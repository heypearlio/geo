# Phase 1: Source Attribution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every lead that enters the system gets `source_tag` and `source_url` stamped at opt-in, automatically derived from the URL — never typed manually.

**Architecture:** A single utility `lib/source.ts` exports `buildLeadSource()` and `buildImportTag()`. Every opt-in route calls one of these. Two columns are added to existing opt-in tables. No existing data is modified — new columns are nullable, old rows stay as-is.

**Tech Stack:** Next.js 16.2.0, TypeScript, Supabase (project `jntughoiksxosjapklfo`), `@supabase/supabase-js` via `lib/resend.ts`

---

## File Map

| Action | File | What changes |
|---|---|---|
| CREATE | `lib/source.ts` | `buildLeadSource()` and `buildImportTag()` utility |
| MODIFY | `app/api/generate-audit-email/route.ts` | Accept `affiliateSlug` param, call `buildLeadSource()`, save to `geo_audit_history` |
| MODIFY | `app/score/page.tsx` | Pass `affiliateSlug` through to `generate-audit-email` call |
| MODIFY | `app/components/LandingPage.tsx` | Pass `affiliateTag` through audit URL chain |
| MODIFY | `app/api/local-optin/route.ts` | Call `buildLeadSource()` using existing `funnel` field, save to `geo_local_submissions` |
| MODIFY | `app/api/affiliate-apply/route.ts` | Call `buildLeadSource()` from host header, save to `geo_email_queue` metadata |
| MODIFY | `app/api/admin/instantly/upload/route.ts` | Call `buildImportTag()` from campaign name, store on upload record |
| MODIFY | `app/admin/affiliates/page.tsx` | Validate `first.last` slug format on create |
| MODIFY | `app/admin/v2/page.tsx` | Validate `first.last` slug format on create |
| MIGRATION | Supabase | Add `source_tag TEXT`, `source_url TEXT` to `geo_audit_history`, `geo_local_submissions` |

---

## Task 1: Create `lib/source.ts`

**File:** Create `lib/source.ts`

- [ ] **Step 1: Create the file**

```typescript
// lib/source.ts
// Universal source attribution utility.
// Every opt-in route calls buildLeadSource() or buildImportTag().
// NEVER hardcode source_tag values — always derive them from context.

import { NextRequest } from "next/server";

// Maps subdomain to offer name
const SUBDOMAIN_TO_OFFER: Record<string, string> = {
  geo:       "geo",
  v2:        "v2",
  local:     "local",
  affiliate: "affiliate",
};

/**
 * Derives { source_tag, source_url } from the incoming request.
 *
 * @param req    The Next.js request object
 * @param slug   The affiliate/client slug if known (e.g. "todd.smith").
 *               Pass undefined for god/admin pages.
 *
 * Examples:
 *   geo.heypearl.io + slug "todd.smith" → { source_tag: "geo_todd.smith", source_url: "geo.heypearl.io/todd.smith" }
 *   geo.heypearl.io + no slug           → { source_tag: "geo_admin",      source_url: "geo.heypearl.io" }
 *   v2.heypearl.io  + slug "sarah.j"    → { source_tag: "v2_sarah.j",     source_url: "v2.heypearl.io/sarah.j" }
 */
export function buildLeadSource(
  req: NextRequest,
  slug?: string | null
): { source_tag: string; source_url: string } {
  const host = req.headers.get("host") ?? "";
  // host is e.g. "geo.heypearl.io" or "localhost:3000"
  const subdomain = host.split(".")[0].split(":")[0]; // "geo", "v2", "local", "localhost"
  const offer = SUBDOMAIN_TO_OFFER[subdomain] ?? subdomain;

  const source_url = slug ? `${host}/${slug}` : host;
  const source_tag = slug ? `${offer}_${slug}` : `${offer}_admin`;

  return { source_tag, source_url };
}

/**
 * Derives a source tag for CSV imports based on the Instantly campaign name.
 *
 * @param campaignName  Raw campaign name from Instantly (e.g. "v2-expired-listings")
 *
 * Examples:
 *   "v2-expired-listings"  → "import_v2_expired_listings"
 *   "geo-buyers"           → "import_geo_buyers"
 *   "aff-v2"               → "import_aff_v2"
 */
export function buildImportTag(campaignName: string): string {
  const normalized = campaignName.toLowerCase().replace(/-/g, "_");
  return `import_${normalized}`;
}
```

