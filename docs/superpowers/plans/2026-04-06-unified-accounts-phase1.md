# Unified Accounts Foundation — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the unified `accounts` + `account_offers` foundation alongside existing auth — new tables, new auth module, new API routes, admin UI to create accounts and grant offers — without touching a single existing route, page, or user record.

**Architecture:** Additive parallel build. New `accounts` table (one row per person) + `account_offers` junction table (one row per offer per person) + `lib/account.ts` (single `pearlos_auth` cookie). Existing `affiliates` and `v2_clients` tables and all their auth remain completely unchanged. Phase 1 ends with working new-system plumbing; Phase 2 (separate plan) wires it into the portals.

**Tech Stack:** Next.js 16.2.0, TypeScript, Supabase (project `jntughoiksxosjapklfo`), bcryptjs (already installed), `lib/resend.ts` supabase client

**Critical rules for every task:**
- `npm run build` passes before every commit — type errors on Vercel are silent failures
- Never touch `affiliates`, `v2_clients`, or any existing auth cookie
- Never change `lib/affiliate.ts` or `lib/v2client.ts`
- Never change colors or styles outside `/admin`
- Deploy command: `/opt/homebrew/bin/vercel --prod`

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `supabase/migrations/20260406_accounts.sql` | Create | `accounts` + `account_offers` tables |
| `lib/account.ts` | Create | All account auth functions + session management |
| `app/api/account/login/route.ts` | Create | POST — email+password → set `pearlos_auth` cookie |
| `app/api/account/logout/route.ts` | Create | POST — clear `pearlos_auth` cookie |
| `app/api/account/me/route.ts` | Create | GET — return current account + offers |
| `app/api/admin/accounts/route.ts` | Create | GET list + POST create account |
| `app/api/admin/accounts/[id]/route.ts` | Create | GET single account |
| `app/api/admin/accounts/[id]/offers/route.ts` | Create | POST grant offer + DELETE revoke offer |
| `app/admin/accounts/page.tsx` | Create | Admin UI — list accounts, create account, grant/revoke offers |
| `app/admin/layout.tsx` | Modify | Add "Accounts" to NAV_LINKS |

**Files NOT changed:** `lib/affiliate.ts`, `lib/v2client.ts`, `middleware.ts`, all existing API routes, all portal pages, all email sequences.

---

## Task 1: DB Migration

**Files:**
- Create: `supabase/migrations/20260406_accounts.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- supabase/migrations/20260406_accounts.sql

CREATE TABLE accounts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  session_token TEXT,
  first_name    TEXT,
  last_name     TEXT,
  headshot_url  TEXT,
  phone         TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE account_offers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id  UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  offer       TEXT NOT NULL,
  slug        TEXT,
  meta        JSONB NOT NULL DEFAULT '{}'::jsonb,
  granted_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(account_id, offer)
);

CREATE INDEX idx_account_offers_account_id ON account_offers(account_id);
```

- [ ] **Step 2: Apply the migration via Supabase MCP**

Use `apply_migration` with the SQL above and name `add_accounts_foundation`.

Expected: migration runs without error. If a table already exists, the migration was already applied — skip.

- [ ] **Step 3: Verify tables exist**

Run this SQL via `execute_sql`:
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('accounts', 'account_offers')
ORDER BY table_name;
```

Expected: two rows — `account_offers`, `accounts`.

- [ ] **Step 4: Commit**

```bash
cd /Users/mistibruton/Desktop/geo-landing
git add supabase/migrations/20260406_accounts.sql
git commit -m "feat: add accounts + account_offers tables for unified auth foundation"
```

---

## Task 2: lib/account.ts

**Files:**
- Create: `lib/account.ts`

- [ ] **Step 1: Create the file**

```typescript
// lib/account.ts
import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { supabase } from "./resend";

export interface AccountOffer {
  offer: string;
  slug: string | null;
  meta: Record<string, unknown>;
}

export interface AccountSession {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  headshot_url: string | null;
  phone: string | null;
  offers: AccountOffer[];
}

