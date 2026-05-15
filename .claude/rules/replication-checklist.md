# Replication Checklist

This file is the single source of truth for what replicates across all portals and what must be done when adding a new offer, affiliate, or client.

**The law:** Admin = super admin. Every `/leads` portal for every offer (GEO, V2, Local, any future offer) = replica of admin minus admin-only features. When a feature ships in admin, it ships everywhere. No exceptions, no per-portal variations.

---

## Part 1 — Master Replication List

### Admin (God Portal) — Features

Admin has two categories of features: those that belong to admin only, and those that replicate out to all user portals.

#### Admin-only — NEVER replicates to user portals
These features exist only at `geo.heypearl.io/admin`. They make no sense in a user portal and must never be added there.

| Admin-only Feature | Why it stays in admin |
|---|---|
| View ALL leads across all portals | Users see only their own leads |
| Add new offers | System management — Misti only |
| Add new affiliates | System management — Misti only |
| Add new clients | System management — Misti only |
| Manage affiliate list | System management — Misti only |
| Manage V2 client list | System management — Misti only |
| Account creation (invite links, passwords) | System management — Misti only |
| Admin upload page (any offer, any campaign) | Misti uploads cold lists across all offers |
| View all affiliate activity / stats across all portals | God-view only |
| God-level suppress (suppress any lead across any portal) | Scoped suppress is in portals — nuclear global is admin |

#### Admin features that replicate to ALL user portals
When any of these are built or improved in admin, every portal inherits on the same deploy. No exceptions.

| Feature | Admin | GEO Aff | V2 Aff | Local Aff | V2 Client | Future | Status |
|---|---|---|---|---|---|---|---|
| Lead list — sortable, filterable, searchable | ✅ | ✅ | ✅ | ✅ | ✅ | inherit | Live |
| Lead detail — contact info, edit inline | ✅ | ✅ | ✅ | ✅ | ✅ | inherit | Live |
| Lead detail — status (auto cold/warm/hot + manual met/no_show/client) | ✅ | ✅ | ✅ | ✅ | ✅ | inherit | Live |
| Lead detail — notes (private per owner) | ✅ | ✅ | ✅ | ✅ | ✅ | inherit | Live |
| Upload list (CSV → Instantly, campaign picker) | ✅ | ✅ | ✅ | ✅ | ✅ | inherit | Live |
| Add lead manually | ✅ | ✅ | ✅ | ✅ | ✅ | inherit | Live |
| Source attribution stamped on every opt-in | ✅ | ✅ | ✅ | ✅ | ✅ | inherit | Live — Phase 1 |
| Lead detail — reminders (date + note, badge on list) | ✅ | ✅ | ✅ | ✅ | ✅ | inherit | **Phase 2 — not built** |
| Lead list — reminder filter pill (daily action queue) | ✅ | ✅ | ✅ | ✅ | ✅ | inherit | **Phase 2 — not built** |
| Lead detail — campaign controls (pause/resume/remove) | ✅ | ✅ | ✅ | ✅ | ✅ | inherit | **Phase 3 — not built** |
| Lead detail — channel controls (email/call/text pause) | ✅ | ✅ | ✅ | ✅ | ✅ | inherit | **Phase 4 — not built** |
| Lead detail — suppress/unsuppress (scoped to own leads) | ✅ | ✅ | ✅ | ✅ | ✅ | inherit | **Phase 4 — not built** |
| Lead detail — active sequence (view + cancel) | ✅ | ✅ | ✅ | ✅ | ✅ | inherit | **Phase 4 — not built** |
| Lead detail — activity timeline | ✅ | ✅ | ✅ | ✅ | ✅ | inherit | **Phase 5 — not built** |
| Calendar integration (each user gets their own) | ✅ | planned | planned | planned | planned | inherit | **Not built** |

### User Portals — Scoping Rules
Every portal above shows the same features. The difference is scope — never features.

