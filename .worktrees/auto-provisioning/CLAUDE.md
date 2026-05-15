@AGENTS.md
@.claude/rules/deploy-checklist.md
@.claude/rules/supabase-rules.md
@.claude/rules/email-system-rules.md
@.claude/rules/vercel-rules.md
@.claude/rules/lead-data-rules.md
@.claude/rules/replication-checklist.md
@.claude/rules/affiliate-verification-agent.md

---

# HeyPearl — geo-landing (Source of Truth)

## THE REPLICATION SYSTEM — READ THIS FIRST

HeyPearl is a replication system. This is the core architectural vision. Every decision must be consistent with it.

### God → Child Replication Rules

**Admin (`/admin`) = God Portal.** It is the full-featured master version of everything.

**Every `/leads` portal = replica of admin.** Affiliates, V2 clients, GEO clients, local clients, every current and future offer — their `/leads` portal is admin minus admin-only privileges. Features are identical across ALL offers and ALL portals. Scope is limited to their own data only.

**When a feature improves on admin, it replicates to ALL portals automatically on next deploy.** One change, every portal updated. No exceptions, no per-portal variations.

**When a new offer is added → child portal pages replicate.**
**When a new affiliate is added → their portal replicates.**
**When a new client is added → their portal replicates.**

### What Replicates vs What Stays in Admin

**Replicates to ALL portals, ALL offers (features only):**
- Lead detail page (campaign controls, suppress, sequences, reminders, timeline, notes, status)
- Sorting, filtering, search
- Upload list, add lead manually
- Calendar integration (each user gets their own calendar)
- Any future feature added to admin leads
- This applies equally to: GEO affiliates, V2 affiliates, Local affiliates, V2 clients, GEO clients, Local clients, and any future offer

**Admin-only — NEVER replicates to portals:**
- Viewing ALL leads across all portals (portals see their own leads only)
- Adding new offers
- Adding new affiliates
- Adding new clients/customers
- Managing the affiliate list
- Any account creation or system management

### The Sacred Rule — User Data is Never Touched by System Changes

**NEVER modify, remove, migrate, or alter:**
- Individual leads belonging to a user
- Notes (affiliate notes, client notes, admin notes)
- Tags on leads
- Any user-generated content

Features improve and change over time. User data belongs to the user and is never touched at the system level. A deploy that improves the lead detail UI must never alter, overwrite, or remove a single note, tag, or lead record. These are permanent and sacred.

### Summary

> Admin = god. Portals = replicas. Features replicate. User data never moves. Admin-only items never reach portals.

This is not a guideline. This is the architecture.

---

## What This Is

This is the HeyPearl offer ecosystem. One codebase, one Vercel project, one Supabase database — serving multiple offers across multiple subdomains. Everything lives here. The project is **production-deployed and live**. Do not break what works. Improve forward only.

**Project codename:** `geo-landing`
**Repo path:** `/Users/mistibruton/Desktop/geo-landing`

---

## The Offers

HeyPearl has four live offers. New offers will be added. Every new offer must follow the same patterns as existing ones — no one-offs, no special snowflakes.

| Offer | What It Is | Domain | God Demo |
|---|---|---|---|
| **GEO** | AI Visibility Score audit funnel for real estate agents | `geo.heypearl.io` | `geo.heypearl.io/` |
| **V2** | Done-for-you listing appointment system for agents | `v2.heypearl.io` | `v2.heypearl.io/` |
| **Local** | HeyLocal — local services lead gen | `local.heypearl.io` | `local.heypearl.io/` |
| **Affiliate** | Affiliate partner dashboard + branded funnels | `affiliate.heypearl.io` | n/a |

---

## Domain Architecture

All subdomains point to the same Vercel project. Middleware routes them to the correct Next.js pages.

```
geo.heypearl.io        → main GEO funnel (app/ root pages)
v2.heypearl.io         → V2 offer (rewrite root → /v2, /schedule → /v2schedule)
local.heypearl.io      → HeyLocal funnel (rewrite root → /local, /prices → /localpricing, /schedule → /localschedule)
affiliate.heypearl.io  → Affiliate portal (rewrite root → /affiliate)
```

**Middleware file:** `middleware.ts` (grandfathered — do not create new middleware files per Vercel rules)

**Middleware routing rules (current state — do not change without explicit instruction):**
- `local.*` → root rewrites to `/local`, `/prices|/pricing` → `/localpricing`, `/schedule` → `/localschedule`
- `v2.*` → root rewrites to `/v2`, `/schedule` rewrites to `/v2schedule`, single-segment slugs (`/[slug]`) rewrite to `/v2/[slug]` (affiliate landing pages), cashoffer/v2/v2schedule excluded
- `affiliate.*` → root rewrites to `/affiliate`, API/_next/favicon pass through
- `[slug].*` → any unknown subdomain rewrites to `/card/[slug]` (affiliate business cards); static file extensions (png/jpg/svg etc.) pass through
- `/v2` on main domain → redirects to `https://v2.heypearl.io` (erased from geo domain)
- `/admin` routes → protected by `admin_auth` cookie

---

## Stack

