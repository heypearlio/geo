# V2 Client Onboarding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add V2 client onboarding so Misti can create cashoffer clients in `/admin/v2`, each getting a password-protected leads portal at `v2.heypearl.io/cashoffer/[slug]/leads` mirroring the local affiliate system.

**Architecture:** `v2_clients` table mirrors `affiliates` (same auth fields, same cookie pattern with `v2client_auth`). God demo moves to a dedicated `app/cashoffer/page.tsx` route served at `v2.heypearl.io/cashoffer`. Per-client pages live at `/cashoffer/[slug]/` and reuse the same templates. Admin at `/admin/v2` mirrors `/admin/affiliates` exactly.

**Tech Stack:** Next.js 16.2 App Router, TypeScript, Supabase (service role), bcryptjs, crypto (Node built-in)

---

## File Map

**Create:**
- `lib/v2client.ts` — auth helper (mirrors `lib/affiliate.ts`)
- `app/cashoffer/page.tsx` — god demo landing page (static, no DB)
- `app/cashoffer/schedule/page.tsx` — god demo schedule page (static, no DB)
- `app/cashoffer/[slug]/layout.tsx` — client dashboard layout + nav
- `app/cashoffer/[slug]/login/page.tsx`
- `app/cashoffer/[slug]/setup/page.tsx`
- `app/cashoffer/[slug]/leads/page.tsx`
- `app/cashoffer/[slug]/change-password/page.tsx`
- `app/cashoffer/[slug]/forgot-password/page.tsx`
- `app/cashoffer/[slug]/reset-password/page.tsx`
- `app/api/v2client/login/route.ts`
- `app/api/v2client/logout/route.ts`
- `app/api/v2client/me/route.ts`
- `app/api/v2client/setup/route.ts`
- `app/api/v2client/change-password/route.ts`
- `app/api/v2client/forgot-password/route.ts`
- `app/api/v2client/reset-password/route.ts`
- `app/api/v2client/leads/route.ts`
- `app/api/v2client/lead-status/route.ts`
- `app/api/admin/v2clients/route.ts`
- `app/api/admin/v2clients/[id]/route.ts`
- `app/api/admin/v2-leads/route.ts`
- `app/admin/v2/page.tsx`
- `app/admin/v2-leads/page.tsx`

**Modify:**
- `app/templates/cashoffer/configs/demo.ts` — update scheduleRoute + funnelTag
- `app/cashoffer/[slug]/page.tsx` — add DB merge for calendlyUrl/metaPixelId
- `app/cashoffer/[slug]/schedule/page.tsx` — add DB merge
- `app/admin/layout.tsx` — add V2 nav links

---

### Task 1: DB Migration — v2_clients and cashoffer_lead_status tables

**Files:**
- Supabase migration via MCP

- [ ] **Step 1: Run migration**

```sql
CREATE TABLE v2_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  password_hash text,
  session_token text,
  invite_token text,
  invite_used boolean NOT NULL DEFAULT false,
  reset_token text,
  reset_expires_at timestamptz,
  calendly_url text,
  meta_pixel_id text,
  domain text,
  active boolean NOT NULL DEFAULT true,
  last_login timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE cashoffer_lead_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES v2_clients(id),
  email text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  name text,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(client_id, email)
);
```

- [ ] **Step 2: Verify tables exist**

Run in Supabase SQL editor:
```sql
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'v2_clients' ORDER BY ordinal_position;

SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'cashoffer_lead_status' ORDER BY ordinal_position;
```

Expected: v2_clients has 15 columns, cashoffer_lead_status has 7.

- [ ] **Step 3: Add env var**

```bash
printf 'v2.heypearl.io' | /opt/homebrew/bin/vercel env add NEXT_PUBLIC_V2_HOST production
printf 'v2.heypearl.io' | /opt/homebrew/bin/vercel env add NEXT_PUBLIC_V2_HOST preview
printf 'v2.heypearl.io' | /opt/homebrew/bin/vercel env add NEXT_PUBLIC_V2_HOST development
```

---

### Task 2: lib/v2client.ts — Auth Helper

**Files:**
- Create: `lib/v2client.ts`

- [ ] **Step 1: Create the file**

```typescript
// lib/v2client.ts
import { NextRequest } from "next/server";
import { supabase } from "./resend";

export interface V2ClientSession {
  id: string;
  slug: string;
  name: string;
  calendly_url: string | null;
}

export async function getV2ClientFromRequest(
  req: NextRequest
): Promise<V2ClientSession | null> {
  const cookie = req.cookies.get("v2client_auth")?.value;
  if (!cookie) return null;

  const colonIdx = cookie.indexOf(":");
  if (colonIdx === -1) return null;

  const slug = cookie.slice(0, colonIdx);
  const sessionToken = cookie.slice(colonIdx + 1);
  if (!slug || !sessionToken) return null;

  const { data, error } = await supabase
    .from("v2_clients")
    .select("id, slug, name, calendly_url")
    .eq("slug", slug)
    .eq("session_token", sessionToken)
    .eq("active", true)
    .maybeSingle();

  if (error || !data) return null;
  return data as V2ClientSession;
}
```

- [ ] **Step 2: Build check**

```bash
npm run build 2>&1 | grep -E "error|Error" | grep -v "node_modules"
```

Expected: no errors mentioning v2client.ts.

- [ ] **Step 3: Commit**

```bash
git add lib/v2client.ts
git commit -m "feat: add v2client auth helper"
```

---

### Task 3: God Demo Routes + Config Update

**Files:**
- Create: `app/cashoffer/page.tsx`
- Create: `app/cashoffer/schedule/page.tsx`
- Modify: `app/templates/cashoffer/configs/demo.ts` (scheduleRoute, funnelTag)

- [ ] **Step 1: Update demo config**

In `app/templates/cashoffer/configs/demo.ts`, change:

```typescript
  funnelTag: "cashoffer",
  scheduleRoute: "/cashoffer/schedule",
```

(was `funnelTag: "demo"` and `scheduleRoute: "/cashoffer/demo/schedule"`)

- [ ] **Step 2: Create god demo landing page**

```typescript
// app/cashoffer/page.tsx
import CashOfferLandingPage from "@/app/templates/cashoffer/CashOfferLandingPage";
import { cashOfferConfigs } from "@/app/templates/cashoffer/configs/index";

export default function CashOfferGodPage() {
  return <CashOfferLandingPage config={cashOfferConfigs.demo} />;
}
```

- [ ] **Step 3: Create god demo schedule page**

```typescript
// app/cashoffer/schedule/page.tsx
import CashOfferSchedulePage from "@/app/templates/cashoffer/CashOfferSchedulePage";
import { cashOfferConfigs } from "@/app/templates/cashoffer/configs/index";

export default function CashOfferGodSchedulePage() {
  return <CashOfferSchedulePage config={cashOfferConfigs.demo} />;
}
```

- [ ] **Step 4: Build check**

```bash
npm run build 2>&1 | grep -E "error|Error" | grep -v "node_modules"
```

Expected: no errors. Build output should show `○ /cashoffer` and `○ /cashoffer/schedule`.

- [ ] **Step 5: Commit**

```bash
git add app/cashoffer/page.tsx app/cashoffer/schedule/page.tsx app/templates/cashoffer/configs/demo.ts
git commit -m "feat: add god demo route at /cashoffer, update demo config"
```

---

### Task 4: V2 Client Auth API Routes

**Files:**
- Create: `app/api/v2client/login/route.ts`
- Create: `app/api/v2client/logout/route.ts`
- Create: `app/api/v2client/me/route.ts`
- Create: `app/api/v2client/setup/route.ts`
- Create: `app/api/v2client/change-password/route.ts`
- Create: `app/api/v2client/forgot-password/route.ts`
- Create: `app/api/v2client/reset-password/route.ts`

- [ ] **Step 1: Create login route**

