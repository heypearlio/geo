# Account Dashboard — Phase 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the account portal — a unified hub where users with a `pearlos_auth` cookie see all their active offers with funnel links, and can update their profile (name, phone, photo).

**Architecture:** Five new files only. No existing files modified. The account portal lives at `geo.heypearl.io/account/*` — these paths pass through the middleware untouched (middleware only intercepts `/admin` and subdomain roots). Auth follows the same client-side pattern as the affiliate layout: `fetch("/api/account/me")` in a useEffect, redirect to login if 401. Offer cards are driven entirely by the `account_offers` rows returned by `/api/account/me` — no hardcoding.

**Tech Stack:** Next.js 16.2.0 App Router, TypeScript, Tailwind 4, Supabase (via `lib/resend.ts`), `lib/account.ts` (already built in Phase 1)

**What is NOT in this phase (Phase 3):** Social links (instagram, facebook, linkedin, tiktok, youtube) and Calendly URL still live on the `affiliates` table. Todd updates those via the existing Settings modal at `/todd.smith/leads`. They migrate to `account_offers.meta` in Phase 3.

---

## File Map

| File | Status | Responsibility |
|---|---|---|
| `app/account/layout.tsx` | **Create** | Client component — auth guard, nav bar, sign out |
| `app/account/login/page.tsx` | **Create** | Login form, POSTs to `/api/account/login`, redirects to dashboard |
| `app/account/dashboard/page.tsx` | **Create** | Offer cards + profile settings form |
| `app/api/account/profile/route.ts` | **Create** | PATCH — update `first_name`, `last_name`, `phone`, `headshot_url` on `accounts` |
| `app/api/account/upload-headshot/route.ts` | **Create** | POST — upload photo to Supabase `affiliate-headshots` bucket under `accounts/{id}/` |

No existing files are modified. The admin nav already has "Accounts" linked to `/admin/accounts`. Middleware has no rules for `/account/*` on the main domain — it passes through as normal Next.js routing.

---

## Task 1: Profile Update API

**Files:**
- Create: `app/api/account/profile/route.ts`

- [ ] **Step 1: Create the route file**

```typescript
// app/api/account/profile/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAccountFromRequest } from "../../../../lib/account";
import { supabase } from "../../../../lib/resend";

export async function PATCH(req: NextRequest) {
  const account = await getAccountFromRequest(req);
  if (!account) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await req.json() as {
    first_name?: string;
    last_name?: string;
    phone?: string;
    headshot_url?: string;
  };

  const update: Record<string, string> = {};
  if (body.first_name !== undefined) update.first_name = body.first_name.trim();
  if (body.last_name  !== undefined) update.last_name  = body.last_name.trim();
  if (body.phone      !== undefined) update.phone      = body.phone.trim();
  if (body.headshot_url !== undefined) update.headshot_url = body.headshot_url;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("accounts")
    .update(update)
    .eq("id", account.id)
    .select("id, email, first_name, last_name, phone, headshot_url")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
```

- [ ] **Step 2: Verify build passes**

```bash
cd /Users/mistibruton/Desktop/geo-landing && npm run build 2>&1 | tail -20
```

Expected: no TypeScript errors. If there are errors, fix before continuing.

- [ ] **Step 3: Commit**

```bash
cd /Users/mistibruton/Desktop/geo-landing
git add app/api/account/profile/route.ts
git commit -m "feat: add PATCH /api/account/profile for account settings"
```

---

## Task 2: Headshot Upload API

**Files:**
- Create: `app/api/account/upload-headshot/route.ts`

- [ ] **Step 1: Create the route file**

```typescript
// app/api/account/upload-headshot/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAccountFromRequest } from "../../../../lib/account";
import { supabase } from "../../../../lib/resend";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const account = await getAccountFromRequest(req);
  if (!account) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const MAX_SIZE = 5 * 1024 * 1024; // 5MB
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 400 });
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const ALLOWED_EXTS = new Set(["jpg", "jpeg", "png", "gif", "webp"]);
  if (!ALLOWED_EXTS.has(ext)) {
    return NextResponse.json({ error: "Invalid file type. Allowed: jpg, jpeg, png, gif, webp" }, { status: 400 });
  }

  const path = `accounts/${account.id}/${Date.now()}.${ext}`;
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const { error } = await supabase.storage
    .from("affiliate-headshots")
    .upload(path, buffer, { contentType: file.type, upsert: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: urlData } = supabase.storage
    .from("affiliate-headshots")
    .getPublicUrl(path);

  return NextResponse.json({ url: urlData.publicUrl });
}
```