- [ ] **Step 2: Verify build passes**

```bash
cd /Users/mistibruton/Desktop/geo-landing && npm run build 2>&1 | tail -5
```
Expected: no new errors (pre-existing Resend key error is normal locally)

- [ ] **Step 3: Commit**

```bash
git add lib/source.ts
git commit -m "Add buildLeadSource and buildImportTag attribution utilities"
```

---

## Task 2: Supabase Migration — Add Source Columns

**Files:** Supabase migration via MCP

- [ ] **Step 1: Add columns to `geo_audit_history`**

Use `apply_migration` with name `add_source_attribution_columns`:

```sql
ALTER TABLE geo_audit_history
  ADD COLUMN IF NOT EXISTS source_tag  TEXT,
  ADD COLUMN IF NOT EXISTS source_url  TEXT;

ALTER TABLE geo_local_submissions
  ADD COLUMN IF NOT EXISTS source_tag  TEXT,
  ADD COLUMN IF NOT EXISTS source_url  TEXT;
```

- [ ] **Step 2: Verify columns exist**

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name IN ('geo_audit_history', 'geo_local_submissions')
  AND column_name IN ('source_tag', 'source_url')
ORDER BY table_name, column_name;
```
Expected: 4 rows returned (2 columns × 2 tables)

- [ ] **Step 3: Commit**

```bash
git commit -m "Migration: add source_tag and source_url to audit and local submission tables"
```

---

## Task 3: Update Local Opt-in Route

**File:** Modify `app/api/local-optin/route.ts`

The `funnel` field in the request body IS the affiliate slug (e.g. `"todd"`, `"heylocal"`). Use it directly with `buildLeadSource()`.

- [ ] **Step 1: Update the route**

```typescript
// app/api/local-optin/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabase, tagLead } from "../../../lib/resend";
import { buildLeadSource } from "../../../lib/source";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { firstName, email, businessType, funnel } = body as {
    firstName?: string;
    email?: string;
    businessType?: string;
    funnel?: string;
  };

  if (!email || !funnel) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // funnel is the affiliate slug (e.g. "todd", "heylocal", "god")
  // "god" slug means the admin/god page — buildLeadSource treats it as local_god
  const affiliateSlug = funnel === "heylocal" ? null : funnel; // heylocal = god/admin page
  const { source_tag, source_url } = buildLeadSource(req, affiliateSlug);

  // Write to geo_local_submissions for affiliate dashboard
  await supabase.from("geo_local_submissions").insert({
    email,
    first_name: firstName ?? null,
    business_type: businessType ?? null,
    source_tag: funnel,          // keep existing field for backwards compat
    source_attribution_tag: source_tag,  // new clean tag
    source_attribution_url: source_url,  // new clean url
  });
```

Wait — the existing `source_tag` column on `geo_local_submissions` already stores `funnel`. We added NEW columns `source_tag` and `source_url` in the migration. To avoid collision with the existing `source_tag` column (if it exists), check first:

- [ ] **Step 1a: Check existing columns on geo_local_submissions**

```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'geo_local_submissions'
ORDER BY column_name;
```

- [ ] **Step 1b: Update the route based on findings**

If `geo_local_submissions` already has a `source_tag` column (it does — the existing code writes `source_tag: funnel`), rename our new columns to avoid collision. Update the migration from Task 2:

```sql
ALTER TABLE geo_local_submissions
  RENAME COLUMN source_tag TO source_tag_legacy;

ALTER TABLE geo_local_submissions
  ADD COLUMN IF NOT EXISTS source_tag  TEXT,
  ADD COLUMN IF NOT EXISTS source_url  TEXT;