- **Framework:** Next.js 16.2.0 + TypeScript + Tailwind (App Router)
- **Database:** Supabase — project `jntughoiksxosjapklfo`
- **Email:** Resend — only active email provider. From address is dynamic via `EMAIL_FROM_POOL` env var (hash-based rotation) with `EMAIL_FROM` as fallback. Flodesk is removed as a sender; `/api/admin/flodesk-leads` exists only as a legacy CSV import tool.
- **Payments:** Stripe (links in `app/api/admin/calls/route.ts`)
- **Hosting:** Vercel — deploy with `/opt/homebrew/bin/vercel --prod`
- **Admin login:** `misti@mistibruton.com`

---

## Directory Structure

```
app/
  page.tsx                    — GEO main landing page
  schedule/page.tsx           — GEO strategy call schedule (GeoSchedulePage component)
  audit/                      — GEO audit flow (send leads here, NOT root)
  score/                      — GEO score results page (reached after audit completes)
  v2/
    page.tsx                  — V2 sales page (served at v2.heypearl.io root)
    [slug]/                   — V2 affiliate landing pages (per affiliate)
  v2schedule/page.tsx         — V2 schedule page (green color scheme)
  cashoffer/
    page.tsx                  — Cashoffer GOD DEMO (static, v2.heypearl.io/cashoffer)
    schedule/page.tsx         — Cashoffer god demo schedule (static)
    [slug]/                   — Per-client cashoffer pages (login, leads, setup, etc.)
      layout.tsx              — Auth guard + nav for client dashboard
      login/page.tsx
      setup/page.tsx          — Invite token → password + Calendly
      leads/page.tsx          — Client's leads portal
      change-password/page.tsx
      forgot-password/page.tsx
      reset-password/page.tsx
  local/                      — HeyLocal landing page
  localschedule/              — HeyLocal schedule
  localpricing/               — HeyLocal pricing
  affiliate/                  — Affiliate portal root
  [slug]/                     — GEO affiliate pages (leads, activity, schedule, etc.)
  admin/
    layout.tsx                — Admin nav (Activity, Leads, Campaigns, Offers, Affiliates, V2 Clients, V2 Leads)
    v2/page.tsx               — V2 client management (create, invite, edit)
    v2-leads/page.tsx         — All cashoffer leads god view
    affiliates/               — Affiliate management
    local-leads/              — All HeyLocal leads god view
    leads/                    — GEO leads
    ...
  api/
    v2client/                 — V2 client auth + leads endpoints
    affiliate/                — Affiliate auth endpoints
    admin/
      v2clients/              — Admin CRUD for v2_clients
      v2-leads/               — Admin god view of cashoffer leads
      affiliates/             — Admin CRUD for affiliates
      local-leads/            — Admin god view of local leads
      ...
    cashoffer-optin/          — Cashoffer lead capture
    local-optin/              — HeyLocal lead capture (writes to geo_local_submissions + geo_email_queue)
    cron/                     — Queue processors (see vercel.json for all 5 scheduled jobs)
  templates/
    cashoffer/
      CashOfferLandingPage.tsx   — Cashoffer template component
      CashOfferSchedulePage.tsx  — Cashoffer schedule template
      configs/
        index.ts              — Registry of all cashoffer configs
        demo.ts               — God demo config (funnelTag: "cashoffer")
    local-services/
      LocalLandingPage.tsx
      LocalSchedulePage.tsx
  components/
    V2Form.tsx                — V2 lead capture form (green color scheme)
    GeoSchedulePage.tsx       — GEO schedule (pink/navy — do NOT change colors)
lib/
  resend.ts                   — Supabase client export + Resend client
  source.ts                   — buildLeadSource() + buildImportTag() — EVERY opt-in route uses this
  affiliate.ts                — getAffiliateFromRequest() — reads affiliate_auth cookie
  v2client.ts                 — getV2ClientFromRequest() — reads v2client_auth cookie
  sequences.ts                — Email sequence definitions + delays
  email-config.ts             — INSTANT_EMAILS + INSTANT_KEYS config
  emails/
    templates.ts              — All email template functions
    base.ts                   — Base email components + footer text
```

---

## Authentication Architecture

Three separate auth systems. They use different cookies to avoid session collision.

| System | Cookie | Format | Table |
|---|---|---|---|
| Admin | `admin_auth` | token string | env var `ADMIN_TOKEN` |
| Affiliate | `affiliate_auth` | `{slug}:{sessionToken}` | `affiliates` |
| V2 Client | `v2client_auth` | `{slug}:{sessionToken}` | `v2_clients` |

**Admin auth pattern** (used in all `/api/admin/` routes):
```typescript
function adminAuth(req: NextRequest) {
  const cookieAuth = req.cookies.get("admin_auth")?.value === (process.env.ADMIN_TOKEN ?? "geo-admin-authenticated");
  const keyAuth = req.headers.get("x-admin-key") === process.env.ADMIN_TOKEN;
  return cookieAuth || keyAuth;
}
```

**Affiliate auth:** `lib/affiliate.ts` → `getAffiliateFromRequest(req)`
**V2 Client auth:** `lib/v2client.ts` → `getV2ClientFromRequest(req)`

---

## Vapi AI Voice (Pearl)

Pearl is HeyPearl's conversational AI. Currently live on `local.heypearl.io` as a test.

**Stack decision:** Vapi for voice, OpenAI (GPT-4o-mini) for web chat, Twilio for SMS (future).

