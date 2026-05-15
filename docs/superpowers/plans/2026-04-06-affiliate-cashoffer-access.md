# Affiliate CashOffer Access Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow an existing affiliate to be granted V2 client (CashOffer) access — one login, one set of credentials, full cashoffer portal access — without breaking any existing V2 clients or affiliate functionality.

**Architecture:** Add a `cashoffer_client` boolean to the `affiliates` table. When true, also create a shell `v2_clients` record (no auth, just config data) so all existing FK constraints and lead queries work unchanged. Extend `lib/v2client.ts` with a `getV2AccessFromRequest()` function that checks BOTH auth paths — existing `v2client_auth` cookie first (pure V2 clients untouched), then `affiliate_auth` cookie + `cashoffer_client = true`. Replace `getV2ClientFromRequest` with `getV2AccessFromRequest` in all API routes. Admin gets a "Grant/Remove" button on the affiliate detail page.

**Tech Stack:** Next.js 16.2.0, TypeScript, Supabase (project `jntughoiksxosjapklfo`), `lib/v2client.ts`, `lib/resend.ts` (supabase client)

**Golden rules — never violate:**
- Lead data (cashoffer_leads, cashoffer_lead_status) is NEVER touched. The shell v2_clients record gives a valid `id` for FK constraints — that's all.
- Existing pure V2 clients work identically. `getV2ClientFromRequest()` is not changed.
- Existing affiliate auth is not changed.
- No new middleware files.
- No color changes outside admin.
- `npm run build` passes before every commit.

---

## File Map

| File | Action | What it does |
|---|---|---|
| `supabase/migrations/TIMESTAMP_cashoffer_client.sql` | Create | Adds `cashoffer_client` column to `affiliates` |
| `lib/v2client.ts` | Modify | Add `getV2AccessFromRequest()` + `is_affiliate` to session type |
| `app/api/v2client/me/route.ts` | Modify | Use new auth function, return `isAffiliate` flag |
| `app/api/v2client/leads/route.ts` | Modify | Use new auth function (GET + POST) |
| `app/api/v2client/lead-status/route.ts` | Modify | Use new auth function |
| `app/api/v2client/leads/upload/route.ts` | Modify | Use new auth function |
| `app/api/v2client/logout/route.ts` | Modify | Skip cookie clearing if user is affiliate |
| `app/cashoffer/[slug]/layout.tsx` | Modify | Show "← My Portal" link instead of Sign out for affiliates |
| `app/api/admin/affiliates/[id]/route.ts` | Modify | Handle `cashofferClient` in GET + PATCH |
| `app/admin/affiliates/[id]/page.tsx` | Modify | Add V2 Client Access section with Grant/Remove button |

**Files NOT changed:**
- `lib/affiliate.ts` — affiliate auth untouched
- `app/cashoffer/[slug]/page.tsx` — already falls back to demo config + reads v2_clients for calendly. Works once shell record exists.
- `app/cashoffer/[slug]/leads/page.tsx` — pure client component, no auth changes needed
- All email sequences, cron jobs, middleware, URL architecture

---

## Task 1: DB Migration

**Files:**
- Create: `supabase/migrations/20260406_cashoffer_client.sql`

- [ ] **Step 1: Write the migration**

```sql
ALTER TABLE affiliates
  ADD COLUMN cashoffer_client BOOLEAN NOT NULL DEFAULT false;
```

- [ ] **Step 2: Apply via Supabase MCP**

```
apply_migration(name="cashoffer_client", query="ALTER TABLE affiliates ADD COLUMN cashoffer_client BOOLEAN NOT NULL DEFAULT false;")
```

Expected: migration applied successfully, no errors.

- [ ] **Step 3: Verify column exists**

```
execute_sql("SELECT column_name, data_type, column_default FROM information_schema.columns WHERE table_name = 'affiliates' AND column_name = 'cashoffer_client'")
```

Expected: one row — `cashoffer_client | boolean | false`

- [ ] **Step 4: Save migration file**

Write the SQL to `supabase/migrations/20260406_cashoffer_client.sql` so it's tracked in git.

- [ ] **Step 5: Commit**

```bash
cd /Users/mistibruton/Desktop/geo-landing
git add supabase/migrations/20260406_cashoffer_client.sql
git commit -m "db: add cashoffer_client column to affiliates"
```

---

## Task 2: Extend lib/v2client.ts

**Files:**
- Modify: `lib/v2client.ts`

