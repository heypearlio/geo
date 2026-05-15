# Auto-Provisioning System Design

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** When someone pays via Stripe (or Misti creates them manually in admin), their full account is provisioned automatically — DB record, DNS, Vercel domain, invite email — with zero manual steps except LinkJolt.

**Architecture:** A `provisioning_jobs` queue in Supabase is the single trigger point. Stripe webhook and admin dashboard both insert into it. A new cron job processes the queue every 5 minutes, executing each step and updating status. Admin dashboard shows live provisioning status for every account.

**Tech Stack:** Supabase (queue + DB), GoDaddy REST API (DNS), Vercel REST API (domain), Resend (invite email), Stripe (payment trigger), Next.js API routes (cron processor + webhook)

---

## User Types and What They Get

| User Type | DB Table | Dashboard URL | V-Card Subdomain | DNS/Vercel Step |
|---|---|---|---|---|
| Affiliate | `affiliates` (user_type=affiliate) | `geo.heypearl.io/[slug]/leads` | `[slug].heypearl.io` | Yes |
| GEO Client | `affiliates` (user_type=geo_client) | `geo.heypearl.io/[slug]/leads` | None | No |
| Local Client | `affiliates` (user_type=local_client) | `geo.heypearl.io/[slug]/leads` | None | No |
| V2 Client | `v2_clients` | `v2.heypearl.io/cashoffer/[slug]/leads` | None | No |

**Key insight:** GEO clients and Local clients are provisioned into the `affiliates` table with a `user_type` field and a scoped `offers` array. They share the exact same dashboard infrastructure as affiliates. The existing lead filtering by `offers` array already scopes what campaigns and leads they see.

---

## Stripe Product Structure

Create 4 products in Stripe. Each product's **metadata** drives provisioning:

| Product Name | metadata.user_type | metadata.offers |
|---|---|---|
| Affiliate Partner | `affiliate` | `geo,v2,local` |
| GEO AI Visibility Engine | `geo_client` | `geo` |
| V2 Seller Attraction Engine | `v2_client` | `v2` |
| Local Business Growth Engine | `local_client` | `local` |

**Required Stripe checkout setting:** Enable "Collect customer name" (billing address collection: name only). This gives us `customer_details.name` on the webhook, used to generate the `first.last` slug.

**Slug generation:** `"Todd Smith"` → `todd.smith`. If taken: `todd.smith2`, `todd.smith3`, etc. Check both `affiliates.slug` and `v2_clients.slug`.

---

## Database Changes

### 1. Add `user_type` to `affiliates` table
```sql
ALTER TABLE affiliates ADD COLUMN user_type TEXT NOT NULL DEFAULT 'affiliate';
```
Valid values: `affiliate`, `geo_client`, `local_client`

### 2. Add `invite_token` to `affiliates` table (if not present)
The setup page already validates tokens via `/api/affiliate/setup` — confirm the column exists. If missing:
```sql
ALTER TABLE affiliates ADD COLUMN invite_token TEXT;
ALTER TABLE affiliates ADD COLUMN invite_used BOOLEAN DEFAULT FALSE;
```

### 3. Create `provisioning_jobs` table
```sql
CREATE TABLE provisioning_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_type TEXT NOT NULL, -- affiliate | geo_client | local_client | v2_client
  slug TEXT,               -- generated or null until DB step
  first_name TEXT NOT NULL,
  last_name TEXT,
  email TEXT NOT NULL,
  offers TEXT[],           -- e.g. {geo,v2,local}
  status TEXT NOT NULL DEFAULT 'pending',
  -- status values: pending | db_created | dns_added | domain_verified | invite_sent | complete | failed
  db_done BOOLEAN DEFAULT FALSE,
  dns_done BOOLEAN DEFAULT FALSE,
  vercel_done BOOLEAN DEFAULT FALSE,
  invite_done BOOLEAN DEFAULT FALSE,
  error TEXT,
  stripe_session_id TEXT,  -- for dedup — prevents double-provisioning on retry
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
```

---

## Provisioning Pipeline

### Step 1: DB Record
- Generate unique `first.last` slug (check both tables, increment suffix if taken)
- **Affiliate / GEO client / Local client:** INSERT into `affiliates` with slug, name, email, offers[], user_type, and a generated `invite_token` (UUID)
- **V2 client:** INSERT into `v2_clients` with slug, name, invite_token (UUID), active=true
- Update job: `db_done=true`, `slug=[generated slug]`