**Credentials:**
- Vapi Public Key: `0288af3c-84ff-465c-9195-8387806941f5`
- Vapi Assistant ID: `b73d9e5f-ba8d-4a7b-892b-8056c493a00a`
- OpenAI key: already in `.env.local` as `OPENAI_API_KEY`

**Pearl avatar:** `/public/pearl-avatar.jpg` — used as the round call button in the hero

**Component:** `app/components/VapiWidget.tsx` — floating widget (available for future use)

**Inline button pattern:** `VapiCallButton` component is defined inside `LocalLandingPage.tsx`. Pearl's round photo is the button — tap to call, tap to end.

**Config pattern:** Vapi keys live in `LocalServicesFunnelConfig` (`vapiPublicKey`, `vapiAssistantId`). Set in `configs/heylocal.ts`. Replicas inherit automatically via `...heylocal` spread. Never pass as page-level props.

**Sales system prompt:** Written — proactive voice agent that opens with "What kind of business do you run?", identifies pain point, pitches HeyLocal, invites to book free call. Paste into Vapi dashboard → Assistants → `b73d9e5f` → Model → System Prompt.

**Support assistant:** `aff09f34-21b1-440d-a9de-e877ee67a232` — live on all affiliate v-cards via `VapiSupportCard`. Handles FAQs, status updates, human transfer, booking.

**NEVER use a floating widget.** Always build embedded static cards using `@vapi-ai/web`. Reference: `VapiSupportCard.tsx` and `VapiCallButton` in `LocalLandingPage.tsx`.

**Possible future expansion:** OpenAI chat widget inside `/leads` dashboard, Twilio SMS (not planned, not in progress).

---

## God Template Pattern (CORE RULE)

> God = source of truth. All clients inherit from the god. **Any feature on a god page that is NOT in the config type will NOT reach replicas. This is a fatal mistake.**

- The **god demo** for each offer is a static page with no DB lookup — it uses hardcoded config
- **Per-client pages** look up their config from DB and merge overrides on top of the static config
- The god demo lives at the offer's root path (e.g., `v2.heypearl.io/cashoffer`)
- Client funnels live at `[offer]/[slug]/` (e.g., `v2.heypearl.io/cashoffer/acme`)
- **Affiliates** get copies of the sales page at their own slug
- **Offer clients** (V2, GEO) get client-funnel copies (leads portal, auth) at their own domain/slug

**DB merge pattern** (used in per-client landing pages):
```typescript
const staticConfig = cashOfferConfigs[slug];
if (!staticConfig) notFound();

const { data: client } = await supabase
  .from("v2_clients")
  .select("calendly_url, meta_pixel_id")
  .eq("slug", slug)
  .eq("active", true)
  .maybeSingle();

const config = client
  ? { ...staticConfig, calendlyUrl: client.calendly_url ?? staticConfig.calendlyUrl, metaPixelId: client.meta_pixel_id ?? staticConfig.metaPixelId }
  : staticConfig;
```

---

## Color System (Do Not Cross-Contaminate)

Each offer has its own color identity. Never apply one offer's colors to another.

| Offer | Primary | Background (light sections) | Dark sections |
|---|---|---|---|
| GEO | `#E8185C` (pink/red) | `#EDF0FA` (blue-purple) | `#0F1E3A` (navy) |
| V2 | `#16A34A` (green) | `#F7F8FC` (near-white) | `#0F1E3A` (navy) |
| Cashoffer | `#16A34A` (green) | `#F7F8FC` | `#0F1E3A` (navy) |
| HeyLocal | Uses `colorPrimary` from config | `#F7F8FC` | `#0F1E3A` (navy) |

**GeoSchedulePage.tsx** uses GEO colors (pink). Do NOT change it — it serves geo.heypearl.io/schedule.
**V2Form.tsx + v2schedule** use green. Calendly embed `primary_color=16A34A`.

**Rule:** In dark sections, use `colorPrimary` for buttons/accents, not `colorButton`. (HeyLocal lesson.)

---

## Database Tables (Supabase — project `jntughoiksxosjapklfo`)

### Offer Client Tables
| Table | Purpose |
|---|---|
| `affiliates` | GEO/V2 affiliate partners — auth, offers, headshot, Calendly, tag |
| `v2_clients` | Cashoffer clients — auth, invite flow, calendly_url, meta_pixel_id, domain, slug |
| `cashoffer_lead_status` | Per-client lead status overrides — FK to v2_clients, UNIQUE(client_id, email) |

### Lead Tables
| Table | Purpose |
|---|---|
| `cashoffer_leads` | All cashoffer leads — tagged by `slug` (matches v2_clients.slug) |
| `geo_audit_history` | GEO audit submissions — has `source_tag`, `source_url` columns |
| `geo_claim_submissions` | GEO claim form submissions (safety net, written before email logic) |
| `geo_scheduled_calls` | Calendly strategy call bookings |
| `geo_email_queue` | Email queue — has `geo_email_queue_sequence_check` constraint (add new keys or inserts fail silently) |
| `geo_suppressed` | Source of truth for suppression/client status |
| `geo_lead_tags` | Universal source of truth for ALL affiliate lead filtering across ALL offers |
| `geo_local_submissions` | HeyLocal opt-ins — has `source_tag`, `source_url`, `source_tag_legacy` (NOT NULL) |
| `affiliate_lead_notes` | Private notes per affiliate per lead — never visible to other affiliates or admin |
| `geo_lead_notes` | Admin-only internal notes per lead — never visible to affiliates |
| `local_lead_status` | Manual status overrides (met/no_show/client) per affiliate+email — works for ALL offers despite name |