- [ ] **Step 1: Read the current file**

Read `lib/v2client.ts` — current content is:
```typescript
import { NextRequest } from "next/server";
import { supabase } from "./resend";

export interface V2ClientSession {
  id: string;
  slug: string;
  name: string;
  calendly_url: string | null;
}

export async function getV2ClientFromRequest(req: NextRequest): Promise<V2ClientSession | null> {
  const cookie = req.cookies.get("v2client_auth")?.value;
  // ... reads from v2_clients table
}
```

- [ ] **Step 2: Add is_affiliate field and getV2AccessFromRequest()**

Replace the entire file content with:

```typescript
import { NextRequest } from "next/server";
import { supabase } from "./resend";

export interface V2ClientSession {
  id: string;
  slug: string;
  name: string;
  calendly_url: string | null;
  is_affiliate?: boolean;
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

// Accepts BOTH pure V2 clients (v2client_auth cookie) AND affiliates with cashoffer_client=true (affiliate_auth cookie).
// Always try pure V2 client first — existing clients are completely unaffected.
export async function getV2AccessFromRequest(
  req: NextRequest
): Promise<V2ClientSession | null> {
  // Path 1: existing pure V2 client — unchanged behavior
  const v2session = await getV2ClientFromRequest(req);
  if (v2session) return v2session;

  // Path 2: affiliate with cashoffer_client = true
  const affilCookie = req.cookies.get("affiliate_auth")?.value;
  if (!affilCookie) return null;

  const colonIdx = affilCookie.indexOf(":");
  if (colonIdx === -1) return null;

  const slug = affilCookie.slice(0, colonIdx);
  const sessionToken = affilCookie.slice(colonIdx + 1);
  if (!slug || !sessionToken) return null;

  // Verify affiliate session + cashoffer access
  const { data: aff } = await supabase
    .from("affiliates")
    .select("id, slug, name, calendly_url, cashoffer_client")
    .eq("slug", slug)
    .eq("session_token", sessionToken)
    .eq("active", true)
    .eq("cashoffer_client", true)
    .maybeSingle();

  if (!aff) return null;

  // Look up the shell v2_clients record (created when access was granted).
  // Its id is used for cashoffer_lead_status FK — do not use affiliate id.
  const { data: v2client } = await supabase
    .from("v2_clients")
    .select("id")
    .eq("slug", aff.slug)
    .maybeSingle();

  if (!v2client) return null;

  return {
    id: v2client.id,
    slug: aff.slug,
    name: aff.name,
    calendly_url: aff.calendly_url,
    is_affiliate: true,
  };
}
```

- [ ] **Step 3: Run build to check types**

```bash
cd /Users/mistibruton/Desktop/geo-landing && npm run build 2>&1 | tail -20
```

Expected: no TypeScript errors related to `lib/v2client.ts`.

- [ ] **Step 4: Commit**

```bash
git add lib/v2client.ts
git commit -m "feat: add getV2AccessFromRequest() — accepts affiliate_auth when cashoffer_client=true"
```

---

## Task 3: Update /api/v2client API Routes

**Files:**
- Modify: `app/api/v2client/me/route.ts`
- Modify: `app/api/v2client/leads/route.ts`
- Modify: `app/api/v2client/lead-status/route.ts`
- Modify: `app/api/v2client/leads/upload/route.ts`
- Modify: `app/api/v2client/logout/route.ts`

- [ ] **Step 1: Update me/route.ts**

Replace entire file:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getV2AccessFromRequest } from "../../../../lib/v2client";

export async function GET(req: NextRequest) {
  const client = await getV2AccessFromRequest(req);
  if (!client) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  return NextResponse.json({
    slug: client.slug,
    name: client.name,
    calendlyUrl: client.calendly_url ?? null,
    isAffiliate: client.is_affiliate ?? false,
  });
}
```

- [ ] **Step 2: Update leads/route.ts — replace getV2ClientFromRequest with getV2AccessFromRequest**

In `app/api/v2client/leads/route.ts`, change line 2 and both auth checks:

Change import from:
```typescript
import { getV2ClientFromRequest } from "../../../../lib/v2client";
```
To:
```typescript
import { getV2AccessFromRequest } from "../../../../lib/v2client";
```

Change line 7 from:
```typescript
  const client = await getV2ClientFromRequest(req);
```
To:
```typescript
  const client = await getV2AccessFromRequest(req);
```

Change line 66 from:
```typescript
  const client = await getV2ClientFromRequest(req);