### Step 2: DNS + Domain (affiliates only)
Skip this step for geo_client, local_client, v2_client.

**GoDaddy API call — add CNAME:**
```
PUT https://api.godaddy.com/v1/domains/heypearl.io/records/CNAME/[slug]
Authorization: sso-key {GODADDY_API_KEY}:{GODADDY_API_SECRET}
Body: [{ "data": "cname.vercel-dns.com", "ttl": 600 }]
```

**Vercel API call — get TXT verification value:**
```
POST https://api.vercel.com/v10/projects/geo-landing/domains
Authorization: Bearer {VERCEL_API_TOKEN}
Body: { "name": "[slug].heypearl.io" }
```
Response includes `verification[].value` — the TXT record value.

**GoDaddy API call — add TXT (append-safe):**
`_vercel` is a shared TXT record — multiple affiliates each need their own value on it. GoDaddy PUT replaces all records; PATCH on the base `/records` also replaces. The safe pattern is:
1. GET existing `_vercel` TXT records: `GET /v1/domains/heypearl.io/records/TXT/_vercel`
2. Append the new value to the array
3. PUT the full array back: `PUT /v1/domains/heypearl.io/records/TXT/_vercel`

```
GET https://api.godaddy.com/v1/domains/heypearl.io/records/TXT/_vercel
→ returns array of existing TXT records

PUT https://api.godaddy.com/v1/domains/heypearl.io/records/TXT/_vercel
Authorization: sso-key {GODADDY_API_KEY}:{GODADDY_API_SECRET}
Body: [...existingRecords, { "data": "[verification value]", "ttl": 600 }]
```

This is idempotent — if the value already exists (retry case), dedup before appending.

Update job: `dns_done=true`, `vercel_done=true`

### Step 3: Domain Verification Poll (affiliates only)
```
GET https://api.vercel.com/v9/projects/geo-landing/domains/[slug].heypearl.io
```
- If `verified=true` → proceed
- If not → job stays at current status, cron retries next run (max 10 runs = ~50 min)

### Step 4: Invite Email
Send via Resend once Step 1 (non-affiliate) or Step 3 (affiliate) completes.

**Affiliate email:**
```
Subject: Your HeyPearl Partner Account is Ready
Body:
  - V-card: https://[slug].heypearl.io
  - Dashboard: https://geo.heypearl.io/[slug]/leads
  - Set up your account: https://geo.heypearl.io/[slug]/setup?token=[invite_token]
  - HeyPearl HQ community: [SKOOL_INVITE_URL env var]
```

**GEO client email:**
```
Subject: Your GEO AI Visibility Engine is Ready
Body:
  - Dashboard: https://geo.heypearl.io/[slug]/leads
  - Set up your account: https://geo.heypearl.io/[slug]/setup?token=[invite_token]
```

**Local client email:**
```
Subject: Your HeyLocal Account is Ready
Body:
  - Dashboard: https://geo.heypearl.io/[slug]/leads
  - Set up your account: https://geo.heypearl.io/[slug]/setup?token=[invite_token]
```

**V2 client email:**
```
Subject: Your V2 Seller Attraction Engine is Ready
Body:
  - Dashboard: https://v2.heypearl.io/cashoffer/[slug]/leads
  - Set up your account: https://v2.heypearl.io/cashoffer/[slug]/setup?token=[invite_token]
```

Update job: `invite_done=true`, `status=complete`, `completed_at=NOW()`

---

## Cron Processor

**New file:** `app/api/cron/provisioning/route.ts`
**vercel.json entry:**
```json
{ "path": "/api/cron/provisioning", "schedule": "*/5 * * * *" }
```

The processor fetches up to 10 jobs where `status NOT IN ('complete', 'failed')`, processes the next incomplete step for each, updates status after each step, and handles errors by setting `status=failed` + storing the error message.

Step routing logic:
- `db_done=false` → run Step 1 (DB record)
- `db_done=true AND user_type=affiliate AND dns_done=false` → run Step 2 (DNS + Vercel)
- `db_done=true AND user_type=affiliate AND dns_done=true AND invite_done=false` → run Step 3 (poll verification, then invite)
- `db_done=true AND user_type!=affiliate AND invite_done=false` → run Step 4 (invite email directly)

**Error handling:** Any step failure sets `status=failed`. Admin can retry via the dashboard reprovision button, which resets the job to `pending` and clears the error.

---

## Stripe Webhook Changes