### Views
| View | Note |
|---|---|
| `geo_lead_scores` | READ ONLY — cannot upsert. Derive tier from `geo_suppressed.reason` |

### Key Columns
- `affiliates.tag` — used to filter leads; separate from `slug`
- `v2_clients.slug` — IS the tag for cashoffer leads (cashoffer_leads.slug matches this)
- `affiliates.offers` — array field, e.g. `["v2", "geo"]` — used to gate access to per-offer pages
- `cashoffer_lead_status.status` — valid values: `active`, `met`, `no_show`, `client`, `unsubscribed`

---

## V2 Client Onboarding System (Built 2026-04-01)

The full system for onboarding cashoffer clients. **Do not rebuild this — it is live.**

**Admin flow (Misti):**
1. `geo.heypearl.io/admin/v2` → create client (name + slug) → copy invite link
2. Invite link format: `https://v2.heypearl.io/cashoffer/{slug}/setup?token={inviteToken}`
3. Admin can set password, Calendly, Meta Pixel, custom domain, toggle active, regenerate invite

**Client setup flow:**
1. Client visits invite link → validates invite_token → sets password (+ optional Calendly) → auto-logs in → lands on leads
2. Login: `v2.heypearl.io/cashoffer/{slug}/login`
3. Leads portal: `v2.heypearl.io/cashoffer/{slug}/leads`

**API routes:**
- `/api/v2client/login|logout|me|setup|change-password|forgot-password|reset-password`
- `/api/v2client/leads` — paginated, filtered by client's slug
- `/api/v2client/lead-status` — upsert cashoffer_lead_status
- `/api/admin/v2clients` — GET list + POST create
- `/api/admin/v2clients/[id]` — PATCH (active, calendly, pixel, domain, password, regenerateInvite)
- `/api/admin/v2-leads` — god view of all cashoffer leads

**Env var:** `NEXT_PUBLIC_V2_HOST=v2.heypearl.io` (used for invite link generation)

**Forgot/reset password:** Stubs only — no email implementation yet. Client contacts Misti to reset.

---

## Affiliate System (Existing — Do Not Break)

Affiliates have access to specific offers via `affiliates.offers` array.

- Dashboard: `geo.heypearl.io/[slug]/leads`, `/[slug]/activity`, `/[slug]/schedule`
- Auth cookie: `affiliate_auth` = `{slug}:{sessionToken}`
- Affiliate landing pages: `geo.heypearl.io/[slug]` (GEO) or `v2.heypearl.io/[slug]` (V2 — middleware rewrites to `/v2/[slug]` internally)
- Business card (v-card): `[slug].heypearl.io` (auto-routed via middleware → `/card/[slug]`)
- **V2 affiliate pages use `V2LandingPage` component** (`app/v2/V2LandingPage.tsx`) — renders the full god landing page with `affiliateTag` passed to the form. Never render just `V2FormComponent` alone.
- Leads filtered by `affiliates.tag` (not slug)
- Email sequences: `affiliate_schedule_abandoned`, `affiliate_post_booking`
- Calendly detection via email lookup
- `get_leads_page` RPC: excludes `affiliate_application` source, has `fallen_off` boolean field

### V-Card (`app/card/[slug]/page.tsx`) — current hardcoded sections (all affiliates)

All of the following are hardcoded for every affiliate — no per-affiliate config needed:

| Section | Content |
|---|---|
| Offer buttons | GEO AI Visibility Engine, V2 Seller Attraction Engine, Local Business Growth Engine |
| Affiliate Resources | "My Leads Dashboard" → `geo.heypearl.io/[slug]/leads`, "HeyPearl HQ Community" → Skool link |
| Refer others | "Know Someone Who Could Benefit?" + "Become an Affiliate" → `affiliate.heypearl.io` |
| Contact Support | `mailto:support@heypearl.io` |

**Offer button URL format:**
- GEO: `https://geo.heypearl.io/[slug]`
- V2: `https://v2.heypearl.io/[slug]`
- Local: `https://local.heypearl.io/[slug]`

## New Affiliate Onboarding Checklist (Misti — Manual Steps)

Do these every time a new affiliate is created:

### 1. Create in Admin
Go to `geo.heypearl.io/admin/affiliates` → create affiliate with name, slug, offers, headshot URL, Calendly URL, phone, email, Meta Pixel ID.

**Slug format:** Always use `first.last` (e.g. `todd.smith`). The form enforces this. If the name is taken, add a number (`todd.smith2`). Existing slugs are unchanged — this applies to new entries only.

### 2. Set Up Business Card Domain (GoDaddy + Vercel)

**GoDaddy** — heypearl.io DNS — add two records:

| Type | Name | Value |
|------|------|-------|
| CNAME | `[slug]` | `cname.vercel-dns.com` |
| TXT | `_vercel` | *(value from step b below — add as new entry, no trailing spaces!)* |