```

Then update `local-optin/route.ts` to write to the new clean columns:

```typescript
// app/api/local-optin/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabase, tagLead } from "../../../lib/resend";
import { buildLeadSource } from "../../../lib/source";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { firstName, email, businessType, funnel } = body as {
    firstName?: string;
    email?: string;
    businessType?: string;
    funnel?: string;
  };

  if (!email || !funnel) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const isGodPage = funnel === "heylocal"; // heylocal is the god/admin funnel tag
  const { source_tag, source_url } = buildLeadSource(req, isGodPage ? null : funnel);

  await supabase.from("geo_local_submissions").insert({
    email,
    first_name: firstName ?? null,
    business_type: businessType ?? null,
    source_tag_legacy: funnel,   // existing field — keep for backwards compat
    source_tag,
    source_url,
  });

  await supabase.from("geo_email_queue").insert({
    email,
    first_name: firstName ?? null,
    sequence:  "local_nurture",
    step:       1,
    send_at:    new Date("2099-01-01").toISOString(),
    metadata:  { source: funnel, affiliate_tag: funnel },
  });

  await tagLead(email, funnel);

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Build verify**

```bash
npm run build 2>&1 | tail -5
```

- [ ] **Step 3: Commit**

```bash
git add app/api/local-optin/route.ts
git commit -m "Local opt-in: stamp source_tag and source_url on every submission"
```

---

## Task 4: Thread Affiliate Slug Through GEO Audit Flow

The GEO audit fires from `score/page.tsx` but doesn't currently pass the affiliate slug to the API. The slug is available in `LandingPage.tsx` as `affiliateTag` but needs threading through the URL chain.

**Files:**
- Modify: `app/components/LandingPage.tsx` (pass affiliateTag through audit URL)
- Modify: `app/score/page.tsx` (read affiliateSlug from URL, pass to API call)

- [ ] **Step 1: Find where LandingPage routes to the audit/score flow**

```bash
grep -n "router.push\|href.*score\|href.*audit\|scheduleHref\|auditHref" /Users/mistibruton/Desktop/geo-landing/app/components/LandingPage.tsx | head -20
```

- [ ] **Step 2: Add affiliateSlug to the score page URL**

In `LandingPage.tsx`, find the `router.push` or link that sends the user to `/score?...` and add `affiliateSlug`:

```typescript
// Find the existing push, e.g.:
// router.push(`/score?auditId=${auditId}&email=${email}&...`)
// Add &affiliateSlug=${overrides?.funnelTag ?? ""}
router.push(
  `/score?auditId=${auditId}&email=${encodeURIComponent(email)}&city=${encodeURIComponent(city)}&name=${encodeURIComponent(name)}&affiliateSlug=${encodeURIComponent(overrides?.funnelTag ?? "")}`
);
```

- [ ] **Step 3: Read affiliateSlug in score/page.tsx and pass to API**

In `app/score/page.tsx`, add `affiliateSlug` to the search params read and include it in the `generate-audit-email` call:

```typescript
// Existing params already read:
const auditId = searchParams.get("auditId");
const email = searchParams.get("email") ?? "";
const city = searchParams.get("city") ?? "";
const name = searchParams.get("name") ?? "";
// Add:
const affiliateSlug = searchParams.get("affiliateSlug") ?? "";

// In the generate-audit-email fetch, add affiliateSlug to body:
fetch("/api/generate-audit-email", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email, firstName: name, city, auditId, overall, seo, ai, affiliateSlug }),
}).catch(() => {});
```

- [ ] **Step 4: Build verify**

```bash
npm run build 2>&1 | tail -5
```

- [ ] **Step 5: Commit**

```bash
git add app/components/LandingPage.tsx app/score/page.tsx
git commit -m "Thread affiliateSlug through GEO audit URL chain to generate-audit-email"
```

---

## Task 5: Update GEO Audit Email Route

**File:** Modify `app/api/generate-audit-email/route.ts`

- [ ] **Step 1: Add import and update handler**