- [ ] **Step 2: Verify build passes**

```bash
cd /Users/mistibruton/Desktop/geo-landing && npm run build 2>&1 | tail -20
```

- [ ] **Step 3: Commit**

```bash
cd /Users/mistibruton/Desktop/geo-landing
git add app/api/account/upload-headshot/route.ts
git commit -m "feat: add POST /api/account/upload-headshot"
```

---

## Task 3: Login Page

**Files:**
- Create: `app/account/login/page.tsx`

- [ ] **Step 1: Create the login page**

```typescript
// app/account/login/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const S = {
  bg: "#0F1E3A", card: "#0d1e36", border: "#1e3354",
  text: "#F7F8FC", muted: "#9BACC0", pink: "#E8185C", faint: "#4A5E7A",
};

export default function AccountLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/account/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Login failed");
      return;
    }

    router.push("/account/dashboard");
  }

  const inputStyle: React.CSSProperties = {
    background: "#1a2d4a", border: `1px solid ${S.border}`, borderRadius: 6,
    color: S.text, padding: "10px 14px", fontSize: 14, width: "100%",
    boxSizing: "border-box", outline: "none",
  };

  return (
    <div style={{ background: S.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ marginBottom: 32, textAlign: "center" }}>
          <div style={{ color: S.pink, fontWeight: 800, fontSize: 22, letterSpacing: "-0.02em" }}>HeyPearl</div>
          <div style={{ color: S.muted, fontSize: 14, marginTop: 6 }}>Sign in to your account</div>
        </div>

        <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 12, padding: 32 }}>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ color: S.muted, fontSize: 12, display: "block", marginBottom: 6 }}>Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="todd@example.com"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ color: S.muted, fontSize: 12, display: "block", marginBottom: 6 }}>Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Your password"
                style={inputStyle}
              />
            </div>

            {error && (
              <div style={{ color: "#f87171", fontSize: 13, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 6, padding: "8px 12px" }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                background: S.pink, color: "#fff", border: "none", borderRadius: 8,
                padding: "12px 24px", fontWeight: 700, fontSize: 14,
                cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1,
                marginTop: 8,
              }}
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build passes**

```bash
cd /Users/mistibruton/Desktop/geo-landing && npm run build 2>&1 | tail -20
```

- [ ] **Step 3: Commit**

```bash
cd /Users/mistibruton/Desktop/geo-landing
git add app/account/login/page.tsx
git commit -m "feat: add account login page at /account/login"
```

---

## Task 4: Account Layout (Auth Guard + Nav)

**Files:**
- Create: `app/account/layout.tsx`

- [ ] **Step 1: Create the layout**

```typescript
// app/account/layout.tsx
"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";