export async function getAccountFromRequest(
  req: NextRequest
): Promise<AccountSession | null> {
  const cookie = req.cookies.get("pearlos_auth")?.value;
  if (!cookie) return null;

  const colonIdx = cookie.indexOf(":");
  if (colonIdx === -1) return null;

  const accountId = cookie.slice(0, colonIdx);
  const sessionToken = cookie.slice(colonIdx + 1);
  if (!accountId || !sessionToken) return null;

  const { data: account } = await supabase
    .from("accounts")
    .select("id, email, first_name, last_name, headshot_url, phone")
    .eq("id", accountId)
    .eq("session_token", sessionToken)
    .maybeSingle();

  if (!account) return null;

  const { data: offers } = await supabase
    .from("account_offers")
    .select("offer, slug, meta")
    .eq("account_id", account.id);

  return { ...account, offers: (offers ?? []) as AccountOffer[] };
}

export async function loginAccount(
  email: string,
  password: string
): Promise<{ sessionToken: string; account: AccountSession } | null> {
  const { data: account } = await supabase
    .from("accounts")
    .select("id, email, password_hash, first_name, last_name, headshot_url, phone")
    .eq("email", email.toLowerCase().trim())
    .maybeSingle();

  if (!account) return null;

  const valid = await bcrypt.compare(password, account.password_hash);
  if (!valid) return null;

  const sessionToken = crypto.randomBytes(32).toString("hex");
  await supabase
    .from("accounts")
    .update({ session_token: sessionToken })
    .eq("id", account.id);

  const { data: offers } = await supabase
    .from("account_offers")
    .select("offer, slug, meta")
    .eq("account_id", account.id);

  const { password_hash: _ph, ...rest } = account;
  void _ph;

  return {
    sessionToken,
    account: { ...rest, offers: (offers ?? []) as AccountOffer[] },
  };
}