**Vercel** — geo-landing project → Settings → Domains → Add Existing:
- a. Type `[slug].heypearl.io` and submit
- b. Click "Learn more" on the new domain — copy the TXT value shown (e.g. `vc-domain-verify=[slug].heypearl.io,XXXX`)
- c. Paste that value into the GoDaddy `_vercel` TXT record (new entry, not replacing existing ones)
- d. **No trailing spaces** — press End then Backspace 2-3 times before saving in GoDaddy
- e. Wait 2-5 min, refresh Vercel — should show "Valid Configuration"

### 3. Meta Pixel
Enter the affiliate's Facebook Pixel ID in the Meta Pixel ID field when creating/editing them in admin. The card page injects it automatically.

### 4. LinkJolt
- Add their card URL (`[slug].heypearl.io`) as an offer
- Send them the invite link to join

### 5. Verify
Visit `https://[slug].heypearl.io` — should show the affiliate's card with their photo, name, contact info, and offer buttons.

---

## HeyLocal System (Existing — Do Not Break)

- Subdomain: `local.heypearl.io`
- Pages: `/local`, `/localschedule`, `/localpricing`
- DB writes in `/api/local-optin/route.ts` are **live** — writes to `geo_local_submissions` and inserts a `local_nurture` sentinel row (send_at: 2099) into `geo_email_queue` so leads appear in admin
- Uses `colorPrimary` from config for buttons in dark sections (not `colorButton`)
- Pearl AI voice widget live on `local.heypearl.io` What We Do section — see Vapi section below

### Adding a new HeyLocal affiliate

**`heylocal.ts` is the god and the only master copy.** Every affiliate spreads from it. When you update content in `heylocal.ts`, all affiliates get it automatically on next deploy. You never touch an affiliate file for content — only for their personal identity fields. Never copy from another affiliate file; they may leave.

1. Create `app/templates/local-services/configs/[name].ts`
2. Import and spread **only from `heylocal.ts`** — never from another affiliate file
3. Override only identity fields: `funnelTag`, `scheduleRoute`, `pricingRoute`, `founder`, `calendlyUrl`, `metaPixelId`, and optionally `colorButton`, `logoUrl`, `heroPhoto`, Vapi keys
4. Never hardcode any marketing copy, services, FAQs, pain cards, steps, testimonials, or stats — those must come from the god
5. Create `app/[name]schedule/page.tsx` and `app/[name]pricing/page.tsx` using the new config
6. Add middleware route for the affiliate's subdomain if they have one

```ts
import heylocalConfig from "./heylocal";
const config = {
  ...heylocalConfig,
  funnelTag: "[name]",
  scheduleRoute: "/[name]schedule",
  pricingRoute: "/[name]pricing",
  founder: { ...heylocalConfig.founder, initials: "XX", name: "Full Name", title: "HeyLocal" },
  // + any other identity overrides
};
```

---

## Email System

See `.claude/rules/email-system-rules.md` for full rules. Key points:

- Queue-based. Sequences defined in `lib/sequences.ts`
- Adding a new sequence = 4 files: `sequences.ts`, `templates.ts`, `base.ts`, DB constraint migration
- `purchased_welcome` and `hot_proof` are exempt from suppression cancellation — do not change
- `INSTANT_EMAILS` and `INSTANT_KEYS` in `lib/email-config.ts` must match exactly
- Cron jobs (all defined in `vercel.json`): `/api/cron` every 15 min, `/api/cron/graduate` daily 10am, `/api/cron/process-calls` every 30 min, `/api/cron/audit-emails` every 30 min, `/api/cron/refresh-templates` weekly Monday 11am
- Test sends go to `misti@heypearl.io`

---

## Source Attribution System (Phase 1 — Live)

Every opt-in stamps two fields on the lead record:

| Field | Example | Meaning |
|---|---|---|
| `source_tag` | `geo_todd.smith` | Offer + affiliate slug |
| `source_url` | `geo.heypearl.io/todd.smith` | Full URL where lead came in |

**Utility:** `lib/source.ts` — import and call from every opt-in route. Never hardcode.

```typescript
// Relative path varies by file depth — adjust "../" count to reach project root
import { buildLeadSource } from "../../../lib/source";
const { source_tag, source_url } = buildLeadSource(req, affiliateSlug || null);
```

### Tag Format Rules (never deviate)

| Scenario | source_tag | source_url |
|---|---|---|
| Affiliate GEO page | `geo_todd.smith` | `geo.heypearl.io/todd.smith` |
| Affiliate V2 page | `v2_todd.smith` | `v2.heypearl.io/todd.smith` |
| Affiliate Local page | `local_todd.smith` | `local.heypearl.io/todd.smith` |
| GEO admin/god page | `geo_admin` | `geo.heypearl.io` |
| V2 admin/god page | `v2_admin` | `v2.heypearl.io` |
| Local admin/god page | `local_admin` | `local.heypearl.io` |
| CSV import | `import_v2_expired_listings` | (none — use `buildImportTag(campaignName)`) |

### Import Tags (CSV uploads)

```typescript
import { buildImportTag } from "../../../../lib/source";
const import_tag = buildImportTag(campaign_name); // "v2-expired-listings" → "import_v2_expired_listings"
```

### Slug Convention (new affiliates and clients)