const S = {
  nav: "#0d1e36", border: "#1e3354", text: "#F7F8FC",
  muted: "#9BACC0", pink: "#E8185C",
};

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  // Login page needs no auth guard or nav
  const isLoginPage = pathname === "/account/login";

  useEffect(() => {
    if (isLoginPage) return;
    fetch("/api/account/me").then(r => {
      if (!r.ok) router.push("/account/login");
    });
  }, [isLoginPage, router]);

  if (isLoginPage) return <>{children}</>;

  async function handleLogout() {
    await fetch("/api/account/logout", { method: "POST" });
    router.push("/account/login");
  }

  return (
    <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", background: "#0F1E3A", minHeight: "100vh" }}>
      <nav style={{
        background: S.nav, borderBottom: `1px solid ${S.border}`,
        height: 52, display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 24px", position: "sticky", top: 0, zIndex: 50,
      }}>
        <Link
          href="/account/dashboard"
          style={{ color: S.pink, fontWeight: 800, fontSize: 15, letterSpacing: "-0.02em", textDecoration: "none" }}
        >
          HeyPearl
        </Link>
        <button
          onClick={handleLogout}
          style={{
            background: "none", border: `1px solid ${S.border}`, color: S.muted,
            borderRadius: 6, padding: "5px 14px", fontSize: 13, cursor: "pointer",
          }}
        >
          Sign out
        </button>
      </nav>
      <div>{children}</div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build passes**

```bash
cd /Users/mistibruton/Desktop/geo-landing && npm run build 2>&1 | tail -20
```

- [ ] **Step 3: Commit**

```bash
cd /Users/mistibruton/Desktop/geo-landing
git add app/account/layout.tsx
git commit -m "feat: add account layout with auth guard and nav"
```

---

## Task 5: Account Dashboard Page

**Files:**
- Create: `app/account/dashboard/page.tsx`

This is the main hub. It fetches the account from `/api/account/me`, renders one offer card per `account_offers` row with the correct portal and funnel links, and shows a settings form below.

**Offer → link logic:**

| `offer` value | `slug` example | What card shows |
|---|---|---|
| `affiliate` | `todd.smith` | Leads portal + GEO/V2/Local funnel links + v-card |
| `v2` | `acme` | CashOffer leads portal |

- [ ] **Step 1: Create the dashboard page**

```typescript
// app/account/dashboard/page.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const S = {
  bg: "#0F1E3A", card: "#0d1e36", border: "#1e3354",
  text: "#F7F8FC", muted: "#9BACC0", pink: "#E8185C",
  green: "#16A34A", faint: "#4A5E7A",
};

interface AccountOffer {
  offer: string;
  slug: string | null;
  meta: Record<string, unknown>;
}

interface Account {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  headshot_url: string | null;
  offers: AccountOffer[];
}

function offerLinks(o: AccountOffer): { label: string; href: string }[] {
  const slug = o.slug ?? "";
  if (o.offer === "affiliate") {
    return [
      { label: "My Leads Dashboard", href: `https://geo.heypearl.io/${slug}/leads` },
      { label: "GEO Funnel Page",    href: `https://geo.heypearl.io/${slug}` },
      { label: "V2 Funnel Page",     href: `https://v2.heypearl.io/${slug}` },
      { label: "Local Funnel Page",  href: `https://local.heypearl.io/${slug}` },
      { label: "My Business Card",   href: `https://${slug}.heypearl.io` },
    ];
  }
  if (o.offer === "v2") {
    return [
      { label: "My Leads Dashboard", href: `https://v2.heypearl.io/cashoffer/${slug}/leads` },
    ];
  }
  return [];
}

function offerTitle(offer: string): string {
  if (offer === "affiliate") return "Affiliate Partner";
  if (offer === "v2")        return "CashOffer Client";
  if (offer === "geo")       return "GEO Client";
  if (offer === "local")     return "Local Client";
  return offer;
}