export async function createAccount(params: {
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  headshot_url?: string;
}): Promise<{ id: string } | { error: string }> {
  const passwordHash = await bcrypt.hash(params.password, 10);

  const { data, error } = await supabase
    .from("accounts")
    .insert({
      email: params.email.toLowerCase().trim(),
      password_hash: passwordHash,
      first_name: params.first_name ?? null,
      last_name: params.last_name ?? null,
      phone: params.phone ?? null,
      headshot_url: params.headshot_url ?? null,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  return { id: data.id };
}

export async function grantOffer(
  accountId: string,
  offer: string,
  slug?: string,
  meta?: Record<string, unknown>
): Promise<void> {
  await supabase.from("account_offers").upsert(
    { account_id: accountId, offer, slug: slug ?? null, meta: meta ?? {} },
    { onConflict: "account_id,offer" }
  );
}

export async function revokeOffer(
  accountId: string,
  offer: string
): Promise<void> {
  await supabase
    .from("account_offers")
    .delete()
    .eq("account_id", accountId)
    .eq("offer", offer);
}
```

- [ ] **Step 2: Run build to confirm no type errors**

```bash
cd /Users/mistibruton/Desktop/geo-landing && npm run build 2>&1 | tail -20
```

Expected: build completes with no errors. If TypeScript complains about `_ph`, change that line to `const { password_hash, ...rest } = account; void password_hash;`.

- [ ] **Step 3: Commit**

```bash
git add lib/account.ts
git commit -m "feat: add lib/account.ts — unified accounts auth module"
```

---

## Task 3: Account API Routes

**Files:**
- Create: `app/api/account/login/route.ts`
- Create: `app/api/account/logout/route.ts`
- Create: `app/api/account/me/route.ts`

- [ ] **Step 1: Create login route**

```typescript
// app/api/account/login/route.ts
import { NextRequest, NextResponse } from "next/server";
import { loginAccount } from "../../../../lib/account";

export async function POST(req: NextRequest) {
  const body = await req.json() as { email?: string; password?: string };
  const { email, password } = body;

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });
  }

  const result = await loginAccount(email, password);
  if (!result) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true, offers: result.account.offers });
  res.cookies.set("pearlos_auth", `${result.account.id}:${result.sessionToken}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
```

- [ ] **Step 2: Create logout route**

```typescript
// app/api/account/logout/route.ts
import { NextResponse } from "next/server";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set("pearlos_auth", "", {
    httpOnly: true,
    path: "/",
    maxAge: 0,
  });
  return res;
}
```

- [ ] **Step 3: Create me route**

```typescript
// app/api/account/me/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAccountFromRequest } from "../../../../lib/account";

export async function GET(req: NextRequest) {
  const account = await getAccountFromRequest(req);
  if (!account) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  return NextResponse.json(account);
}
```

- [ ] **Step 4: Run build**

```bash
cd /Users/mistibruton/Desktop/geo-landing && npm run build 2>&1 | tail -20
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add app/api/account/
git commit -m "feat: add account login/logout/me API routes"
```

---

## Task 4: Admin Accounts API

**Files:**
- Create: `app/api/admin/accounts/route.ts`
- Create: `app/api/admin/accounts/[id]/route.ts`
- Create: `app/api/admin/accounts/[id]/offers/route.ts`

- [ ] **Step 1: Create admin accounts list + create route**

```typescript
// app/api/admin/accounts/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../../lib/resend";
import { createAccount } from "../../../../lib/account";

function adminAuth(req: NextRequest): boolean {
  const token = process.env.ADMIN_TOKEN ?? "geo-admin-authenticated";
  return (
    req.cookies.get("admin_auth")?.value === token ||
    req.headers.get("x-admin-key") === token
  );
}

export async function GET(req: NextRequest) {
  if (!adminAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("accounts")
    .select("id, email, first_name, last_name, phone, created_at, account_offers(offer, slug)")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  if (!adminAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as {
    email?: string;
    password?: string;
    first_name?: string;
    last_name?: string;
    phone?: string;
    headshot_url?: string;
  };

  if (!body.email || !body.password) {
    return NextResponse.json({ error: "email and password required" }, { status: 400 });
  }

  const result = await createAccount({
    email: body.email,
    password: body.password,
    first_name: body.first_name,
    last_name: body.last_name,
    phone: body.phone,
    headshot_url: body.headshot_url,
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(result, { status: 201 });
}
```

- [ ] **Step 2: Create admin single account route**

```typescript
// app/api/admin/accounts/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../../../lib/resend";

function adminAuth(req: NextRequest): boolean {
  const token = process.env.ADMIN_TOKEN ?? "geo-admin-authenticated";
  return (
    req.cookies.get("admin_auth")?.value === token ||
    req.headers.get("x-admin-key") === token
  );
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!adminAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("accounts")
    .select("id, email, first_name, last_name, phone, headshot_url, created_at, account_offers(offer, slug, meta, granted_at)")
    .eq("id", params.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(data);
}
```

- [ ] **Step 3: Create grant/revoke offers route**

```typescript
// app/api/admin/accounts/[id]/offers/route.ts
import { NextRequest, NextResponse } from "next/server";
import { grantOffer, revokeOffer } from "../../../../../../lib/account";

function adminAuth(req: NextRequest): boolean {
  const token = process.env.ADMIN_TOKEN ?? "geo-admin-authenticated";
  return (
    req.cookies.get("admin_auth")?.value === token ||
    req.headers.get("x-admin-key") === token
  );
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!adminAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as { offer?: string; slug?: string; meta?: Record<string, unknown> };
  if (!body.offer) return NextResponse.json({ error: "offer required" }, { status: 400 });

  await grantOffer(params.id, body.offer, body.slug, body.meta);
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!adminAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as { offer?: string };
  if (!body.offer) return NextResponse.json({ error: "offer required" }, { status: 400 });

  await revokeOffer(params.id, body.offer);
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 4: Run build**

```bash
cd /Users/mistibruton/Desktop/geo-landing && npm run build 2>&1 | tail -20
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add app/api/admin/accounts/
git commit -m "feat: add admin accounts API (list, create, get, grant/revoke offers)"
```

---

## Task 5: Admin Accounts UI Page

**Files:**
- Create: `app/admin/accounts/page.tsx`
- Modify: `app/admin/layout.tsx` (add "Accounts" to NAV_LINKS)

- [ ] **Step 1: Create the accounts page**

```typescript
// app/admin/accounts/page.tsx
"use client";

import { useEffect, useState } from "react";

const S = {
  bg: "#0F1E3A", card: "#0d1e36", border: "#1e3354",
  text: "#F7F8FC", muted: "#9BACC0", pink: "#E8185C",
  green: "#16A34A", faint: "#4A5E7A",
};

interface AccountOffer { offer: string; slug: string | null; }
interface Account {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  created_at: string;
  account_offers: AccountOffer[];
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", first_name: "", last_name: "", phone: "" });
  const [toast, setToast] = useState<string | null>(null);
  const [grantModal, setGrantModal] = useState<{ accountId: string; email: string } | null>(null);
  const [grantForm, setGrantForm] = useState({ offer: "", slug: "" });

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  }

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/accounts");
    if (res.ok) setAccounts(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    const res = await fetch("/api/admin/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setCreating(false);
    if (!res.ok) { showToast(`Error: ${data.error}`); return; }
    showToast("Account created");
    setForm({ email: "", password: "", first_name: "", last_name: "", phone: "" });
    load();
  }

  async function handleGrantOffer(e: React.FormEvent) {
    e.preventDefault();
    if (!grantModal) return;
    const res = await fetch(`/api/admin/accounts/${grantModal.accountId}/offers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ offer: grantForm.offer, slug: grantForm.slug || undefined }),
    });
    const data = await res.json();
    if (!res.ok) { showToast(`Error: ${data.error}`); return; }
    showToast(`Granted ${grantForm.offer}`);
    setGrantModal(null);
    setGrantForm({ offer: "", slug: "" });
    load();
  }

  async function handleRevokeOffer(accountId: string, offer: string) {
    if (!confirm(`Remove ${offer} from this account?`)) return;
    const res = await fetch(`/api/admin/accounts/${accountId}/offers`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ offer }),
    });
    if (res.ok) { showToast(`Removed ${offer}`); load(); }
  }

  const inputStyle: React.CSSProperties = {
    background: "#1a2d4a", border: `1px solid ${S.border}`, borderRadius: 6,
    color: S.text, padding: "8px 12px", fontSize: 13, width: "100%",
  };

  return (
    <div style={{ padding: 32, maxWidth: 900 }}>
      {toast && (
        <div style={{
          position: "fixed", top: 20, right: 20, background: S.card, border: `1px solid ${S.border}`,
          borderRadius: 8, padding: "12px 20px", color: S.text, fontSize: 13, zIndex: 100,
        }}>{toast}</div>
      )}

      <h1 style={{ color: S.text, fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Accounts</h1>
      <p style={{ color: S.muted, fontSize: 13, marginBottom: 32 }}>
        One account per person. Each account can hold multiple offers.
      </p>

      {/* Create account form */}
      <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 10, padding: 24, marginBottom: 32 }}>
        <h2 style={{ color: S.text, fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Create Account</h2>
        <form onSubmit={handleCreate} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label style={{ color: S.muted, fontSize: 12, display: "block", marginBottom: 4 }}>Email *</label>
            <input style={inputStyle} value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required placeholder="todd@example.com" />
          </div>
          <div>
            <label style={{ color: S.muted, fontSize: 12, display: "block", marginBottom: 4 }}>Password *</label>
            <input style={inputStyle} type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required placeholder="Min 8 chars" />
          </div>
          <div>
            <label style={{ color: S.muted, fontSize: 12, display: "block", marginBottom: 4 }}>First Name</label>
            <input style={inputStyle} value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} placeholder="Todd" />
          </div>
          <div>
            <label style={{ color: S.muted, fontSize: 12, display: "block", marginBottom: 4 }}>Last Name</label>
            <input style={inputStyle} value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} placeholder="Smith" />
          </div>
          <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end" }}>
            <button
              type="submit"
              disabled={creating}
              style={{ background: S.pink, color: "#fff", border: "none", borderRadius: 6, padding: "9px 24px", fontWeight: 600, fontSize: 13, cursor: creating ? "not-allowed" : "pointer", opacity: creating ? 0.7 : 1 }}
            >
              {creating ? "Creating..." : "Create Account"}
            </button>
          </div>
        </form>
      </div>

      {/* Accounts list */}
      {loading ? (
        <p style={{ color: S.muted, fontSize: 13 }}>Loading...</p>
      ) : accounts.length === 0 ? (
        <p style={{ color: S.muted, fontSize: 13 }}>No accounts yet.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {accounts.map(acc => (
            <div key={acc.id} style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 10, padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ color: S.text, fontWeight: 600, fontSize: 14 }}>
                    {acc.first_name || acc.last_name ? `${acc.first_name ?? ""} ${acc.last_name ?? ""}`.trim() : acc.email}
                  </div>
                  <div style={{ color: S.muted, fontSize: 12, marginTop: 2 }}>{acc.email}</div>
                </div>
                <button
                  onClick={() => setGrantModal({ accountId: acc.id, email: acc.email })}
                  style={{ background: "transparent", border: `1px solid ${S.border}`, borderRadius: 6, color: S.muted, padding: "5px 12px", fontSize: 12, cursor: "pointer" }}
                >
                  + Add Offer
                </button>
              </div>

              {acc.account_offers.length > 0 && (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                  {acc.account_offers.map(o => (
                    <div key={o.offer} style={{
                      display: "flex", alignItems: "center", gap: 6,
                      background: "#1a2d4a", border: `1px solid ${S.border}`, borderRadius: 20,
                      padding: "4px 10px 4px 12px",
                    }}>
                      <span style={{ color: S.text, fontSize: 12 }}>{o.offer}{o.slug ? ` · ${o.slug}` : ""}</span>
                      <button
                        onClick={() => handleRevokeOffer(acc.id, o.offer)}
                        style={{ background: "none", border: "none", color: S.faint, cursor: "pointer", fontSize: 14, padding: 0, lineHeight: 1 }}
                      >×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Grant offer modal */}
      {grantModal && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex",
          alignItems: "center", justifyContent: "center", zIndex: 200,
        }}>
          <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 12, padding: 28, width: 360 }}>
            <h3 style={{ color: S.text, fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Grant Offer</h3>
            <p style={{ color: S.muted, fontSize: 12, marginBottom: 20 }}>{grantModal.email}</p>
            <form onSubmit={handleGrantOffer} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ color: S.muted, fontSize: 12, display: "block", marginBottom: 4 }}>Offer *</label>
                <select
                  style={{ ...inputStyle }}
                  value={grantForm.offer}
                  onChange={e => setGrantForm(f => ({ ...f, offer: e.target.value }))}
                  required
                >
                  <option value="">Select offer...</option>
                  <option value="affiliate">Affiliate</option>
                  <option value="v2">V2 (CashOffer)</option>
                  <option value="geo">GEO</option>
                  <option value="local">Local</option>
                </select>
              </div>
              <div>
                <label style={{ color: S.muted, fontSize: 12, display: "block", marginBottom: 4 }}>Slug (portal URL)</label>
                <input
                  style={inputStyle}
                  value={grantForm.slug}
                  onChange={e => setGrantForm(f => ({ ...f, slug: e.target.value }))}
                  placeholder="todd.smith"
                />
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
                <button
                  type="button"
                  onClick={() => { setGrantModal(null); setGrantForm({ offer: "", slug: "" }); }}
                  style={{ background: "transparent", border: `1px solid ${S.border}`, borderRadius: 6, color: S.muted, padding: "8px 16px", fontSize: 13, cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ background: S.green, color: "#fff", border: "none", borderRadius: 6, padding: "8px 20px", fontWeight: 600, fontSize: 13, cursor: "pointer" }}
                >
                  Grant
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Add "Accounts" to admin nav**

In `app/admin/layout.tsx`, find the `NAV_LINKS` array (currently ends with `{ href: "/admin/upload", label: "Upload" }`). Add Accounts before it:

```typescript
const NAV_LINKS = [
  { href: "/admin/activity",    label: "Activity"      },
  { href: "/admin/leads",       label: "Leads"         },
  { href: "/admin/campaigns",   label: "Campaigns"     },
  { href: "/admin/offers",      label: "Offers"        },
  { href: "/admin/affiliates",  label: "Affiliates"    },
  { href: "/admin/provisioning", label: "Provisioning" },
  { href: "/admin/v2",          label: "V2 Clients"    },
  { href: "/admin/v2-leads",    label: "V2 Leads"      },
  { href: "/admin/accounts",    label: "Accounts"      },
  { href: "/admin/upload",      label: "Upload"        },
];
```

- [ ] **Step 3: Run build**

```bash
cd /Users/mistibruton/Desktop/geo-landing && npm run build 2>&1 | tail -20
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/admin/accounts/ app/admin/layout.tsx
git commit -m "feat: add admin accounts page with create, list, grant/revoke offers"
```

---

## Task 6: Deploy and Smoke Test

- [ ] **Step 1: Deploy**

```bash
cd /Users/mistibruton/Desktop/geo-landing && /opt/homebrew/bin/vercel --prod
```

Expected: deployment URL returned, no build errors.

- [ ] **Step 2: Navigate to admin accounts page**

Open `https://geo.heypearl.io/admin/accounts` and confirm:
- Page loads (not 404, not blank)
- "Accounts" link is visible in the nav
- "Create Account" form is present
- No accounts shown yet (empty state)

- [ ] **Step 3: Create a test account via the admin UI**

Fill in the form:
- Email: `test-unified@heypearl.io`
- Password: `TestUnified123`
- First Name: `Test`
- Last Name: `Unified`

Click "Create Account". Expected: "Account created" toast, new row appears in the list.

- [ ] **Step 4: Grant an offer via the admin UI**

Click "+ Add Offer" on the test account. Select "affiliate". Enter slug `test.unified`. Click "Grant". Expected: "Granted affiliate" toast, pill appears on the account row.

- [ ] **Step 5: Verify via API**

In a terminal, create a test login and check the me endpoint:

```bash
# Login
curl -s -c /tmp/pearl_cookies.txt -X POST https://geo.heypearl.io/api/account/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test-unified@heypearl.io","password":"TestUnified123"}' | python3 -m json.tool
```

Expected response:
```json
{
  "ok": true,
  "offers": [
    { "offer": "affiliate", "slug": "test.unified", "meta": {} }
  ]
}
```

```bash
# Check me endpoint
curl -s -b /tmp/pearl_cookies.txt https://geo.heypearl.io/api/account/me | python3 -m json.tool
```

Expected: JSON with email, first_name, last_name, and offers array containing the affiliate offer.

- [ ] **Step 6: Verify wrong password is rejected**

```bash
curl -s -X POST https://geo.heypearl.io/api/account/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test-unified@heypearl.io","password":"wrongpassword"}' | python3 -m json.tool
```

Expected: `{"error":"Invalid credentials"}` with status 401.

- [ ] **Step 7: Clean up test account**

Delete the test account from Supabase:
```sql
DELETE FROM accounts WHERE email = 'test-unified@heypearl.io';
```

- [ ] **Step 8: Final commit**

```bash
git add -A
git commit -m "chore: phase 1 unified accounts foundation — deploy verified"
```

---

## What Phase 2 Will Do (Not This Plan)

Phase 2 wires the new auth into the existing portals. When an affiliate logs in via `/api/account/login`, the affiliate portal (`/[slug]/leads`) will check for EITHER `affiliate_auth` (old) OR `pearlos_auth` with offer `affiliate` (new). Both work. No forced migration yet.

Phase 3 migrates existing affiliates to accounts (creates an `accounts` row + `account_offers` row for each affiliate).

Phase 4 removes `cashoffer_client` band-aid + old auth cookies after everything is confirmed.