```
To:
```typescript
  const client = await getV2AccessFromRequest(req);
```

- [ ] **Step 3: Read and update lead-status/route.ts**

Read `app/api/v2client/lead-status/route.ts`. Apply the same import + auth swap:
- Import: `getV2ClientFromRequest` → `getV2AccessFromRequest`
- Auth call: `getV2ClientFromRequest(req)` → `getV2AccessFromRequest(req)`

- [ ] **Step 4: Read and update leads/upload/route.ts**

Read `app/api/v2client/leads/upload/route.ts`. Apply the same import + auth swap.

- [ ] **Step 5: Update logout/route.ts**

Replace entire file:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getV2AccessFromRequest } from "../../../../lib/v2client";
import { supabase } from "../../../../lib/resend";

export async function POST(req: NextRequest) {
  const client = await getV2AccessFromRequest(req);

  if (client && !client.is_affiliate) {
    // Pure V2 client — clear their session token
    await supabase
      .from("v2_clients")
      .update({ session_token: null })
      .eq("id", client.id);

    const res = NextResponse.json({ success: true });
    res.cookies.set("v2client_auth", "", { httpOnly: true, path: "/", maxAge: 0 });
    return res;
  }

  // Affiliate accessing cashoffer portal — do NOT clear affiliate_auth.
  // They remain logged into their affiliate portal.
  return NextResponse.json({ success: true });
}
```

- [ ] **Step 6: Run build**

```bash
cd /Users/mistibruton/Desktop/geo-landing && npm run build 2>&1 | tail -20
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add app/api/v2client/me/route.ts app/api/v2client/leads/route.ts app/api/v2client/lead-status/route.ts app/api/v2client/leads/upload/route.ts app/api/v2client/logout/route.ts
git commit -m "feat: extend v2client API routes to accept affiliate cashoffer access"
```

---

## Task 4: Update CashOffer Portal Layout

**Files:**
- Modify: `app/cashoffer/[slug]/layout.tsx`

Current layout calls `/api/v2client/me` on mount. The response now includes `isAffiliate`. When true, show "← My Portal" link instead of "Sign out" button.

- [ ] **Step 1: Update layout state and useEffect**

In `app/cashoffer/[slug]/layout.tsx`:

Add `isAffiliate` to state:
```typescript
const [isAffiliate, setIsAffiliate] = useState(false);
```

Update the `useEffect` fetch to capture `isAffiliate`:
```typescript
useEffect(() => {
  if (!requiresAuth) return;
  fetch("/api/v2client/me")
    .then(r => {
      if (!r.ok) { router.push(`/cashoffer/${slug}/login`); return null; }
      return r.json();
    })
    .then(data => {
      if (data?.name) setName(data.name);
      if (data?.isAffiliate) setIsAffiliate(true);
    });
}, [slug, requiresAuth, router]);
```

- [ ] **Step 2: Update the Sign out button**

Replace the Sign out button section:

```typescript
<div style={{ display: "flex", gap: 12, alignItems: "center" }}>
  {!isAffiliate && (
    <Link href={`/cashoffer/${slug}/change-password`} style={{ color: S.muted, fontSize: 13, textDecoration: "none" }}>
      Settings
    </Link>
  )}
  {isAffiliate ? (
    <a
      href={`https://geo.heypearl.io/${slug}/leads`}
      style={{
        background: "none", border: `1px solid ${S.border}`, color: S.muted,
        borderRadius: 6, padding: "5px 12px", fontSize: 13, textDecoration: "none",
        display: "inline-block",
      }}
    >
      ← My Portal
    </a>
  ) : (
    <button onClick={handleLogout} style={{
      background: "none", border: `1px solid ${S.border}`, color: S.muted,
      borderRadius: 6, padding: "5px 12px", fontSize: 13, cursor: "pointer",
    }}>
      Sign out
    </button>
  )}