```typescript
// app/api/v2client/login/route.ts
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { supabase } from "../../../../lib/resend";

export async function POST(req: NextRequest) {
  const { slug, password } = await req.json() as { slug?: string; password?: string };

  if (!slug || !password) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const { data: client } = await supabase
    .from("v2_clients")
    .select("id, slug, password_hash, active")
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle();

  if (!client || !client.password_hash) {
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }

  const valid = await bcrypt.compare(password, client.password_hash);
  if (!valid) {
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }

  const sessionToken = crypto.randomBytes(32).toString("hex");
  await supabase
    .from("v2_clients")
    .update({ session_token: sessionToken, last_login: new Date().toISOString() })
    .eq("id", client.id);

  const res = NextResponse.json({ success: true });
  res.cookies.set("v2client_auth", `${slug}:${sessionToken}`, {
    httpOnly: true,
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    sameSite: "lax",
  });
  return res;
}
```

- [ ] **Step 2: Create logout route**

```typescript
// app/api/v2client/logout/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getV2ClientFromRequest } from "../../../../lib/v2client";
import { supabase } from "../../../../lib/resend";

export async function POST(req: NextRequest) {
  const client = await getV2ClientFromRequest(req);
  if (client) {
    await supabase
      .from("v2_clients")
      .update({ session_token: null })
      .eq("id", client.id);
  }

  const res = NextResponse.json({ success: true });
  res.cookies.set("v2client_auth", "", {
    httpOnly: true,
    path: "/",
    maxAge: 0,
  });
  return res;
}
```

- [ ] **Step 3: Create me route**

```typescript
// app/api/v2client/me/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getV2ClientFromRequest } from "../../../../lib/v2client";

export async function GET(req: NextRequest) {
  const client = await getV2ClientFromRequest(req);
  if (!client) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  return NextResponse.json({
    slug: client.slug,
    name: client.name,
    calendlyUrl: client.calendly_url ?? null,
  });
}
```

- [ ] **Step 4: Create setup route**

```typescript
// app/api/v2client/setup/route.ts
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { supabase } from "../../../../lib/resend";

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug");
  const token = req.nextUrl.searchParams.get("token");
  if (!slug || !token) return NextResponse.json({ error: "Missing params" }, { status: 400 });

  const { data } = await supabase
    .from("v2_clients")
    .select("invite_token, invite_used")
    .eq("slug", slug)
    .maybeSingle();

  if (!data || data.invite_used || data.invite_token !== token) {
    return NextResponse.json({ error: "Invalid" }, { status: 400 });
  }

  return NextResponse.json({ valid: true });
}

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    slug?: string;
    inviteToken?: string;
    password?: string;
    calendlyUrl?: string;
  };

  const { slug, inviteToken, password, calendlyUrl } = body;

  if (!slug || !inviteToken || !password) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const { data: client } = await supabase
    .from("v2_clients")
    .select("id, invite_token, invite_used")
    .eq("slug", slug)
    .maybeSingle();

  if (!client || client.invite_used || client.invite_token !== inviteToken) {
    return NextResponse.json({ error: "Invalid or expired invite link" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const sessionToken = crypto.randomBytes(32).toString("hex");

  await supabase
    .from("v2_clients")
    .update({
      password_hash: passwordHash,
      session_token: sessionToken,
      invite_token: null,
      invite_used: true,
      calendly_url: calendlyUrl ?? undefined,
    })
    .eq("id", client.id);

  const res = NextResponse.json({ success: true });
  res.cookies.set("v2client_auth", `${slug}:${sessionToken}`, {
    httpOnly: true,
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    sameSite: "lax",
  });
  return res;
}
```

- [ ] **Step 5: Create change-password route**

```typescript
// app/api/v2client/change-password/route.ts
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getV2ClientFromRequest } from "../../../../lib/v2client";
import { supabase } from "../../../../lib/resend";

export async function POST(req: NextRequest) {
  const client = await getV2ClientFromRequest(req);
  if (!client) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { currentPassword, newPassword } = await req.json() as {
    currentPassword?: string;
    newPassword?: string;
  };

  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  if (newPassword.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const { data: row } = await supabase
    .from("v2_clients")
    .select("password_hash")
    .eq("id", client.id)
    .maybeSingle();

  if (!row?.password_hash) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const valid = await bcrypt.compare(currentPassword, row.password_hash);
  if (!valid) return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });

  const newHash = await bcrypt.hash(newPassword, 12);
  await supabase
    .from("v2_clients")
    .update({ password_hash: newHash, session_token: null })
    .eq("id", client.id);

  const res = NextResponse.json({ success: true });
  res.cookies.set("v2client_auth", "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}
```

- [ ] **Step 6: Create forgot-password route (stub)**

```typescript
// app/api/v2client/forgot-password/route.ts
import { NextResponse } from "next/server";

// Stub — email reset not yet implemented for V2 clients
export async function POST() {
  return NextResponse.json({ success: true });
}
```

- [ ] **Step 7: Create reset-password route (stub)**

```typescript
// app/api/v2client/reset-password/route.ts
import { NextResponse } from "next/server";

// Stub — email reset not yet implemented for V2 clients
export async function POST() {
  return NextResponse.json({ error: "Not yet implemented" }, { status: 400 });
}
```

- [ ] **Step 8: Build check**

```bash
npm run build 2>&1 | grep -E "error|Error" | grep -v "node_modules"
```

Expected: no errors.

- [ ] **Step 9: Commit**

```bash
git add app/api/v2client/
git commit -m "feat: add v2client auth API routes (login, logout, me, setup, change-password)"
```

---

### Task 5: V2 Client Leads API Routes

**Files:**
- Create: `app/api/v2client/leads/route.ts`
- Create: `app/api/v2client/lead-status/route.ts`

- [ ] **Step 1: Create leads route**

```typescript
// app/api/v2client/leads/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getV2ClientFromRequest } from "../../../../lib/v2client";
import { supabase } from "../../../../lib/resend";

export async function GET(req: NextRequest) {
  const client = await getV2ClientFromRequest(req);
  if (!client) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = req.nextUrl;
  const search = url.searchParams.get("search") ?? "";
  const page = parseInt(url.searchParams.get("page") ?? "1", 10);
  const statusFilter = url.searchParams.get("status") ?? "";
  const sortCol = url.searchParams.get("sort_col") ?? "created_at";
  const sortDir = url.searchParams.get("sort_dir") ?? "desc";
  const ascending = sortDir === "asc";
  const pageSize = 50;
  const offset = (page - 1) * pageSize;

  const validCols = ["created_at", "name", "email", "address"];
  const col = validCols.includes(sortCol) ? sortCol : "created_at";

  let query = supabase
    .from("cashoffer_leads")
    .select("id, email, name, phone, address, created_at", { count: "exact" })
    .eq("slug", client.slug)
    .order(col, { ascending })
    .range(offset, offset + pageSize - 1);

  if (search) {
    query = query.or(`email.ilike.%${search}%,name.ilike.%${search}%,address.ilike.%${search}%`);
  }

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const emails = (data ?? []).map(r => r.email).filter(Boolean);

  const { data: statuses } = emails.length > 0
    ? await supabase
        .from("cashoffer_lead_status")
        .select("email, status, name, phone")
        .eq("client_id", client.id)
        .in("email", emails)
    : { data: [] };

  const statusMap = new Map((statuses ?? []).map(s => [s.email, s]));

  let leads = (data ?? []).map(lead => {
    const s = lead.email ? statusMap.get(lead.email) : undefined;
    return {
      ...lead,
      name: s?.name ?? lead.name,
      phone: s?.phone ?? lead.phone,
      status: s?.status ?? "active",
    };
  });

  if (statusFilter) {
    leads = leads.filter(l => l.status === statusFilter);
  }

  return NextResponse.json({ leads, total: count ?? 0, page, pageSize });
}
```

- [ ] **Step 2: Create lead-status route**