```typescript
// At top of file, add:
import { buildLeadSource } from "../../../lib/source";

// In the POST handler, destructure affiliateSlug from body:
const { email, firstName: rawFirstName, city, website, auditId, overall, seo, ai, affiliateSlug } = await req.json();

// After the dedup check, before the geo_audit_history insert/update, add:
const { source_tag, source_url } = buildLeadSource(req, affiliateSlug || null);

// Find the geo_audit_history INSERT (around line 79) and add the new fields:
const { data: inserted } = await supabase
  .from("geo_audit_history")
  .insert({
    email,
    first_name: firstName ?? null,
    city: city ?? null,
    website: website ?? null,
    audit_id: auditId ?? null,
    overall,
    seo,
    ai,
    source_tag,   // ADD
    source_url,   // ADD
  })
  .select()
  .single();

// Find the geo_audit_history UPDATE (around line 66) and add the new fields:
await supabase.from("geo_audit_history").update({
  overall, seo, ai,
  city: city ?? undefined,
  website: website ?? undefined,
  source_tag,   // ADD
  source_url,   // ADD
}).eq("audit_id", auditId);
```

- [ ] **Step 2: Build verify**

```bash
npm run build 2>&1 | tail -5
```

- [ ] **Step 3: Commit**

```bash
git add app/api/generate-audit-email/route.ts
git commit -m "GEO audit: stamp source_tag and source_url on every audit submission"
```

---

## Task 6: Update Affiliate Apply Route

**File:** Modify `app/api/affiliate-apply/route.ts`