</div>
```

- [ ] **Step 3: Run build**

```bash
cd /Users/mistibruton/Desktop/geo-landing && npm run build 2>&1 | tail -20
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add "app/cashoffer/[slug]/layout.tsx"
git commit -m "feat: show My Portal link instead of Sign out for affiliates in cashoffer portal"
```

---

## Task 5: Update Admin Affiliates API

**Files:**
- Modify: `app/api/admin/affiliates/[id]/route.ts`

- [ ] **Step 1: Update GET to include cashoffer_client**

In the `GET` handler, change the `.select()` string from:
```typescript
.select("id, name, slug, tag, email, phone, headshot_url, calendly_url, meta_pixel_id, invite_used, active, offers, created_at, last_login, instagram_url, facebook_url, linkedin_url, tiktok_url, youtube_url")
```
To:
```typescript
.select("id, name, slug, tag, email, phone, headshot_url, calendly_url, meta_pixel_id, invite_used, active, offers, cashoffer_client, created_at, last_login, instagram_url, facebook_url, linkedin_url, tiktok_url, youtube_url")
```

Also add `cashoffer_client` to the returned JSON:
```typescript
return NextResponse.json({
  ...affiliate,
  cashoffer_client: affiliate.cashoffer_client ?? false,
  leadCount: leadCount ?? 0,
  lastLeadAt: lastLeadRow?.created_at ?? null,
  // ... rest unchanged
});
```

- [ ] **Step 2: Update PATCH body type to accept cashofferClient**

In the PATCH handler, add `cashofferClient?: boolean` to the body type:
```typescript
const body = await req.json() as {
  active?: boolean;
  metaPixelId?: string;
  regenerateInvite?: boolean;
  offers?: string[];
  name?: string;
  email?: string;
  calendlyUrl?: string;
  headshotUrl?: string;
  phone?: string;
  newPassword?: string;
  linkjoltUrl?: string;
  cashofferClient?: boolean;
};
```

- [ ] **Step 3: Add cashofferClient handler in PATCH**

After the existing `if (body.offers !== undefined)` block, add:

```typescript
if (body.cashofferClient !== undefined) {
  updates.cashoffer_client = body.cashofferClient;

  if (body.cashofferClient === true) {
    // Fetch affiliate data to create shell v2_clients record
    const { data: aff } = await supabase
      .from("affiliates")
      .select("slug, name, calendly_url, meta_pixel_id")
      .eq("id", id)
      .maybeSingle();

    if (aff) {
      // Check if v2_clients record already exists (idempotent)
      const { data: existing } = await supabase
        .from("v2_clients")
        .select("id")
        .eq("slug", aff.slug)
        .maybeSingle();

      if (!existing) {
        // Create shell record — no password/session, active=true
        await supabase
          .from("v2_clients")
          .insert({
            slug: aff.slug,
            name: aff.name,
            calendly_url: aff.calendly_url ?? null,
            meta_pixel_id: aff.meta_pixel_id ?? null,
            active: true,
            invite_used: true,
          });
      }
    }
  }
  // When cashofferClient = false: just update the flag.
  // Never delete the v2_clients record — lead data (cashoffer_leads, cashoffer_lead_status) is sacred.
}
```

- [ ] **Step 4: Run build**

```bash
cd /Users/mistibruton/Desktop/geo-landing && npm run build 2>&1 | tail -20
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add "app/api/admin/affiliates/[id]/route.ts"
git commit -m "feat: admin affiliates API — grant/remove cashoffer client access"
```

---

## Task 6: Admin Affiliate Detail Page — V2 Client Access Section

**Files:**
- Modify: `app/admin/affiliates/[id]/page.tsx`

- [ ] **Step 1: Add cashoffer_client to AffiliateDetail interface**

In the `AffiliateDetail` interface (around line 26), add:
```typescript
cashoffer_client: boolean;
```

- [ ] **Step 2: Add grantCashoffer handler**

After the `toggleOffer` function (around line 144), add:

```typescript
async function toggleCashofferAccess() {
  if (!aff) return;
  await patch({ cashofferClient: !aff.cashoffer_client });
}
```

- [ ] **Step 3: Add V2 Client Access card to the UI**

Read the file from line 400 to the end to find where existing cards end. Add a new card after the Social Channels card (or wherever is logical). Place it inside the grid div.

Add this card:

```typescript
{/* V2 Client Access */}
<div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 12, padding: 24, gridColumn: "1 / -1" }}>
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
    <div>
      <h2 style={{ color: S.text, fontSize: 15, fontWeight: 700, margin: 0 }}>V2 Client Access (CashOffer Portal)</h2>
      <p style={{ color: S.muted, fontSize: 12, margin: "4px 0 0" }}>
        When granted, this affiliate can access the CashOffer portal at their slug. One login, one portal.
      </p>
    </div>
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <span style={{
        background: aff.cashoffer_client ? "#f0fdf4" : "#f8fafc",
        color: aff.cashoffer_client ? S.green : S.muted,
        borderRadius: 6, padding: "3px 10px", fontSize: 12, fontWeight: 600,
      }}>
        {aff.cashoffer_client ? "Access Granted" : "No Access"}
      </span>
      <button
        onClick={toggleCashofferAccess}
        disabled={saving}
        style={{
          background: aff.cashoffer_client ? "#fef2f2" : "#f0fdf4",
          border: `1px solid ${aff.cashoffer_client ? "#fecaca" : "#bbf7d0"}`,
          color: aff.cashoffer_client ? "#dc2626" : S.green,
          borderRadius: 6, padding: "5px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer",
        }}
      >
        {saving ? "Saving…" : aff.cashoffer_client ? "Remove Access" : "Grant Access"}
      </button>
    </div>
  </div>
  {aff.cashoffer_client && (
    <div style={{ background: S.bg, borderRadius: 8, padding: "10px 14px" }}>
      <span style={{ color: S.muted, fontSize: 12 }}>Portal: </span>
      <a
        href={`https://v2.heypearl.io/cashoffer/${aff.slug}/leads`}
        target="_blank"
        rel="noreferrer"
        style={{ color: S.green, fontSize: 12, fontWeight: 500 }}
      >
        v2.heypearl.io/cashoffer/{aff.slug}/leads
      </a>
    </div>
  )}