Extend `app/api/stripe-webhook/route.ts` to handle provisioning:

```typescript
if (event.type === "checkout.session.completed") {
  const session = event.data.object as Stripe.Checkout.Session;
  const metadata = session.metadata ?? {};
  const userType = metadata.user_type;
  const offers = metadata.offers?.split(",") ?? [];
  const name = session.customer_details?.name ?? "";
  const email = session.customer_details?.email ?? "";
  const [firstName, ...rest] = name.trim().split(" ");
  const lastName = rest.join(" ");

  if (userType && email && firstName) {
    // Dedup: skip if session_id already provisioned
    const { data: existing } = await supabase
      .from("provisioning_jobs")
      .select("id")
      .eq("stripe_session_id", session.id)
      .maybeSingle();

    if (!existing) {
      await supabase.from("provisioning_jobs").insert({
        user_type: userType,
        first_name: firstName,
        last_name: lastName || null,
        email: email.toLowerCase(),
        offers: offers.length ? offers : null,
        stripe_session_id: session.id,
      });
    }
  }
}
```

The existing payment handling (marking `paid_at`, cancelling `hot_proof`) stays unchanged.

---

## Admin Dashboard Changes

### Admin affiliate list (`/admin/affiliates`)
GEO clients and Local clients live in the `affiliates` table alongside affiliates. Show a `user_type` badge on each row so Misti can distinguish them: `Affiliate` (blue) | `GEO Client` (pink) | `Local Client` (green).

### All create forms (`/admin/affiliates`, `/admin/v2`)
- On submit: INSERT into `provisioning_jobs` instead of directly calling the create API
- Show inline status badge after creation: `Provisioning... | DNS pending | Live | Failed`
- Poll `/api/admin/provisioning/[jobId]` every 5s until complete

### New page: `/admin/provisioning`
- Lists all provisioning jobs with status, timestamps, user type, slug, email
- "Retry" button on failed jobs (calls `/api/admin/provisioning/[jobId]/retry`)
- Linked from admin nav

### New API routes:
- `GET /api/admin/provisioning` — list all jobs
- `GET /api/admin/provisioning/[id]` — single job status (used for polling)
- `POST /api/admin/provisioning/[id]/retry` — reset failed job to pending

---

## V2 Landing Page Fix

In `app/cashoffer/[slug]/page.tsx`, change config lookup to fall back to demo:

```typescript
// Before:
const staticConfig = cashOfferConfigs[slug];
if (!staticConfig) notFound();

// After:
const staticConfig = cashOfferConfigs[slug] ?? cashOfferConfigs["demo"];
```

This means provisioning a V2 client is a pure DB insert — no config file, no deploy ever needed.

---

## Environment Variables Needed

| Variable | Value | Where |
|---|---|---|
| `GODADDY_API_KEY` | From developer.godaddy.com/keys | Vercel env |
| `GODADDY_API_SECRET` | From developer.godaddy.com/keys | Vercel env |
| `VERCEL_API_TOKEN` | From vercel.com/account/tokens | Vercel env |
| `VERCEL_PROJECT_ID` | geo-landing project ID | Vercel env |
| `SKOOL_INVITE_URL` | `https://www.skool.com/inspired-agent-community-2811/about` | Vercel env |

---

## What Stays Manual (Misti)

- **LinkJolt** — add `[slug].heypearl.io` as an offer, send invite link
- **Headshot URL** — affiliates set their own via the setup wizard; GEO/Local clients don't need one
- **Meta Pixel ID** — optional, affiliate/client sets in their profile after setup

---

## Pre-existing Bug Fix (include in this build)

`app/api/admin/affiliates/route.ts:58` — slug validation uses `/^[a-z0-9-]+$/` (hyphens only). Must be updated to `/^[a-z0-9]+(\.[a-z0-9]+)+$/` to accept `first.last` format. This was missed in Phase 1 and causes the admin create form to silently fail on any `first.last` slug.

---

## Build Order

1. DB migrations (provisioning_jobs table, user_type + invite_token on affiliates)
2. Slug generation utility (`lib/provisioning.ts`)
3. GoDaddy + Vercel API helpers (`lib/dns.ts`)
4. Cron processor (`app/api/cron/provisioning/route.ts`)
5. Stripe webhook extension
6. Invite email templates (4 variants)
7. Admin provisioning API routes
8. Admin dashboard status UI
9. V2 landing page fallback fix
10. vercel.json cron entry + env vars