All new affiliates and clients must use `first.last` slug format (e.g. `todd.smith`). Admin enforces this at creation time. Existing slugs are unchanged. DB uniqueness is enforced at creation — admin chooses a unique slug if there's a name conflict (`todd.smith`, `todd.smith2`).

### Tables with source attribution columns

| Table | source_tag | source_url | Notes |
|---|---|---|---|
| `geo_audit_history` | ✅ TEXT nullable | ✅ TEXT nullable | Written by `generate-audit-email` route |
| `geo_local_submissions` | ✅ TEXT nullable | ✅ TEXT nullable | Old `source_tag` renamed to `source_tag_legacy` (NOT NULL) — still written |

### Hard Rules

1. Every opt-in route MUST call `buildLeadSource()` — never skip, never hardcode
2. `buildImportTag()` for CSV uploads — always derived from campaign name, never typed
3. Format is always `{offer}_{slug}` for live opt-ins, `import_{offer}_{type}` for imports
4. `source_tag_legacy` on `geo_local_submissions` is NOT NULL — always write the funnel value there

---

## Repeatable Pattern for New Offers

When adding a new offer, follow this exact pattern:

1. **Domain:** Add subdomain to Vercel, add GoDaddy CNAME + TXT verification, add middleware routing block
2. **God demo:** Create `app/[offer]/page.tsx` (static, no DB) + schedule page
3. **Config:** Add to `app/templates/[offer]/configs/index.ts`, create `demo.ts` config
4. **DB tables:** `[offer]_clients` (mirrors `v2_clients`) + `[offer]_lead_status` (mirrors `cashoffer_lead_status`)
5. **Auth helper:** `lib/[offer]client.ts` (mirrors `lib/v2client.ts`) — new cookie name `[offer]client_auth`
6. **API routes:** `/api/[offer]client/` (login, logout, me, setup, change-password, leads, lead-status)
   - `leads/route.ts` must have both GET (paginated list) AND POST (individual manual add)
   - `leads/upload/route.ts` must exist — pushes CSV to Instantly tagged with `client_slug` + `offer=[offer]`
7. **Client pages:** `app/[offer]/[slug]/` (layout, login, setup, leads, change-password)
   - `leads/page.tsx` must include **Upload List** button (→ `/api/[offer]client/leads/upload`) and **Add Lead** button (→ POST `/api/[offer]client/leads`)
   - This is the god template for all clients — one file, all clients auto-inherit on deploy
8. **Admin API:** `/api/admin/[offer]clients/` (GET list, POST create, PATCH [id])
9. **Admin pages:** `app/admin/[offer]/page.tsx` + `app/admin/[offer]-leads/page.tsx`
10. **Nav:** Add to `app/admin/layout.tsx` NAV_LINKS
11. **Landing page DB merge:** Override calendly_url + meta_pixel_id from DB into static config
12. **Colors:** Each offer gets its own color palette — never share with other offers
13. **Env var:** `NEXT_PUBLIC_[OFFER]_HOST=[subdomain].heypearl.io`
14. **Instantly webhook routing:** Add the new `offer` value to the webhook handler at `app/api/webhooks/instantly/route.ts`. v2 inserts into `cashoffer_leads`; all other offers call `tagLead(email, clientSlug)` which routes into `geo_lead_tags`. If a new offer has its own lead table, add a new branch in the webhook.
15. **Source attribution:** In the opt-in route, call `buildLeadSource(req, affiliateSlug)` from `lib/source.ts` and save `source_tag` + `source_url` to the lead table. If the lead table doesn't have these columns yet, add them via Supabase migration (nullable TEXT). Never hardcode source_tag values.

### Lead Intake — Every /leads Dashboard (Required)
Every client or affiliate /leads page must have:
- **Upload List** → CSV goes to Instantly (shared campaign, tagged with `client_slug` + `offer`)
- **Add Lead** → manual single-lead form, writes directly to that offer's lead table
- When a tagged lead replies in Instantly, the webhook auto-routes them back to the correct /leads

Affiliates use `affiliate.tag` as `client_slug`, `offer=affiliate`. V2 clients use `client.slug`, `offer=v2`.

### Client vs Affiliate — Permanent Reference Table

**CRITICAL: These are two completely different user types. Never apply client labels to affiliate portals or vice versa.**

| User type | Who they are | Their portal URL | Portal file | What they upload | Campaign prefix |
|---|---|---|---|---|---|
| **V2 Client** | Paying customer — a real estate agent using the CashOffer/V2 system | `v2.heypearl.io/cashoffer/[slug]` | `app/cashoffer/[slug]/leads/page.tsx` | Home **sellers** (expired, pre-foreclosure, probate) | `v2-` |
| **V2 Affiliate** | Partner/reseller who promotes the V2 offer | `v2.heypearl.io/[slug]` | `app/[slug]/leads/page.tsx` | Real estate **agents** who specialize in seller niches — to pitch them V2 | `aff-` |
| **GEO Affiliate** | Partner/reseller who promotes the GEO offer | `geo.heypearl.io/[slug]` | `app/[slug]/leads/page.tsx` | Real estate **agents** segmented by buyer/seller focus | `aff-` |
| **Local Affiliate** | Partner/reseller who promotes the HeyLocal offer | `local.heypearl.io/[slug]` | `app/[slug]/leads/page.tsx` | Local business **owners** | `aff-` |
| **Admin (Misti)** | Internal — full access | `geo.heypearl.io/admin/upload` | `app/admin/upload/page.tsx` | Any cold list across any offer | any |