```typescript
// app/api/v2client/lead-status/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getV2ClientFromRequest } from "../../../../lib/v2client";
import { supabase } from "../../../../lib/resend";

export async function POST(req: NextRequest) {
  const client = await getV2ClientFromRequest(req);
  if (!client) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { email, status, name, phone } = await req.json() as {
    email?: string;
    status?: string;
    name?: string;
    phone?: string;
  };

  if (!email || !status) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const validStatuses = ["active", "met", "no_show", "client", "unsubscribed"];
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const { error } = await supabase
    .from("cashoffer_lead_status")
    .upsert(
      { client_id: client.id, email, status, name: name ?? null, phone: phone ?? null },
      { onConflict: "client_id,email" }
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
```

- [ ] **Step 3: Build check**

```bash
npm run build 2>&1 | grep -E "error|Error" | grep -v "node_modules"
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/api/v2client/leads/ app/api/v2client/lead-status/
git commit -m "feat: add v2client leads API routes"
```

---

### Task 6: Client Portal Pages

**Files:**
- Create: `app/cashoffer/[slug]/layout.tsx`
- Create: `app/cashoffer/[slug]/login/page.tsx`
- Create: `app/cashoffer/[slug]/setup/page.tsx`
- Create: `app/cashoffer/[slug]/leads/page.tsx`
- Create: `app/cashoffer/[slug]/change-password/page.tsx`
- Create: `app/cashoffer/[slug]/forgot-password/page.tsx`
- Create: `app/cashoffer/[slug]/reset-password/page.tsx`

- [ ] **Step 1: Create layout**

```typescript
// app/cashoffer/[slug]/layout.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import Link from "next/link";

const S = {
  nav: "#0d1e36", border: "#1e3354", text: "#F7F8FC",
  muted: "#9BACC0", faint: "#4A5E7A", pink: "#16A34A",
};

const DASHBOARD_PATHS = ["/leads", "/change-password"];

export default function V2ClientLayout({ children }: { children: React.ReactNode }) {
  const { slug } = useParams() as { slug: string };
  const pathname = usePathname();
  const router = useRouter();
  const [name, setName] = useState("");

  const requiresAuth = DASHBOARD_PATHS.some(p => pathname.endsWith(p));

  useEffect(() => {
    if (!requiresAuth) return;
    fetch("/api/v2client/me")
      .then(r => {
        if (!r.ok) { router.push(`/cashoffer/${slug}/login`); return null; }
        return r.json();
      })
      .then(data => { if (data?.name) setName(data.name); });
  }, [slug, requiresAuth, router]);

  if (!requiresAuth) return <>{children}</>;

  const NAV = [
    { href: `/cashoffer/${slug}/leads`, label: "Leads" },
  ];

  async function handleLogout() {
    await fetch("/api/v2client/logout", { method: "POST" });
    router.push(`/cashoffer/${slug}/login`);
  }

  return (
    <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", background: "#F0F2F8", minHeight: "100vh" }}>
      <nav style={{
        background: S.nav, borderBottom: `1px solid ${S.border}`,
        height: 52, display: "flex", alignItems: "center",
        padding: "0 24px", position: "sticky", top: 0, zIndex: 50,
        justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
          <span style={{ color: S.pink, fontWeight: 800, fontSize: 15, letterSpacing: "-0.02em" }}>
            {name ? `${name}'s Dashboard` : "Cash Offers Dashboard"}
          </span>
          <div style={{ display: "flex", gap: 4 }}>
            {NAV.map(({ href, label }) => {
              const active = pathname === href;
              return (
                <Link key={href} href={href} style={{
                  color: active ? S.text : S.muted,
                  fontWeight: active ? 700 : 400,
                  fontSize: 14, padding: "6px 14px", borderRadius: 6,
                  textDecoration: "none", background: active ? "#1a2d4a" : "transparent",
                  borderBottom: active ? `2px solid ${S.pink}` : "2px solid transparent",
                }}>
                  {label}
                </Link>
              );
            })}
          </div>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <Link href={`/cashoffer/${slug}/change-password`} style={{ color: S.muted, fontSize: 13, textDecoration: "none" }}>
            Settings
          </Link>
          <button onClick={handleLogout} style={{
            background: "none", border: `1px solid ${S.border}`, color: S.muted,
            borderRadius: 6, padding: "5px 12px", fontSize: 13, cursor: "pointer",
          }}>
            Sign out
          </button>
        </div>
      </nav>
      <div>{children}</div>
    </div>
  );
}
```

- [ ] **Step 2: Create login page**

```typescript
// app/cashoffer/[slug]/login/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