The affiliate application comes from `affiliate.heypearl.io` — source is always `affiliate_admin` (there's no per-affiliate slug on the application page).

- [ ] **Step 1: Add import and source derivation**

```typescript
// At top of file, add:
import { buildLeadSource } from "../../../lib/source";

// In the POST handler, after parsing body, add:
const { source_tag, source_url } = buildLeadSource(req); // no slug — affiliate.heypearl.io = admin page

// Find the geo_email_queue INSERT for the affiliate_application sentinel and add source fields:
await supabase.from("geo_email_queue").insert({
  email,
  first_name: firstName ?? null,
  last_name: lastName ?? null,
  sequence: "affiliate_application",
  step: 1,
  send_at: new Date("2099-01-01").toISOString(),
  metadata: {
    source: "affiliate_application",
    source_tag,    // ADD
    source_url,    // ADD
  },
});
```

- [ ] **Step 2: Build verify**

```bash
npm run build 2>&1 | tail -5
```

- [ ] **Step 3: Commit**

```bash
git add app/api/affiliate-apply/route.ts
git commit -m "Affiliate apply: stamp source_tag and source_url in email queue metadata"
```

---

## Task 7: Update CSV Upload Route (Import Tags)

**File:** Modify `app/api/admin/instantly/upload/route.ts`

- [ ] **Step 1: Read the current upload route**

```bash
cat /Users/mistibruton/Desktop/geo-landing/app/api/admin/instantly/upload/route.ts
```

- [ ] **Step 2: Add buildImportTag to the route**

```typescript
// At top of file, add:
import { buildImportTag } from "../../../../lib/source";

// In the POST handler, after parsing campaign_id and campaign name, derive the import tag:
// The route already receives campaign_id and offer from the request body.
// Fetch the campaign name from Instantly to build the tag, OR
// require campaign_name to be sent from the frontend alongside campaign_id.

// Add campaign_name to the expected request body:
const { csv, campaign_id, campaign_name, offer } = await req.json();

// Derive the import tag:
const import_tag = campaign_name ? buildImportTag(campaign_name) : `import_${offer}`;

// Log it (for now — will be used in lead_campaign_status in Phase 3):
console.log(`[upload] import_tag=${import_tag} campaign=${campaign_id}`);
```

- [ ] **Step 3: Update the admin upload page to send campaign_name**

In `app/admin/upload/page.tsx`, find the upload fetch call and add `campaign_name`:

```typescript
// Find the existing fetch in upload():
const res = await fetch("/api/admin/instantly/upload", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    csv,
    campaign_id: campaignId,
    campaign_name: campaigns.find(c => c.id === campaignId)?.name ?? "",  // ADD
    offer,
  }),
});
```

- [ ] **Step 4: Build verify**

```bash
npm run build 2>&1 | tail -5
```

- [ ] **Step 5: Commit**

```bash
git add app/api/admin/instantly/upload/route.ts app/admin/upload/page.tsx
git commit -m "CSV upload: derive import_tag from campaign name via buildImportTag()"
```

---

## Task 8: Enforce first.last Slug Convention in Admin UI

New affiliates and clients should have slugs in `first.last` format. Add validation to the admin creation forms.

**Files:**
- Modify: `app/admin/affiliates/page.tsx` — affiliate creation form
- Modify: `app/admin/v2/page.tsx` — V2 client creation form

- [ ] **Step 1: Find the slug input in affiliate creation**

```bash
grep -n "slug\|Slug\|input.*slug" /Users/mistibruton/Desktop/geo-landing/app/admin/affiliates/page.tsx | head -10
grep -n "slug\|Slug\|input.*slug" /Users/mistibruton/Desktop/geo-landing/app/admin/v2/page.tsx | head -10
```

- [ ] **Step 2: Add slug validation helper**

Add this function near the top of each admin page file (before the component):

```typescript
function isValidSlug(slug: string): boolean {
  // Valid: first.last, first.last2, todd.spencer.jr
  // Letters, numbers, dots, hyphens only. Must contain at least one dot.
  return /^[a-z0-9]+(\.[a-z0-9]+)+(-[a-z0-9]+)*$/.test(slug.toLowerCase());
}

function slugHint(slug: string): string | null {
  if (!slug) return null;
  if (!slug.includes(".")) return "Use first.last format (e.g. todd.smith)";
  if (!/^[a-z0-9.]+$/.test(slug.toLowerCase())) return "Only letters, numbers, and dots allowed";
  return null;
}
```

- [ ] **Step 3: Add inline hint below the slug input field**

Find the slug `<input>` in each creation form and add the hint display below it:

```typescript
<input
  placeholder="first.last (e.g. todd.smith)"
  value={slug}
  onChange={e => setSlug(e.target.value.toLowerCase())}
  style={{ /* existing styles */ }}
/>
{slugHint(slug) && (
  <p style={{ color: "#f97316", fontSize: 11, margin: "4px 0 0" }}>
    {slugHint(slug)}
  </p>
)}
```

- [ ] **Step 4: Block form submission if slug is invalid**

In the submit handler, add check before the API call:

```typescript
if (!isValidSlug(slug)) {
  setError("Slug must be in first.last format (e.g. todd.smith)");
  return;
}
```

- [ ] **Step 5: Build verify**

```bash
npm run build 2>&1 | tail -5
```

- [ ] **Step 6: Commit**

```bash
git add app/admin/affiliates/page.tsx app/admin/v2/page.tsx
git commit -m "Admin: enforce first.last slug format for new affiliates and clients"
```

---

## Task 9: Deploy and Verify

- [ ] **Step 1: Final build check**

```bash
npm run build 2>&1 | tail -10
```

- [ ] **Step 2: Deploy**

```bash
/opt/homebrew/bin/vercel --prod 2>&1 | tail -5
```

- [ ] **Step 3: Verify source attribution is working**

1. Go to `geo.heypearl.io` (god page) and submit an audit with a test email
2. Check Supabase: `SELECT email, source_tag, source_url FROM geo_audit_history ORDER BY created_at DESC LIMIT 3;`
3. Expected: `source_tag = "geo_admin"`, `source_url = "geo.heypearl.io"`
4. Go to `local.heypearl.io` and submit a test opt-in
5. Check Supabase: `SELECT email, source_tag, source_url FROM geo_local_submissions ORDER BY created_at DESC LIMIT 3;`
6. Expected: `source_tag = "local_admin"`, `source_url = "local.heypearl.io"`

- [ ] **Step 4: Final commit if any fixes needed**

```bash
git add -A
git commit -m "Phase 1 complete: universal source attribution live on all opt-in routes"
```

---

## Self-Review Checklist

- [x] `buildLeadSource()` handles both slug and no-slug cases
- [x] `buildImportTag()` normalizes campaign names consistently
- [x] Migration adds nullable columns — no existing data affected
- [x] Local opt-in: handles the existing `source_tag` column collision via rename
- [x] GEO audit: affiliate slug threaded through URL chain from LandingPage → score → API
- [x] Affiliate apply: no slug needed — always `affiliate_admin`
- [x] CSV upload: `campaign_name` now sent from frontend to derive import tag
- [x] Slug validation: hint + block on submit, existing slugs unchanged
- [x] All tasks have build verification steps before commits