**Campaign separation rule — never cross these lines:**
- `v2-*`, `geo-*`, `local-*` campaigns → **paying clients only**
- `aff-*` campaigns → **affiliates only** — one per offer, never more

### Campaign Friendly Names — Every /leads Upload Modal (Required)
Every upload modal has a `campaignLabel()` function with a `CAMPAIGN_FRIENDLY_NAMES` map. Clients and affiliates use completely different campaign sets and labels.

**Current mappings:**

| Portal | Raw campaign name | Label shown |
|---|---|---|
| V2 **client** (`cashoffer/[slug]/leads`) | `v2-expired-listings` | Expired Sellers |
| V2 **client** | `v2-pre-foreclosures` | Pre-Foreclosure Sellers |
| V2 **client** | `v2-probate` | Probate Sellers |
| **Affiliate** (`[slug]/leads`) | `aff-v2` | V2 Seller Leads |
| **Affiliate** | `aff-geo` | GEO AI Visibility Leads |
| **Affiliate** | `aff-local` | Local Business Leads |

Files to update when adding a new campaign:
- **V2 client upload:** `app/cashoffer/[slug]/leads/page.tsx` → `CAMPAIGN_FRIENDLY_NAMES`
- **Affiliate upload:** `app/[slug]/leads/page.tsx` → `CAMPAIGN_FRIENDLY_NAMES`
- **Affiliate campaigns API:** `app/api/affiliate/campaigns/route.ts` → `OFFER_CAMPAIGN` map
- **Admin upload:** `app/admin/upload/page.tsx` → no mapping needed (admin sees raw names)

---

## Writing & Copy Rules

- **No em dashes (—)** in any copy — ever
- **"AI Visibility Score"** not "GEO Score"
- No exclamation points in professional copy
- Always deploy after `templates.ts` changes

---

## Workflow Rules

- **Present plan + get approval before writing any code**
- **Commit after each logical unit** — not just at end of session
- **`npm run build` before every deploy** — Vercel fails silently on type errors
- **`printf` not `echo`** for Vercel env vars — echo appends `\n` and silently breaks API calls
- **Do not change colors or styles** on pages outside `/admin` unless explicitly asked
- **Verify column names** against `information_schema.columns` before any Supabase query

---

## What Is Currently Live and Working (As of 2026-04-04 — foundation locked)

Do not rebuild, re-architect, or "improve" these unless explicitly asked:

- ✅ GEO main funnel — audit, score, schedule, email sequences, admin
- ✅ V2 sales page at `v2.heypearl.io` (green color scheme)
- ✅ V2 schedule at `v2.heypearl.io/v2schedule` (green, rewrites from /schedule)
- ✅ Cashoffer god demo at `v2.heypearl.io/cashoffer`
- ✅ V2 client onboarding — admin, invite flow, client auth, leads portal
- ✅ Affiliate system — dashboard, leads, sequences, auth
- ✅ HeyLocal funnel — landing, schedule, pricing (DB writes live — writes to `geo_local_submissions` + `geo_email_queue`)
- ✅ Pearl AI voice widget — live on `local.heypearl.io` What We Do section (sales system prompt written, paste into Vapi dashboard)
- ✅ Affiliate v-cards — redesigned, god config at `app/card/config.ts`, Pearl support widget, OG metadata, white buttons
- ✅ God v-card — `geo.heypearl.io/card` renders from `cfg.godProfile` in `app/card/config.ts`; change god profile → all affiliate cards inherit
- ✅ OG metadata architecture — one `meta.ts` per offer (`app/config/geoMeta.ts`, `app/v2/meta.ts`, `app/cashoffer/meta.ts`, `app/templates/local-services/meta.ts`, `app/affiliate/config.ts`, `app/card/meta.ts`). All pages import from their offer's file. OG images use config-driven colors via `hexToRgba()`. `metadataBase` set in `app/layout.tsx`. Middleware excludes `opengraph-image` + `twitter-image` from v2 rewrites.
- ✅ `colorOnPrimary` field in `LocalServicesFunnelConfig` — text color on primary-colored buttons. Set to `#0F1E3A` in `heylocal.ts` (lime is light). Default `#ffffff` for dark primaries. Used in `LocalLandingPage.tsx`, `LocalSchedulePage.tsx`, and `local/opengraph-image.tsx`.
- ✅ Affiliate /leads — mobile-friendly card layout, correct lead data across all offers
- ✅ Affiliate /calls — correct call list + outcome updates (attended/no show/bought/rescheduled) for all offers
- ✅ Affiliate /activity — correct stats and hot leads across all offers
- ✅ Admin affiliate list — correct lead counts for all offers
- ✅ Admin affiliate detail + leads view — correct lead data for all offers
- ✅ Admin — all offers managed from `geo.heypearl.io/admin`
- ✅ Email queue system — sequences, cron, templates
- ✅ Middleware — all subdomain routing
- ✅ Calendly — god pages use master Calendly (env var), affiliate pages use their own link (never mixed)
- ✅ Duplicate booking guard — idempotency check at top of Calendly webhook, dedupes by email+meeting_time
- ✅ Instantly lead intake — cold upload → Instantly, warm reply → webhook → /leads. Live for all offers (v2, geo, affiliate, god admin)
- ✅ Admin upload page — `geo.heypearl.io/admin/upload` — offer selector + campaign picker + CSV paste
- ✅ V2 client upload modal — campaign picker shows v2- campaigns with friendly names: "Expired Sellers", "Pre-Foreclosure Sellers", "Probate Sellers"
- ✅ Affiliate upload modal — campaign picker shows aff-* campaigns ONLY (1 per offer): "V2 Seller Leads", "GEO AI Visibility Leads", "Local Business Leads" — never shows v2-/geo-/local- client campaigns
- ✅ Instantly webhook — `app/api/webhooks/instantly/route.ts`, secret via `?secret=` query param, routes by offer+client_slug
- ✅ Instantly campaigns — 8 live campaigns: v2-expired-listings, v2-pre-foreclosures, v2-probate, geo-buyers, geo-sellers, aff-local, aff-geo, aff-v2 (no email sequences yet — add in Instantly before running)
- ✅ Phase 1 Source Attribution — `lib/source.ts` live. Every opt-in stamps `source_tag` + `source_url`. GEO audit, local opt-in, affiliate apply all covered. CSV uploads derive `import_tag` via `buildImportTag()`. Admin slug forms enforce `first.last` format.
- ✅ Instantly variable system — all 3 upload routes (admin, affiliate, v2 client) parse full CSV column set: email (required), first_name, last_name, city, address, phone, company, website, linkedin. Server auto-injects sender vars: `sender_name`, `sender_email`, `sender_phone`, `sender_calendly` — sourced from DB per user type. `lib/affiliate.ts` AffiliateSession includes phone + calendly_url.
- ✅ Instantly import reporting — all 3 upload portals show post-upload breakdown: red = hard failures (no email / Instantly rejection), yellow = soft warnings (missing first_name → fallback "there", missing city → fallback "your market"), green = clean import. Only missing/invalid email hard-skips a row.
- ✅ GEO Real Estate Agent Outreach sequence — 4 emails, Day 0/3/8/14 cadence. Uses `{{firstName|there}}`, `{{city|your market}}`, `{{sender_name|Misti}}`. Spintax on Step 1 subject. Each email standalone. Updated via Instantly API 2026-04-04.
- ✅ Affiliate Add Lead modal — city/market field added. All upload modal placeholders/hints show full column list.