export default function V2ClientLoginPage() {
  const { slug } = useParams() as { slug: string };
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/v2client/me").then(r => {
      if (r.ok) r.json().then(d => { if (d.slug === slug) router.push(`/cashoffer/${slug}/leads`); });
    });
  }, [slug, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/v2client/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, password }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error ?? "Login failed"); return; }
    router.push(`/cashoffer/${slug}/leads`);
  }

  return (
    <div style={{
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      background: "#0F1E3A", color: "#F7F8FC",
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      padding: 24,
    }}>
      <div style={{ width: "100%", maxWidth: 380, padding: "0 24px" }}>
        <h1 style={{ color: "#16A34A", marginBottom: 8, fontSize: 22, textAlign: "center", fontWeight: 800 }}>
          Cash Offers
        </h1>
        <p style={{ color: "#4A5E7A", fontSize: 12, textAlign: "center", marginBottom: 36 }}>
          {slug.charAt(0).toUpperCase() + slug.slice(1)} Dashboard
        </p>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            style={{
              background: "#1a2d4a", border: "1px solid #1a2d4a",
              color: "#F7F8FC", padding: "12px 16px",
              borderRadius: 6, fontSize: 13, outline: "none",
            }}
          />
          {error && <p style={{ color: "#f87171", fontSize: 12, margin: 0 }}>{error}</p>}
          <button
            type="submit"
            disabled={loading}
            style={{
              background: "#16A34A", color: "#fff", border: "none",
              padding: "12px", borderRadius: 6, fontSize: 13, fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
        <div style={{ marginTop: 20, textAlign: "center" }}>
          <Link href={`/cashoffer/${slug}/forgot-password`} style={{ color: "#4A5E7A", fontSize: 13, textDecoration: "none" }}>
            Forgot password?
          </Link>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create setup page**

```typescript
// app/cashoffer/[slug]/setup/page.tsx
"use client";

import { useState, useEffect, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";

function SetupWizard() {
  const { slug } = useParams() as { slug: string };
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") ?? "";

  const [step, setStep] = useState(1);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [calendlyUrl, setCalendlyUrl] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) { setTokenValid(false); return; }
    fetch(`/api/v2client/setup?slug=${slug}&token=${token}`)
      .then(r => setTokenValid(r.ok))
      .catch(() => setTokenValid(false));
  }, [slug, token]);

  async function handleFinish() {
    setSubmitting(true);
    setError("");
    const res = await fetch("/api/v2client/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug, inviteToken: token, password,
        calendlyUrl: calendlyUrl || undefined,
      }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) { setError(data.error ?? "Setup failed"); return; }
    router.push(`/cashoffer/${slug}/leads`);
  }

  const S = {
    bg: "#0F1E3A", card: "#0d1e36", border: "#1e3354",
    text: "#F7F8FC", muted: "#9BACC0", green: "#16A34A",
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", boxSizing: "border-box",
    background: S.bg, border: `1px solid ${S.border}`, borderRadius: 8,
    color: S.text, padding: "12px 14px", fontSize: 14, outline: "none",
  };

  const btnStyle: React.CSSProperties = {
    width: "100%", background: S.green, color: "#fff",
    border: "none", borderRadius: 8, padding: "12px",
    fontWeight: 700, fontSize: 14, cursor: "pointer", marginTop: 8,
  };

  if (tokenValid === null) {
    return (
      <div style={{ minHeight: "100vh", background: S.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: S.muted }}>Verifying invite link...</p>
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div style={{ minHeight: "100vh", background: S.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 16, padding: 40, maxWidth: 400 }}>
          <p style={{ color: "#f87171", fontWeight: 700 }}>This invite link is invalid or has already been used.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: S.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 16, padding: 40, width: "100%", maxWidth: 440 }}>
        <p style={{ color: S.muted, fontSize: 12, marginBottom: 4 }}>Step {step} of 2</p>
        <h1 style={{ color: S.green, fontSize: 20, fontWeight: 800, marginBottom: 24 }}>
          {step === 1 ? "Set your password" : "Add your Calendly link"}
        </h1>

        {step === 1 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <input type="password" placeholder="Password (min 8 characters)" value={password}
              onChange={e => setPassword(e.target.value)} style={inputStyle} />
            <input type="password" placeholder="Confirm password" value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)} style={inputStyle} />
            {error && <p style={{ color: "#f87171", fontSize: 13 }}>{error}</p>}
            <button
              onClick={() => {
                if (password.length < 8) { setError("Password must be at least 8 characters"); return; }
                if (password !== confirmPassword) { setError("Passwords do not match"); return; }
                setError("");
                setStep(2);
              }}
              style={btnStyle}
            >
              Continue
            </button>
          </div>
        )}

        {step === 2 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <input type="url" placeholder="https://calendly.com/your-link (optional)"
              value={calendlyUrl} onChange={e => setCalendlyUrl(e.target.value)} style={inputStyle} />
            {error && <p style={{ color: "#f87171", fontSize: 13 }}>{error}</p>}
            <button onClick={handleFinish} disabled={submitting} style={{ ...btnStyle, opacity: submitting ? 0.7 : 1 }}>
              {submitting ? "Setting up..." : "Finish Setup"}
            </button>
            <button onClick={handleFinish} disabled={submitting}
              style={{ ...btnStyle, background: "transparent", border: `1px solid ${S.border}`, color: S.muted, marginTop: 0 }}>
              Skip for now
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SetupPage() {
  return <Suspense><SetupWizard /></Suspense>;
}
```

- [ ] **Step 4: Create leads page**

```typescript
// app/cashoffer/[slug]/leads/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface Lead {
  id: string;
  email: string | null;
  name: string | null;
  phone: string | null;
  address: string;
  created_at: string;
  status: string;
}

const S = { text: "#0F1E3A", muted: "#8A9AB5", border: "#E2E8F2", card: "#ffffff", green: "#16A34A", bg: "#F0F2F8" };

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  active:       { bg: "#eff6ff", color: "#2563eb", label: "Active" },
  met:          { bg: "#f0fdf4", color: "#16a34a", label: "Met" },
  no_show:      { bg: "#fef2f2", color: "#dc2626", label: "No Show" },
  client:       { bg: "#fff0f4", color: "#E8185C", label: "Client" },
  unsubscribed: { bg: "#f8fafc", color: "#8A9AB5", label: "Unsub" },
};

const STATUS_FILTERS = [
  { value: "", label: "All" },
  { value: "active", label: "Active" },
  { value: "met", label: "Met" },
  { value: "no_show", label: "No Show" },
  { value: "client", label: "Client" },
  { value: "unsubscribed", label: "Unsubscribed" },
];

export default function V2ClientLeadsPage() {
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [sortCol, setSortCol] = useState<"name" | "email" | "address" | "status" | "created_at">("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  function toggleSort(col: typeof sortCol) {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
    setPage(1);
  }

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), search, status: statusFilter, sort_col: sortCol, sort_dir: sortDir });
    const res = await fetch(`/api/v2client/leads?${params}`);
    if (!res.ok) { setLoading(false); return; }
    const data = await res.json();
    setLeads(data.leads);
    setTotal(data.total);
    setLoading(false);
  }, [page, search, statusFilter, sortCol, sortDir]);

  useEffect(() => { load(); }, [load]);

  const pageSize = 50;
  const totalPages = Math.ceil(total / pageSize);

  const COLS: { label: string; col: typeof sortCol }[] = [
    { label: "Name",    col: "name" },
    { label: "Address", col: "address" },
    { label: "Email",   col: "email" },
    { label: "Status",  col: "status" },
    { label: "Date",    col: "created_at" },
  ];

  return (
    <div style={{ padding: "32px 24px", maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ color: S.text, fontSize: 22, fontWeight: 800 }}>Leads</h1>
        <span style={{ color: S.muted, fontSize: 14 }}>{total} total</span>
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        {STATUS_FILTERS.map(f => (
          <button key={f.value} onClick={() => { setStatusFilter(f.value); setPage(1); }}
            style={{
              background: statusFilter === f.value ? S.text : S.card,
              color: statusFilter === f.value ? "#fff" : S.muted,
              border: `1px solid ${statusFilter === f.value ? S.text : S.border}`,
              borderRadius: 20, padding: "5px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer",
            }}>
            {f.label}
          </button>
        ))}
      </div>

      <input
        placeholder="Search by name, email, or address..."
        value={search}
        onChange={e => { setSearch(e.target.value); setPage(1); }}
        style={{
          width: "100%", boxSizing: "border-box", marginBottom: 16,
          background: S.card, border: `1px solid ${S.border}`, borderRadius: 10,
          color: S.text, padding: "10px 14px", fontSize: 14, outline: "none",
        }}
      />

      {loading ? (
        <p style={{ color: S.muted }}>Loading...</p>
      ) : leads.length === 0 ? (
        <p style={{ color: S.muted }}>No leads yet.</p>
      ) : (
        <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 12, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${S.border}` }}>
                {COLS.map(({ label, col }) => (
                  <th key={col} onClick={() => toggleSort(col)}
                    style={{ color: sortCol === col ? S.text : S.muted, fontWeight: 600, padding: "12px 16px", textAlign: "left", cursor: "pointer", userSelect: "none", whiteSpace: "nowrap" }}>
                    {label}
                    <span style={{ marginLeft: 4, opacity: sortCol === col ? 1 : 0.3, fontSize: 11 }}>
                      {sortCol === col ? (sortDir === "asc" ? "↑" : "↓") : "↕"}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {leads.map((lead, i) => {
                const st = STATUS_STYLES[lead.status] ?? STATUS_STYLES.active;
                return (
                  <tr key={lead.id}
                    style={{ borderBottom: i < leads.length - 1 ? `1px solid ${S.border}` : "none", cursor: "default" }}
                    onMouseEnter={e => (e.currentTarget.style.background = S.bg)}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    <td style={{ color: S.text, padding: "12px 16px", fontWeight: 600 }}>{lead.name ?? "—"}</td>
                    <td style={{ color: S.muted, padding: "12px 16px" }}>{lead.address}</td>
                    <td style={{ color: S.muted, padding: "12px 16px" }}>{lead.email ?? "—"}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ background: st.bg, color: st.color, borderRadius: 6, padding: "3px 8px", fontSize: 11, fontWeight: 700 }}>
                        {st.label}
                      </span>
                    </td>
                    <td style={{ color: S.muted, padding: "12px 16px" }}>
                      {new Date(lead.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div style={{ display: "flex", gap: 8, marginTop: 20, justifyContent: "center" }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            style={{ background: S.card, border: `1px solid ${S.border}`, color: S.muted, borderRadius: 6, padding: "6px 14px", cursor: "pointer" }}>
            Previous
          </button>
          <span style={{ color: S.muted, fontSize: 14, lineHeight: "32px" }}>Page {page} of {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            style={{ background: S.card, border: `1px solid ${S.border}`, color: S.muted, borderRadius: 6, padding: "6px 14px", cursor: "pointer" }}>
            Next
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Create change-password page**

```typescript
// app/cashoffer/[slug]/change-password/page.tsx
"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";

export default function V2ChangePasswordPage() {
  const { slug } = useParams() as { slug: string };
  const router = useRouter();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const S = {
    bg: "#F0F2F8", card: "#ffffff", border: "#E2E8F2",
    text: "#0F1E3A", muted: "#8A9AB5", green: "#16A34A",
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", boxSizing: "border-box",
    background: S.bg, border: `1px solid ${S.border}`, borderRadius: 8,
    color: S.text, padding: "12px 14px", fontSize: 14, outline: "none",
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (next !== confirm) { setError("Passwords do not match"); return; }
    setLoading(true);
    setError("");
    const res = await fetch("/api/v2client/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: current, newPassword: next }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error ?? "Failed"); return; }
    setSuccess(true);
    setTimeout(() => router.push(`/cashoffer/${slug}/leads`), 1500);
  }

  return (
    <div style={{ padding: "48px 24px", maxWidth: 480, margin: "0 auto" }}>
      <h1 style={{ color: S.text, fontSize: 22, fontWeight: 800, marginBottom: 24 }}>Change Password</h1>
      {success ? (
        <p style={{ color: S.green, fontWeight: 700 }}>Password updated. Redirecting...</p>
      ) : (
        <form onSubmit={handleSubmit} style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 12, padding: 24, display: "flex", flexDirection: "column", gap: 12 }}>
          <input type="password" placeholder="Current password" value={current} onChange={e => setCurrent(e.target.value)} required style={inputStyle} />
          <input type="password" placeholder="New password (min 8 characters)" value={next} onChange={e => setNext(e.target.value)} required style={inputStyle} />
          <input type="password" placeholder="Confirm new password" value={confirm} onChange={e => setConfirm(e.target.value)} required style={inputStyle} />
          {error && <p style={{ color: "#f87171", fontSize: 13, margin: 0 }}>{error}</p>}
          <button type="submit" disabled={loading}
            style={{ background: S.green, color: "#fff", border: "none", borderRadius: 8, padding: "12px", fontWeight: 700, fontSize: 14, cursor: "pointer", opacity: loading ? 0.7 : 1 }}>
            {loading ? "Saving..." : "Update Password"}
          </button>
        </form>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Create forgot-password page**

```typescript
// app/cashoffer/[slug]/forgot-password/page.tsx
"use client";

import { useParams } from "next/navigation";
import Link from "next/link";

export default function V2ForgotPasswordPage() {
  const { slug } = useParams() as { slug: string };

  return (
    <div style={{
      minHeight: "100vh", background: "#0F1E3A",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
    }}>
      <div style={{
        background: "#0d1e36", border: "1px solid #1e3354",
        borderRadius: 16, padding: 40, width: "100%", maxWidth: 400,
      }}>
        <span style={{ color: "#16A34A", fontWeight: 800, fontSize: 18 }}>Cash Offers</span>
        <h1 style={{ color: "#F7F8FC", fontSize: 20, fontWeight: 700, marginTop: 8 }}>Forgot Password</h1>
        <p style={{ color: "#9BACC0", fontSize: 14, marginTop: 16 }}>
          Contact your account manager to reset your password.
        </p>
        <div style={{ marginTop: 24 }}>
          <Link href={`/cashoffer/${slug}/login`} style={{ color: "#9BACC0", fontSize: 13, textDecoration: "none" }}>
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Create reset-password page**

```typescript
// app/cashoffer/[slug]/reset-password/page.tsx
"use client";

import { useParams } from "next/navigation";
import Link from "next/link";

export default function V2ResetPasswordPage() {
  const { slug } = useParams() as { slug: string };

  return (
    <div style={{
      minHeight: "100vh", background: "#0F1E3A",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
    }}>
      <div style={{
        background: "#0d1e36", border: "1px solid #1e3354",
        borderRadius: 16, padding: 40, width: "100%", maxWidth: 400,
      }}>
        <p style={{ color: "#f87171", fontWeight: 700 }}>This reset link is not yet active. Contact your account manager.</p>
        <div style={{ marginTop: 24 }}>
          <Link href={`/cashoffer/${slug}/login`} style={{ color: "#9BACC0", fontSize: 13, textDecoration: "none" }}>
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 8: Build check**

```bash
npm run build 2>&1 | grep -E "error|Error" | grep -v "node_modules"
```

Expected: no errors. Build shows routes for `/cashoffer/[slug]/login`, `/cashoffer/[slug]/leads`, etc.

- [ ] **Step 9: Commit**

```bash
git add app/cashoffer/\[slug\]/
git commit -m "feat: add v2client portal pages (layout, login, setup, leads, change-password)"
```

---

### Task 7: Admin API Routes

**Files:**
- Create: `app/api/admin/v2clients/route.ts`
- Create: `app/api/admin/v2clients/[id]/route.ts`
- Create: `app/api/admin/v2-leads/route.ts`

- [ ] **Step 1: Create v2clients GET/POST route**

```typescript
// app/api/admin/v2clients/route.ts
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { supabase } from "../../../../lib/resend";

function adminAuth(req: NextRequest) {
  const cookieAuth = req.cookies.get("admin_auth")?.value === (process.env.ADMIN_TOKEN ?? "geo-admin-authenticated");
  const keyAuth = req.headers.get("x-admin-key") === process.env.ADMIN_TOKEN;
  return cookieAuth || keyAuth;
}

export async function GET(req: NextRequest) {
  if (!adminAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: clients, error } = await supabase
    .from("v2_clients")
    .select("id, name, slug, calendly_url, meta_pixel_id, domain, invite_used, active, created_at")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const slugs = (clients ?? []).map(c => c.slug);
  const { data: leadCounts } = await supabase
    .from("cashoffer_leads")
    .select("slug")
    .in("slug", slugs.length > 0 ? slugs : ["__none__"]);

  const countMap: Record<string, number> = {};
  for (const row of leadCounts ?? []) {
    countMap[row.slug] = (countMap[row.slug] ?? 0) + 1;
  }

  const result = (clients ?? []).map(c => ({
    ...c,
    leadCount: countMap[c.slug] ?? 0,
  }));

  return NextResponse.json({ clients: result });
}

export async function POST(req: NextRequest) {
  if (!adminAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, slug } = await req.json() as { name?: string; slug?: string };

  if (!name || !slug) {
    return NextResponse.json({ error: "name and slug are required" }, { status: 400 });
  }

  if (!/^[a-z0-9-]+$/.test(slug)) {
    return NextResponse.json({ error: "Slug must be lowercase letters, numbers, and hyphens only" }, { status: 400 });
  }

  const inviteToken = crypto.randomBytes(32).toString("hex");

  const { data, error } = await supabase
    .from("v2_clients")
    .insert({ name, slug, invite_token: inviteToken })
    .select("id, slug")
    .single();

  if (error) {
    if (error.message.includes("unique")) {
      return NextResponse.json({ error: "Slug already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const host = process.env.NEXT_PUBLIC_V2_HOST ?? "v2.heypearl.io";
  const inviteLink = `https://${host}/cashoffer/${data.slug}/setup?token=${inviteToken}`;

  return NextResponse.json({ id: data.id, slug: data.slug, inviteLink });
}
```

- [ ] **Step 2: Create v2clients/[id] PATCH route**

```typescript
// app/api/admin/v2clients/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { supabase } from "../../../../../lib/resend";

function adminAuth(req: NextRequest) {
  const cookieAuth = req.cookies.get("admin_auth")?.value === (process.env.ADMIN_TOKEN ?? "geo-admin-authenticated");
  const keyAuth = req.headers.get("x-admin-key") === process.env.ADMIN_TOKEN;
  return cookieAuth || keyAuth;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!adminAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const body = await req.json() as {
    active?: boolean;
    calendlyUrl?: string;
    metaPixelId?: string;
    domain?: string;
    newPassword?: string;
    regenerateInvite?: boolean;
  };

  const updates: Record<string, unknown> = {};
  let newInviteLink: string | undefined;

  if (body.active !== undefined) updates.active = body.active;
  if (body.calendlyUrl !== undefined) updates.calendly_url = body.calendlyUrl;
  if (body.metaPixelId !== undefined) updates.meta_pixel_id = body.metaPixelId;
  if (body.domain !== undefined) updates.domain = body.domain;

  if (body.newPassword !== undefined) {
    if (body.newPassword.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }
    updates.password_hash = await bcrypt.hash(body.newPassword, 10);
  }

  if (body.regenerateInvite) {
    const newToken = crypto.randomBytes(32).toString("hex");
    updates.invite_token = newToken;
    updates.invite_used = false;

    const { data: client } = await supabase
      .from("v2_clients")
      .select("slug")
      .eq("id", id)
      .maybeSingle();

    if (client) {
      const host = process.env.NEXT_PUBLIC_V2_HOST ?? "v2.heypearl.io";
      newInviteLink = `https://${host}/cashoffer/${client.slug}/setup?token=${newToken}`;
    }
  }

  if (Object.keys(updates).length === 0 && !body.regenerateInvite) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const { error } = await supabase
    .from("v2_clients")
    .update(updates)
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, inviteLink: newInviteLink });
}
```

- [ ] **Step 3: Create v2-leads admin route**

```typescript
// app/api/admin/v2-leads/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../../lib/resend";

function adminAuth(req: NextRequest) {
  const cookieAuth = req.cookies.get("admin_auth")?.value === (process.env.ADMIN_TOKEN ?? "geo-admin-authenticated");
  const keyAuth = req.headers.get("x-admin-key") === process.env.ADMIN_TOKEN;
  return cookieAuth || keyAuth;
}

export async function GET(req: NextRequest) {
  if (!adminAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const search = req.nextUrl.searchParams.get("search") ?? "";
  const page = parseInt(req.nextUrl.searchParams.get("page") ?? "1", 10);
  const pageSize = 50;
  const offset = (page - 1) * pageSize;

  let query = supabase
    .from("cashoffer_leads")
    .select("id, name, address, email, phone, slug, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (search) {
    query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,address.ilike.%${search}%`);
  }

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ leads: data ?? [], total: count ?? 0, page, pageSize });
}
```

- [ ] **Step 4: Build check**

```bash
npm run build 2>&1 | grep -E "error|Error" | grep -v "node_modules"
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add app/api/admin/v2clients/ app/api/admin/v2-leads/
git commit -m "feat: add admin API routes for v2 clients and leads"
```

---

### Task 8: Admin Pages + Nav

**Files:**
- Create: `app/admin/v2/page.tsx`
- Create: `app/admin/v2-leads/page.tsx`
- Modify: `app/admin/layout.tsx`

- [ ] **Step 1: Create /admin/v2 page**

```typescript
// app/admin/v2/page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

const S = {
  bg: "#F0F2F8", card: "#ffffff", border: "#E2E8F2",
  text: "#0F1E3A", muted: "#8A9AB5", faint: "#4A5E7A",
  green: "#16a34a",
};

interface V2Client {
  id: string;
  name: string;
  slug: string;
  calendly_url: string | null;
  meta_pixel_id: string | null;
  domain: string | null;
  invite_used: boolean;
  active: boolean;
  leadCount: number;
}

const inputStyle: React.CSSProperties = {
  background: "#ffffff", border: "1px solid #E2E8F2", borderRadius: 8,
  color: "#0F1E3A", padding: "10px 14px", fontSize: 14, outline: "none", flex: 1, minWidth: 180,
};

const smallBtnStyle: React.CSSProperties = {
  background: "#F0F2F8", color: "#8A9AB5", border: "1px solid #E2E8F2",
  borderRadius: 6, padding: "5px 10px", fontSize: 12, fontWeight: 600, cursor: "pointer",
};

export default function AdminV2Page() {
  const router = useRouter();
  const [clients, setClients] = useState<V2Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", slug: "" });
  const [creating, setCreating] = useState(false);
  const [inviteResult, setInviteResult] = useState<{ name: string; link: string; slug: string } | null>(null);
  const [calendlyEdit, setCalendlyEdit] = useState<{ id: string; value: string } | null>(null);
  const [pixelEdit, setPixelEdit] = useState<{ id: string; value: string } | null>(null);
  const [domainEdit, setDomainEdit] = useState<{ id: string; value: string } | null>(null);
  const [pwEdit, setPwEdit] = useState<{ id: string; value: string } | null>(null);
  const [pwSaving, setPwSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/v2clients");
    if (res.status === 401) { router.push("/admin/login"); return; }
    const data = await res.json();
    setClients(data.clients ?? []);
    setLoading(false);
  }, [router]);

  useEffect(() => { load(); }, [load]);

  function autoSlug(name: string) {
    return name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  }

  async function createClient() {
    setCreating(true);
    setError("");
    const res = await fetch("/api/admin/v2clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: form.name, slug: form.slug }),
    });
    const data = await res.json();
    setCreating(false);
    if (!res.ok) { setError(data.error ?? "Failed to create"); return; }
    setInviteResult({ name: form.name, link: data.inviteLink, slug: form.slug });
    setForm({ name: "", slug: "" });
    load();
  }

  async function toggleActive(id: string, current: boolean) {
    await fetch(`/api/admin/v2clients/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !current }),
    });
    load();
  }

  async function saveCalendly(id: string, value: string) {
    await fetch(`/api/admin/v2clients/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ calendlyUrl: value }),
    });
    setCalendlyEdit(null);
    load();
  }

  async function savePixel(id: string, value: string) {
    await fetch(`/api/admin/v2clients/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ metaPixelId: value }),
    });
    setPixelEdit(null);
    load();
  }

  async function saveDomain(id: string, value: string) {
    await fetch(`/api/admin/v2clients/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domain: value }),
    });
    setDomainEdit(null);
    load();
  }

  async function savePassword(id: string, password: string) {
    if (password.length < 6) return;
    setPwSaving(true);
    await fetch(`/api/admin/v2clients/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newPassword: password }),
    });
    setPwSaving(false);
    setPwEdit(null);
  }

  async function regenerateInvite(id: string, name: string) {
    const res = await fetch(`/api/admin/v2clients/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ regenerateInvite: true }),
    });
    const data = await res.json();
    if (data.inviteLink) {
      const c = clients.find(c => c.id === id);
      setInviteResult({ name, link: data.inviteLink, slug: c?.slug ?? "" });
    }
  }

  const host = "v2.heypearl.io";

  return (
    <div style={{ background: S.bg, minHeight: "100vh", fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
    <div style={{ padding: "32px 24px", maxWidth: 1200, margin: "0 auto" }}>
      <h1 style={{ color: S.text, fontSize: 24, fontWeight: 800, marginBottom: 32 }}>V2 Clients</h1>

      {/* Create form */}
      <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 12, padding: 24, marginBottom: 32 }}>
        <h2 style={{ color: S.text, fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Add New V2 Client</h2>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <input
            placeholder="Company name (e.g. Acme Offers)"
            value={form.name}
            onChange={e => {
              const name = e.target.value;
              setForm(f => ({ ...f, name, slug: autoSlug(name) }));
            }}
            style={inputStyle}
          />
          <input
            placeholder="Slug (e.g. acme)"
            value={form.slug}
            onChange={e => setForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") }))}
            style={{ ...inputStyle, width: 160 }}
          />
          <button
            onClick={createClient}
            disabled={creating || !form.name || !form.slug}
            style={{
              background: S.green, color: "#fff", border: "none",
              borderRadius: 8, padding: "10px 20px", fontWeight: 700,
              fontSize: 14, cursor: "pointer", opacity: creating ? 0.7 : 1,
            }}
          >
            {creating ? "Creating..." : "Create Client"}
          </button>
        </div>
        {error && <p style={{ color: "#f87171", marginTop: 8, fontSize: 13 }}>{error}</p>}
      </div>

      {/* Invite result */}
      {inviteResult && (
        <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 12, padding: 20, marginBottom: 32 }}>
          <p style={{ color: S.green, fontWeight: 700, marginBottom: 8 }}>
            Client created. Send this setup link to {inviteResult.name}:
          </p>
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12 }}>
            <code style={{ color: "#15803d", fontSize: 13, wordBreak: "break-all", flex: 1 }}>{inviteResult.link}</code>
            <button onClick={() => navigator.clipboard.writeText(inviteResult.link)}
              style={{ background: "#dcfce7", color: S.green, border: "1px solid #bbf7d0", borderRadius: 6, padding: "6px 14px", fontWeight: 600, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap" }}>
              Copy
            </button>
          </div>
          <p style={{ color: S.muted, fontSize: 12 }}>Funnel URL: <a href={`https://${host}/cashoffer/${inviteResult.slug}`} target="_blank" rel="noreferrer" style={{ color: S.green }}>{host}/cashoffer/{inviteResult.slug}</a></p>
          <button onClick={() => setInviteResult(null)} style={{ marginTop: 8, background: "none", border: "none", color: S.faint, cursor: "pointer", fontSize: 12 }}>Dismiss</button>
        </div>
      )}

      {/* Clients table */}
      {loading ? (
        <p style={{ color: S.muted }}>Loading...</p>
      ) : clients.length === 0 ? (
        <p style={{ color: S.muted }}>No V2 clients yet. Create one above.</p>
      ) : (
        <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 12, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${S.border}` }}>
                {["Name / Funnel URL", "Status", "Leads", "Calendly", "Meta Pixel", "Domain", "Actions"].map(h => (
                  <th key={h} style={{ color: S.muted, fontWeight: 600, padding: "12px 16px", textAlign: "left" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {clients.map((c, i) => (
                <tr key={c.id} style={{ borderBottom: i < clients.length - 1 ? `1px solid ${S.border}` : "none" }}>
                  <td style={{ padding: "14px 16px" }}>
                    <div style={{ fontWeight: 700, color: S.text, marginBottom: 4 }}>{c.name}</div>
                    <code style={{ color: S.muted, fontSize: 11 }}>{c.slug}</code>
                    <div>
                      <a href={`https://${host}/cashoffer/${c.slug}`} target="_blank" rel="noreferrer"
                        style={{ color: S.green, fontSize: 11 }}>{host}/cashoffer/{c.slug}</a>
                    </div>
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    <span style={{
                      background: c.invite_used ? "#f0fdf4" : "#eff6ff",
                      color: c.invite_used ? S.green : "#2563eb",
                      borderRadius: 6, padding: "3px 8px", fontSize: 12, fontWeight: 600,
                    }}>
                      {c.invite_used ? "Active" : "Pending Setup"}
                    </span>
                  </td>
                  <td style={{ color: S.text, padding: "14px 16px", fontWeight: 700 }}>{c.leadCount}</td>
                  <td style={{ padding: "14px 16px" }}>
                    {calendlyEdit?.id === c.id ? (
                      <div style={{ display: "flex", gap: 6 }}>
                        <input value={calendlyEdit.value} onChange={e => setCalendlyEdit(p => p ? { ...p, value: e.target.value } : p)}
                          style={{ ...inputStyle, width: 200, fontSize: 12, padding: "4px 8px" }} placeholder="https://calendly.com/..." />
                        <button onClick={() => saveCalendly(c.id, calendlyEdit.value)} style={smallBtnStyle}>Save</button>
                        <button onClick={() => setCalendlyEdit(null)} style={{ ...smallBtnStyle, background: S.bg }}>&times;</button>
                      </div>
                    ) : (
                      <button onClick={() => setCalendlyEdit({ id: c.id, value: c.calendly_url ?? "" })}
                        style={{ ...smallBtnStyle, background: "transparent", border: `1px solid ${S.border}`, color: c.calendly_url ? S.text : S.muted, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                        title={c.calendly_url ?? ""}>
                        {c.calendly_url ? c.calendly_url.replace("https://calendly.com/", "") : "Add Calendly"}
                      </button>
                    )}
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    {pixelEdit?.id === c.id ? (
                      <div style={{ display: "flex", gap: 6 }}>
                        <input value={pixelEdit.value} onChange={e => setPixelEdit(p => p ? { ...p, value: e.target.value } : p)}
                          style={{ ...inputStyle, width: 160, fontSize: 12, padding: "4px 8px" }} placeholder="Pixel ID" />
                        <button onClick={() => savePixel(c.id, pixelEdit.value)} style={smallBtnStyle}>Save</button>
                        <button onClick={() => setPixelEdit(null)} style={{ ...smallBtnStyle, background: S.bg }}>&times;</button>
                      </div>
                    ) : (
                      <button onClick={() => setPixelEdit({ id: c.id, value: c.meta_pixel_id ?? "" })}
                        style={{ ...smallBtnStyle, background: "transparent", border: `1px solid ${S.border}`, color: S.muted }}>
                        {c.meta_pixel_id ?? "Add Pixel"}
                      </button>
                    )}
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    {domainEdit?.id === c.id ? (
                      <div style={{ display: "flex", gap: 6 }}>
                        <input value={domainEdit.value} onChange={e => setDomainEdit(p => p ? { ...p, value: e.target.value } : p)}
                          style={{ ...inputStyle, width: 180, fontSize: 12, padding: "4px 8px" }} placeholder="offers.theirdomain.com" />
                        <button onClick={() => saveDomain(c.id, domainEdit.value)} style={smallBtnStyle}>Save</button>
                        <button onClick={() => setDomainEdit(null)} style={{ ...smallBtnStyle, background: S.bg }}>&times;</button>
                      </div>
                    ) : (
                      <button onClick={() => setDomainEdit({ id: c.id, value: c.domain ?? "" })}
                        style={{ ...smallBtnStyle, background: "transparent", border: `1px solid ${S.border}`, color: c.domain ? S.text : S.muted }}>
                        {c.domain ?? "Add Domain"}
                      </button>
                    )}
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                      <button onClick={() => toggleActive(c.id, c.active)}
                        style={{ ...smallBtnStyle, background: c.active ? "#fef2f2" : "#f0fdf4", color: c.active ? "#dc2626" : S.green, border: `1px solid ${c.active ? "#fecaca" : "#bbf7d0"}` }}>
                        {c.active ? "Deactivate" : "Activate"}
                      </button>
                      {!c.invite_used && (
                        <button onClick={() => regenerateInvite(c.id, c.name)}
                          style={{ ...smallBtnStyle, background: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe" }}>
                          New Invite
                        </button>
                      )}
                      {pwEdit?.id === c.id ? (
                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          <input type="password" value={pwEdit.value}
                            onChange={e => setPwEdit(p => p ? { ...p, value: e.target.value } : p)}
                            placeholder="New password"
                            style={{ ...inputStyle, width: 140, fontSize: 12, padding: "4px 8px" }} />
                          <button onClick={() => savePassword(c.id, pwEdit.value)} disabled={pwSaving || pwEdit.value.length < 6}
                            style={{ ...smallBtnStyle, background: "#f0fdf4", color: S.green, border: "1px solid #bbf7d0", opacity: pwEdit.value.length < 6 ? 0.5 : 1 }}>
                            {pwSaving ? "..." : "Save"}
                          </button>
                          <button onClick={() => setPwEdit(null)} style={{ ...smallBtnStyle, background: S.bg }}>&times;</button>
                        </div>
                      ) : (
                        <button onClick={() => setPwEdit({ id: c.id, value: "" })}
                          style={{ ...smallBtnStyle, background: "#faf5ff", color: "#7c3aed", border: "1px solid #e9d5ff" }}>
                          Set Password
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
    </div>
  );
}
```

- [ ] **Step 2: Create /admin/v2-leads page**

```typescript
// app/admin/v2-leads/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

const S = {
  bg: "#F0F2F8", card: "#ffffff", border: "#E2E8F2",
  text: "#0F1E3A", muted: "#8A9AB5",
};

interface CashofferLead {
  id: string;
  name: string | null;
  address: string;
  email: string | null;
  phone: string | null;
  slug: string;
  created_at: string;
}

export default function AdminV2LeadsPage() {
  const router = useRouter();
  const [leads, setLeads] = useState<CashofferLead[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), search });
    const res = await fetch(`/api/admin/v2-leads?${params}`);
    if (res.status === 401) { router.push("/admin/login"); return; }
    const data = await res.json();
    setLeads(data.leads ?? []);
    setTotal(data.total ?? 0);
    setLoading(false);
  }, [page, search, router]);

  useEffect(() => { load(); }, [load]);

  const pageSize = 50;
  const totalPages = Math.ceil(total / pageSize);

  return (
    <div style={{ background: S.bg, minHeight: "100vh", fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
    <div style={{ padding: "32px 24px", maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ color: S.text, fontSize: 22, fontWeight: 800, margin: 0 }}>V2 Leads</h1>
        <span style={{ color: S.muted, fontSize: 14 }}>{total} total</span>
      </div>

      <input
        placeholder="Search by name, email, or address..."
        value={search}
        onChange={e => { setSearch(e.target.value); setPage(1); }}
        style={{
          width: "100%", boxSizing: "border-box", marginBottom: 16,
          background: S.card, border: `1px solid ${S.border}`, borderRadius: 10,
          color: S.text, padding: "10px 14px", fontSize: 14, outline: "none",
        }}
      />

      {loading ? (
        <p style={{ color: S.muted }}>Loading...</p>
      ) : leads.length === 0 ? (
        <p style={{ color: S.muted }}>No leads yet.</p>
      ) : (
        <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 12, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${S.border}` }}>
                {["Name", "Address", "Email", "Phone", "Client", "Date"].map(h => (
                  <th key={h} style={{ color: S.muted, fontWeight: 600, padding: "12px 16px", textAlign: "left" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {leads.map((lead, i) => (
                <tr key={lead.id}
                  style={{ borderBottom: i < leads.length - 1 ? `1px solid ${S.border}` : "none" }}
                  onMouseEnter={e => (e.currentTarget.style.background = S.bg)}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  <td style={{ color: S.text, padding: "12px 16px", fontWeight: 600 }}>{lead.name ?? "—"}</td>
                  <td style={{ color: S.muted, padding: "12px 16px" }}>{lead.address}</td>
                  <td style={{ color: S.muted, padding: "12px 16px" }}>{lead.email ?? "—"}</td>
                  <td style={{ color: S.muted, padding: "12px 16px" }}>{lead.phone ?? "—"}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <code style={{ background: "#f0fdf4", color: "#16a34a", borderRadius: 4, padding: "2px 6px", fontSize: 11 }}>{lead.slug}</code>
                  </td>
                  <td style={{ color: S.muted, padding: "12px 16px" }}>
                    {new Date(lead.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div style={{ display: "flex", gap: 8, marginTop: 20, justifyContent: "center" }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            style={{ background: S.card, border: `1px solid ${S.border}`, color: S.muted, borderRadius: 6, padding: "6px 14px", cursor: "pointer" }}>
            Previous
          </button>
          <span style={{ color: S.muted, fontSize: 14, lineHeight: "32px" }}>Page {page} of {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            style={{ background: S.card, border: `1px solid ${S.border}`, color: S.muted, borderRadius: 6, padding: "6px 14px", cursor: "pointer" }}>
            Next
          </button>
        </div>
      )}
    </div>
    </div>
  );
}
```

- [ ] **Step 3: Update admin nav**

In `app/admin/layout.tsx`, change `NAV_LINKS` from:

```typescript
const NAV_LINKS = [
  { href: "/admin/activity",   label: "Activity"   },
  { href: "/admin/leads",      label: "Leads"      },
  { href: "/admin/campaigns",  label: "Campaigns"  },
  { href: "/admin/offers",     label: "Offers"     },
  { href: "/admin/affiliates", label: "Affiliates" },
];
```

to:

```typescript
const NAV_LINKS = [
  { href: "/admin/activity",   label: "Activity"   },
  { href: "/admin/leads",      label: "Leads"      },
  { href: "/admin/campaigns",  label: "Campaigns"  },
  { href: "/admin/offers",     label: "Offers"     },
  { href: "/admin/affiliates", label: "Affiliates" },
  { href: "/admin/v2",         label: "V2 Clients" },
  { href: "/admin/v2-leads",   label: "V2 Leads"   },
];
```

- [ ] **Step 4: Build check**

```bash
npm run build 2>&1 | grep -E "error|Error" | grep -v "node_modules"
```

Expected: no errors. Build shows `○ /admin/v2` and `○ /admin/v2-leads`.

- [ ] **Step 5: Commit**

```bash
git add app/admin/v2/ app/admin/v2-leads/ app/admin/layout.tsx
git commit -m "feat: add admin V2 clients page, V2 leads page, update nav"
```

---

### Task 9: Landing Page DB Merge + Deploy

**Files:**
- Modify: `app/cashoffer/[slug]/page.tsx`
- Modify: `app/cashoffer/[slug]/schedule/page.tsx`

- [ ] **Step 1: Update [slug] landing page to merge DB overrides**

Replace `app/cashoffer/[slug]/page.tsx` with:

```typescript
// app/cashoffer/[slug]/page.tsx
import { notFound } from "next/navigation";
import CashOfferLandingPage from "@/app/templates/cashoffer/CashOfferLandingPage";
import { cashOfferConfigs } from "@/app/templates/cashoffer/configs/index";
import { supabase } from "@/lib/resend";

export default async function CashOfferPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const staticConfig = cashOfferConfigs[slug];
  if (!staticConfig) notFound();

  const { data: client } = await supabase
    .from("v2_clients")
    .select("calendly_url, meta_pixel_id")
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle();

  const config = client
    ? {
        ...staticConfig,
        calendlyUrl: client.calendly_url ?? staticConfig.calendlyUrl,
        metaPixelId: client.meta_pixel_id ?? staticConfig.metaPixelId,
      }
    : staticConfig;

  return <CashOfferLandingPage config={config} />;
}
```

- [ ] **Step 2: Update [slug] schedule page to merge DB overrides**

Replace `app/cashoffer/[slug]/schedule/page.tsx` with:

```typescript
// app/cashoffer/[slug]/schedule/page.tsx
import { notFound } from "next/navigation";
import CashOfferSchedulePage from "@/app/templates/cashoffer/CashOfferSchedulePage";
import { cashOfferConfigs } from "@/app/templates/cashoffer/configs/index";
import { supabase } from "@/lib/resend";

export default async function CashOfferScheduleRoute({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const staticConfig = cashOfferConfigs[slug];
  if (!staticConfig) notFound();

  const { data: client } = await supabase
    .from("v2_clients")
    .select("calendly_url, meta_pixel_id")
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle();

  const config = client
    ? {
        ...staticConfig,
        calendlyUrl: client.calendly_url ?? staticConfig.calendlyUrl,
        metaPixelId: client.meta_pixel_id ?? staticConfig.metaPixelId,
      }
    : staticConfig;

  return <CashOfferSchedulePage config={config} />;
}
```

- [ ] **Step 3: Build check**

```bash
npm run build 2>&1 | grep -E "error|Error" | grep -v "node_modules"
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/cashoffer/\[slug\]/page.tsx app/cashoffer/\[slug\]/schedule/page.tsx
git commit -m "feat: merge v2_clients DB overrides into cashoffer landing + schedule pages"
```

- [ ] **Step 5: Deploy**

```bash
/opt/homebrew/bin/vercel --prod
```

Expected: deployment succeeds, aliased to `v2.heypearl.io`.

- [ ] **Step 6: Smoke test**

- `v2.heypearl.io` → redirects to `v2.heypearl.io/cashoffer` → god demo loads
- `v2.heypearl.io/cashoffer/schedule` → schedule page loads
- `geo.heypearl.io/admin/v2` → V2 Clients admin page loads
- `geo.heypearl.io/admin/v2-leads` → V2 Leads admin page loads
- Create a test client in `/admin/v2` → copy invite link → visit `v2.heypearl.io/cashoffer/[slug]/setup?token=...` → complete setup → lands on leads page
- `v2.heypearl.io/cashoffer/[slug]/login` → login works → leads page shows