| What differs per portal | What stays identical |
|---|---|
| Which leads they see (own only) | Every UI feature |
| Which campaigns they can upload to (their offer's `aff-*` or `v2-*` etc.) | Lead detail layout |
| Their own calendar | Sort/filter options |
| Their own notes (private) | Status labels |
| | Reminder system |
| | Timeline events |

**If you ever find yourself adding a feature to one portal but not others — stop. Build it in admin first, then confirm it replicates.**

---

## Part 2 — New Offer Checklist

Do every step when launching a new offer. Nothing optional.

### Infrastructure
- [ ] Add subdomain to Vercel project
- [ ] Add GoDaddy CNAME record: `[offer]` → `cname.vercel-dns.com`
- [ ] Add GoDaddy TXT record: `_vercel` → value from Vercel domain settings
- [ ] Add middleware routing block in `middleware.ts`
- [ ] Add `NEXT_PUBLIC_[OFFER]_HOST=[subdomain].heypearl.io` env var in Vercel

### God Demo
- [ ] Create `app/[offer]/page.tsx` — static, no DB lookup, uses hardcoded config
- [ ] Create schedule page for the offer
- [ ] Add offer to The Offers table in CLAUDE.md

### Config System
- [ ] Create `app/templates/[offer]/configs/demo.ts` — super admin demo config
- [ ] Create `app/templates/[offer]/configs/index.ts` — registry of all configs
- [ ] Set a unique color palette — never reuse another offer's colors

### Database
- [ ] Create `[offer]_clients` table (mirrors `v2_clients`)
- [ ] Create `[offer]_lead_status` table (mirrors `cashoffer_lead_status`)
- [ ] Create `[offer]_leads` table OR confirm leads route to `geo_lead_tags`
- [ ] Add `source_tag TEXT`, `source_url TEXT` to the opt-in table (nullable)

### Auth
- [ ] Create `lib/[offer]client.ts` (mirrors `lib/v2client.ts`) — cookie: `[offer]client_auth`

### API Routes
- [ ] `/api/[offer]client/login` + `logout` + `me` + `setup` + `change-password`
- [ ] `/api/[offer]client/leads` — GET (paginated) + POST (manual add)
- [ ] `/api/[offer]client/leads/upload` — pushes CSV to Instantly, tags with `client_slug` + `offer=[offer]`
- [ ] `/api/[offer]client/lead-status` — upsert lead status
- [ ] `/api/admin/[offer]clients` — GET list + POST create
- [ ] `/api/admin/[offer]clients/[id]` — PATCH (active, calendly, pixel, domain, password, regenerateInvite)

### Opt-in Route (REQUIRED)
- [ ] Call `tagLead(email, affiliateTag)` — writes to `geo_lead_tags` — required or leads never appear in any dashboard
- [ ] Call `buildLeadSource(req, affiliateSlug)` from `lib/source.ts` — writes `source_tag` + `source_url`

### Client Portal Pages
- [ ] `app/[offer]/[slug]/layout.tsx` — auth guard + nav
- [ ] `app/[offer]/[slug]/login/page.tsx`
- [ ] `app/[offer]/[slug]/setup/page.tsx` — invite token → password + Calendly
- [ ] `app/[offer]/[slug]/leads/page.tsx` — super admin template for all clients (one file, all clients inherit)
  - [ ] Includes Upload List button → `/api/[offer]client/leads/upload`
  - [ ] Includes Add Lead button → POST `/api/[offer]client/leads`
  - [ ] Includes `CAMPAIGN_FRIENDLY_NAMES` map for this offer's campaigns
- [ ] `app/[offer]/[slug]/change-password/page.tsx`

### Admin Pages
- [ ] `app/admin/[offer]/page.tsx` — client management (create, invite, edit)
- [ ] `app/admin/[offer]-leads/page.tsx` — super admin view of all leads for this offer
- [ ] Add to `app/admin/layout.tsx` NAV_LINKS

### Funnel Slug Naming — Non-Negotiable
Every landing page gets its own slug tag. Format is `{offer}-{funnel}-{client}` for clients, `{offer}-{funnel}` for super admin. Same pattern across every offer, every funnel.

| Context | Slug format | Example |
|---|---|---|
| Super admin demo landing page | `{offer}-{funnel}` | `v2-cashoffer`, `geo-audit` |
| Per-client landing page | `{offer}-{funnel}-{client}` | `v2-cashoffer-todd`, `geo-audit-jane.doe` |

- [ ] `demo.ts` config: set `funnelTag: "{offer}-{funnel}"`
- [ ] Per-client page config merge: override `funnelTag: \`{offer}-{funnel}-${slug}\``
- [ ] Client leads API GET: filter by `{offer}-{funnel}-${client.slug}`, not raw `client.slug`
- [ ] Client leads API POST (manual add): insert with `slug: \`{offer}-{funnel}-${client.slug}\``
- [ ] Instantly webhook handler: insert `slug: isSuperAdmin ? "{offer}-{funnel}" : \`{offer}-{funnel}-${clientSlug}\``
- [ ] Every additional funnel for the same offer follows the same pattern (e.g. V2 has cashoffer + calculator — both use `v2-{funnel}-{client}`)

### Landing Page DB Merge
- [ ] Override `calendly_url` + `meta_pixel_id` from DB into static config at runtime

### Instantly Integration
- [ ] Add `[offer]` value to webhook handler at `app/api/webhooks/instantly/route.ts`
- [ ] Create Instantly campaigns — three tiers, never mix:
  - `super-admin-[offer]` — super admin's own cold prospecting for this offer's clients (appears in super admin Enroll button, NOT admin upload page)
  - `[offer]-*` — paying client campaigns (appears in admin upload page + client upload modal)
  - `aff-[offer]` — affiliates' own cold outreach for this offer (appears in affiliate upload modal)
- [ ] Add campaign friendly names to client upload modal (`CAMPAIGN_FRIENDLY_NAMES`)
- [ ] Add `aff-[offer]` to affiliate campaigns API `OFFER_CAMPAIGN` map in `app/api/affiliate/campaigns/route.ts`
- [ ] Add `aff-[offer]` label to affiliate upload modal `CAMPAIGN_FRIENDLY_NAMES`
- [ ] Add `super-admin-[offer]` to super admin Enroll button Instantly section (once Enroll supports Instantly — see Enroll extension task)

### Affiliate Recruiting Campaign (one-time — not per offer)
- [ ] `aff-recruit` Instantly campaign — super admin uses this to find and hire new affiliates
- [ ] Lives in super admin Enroll button, NOT admin upload page
- [ ] When super user tier is added: each super user gets their own recruiting campaign scoped to their org — same pattern, different owner

### Replication Verification
- [ ] Every feature in Part 1 "Live" column is present in the new offer's `/leads` portal
- [ ] Lead detail matches admin lead detail (minus admin-only features)
- [ ] All future Phase 2-5 features will inherit automatically — no extra work needed if built correctly

### Documentation
- [ ] Add offer to CLAUDE.md — The Offers table, Domain Architecture, Directory Structure, DB Tables
- [ ] Add offer to `lib/source.ts` `SUBDOMAIN_TO_OFFER` map
- [ ] Add ✅ to foundation lock section once live

---

## Part 3 — New Affiliate Checklist

### Create in Admin
- [ ] Go to `geo.heypearl.io/admin/affiliates`
- [ ] Set slug in `first.last` format (e.g. `todd.smith`) — form enforces this
- [ ] Fill: name, slug, offers array (which offers they promote), headshot URL, Calendly URL, phone, email, Meta Pixel ID
- [ ] Confirm slug is unique — DB enforces, creation fails if taken

### Business Card Domain (GoDaddy + Vercel)
- [ ] Vercel: geo-landing project → Settings → Domains → Add `[slug].heypearl.io` → copy TXT verification value
- [ ] GoDaddy: add CNAME `[slug]` → `cname.vercel-dns.com`
- [ ] GoDaddy: add TXT `_vercel` → paste verification value (new entry, no trailing spaces)
- [ ] Wait 2-5 min → verify Vercel shows "Valid Configuration"
- [ ] Visit `https://[slug].heypearl.io` → confirm card loads with photo, name, offer buttons

### Instantly
- [ ] Confirm affiliate has been added to all relevant `aff-[offer]` campaigns in Instantly (one per offer they promote)

### LinkJolt
- [ ] Add `[slug].heypearl.io` as an offer
- [ ] Send affiliate the invite link

### Verification
- [ ] Affiliate can log in at `geo.heypearl.io/[slug]/leads`
- [ ] Leads filtered to their tag only — no cross-contamination
- [ ] Upload modal shows only `aff-*` campaigns for their assigned offers
- [ ] Check admin detail page (`geo.heypearl.io/admin/affiliates/[id]`) — confirm all fields visible including social channels

### Admin Visibility Rule (applies to ALL future affiliate features)
Every field an affiliate can set must also appear in the admin affiliate detail page. Admin is Misti's only window into affiliate configuration. If it's not in admin, it doesn't exist from her perspective.

### After all steps — Launch Verification Agent

```
Launch the affiliate verification agent for slug: [slug]
```

The agent runs all automated checks, fixes anything broken on the spot, and hands you the final manual checklist (LinkJolt, Skool, credentials, onboarding).

---

## Part 4 — New V2 Client Checklist

### Create in Admin
- [ ] Go to `geo.heypearl.io/admin/v2`
- [ ] Set slug in `first.last` format — form enforces this
- [ ] Copy invite link: `https://v2.heypearl.io/cashoffer/[slug]/setup?token=[token]`
- [ ] Send invite link to client

### Config
- [ ] **Optional** — V2 clients provisioned via the queue use `cashOfferConfigs["demo"]` as a fallback automatically. No config file needed unless the client needs custom branding (colors, copy, logo).
- [ ] If custom branding is needed: create `app/templates/cashoffer/configs/[slug].ts` — spread from `demo.ts`, override identity fields, add to `app/templates/cashoffer/configs/index.ts` registry

### Client Verification
- [ ] Client visits invite link → sets password → lands on leads portal
- [ ] Client can upload CSV and see the correct campaign labels (Cold Seller Outreach)
- [ ] Upload modal shows only `v2-*` campaigns — never `aff-*`
- [ ] Calculator page live at `v2.heypearl.io/calculator/[slug]` — leads tagged to client's slug, book-call redirects to `/cashoffer/[slug]/schedule`

---

## Part 5 — New HeyLocal Affiliate Checklist

### Config
- [ ] Create `app/templates/local-services/configs/[name].ts`
- [ ] Import and spread **only from `heylocal.ts`** — never from another affiliate file
- [ ] Override only: `funnelTag`, `scheduleRoute`, `pricingRoute`, `founder`, `calendlyUrl`, `metaPixelId`
- [ ] Never hardcode marketing copy, services, FAQs, steps, testimonials — those come from the master template

### Pages
- [ ] Create `app/[name]schedule/page.tsx`
- [ ] Create `app/[name]pricing/page.tsx`
- [ ] Add middleware subdomain routing if they have a custom subdomain

### Opt-in Verification
- [ ] Opt-in stamps `source_tag` (e.g. `local_[name]`) and `source_url` in `geo_local_submissions`
- [ ] `source_tag_legacy` still written (NOT NULL — required)
- [ ] Lead appears in affiliate's `/[name]/leads` dashboard