</div>
```

- [ ] **Step 4: Run build**

```bash
cd /Users/mistibruton/Desktop/geo-landing && npm run build 2>&1 | tail -20
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add "app/admin/affiliates/[id]/page.tsx"
git commit -m "feat: admin affiliate detail — V2 client access grant/remove UI"
```

---

## Task 7: End-to-End Verification

- [ ] **Step 1: Deploy to production**

```bash
cd /Users/mistibruton/Desktop/geo-landing && /opt/homebrew/bin/vercel --prod
```

- [ ] **Step 2: Grant cashoffer access to a test affiliate in admin**

Navigate to `geo.heypearl.io/admin/affiliates/[test-affiliate-id]`.
Click "Grant Access" in the V2 Client Access section.
Expected: green "Access Granted" badge appears. Portal link shows.

- [ ] **Step 3: Verify shell v2_clients record was created**

```
execute_sql("SELECT id, slug, name, calendly_url, active FROM v2_clients WHERE slug = '[test-slug]'")
```

Expected: one row with the affiliate's name, calendly_url, active=true, no password_hash.

- [ ] **Step 4: Verify cashoffer portal access**

While logged in as the affiliate at `geo.heypearl.io/[slug]/leads`, navigate to `v2.heypearl.io/cashoffer/[slug]/leads`.
Expected: portal loads with "← My Portal" link, NOT a login redirect. Correct name in nav.

- [ ] **Step 5: Verify cashoffer landing page**

Navigate to `v2.heypearl.io/cashoffer/[slug]`.
Expected: CashOffer landing page loads (uses demo config + affiliate's calendly from v2_clients). No 404.

- [ ] **Step 6: Verify existing pure V2 clients are unaffected**

Log in as an existing V2 client at `v2.heypearl.io/cashoffer/[existing-client-slug]/login`.
Expected: normal login flow, leads portal works, "Sign out" button present (not "← My Portal").

- [ ] **Step 7: Verify affiliate portal still works**

Log in as the test affiliate at `geo.heypearl.io/[slug]/login`.
Expected: normal affiliate portal loads, leads display correctly, offers/campaign uploads unchanged.

- [ ] **Step 8: Verify Remove Access**

In admin, click "Remove Access" on the test affiliate.
Expected: badge changes to "No Access". Navigating to cashoffer portal now redirects to cashoffer login page.

---

## Self-Review

**Spec coverage:**
- ✅ One login (affiliate_auth works for cashoffer portal)
- ✅ Existing V2 clients untouched (getV2ClientFromRequest checked first)
- ✅ Existing affiliate auth untouched
- ✅ Admin can grant/remove access
- ✅ cashoffer_lead_status FK satisfied (uses v2_clients.id)
- ✅ cashoffer landing page works (shell v2_clients record + demo config fallback already in place)
- ✅ Lead data never touched
- ✅ Admin visibility rule: cashoffer_client visible in admin detail page

**Placeholder scan:** None found.

**Type consistency:** `V2ClientSession.is_affiliate` optional boolean — all existing callers unaffected (undefined is falsy). `getV2AccessFromRequest` returns same type as `getV2ClientFromRequest`.
