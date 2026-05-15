# V2 Client Onboarding Design

## Goal

Add `/admin/v2` so Misti can onboard V2 (cashoffer) clients exactly like local affiliates. Each client gets:
- A password-protected leads portal at `/cashoffer/[slug]/leads` showing only their leads
- Auth system (login, setup, change-password, forgot/reset password) mirroring the affiliate pattern
- Admin CRUD at `/admin/v2` matching `/admin/affiliates` visually and functionally
- God admin sees ALL cashoffer leads at `/admin/v2-leads` (mirrors `/admin/local-leads` exactly)

## Domain

- **God demo:** `v2.heypearl.io/cashoffer` (NOT `geo.heypearl.io/cashoffer/demo`)
- **Client portals (login, leads, setup):** `v2.heypearl.io/cashoffer/[slug]/...`
- **Customer-facing funnel:** client's own custom domain (CNAME → Vercel) — heypearl URLs never exposed
- `v2.heypearl.io` is already verified and live on the geo-landing Vercel project

## Routing Changes to Existing Cashoffer Pages

The god demo currently lives at `app/cashoffer/[slug]/page.tsx` with slug `"demo"`. It moves to a dedicated non-dynamic route:

- `app/cashoffer/page.tsx` — god demo landing page (uses demo config directly, no DB lookup)
- `app/cashoffer/schedule/page.tsx` — god demo schedule page

The `app/cashoffer/[slug]/` dynamic route remains for all per-client pages (login, leads, setup, etc.). The slug `"demo"` is retired from `cashOfferConfigs` — god config key becomes `"cashoffer"` matching the path.

**Demo config updates:**
- `scheduleRoute`: `"/cashoffer/demo/schedule"` → `"/cashoffer/schedule"`
- `funnelTag`: `"demo"` → `"cashoffer"`
- `apiOptinRoute`: unchanged (`"/api/cashoffer-optin"`)

**Env var to add:**
- `NEXT_PUBLIC_V2_HOST=v2.heypearl.io` (used for invite links in admin)

---

## Database

### New table: `v2_clients`

Mirrors the `affiliates` table minus `tag`, `offers`, `headshot_url`, `linkjolt_url`. Adds `domain`.

| Column | Type | Notes |
|---|---|---|
| id | uuid pk default gen_random_uuid() | |
| name | text not null | display name |
| slug | text not null unique | matches cashoffer_leads.slug — this IS the tag |
| password_hash | text | null until setup complete |
| session_token | text | null when not logged in |
| invite_token | text | one-time setup link token |
| invite_used | boolean default false | flips true on setup complete |
| reset_token | text nullable | for forgot-password flow |
| reset_expires_at | timestamptz nullable | |
| calendly_url | text nullable | set during setup or by admin |
| meta_pixel_id | text nullable | admin-only |
| domain | text nullable | custom domain (e.g. offers.theirdomain.com) |
| active | boolean default true | |
| last_login | timestamptz nullable | |
| created_at | timestamptz default now() | |

### New table: `cashoffer_lead_status`

Mirrors `local_lead_status`. Partitions lead status per V2 client.

| Column | Type | Notes |
|---|---|---|
| id | uuid pk default gen_random_uuid() | |
| client_id | uuid not null references v2_clients(id) | |
| email | text not null | |
| status | text not null | active, met, no_show, client, unsubscribed |
| name | text nullable | manual override for lead name |
| phone | text nullable | |
| created_at | timestamptz default now() | |
| UNIQUE(client_id, email) | | |

Existing `cashoffer_leads` table is already correct. No changes needed — it already tags rows by `slug`.

---

## Authentication

### `lib/v2client.ts` (mirrors `lib/affiliate.ts`)

New file. `getV2ClientFromRequest(req)` reads cookie `v2client_auth` (format: `{slug}:{sessionToken}`), queries `v2_clients` by slug + session_token + active=true, returns `V2ClientSession | null`.

Cookie name is `v2client_auth` (not `affiliate_auth`) to avoid collision when the same browser has both sessions.

```typescript
export interface V2ClientSession {
  id: string;
  slug: string;
  name: string;
  calendly_url: string | null;
}
```

---

## API Routes

All routes mirror `/api/affiliate/` exactly. New prefix: `/api/v2client/`.

| Route | Method | Purpose |
|---|---|---|
| `/api/v2client/login` | POST | slug + password → set `v2client_auth` cookie |
| `/api/v2client/logout` | POST | clear cookie |
| `/api/v2client/me` | GET | return session data |
| `/api/v2client/setup` | GET | validate invite token |
| `/api/v2client/setup` | POST | complete setup (password + calendlyUrl) |
| `/api/v2client/change-password` | POST | change password (requires auth) |
| `/api/v2client/forgot-password` | POST | log only for now (no email) |
| `/api/v2client/reset-password` | POST | complete password reset |
| `/api/v2client/leads` | GET | paginated leads from cashoffer_leads filtered by slug |
| `/api/v2client/lead-status` | POST | upsert cashoffer_lead_status |

Admin routes:

| Route | Method | Purpose |
|---|---|---|
| `/api/admin/v2clients` | GET | list all v2_clients with lead counts |
| `/api/admin/v2clients` | POST | create new client (name + slug) |
| `/api/admin/v2clients/[id]` | PATCH | update calendly_url, meta_pixel_id, domain, active, newPassword, regenerateInvite |
| `/api/admin/v2-leads` | GET | all cashoffer_leads across all slugs, paginated + search |

---

## Client-Facing Pages

### `app/cashoffer/[slug]/layout.tsx` (mirrors `/[slug]/layout.tsx`)

Protected paths: `/leads`, `/change-password`. Auth check against `/api/v2client/me`. On 401 → redirect to `/cashoffer/[slug]/login`. Nav shows "Leads" only (no activity tab for V2). Header: `{name}'s Dashboard`.

### `app/cashoffer/[slug]/login/page.tsx` (mirrors `/[slug]/login/page.tsx`)

- POST to `/api/v2client/login` with `{ slug, password }`
- On success → redirect to `/cashoffer/[slug]/leads`
- "Cash Offers" branding in header instead of "HeyLocal"

### `app/cashoffer/[slug]/setup/page.tsx` (mirrors `/[slug]/setup/page.tsx`, simplified)

Two steps:
1. Set password + confirm
2. Add Calendly URL (optional, can skip)

No headshot since they're a business. POST to `/api/v2client/setup`. On success → redirect to `/cashoffer/[slug]/leads`.

### `app/cashoffer/[slug]/leads/page.tsx` (mirrors `/[slug]/leads/page.tsx`)

- Fetches `/api/v2client/leads`
- Columns: Name, Address, Email, Phone, Status, Date
- Same status filters: All, Active, Met, No Show, Client, Unsubscribed
- Same sort/search/pagination as affiliate leads

### `app/cashoffer/[slug]/change-password/page.tsx`

Mirrors `/[slug]/change-password/page.tsx`. POST to `/api/v2client/change-password`.

### `app/cashoffer/[slug]/forgot-password/page.tsx`

Mirrors `/[slug]/forgot-password/page.tsx`. POST to `/api/v2client/forgot-password`.

### `app/cashoffer/[slug]/reset-password/page.tsx`

Mirrors `/[slug]/reset-password/page.tsx`. POST to `/api/v2client/reset-password`.

---

## Admin Pages

### `app/admin/v2/page.tsx` (mirrors `/admin/affiliates/page.tsx`)

**Create form:** name + slug. No offers selector. Click "Create Client" → POST `/api/admin/v2clients` → show invite link.

**Invite link format:** `https://v2.heypearl.io/cashoffer/{slug}/setup?token={inviteToken}`

**Table columns:** Name, Slug / Funnel URL, Status (Pending Setup / Active), Leads, Calendly, Meta Pixel, Domain, Actions.

**Actions per row:**
- Deactivate / Activate toggle
- Set Password (inline input like affiliates)
- New Invite (only when invite_used = false)
- Inline editing: Calendly, Pixel, Domain

**Funnel URL shown:** `v2.heypearl.io/cashoffer/{slug}`

### `app/admin/v2-leads/page.tsx` (mirrors `/admin/local-leads/page.tsx`)

God admin view of ALL cashoffer leads across all V2 clients and the god demo page.

- Fetches `/api/admin/v2-leads` (paginated, search by name/email/address)
- Columns: Name, Address, Email, Phone, Slug, Date
- Same search + pagination pattern as `/admin/local-leads`

### Admin nav

Add "V2 Clients" and "V2 Leads" links to `app/admin/layout.tsx` nav.

---

## Landing Page DB Merge

**Modify `app/cashoffer/[slug]/page.tsx`:**

After looking up static config from `cashOfferConfigs`, fetch the `v2_clients` row for this slug and override `calendlyUrl` and `metaPixelId` from DB.

```typescript
const staticConfig = cashOfferConfigs[slug];
if (!staticConfig) notFound();

let config = staticConfig;
const { data: client } = await supabase
  .from("v2_clients")
  .select("calendly_url, meta_pixel_id")
  .eq("slug", slug)
  .eq("active", true)
  .maybeSingle();
if (client) {
  config = {
    ...staticConfig,
    calendlyUrl: client.calendly_url ?? staticConfig.calendlyUrl,
    metaPixelId: client.meta_pixel_id ?? staticConfig.metaPixelId,
  };
}
```

Same pattern applies to `app/cashoffer/[slug]/schedule/page.tsx`.

The god demo pages (`app/cashoffer/page.tsx` and `app/cashoffer/schedule/page.tsx`) use the static config directly — no DB lookup.

---

## What Does NOT Change

- `cashoffer_leads` table — unchanged, already has slug
- `cashOfferConfigs` registry — config key changes from `"demo"` to `"cashoffer"`, new clients added here + to v2_clients DB
- Existing affiliate auth system — completely separate, no changes
- `CashOfferLandingPage.tsx` and `CashOfferSchedulePage.tsx` templates — unchanged