export default function AccountDashboard() {
  const router = useRouter();
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);

  // Settings form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName]   = useState("");
  const [phone, setPhone]         = useState("");
  const [headshotUrl, setHeadshotUrl] = useState("");
  const [saving, setSaving]       = useState(false);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast]         = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  }

  useEffect(() => {
    fetch("/api/account/me")
      .then(r => {
        if (!r.ok) { router.push("/account/login"); return null; }
        return r.json();
      })
      .then((data: Account | null) => {
        if (!data) return;
        setAccount(data);
        setFirstName(data.first_name ?? "");
        setLastName(data.last_name ?? "");
        setPhone(data.phone ?? "");
        setHeadshotUrl(data.headshot_url ?? "");
        setLoading(false);
      });
  }, [router]);

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/account/upload-headshot", { method: "POST", body: fd });
    setUploading(false);
    if (!res.ok) { showToast("Upload failed"); return; }
    const { url } = await res.json();
    setHeadshotUrl(url);
    showToast("Photo uploaded");
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/account/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        first_name: firstName,
        last_name: lastName,
        phone,
        headshot_url: headshotUrl,
      }),
    });
    setSaving(false);
    if (!res.ok) { showToast("Save failed"); return; }
    const updated = await res.json();
    setAccount(prev => prev ? { ...prev, ...updated } : prev);
    showToast("Saved");
  }

  const inputStyle: React.CSSProperties = {
    background: "#1a2d4a", border: `1px solid ${S.border}`, borderRadius: 6,
    color: S.text, padding: "9px 12px", fontSize: 13, width: "100%",
    boxSizing: "border-box", outline: "none",
  };

  if (loading) {
    return (
      <div style={{ background: S.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ color: S.muted, fontSize: 14 }}>Loading...</span>
      </div>
    );
  }

  if (!account) return null;

  const displayName = [account.first_name, account.last_name].filter(Boolean).join(" ") || account.email;

  return (
    <div style={{ background: S.bg, minHeight: "100vh", padding: "32px 24px" }}>
      {toast && (
        <div style={{
          position: "fixed", top: 20, right: 20, background: S.card,
          border: `1px solid ${S.border}`, borderRadius: 8, padding: "12px 20px",
          color: S.text, fontSize: 13, zIndex: 100,
        }}>
          {toast}
        </div>
      )}

      <div style={{ maxWidth: 720, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ color: S.text, fontSize: 22, fontWeight: 700, margin: 0 }}>
            Welcome back, {account.first_name || displayName}
          </h1>
          <p style={{ color: S.muted, fontSize: 13, marginTop: 4 }}>{account.email}</p>
        </div>

        {/* Offer Cards */}
        {account.offers.length > 0 && (
          <div style={{ marginBottom: 40 }}>
            <h2 style={{ color: S.text, fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Your Offers</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {account.offers.map(o => {
                const links = offerLinks(o);
                return (
                  <div
                    key={o.offer}
                    style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 10, padding: 24 }}
                  >
                    <div style={{ color: S.text, fontWeight: 700, fontSize: 15, marginBottom: 4 }}>
                      {offerTitle(o.offer)}
                    </div>
                    {o.slug && (
                      <div style={{ color: S.muted, fontSize: 12, marginBottom: 16 }}>
                        Slug: {o.slug}
                      </div>
                    )}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                      {links.map(l => (
                        <a
                          key={l.href}
                          href={l.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            background: "#1a2d4a", border: `1px solid ${S.border}`,
                            borderRadius: 6, color: S.text, textDecoration: "none",
                            padding: "7px 14px", fontSize: 13, fontWeight: 500,
                            display: "inline-block",
                          }}
                        >
                          {l.label} ↗
                        </a>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Profile Settings */}
        <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 10, padding: 24 }}>
          <h2 style={{ color: S.text, fontSize: 15, fontWeight: 600, marginBottom: 20 }}>Profile</h2>

          {/* Headshot */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
            <div
              onClick={() => fileRef.current?.click()}
              style={{
                width: 72, height: 72, borderRadius: "50%",
                background: headshotUrl ? "transparent" : "#1a2d4a",
                border: `2px solid ${S.border}`, cursor: "pointer",
                overflow: "hidden", flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              {headshotUrl ? (
                <img src={headshotUrl} alt="Photo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <span style={{ color: S.faint, fontSize: 11 }}>Photo</span>
              )}
            </div>
            <div>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                style={{
                  background: "transparent", border: `1px solid ${S.border}`, borderRadius: 6,
                  color: S.muted, padding: "6px 14px", fontSize: 12, cursor: uploading ? "not-allowed" : "pointer",
                  opacity: uploading ? 0.6 : 1,
                }}
              >
                {uploading ? "Uploading..." : "Change Photo"}
              </button>
              <p style={{ color: S.faint, fontSize: 11, margin: "4px 0 0" }}>JPG, PNG, WebP — max 5MB</p>
            </div>
            <input ref={fileRef} type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: "none" }} />
          </div>

          <form onSubmit={handleSave}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
              <div>
                <label style={{ color: S.muted, fontSize: 12, display: "block", marginBottom: 5 }}>First Name</label>
                <input style={inputStyle} value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Todd" />
              </div>
              <div>
                <label style={{ color: S.muted, fontSize: 12, display: "block", marginBottom: 5 }}>Last Name</label>
                <input style={inputStyle} value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Smith" />
              </div>
              <div>
                <label style={{ color: S.muted, fontSize: 12, display: "block", marginBottom: 5 }}>Phone</label>
                <input style={inputStyle} value={phone} onChange={e => setPhone(e.target.value)} placeholder="(555) 123-4567" />
              </div>
              <div>
                <label style={{ color: S.muted, fontSize: 12, display: "block", marginBottom: 5 }}>Email</label>
                <input style={{ ...inputStyle, opacity: 0.5, cursor: "not-allowed" }} value={account.email} readOnly />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                type="submit"
                disabled={saving}
                style={{
                  background: S.pink, color: "#fff", border: "none", borderRadius: 7,
                  padding: "9px 24px", fontWeight: 700, fontSize: 13,
                  cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1,
                }}
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>

          <div style={{ borderTop: `1px solid ${S.border}`, marginTop: 20, paddingTop: 14 }}>
            <p style={{ color: S.faint, fontSize: 12, margin: 0 }}>
              Social links and Calendly URL are managed in your leads dashboard Settings modal.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build passes**

```bash
cd /Users/mistibruton/Desktop/geo-landing && npm run build 2>&1 | tail -20
```

Expected: clean build, no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/mistibruton/Desktop/geo-landing
git add app/account/dashboard/page.tsx
git commit -m "feat: add account dashboard with offer cards and profile settings"
```

---

## Task 6: Manual Smoke Test + Deploy

- [ ] **Step 1: Test login flow**

1. Go to `http://localhost:3000/account/dashboard` (or run `npm run dev` first)
2. Should redirect to `/account/login` immediately (no `pearlos_auth` cookie)
3. Enter wrong credentials → should show error message, not crash
4. Enter credentials for a test account (create one at `/admin/accounts` if none exist)
5. Should redirect to `/account/dashboard`

- [ ] **Step 2: Test offer cards**

1. In `/admin/accounts`, grant the test account an `affiliate` offer with slug `todd.smith`
2. Reload dashboard — card should appear with 5 links
3. Click "My Leads Dashboard" link — should open `geo.heypearl.io/todd.smith/leads`
4. Click "My Business Card" — should open `todd.smith.heypearl.io`

- [ ] **Step 3: Test settings**

1. Update first name, last name, phone → click Save
2. Refresh page — values should persist (loaded from DB via `/api/account/me`)
3. Click "Change Photo" → upload a JPG → photo circle updates
4. Click Save → photo URL saved, persists on refresh

- [ ] **Step 4: Test sign out**

1. Click "Sign out" — should clear cookie and redirect to `/account/login`
2. Navigating to `/account/dashboard` should redirect back to login

- [ ] **Step 5: Deploy**

```bash
cd /Users/mistibruton/Desktop/geo-landing
git add .
git commit -m "feat: account dashboard phase 2 complete" --allow-empty
/opt/homebrew/bin/vercel --prod
```

- [ ] **Step 6: Verify on production**

Visit `https://geo.heypearl.io/account/login` — confirm page loads, login works, dashboard renders with offer cards.

---

## Self-Review

**Spec coverage:**
- [x] Account login page at `/account/login`
- [x] Auth guard — redirects to login if no `pearlos_auth` cookie
- [x] Offer cards — one per `account_offers` row, correct links per offer type
- [x] Profile settings — name, phone, photo
- [x] Photo upload → Supabase storage → URL saved to accounts table
- [x] Sign out
- [x] Zero existing files modified — Todd's `/leads` portal untouched
- [x] Social links / Calendly clearly noted as Phase 3 (footer note on settings card)

**Placeholder scan:** None found — all steps have real code.

**Type consistency:**
- `AccountOffer` interface defined once in dashboard, matches `lib/account.ts` `AccountOffer`
- `Account` interface in dashboard matches shape returned by `/api/account/me`
- `PATCH /api/account/profile` accepts `first_name | last_name | phone | headshot_url` — all used correctly in dashboard form
- `POST /api/account/upload-headshot` returns `{ url: string }` — destructured correctly in `handlePhotoUpload`