## Lead Data Routing — Do Not Change Without Explicit Instruction

This is the established data architecture as of 2026-04-04. Every route in the system has been audited and corrected to follow this pattern:

- `geo_lead_tags` — universal source of truth for ALL affiliate lead filtering, across ALL offers, in ALL contexts (affiliate-facing and admin). Never replace this with `geo_local_submissions` for lead filtering or counting.
- `geo_local_submissions` — valid only for enrichment (pulling `business_type` for local leads) and in `admin/local-leads` (the HeyLocal-specific god view). Never use this table to count or list affiliate leads. **Column note:** the original `source_tag` column (stored the funnel/slug value) was renamed to `source_tag_legacy` in the Phase 1 migration. The new `source_tag` column is the clean attribution tag from `buildLeadSource()` (e.g. `local_todd.smith`). `source_tag_legacy` is NOT NULL — it must always be written.
- `local_lead_status` — stores manual status overrides (met/no_show/client) per affiliate per email. Scoped by `affiliate_id + email`. Works correctly for all offers despite the "local" in the table name.
- Affiliate notes (`affiliate_lead_notes`) are private per affiliate by design — "Only you can see these" is intentional.
- Admin notes (`geo_lead_notes`) are internal admin-only notes. Separate from affiliate notes by design.

---

## Key Files (Do Not Delete or Rename)

| File | Why It Matters |
|---|---|
| `middleware.ts` | All subdomain routing — touch with extreme care |
| `lib/resend.ts` | Supabase client used everywhere (`import { supabase } from "./resend"`) |
| `lib/source.ts` | Source attribution utility — `buildLeadSource()` and `buildImportTag()`. EVERY new opt-in route must call one of these. Never hardcode source_tag values. |
| `lib/affiliate.ts` | Affiliate session auth |
| `lib/v2client.ts` | V2 client session auth |
| `lib/sequences.ts` | All email sequence definitions |
| `lib/email-config.ts` | INSTANT_EMAILS config — must stay in sync with templates.ts |
| `app/api/cron/route.ts` | Email queue processor — hot_proof suppression exemption must stay |
| `app/templates/cashoffer/configs/index.ts` | Cashoffer config registry |
| `app/templates/local-services/configs/heylocal.ts` | HeyLocal god config — includes Vapi keys |
| `app/card/config.ts` | V-card god config — change here to update ALL affiliate cards |
| `app/card/[slug]/VapiSupportCard.tsx` | Pearl support widget for affiliate v-cards |
| `app/components/VapiWidget.tsx` | Floating Vapi widget (do NOT use — reference only) |
| `public/pearl-avatar.jpg` | Pearl AI avatar — used on local services and v-cards |
| `vercel.json` | Cron job definitions |
| `app/api/webhooks/instantly/route.ts` | Instantly reply webhook — routes all offers. Secret: `INSTANTLY_WEBHOOK_SECRET` env var. DO NOT change routing logic without reading the full comment block. |
