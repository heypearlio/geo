# Lead Detail & Attribution System Design
**Date:** 2026-04-04
**Scope:** Lead detail pages, campaign controls, reminders, channel pause/suppress, activity timeline, universal source attribution

---

## Vision

Every `/leads` portal is a replica of `/admin` minus admin-only privileges. When a feature improves in admin, every portal inherits it on next deploy. User data (leads, notes, tags) is never touched by system changes. This system must scale cleanly to 150k users and 2500 affiliates.

---

## Architecture

### Replication Rule
- **Admin (`/admin`)** = god portal. Full-featured. Source of truth.
- **Every portal** (affiliate, V2 client, GEO client, local, every future offer) = admin minus admin privileges
- Feature added to admin → replicates to all portals on next deploy
- New offer / affiliate / client added → their portal inherits everything automatically
- Admin-only (never replicates): adding offers, affiliates, clients; viewing all leads across all portals; managing accounts

### What Changes vs What Stays
All new features are **purely additive**. No existing tables, routes, email system, auth, sequences, or foundation-locked features are modified. Existing data is never touched.

---

## Section 1 — Universal Source Attribution

### The Problem
Today each offer writes opt-in data to different tables with inconsistent tagging. This doesn't scale.

### The Solution
A single utility `lib/source.ts` exports two functions used by every opt-in route:

**`buildLeadSource(req)`** — derives attribution from the request URL at runtime:
```
geo.heypearl.io/todd.smith  →  { source_tag: "geo_todd.smith",  source_url: "geo.heypearl.io/todd.smith" }
v2.heypearl.io/sarah.jones  →  { source_tag: "v2_sarah.jones",  source_url: "v2.heypearl.io/sarah.jones" }
geo.heypearl.io             →  { source_tag: "geo_admin",        source_url: "geo.heypearl.io" }
local.heypearl.io           →  { source_tag: "local_admin",      source_url: "local.heypearl.io" }
```

**`buildImportTag(offer, campaignType)`** — for CSV uploads:
```
("v2", "expired")        →  "import_v2_expired"
("v2", "preforeclosure") →  "import_v2_preforeclosure"
("v2", "probate")        →  "import_v2_probate"
("geo", "buyers")        →  "import_geo_buyers"
("geo", "sellers")       →  "import_geo_sellers"
("aff", "v2")            →  "import_aff_v2"
("aff", "geo")           →  "import_aff_geo"
("aff", "local")         →  "import_aff_local"
```

### Source Tag Catalog

| Scenario | Tag | URL |
|---|---|---|
| Affiliate's GEO page | `geo_{slug}` | `geo.heypearl.io/{slug}` |
| Affiliate's V2 page | `v2_{slug}` | `v2.heypearl.io/{slug}` |
| Affiliate's Local page | `local_{slug}` | `local.heypearl.io/{slug}` |
| GEO admin/god page | `geo_admin` | `geo.heypearl.io` |
| V2 admin/god page | `v2_admin` | `v2.heypearl.io` |
| Local admin/god page | `local_admin` | `local.heypearl.io` |
| Import — V2 expired sellers | `import_v2_expired` | — |
| Import — V2 pre-foreclosure | `import_v2_preforeclosure` | — |
| Import — V2 probate | `import_v2_probate` | — |
| Import — GEO buyers | `import_geo_buyers` | — |
| Import — GEO sellers | `import_geo_sellers` | — |
| Import — affiliate V2 | `import_aff_v2` | — |
| Import — affiliate GEO | `import_aff_geo` | — |
| Import — affiliate Local | `import_aff_local` | — |

### Slug Naming Convention (going forward)
- All new affiliates, clients, and admin-created users: slug = `first.last`
- Two people with same name: admin chooses unique slug at creation (`todd.spencer`, `todd.spencer2`)
- DB enforces uniqueness — creation fails if slug already exists
- Existing slugs are unchanged — this applies to new entries only

### DB Changes (additive only)
Add two columns to existing opt-in tables:
- `geo_audit_history`: add `source_tag TEXT`, `source_url TEXT`
- `cashoffer_leads`: add `source_tag TEXT`, `source_url TEXT`
- `geo_local_submissions`: add `source_tag TEXT`, `source_url TEXT`

Existing rows get `NULL` — no backfill required. All new opt-ins populate both fields.

---

## Section 2 — New Database Tables

### `lead_reminders`
```sql
CREATE TABLE lead_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  owner_id TEXT NOT NULL,        -- affiliate.id or v2client.slug or "admin"
  owner_type TEXT NOT NULL,      -- "affiliate" | "v2client" | "admin"
  due_date DATE NOT NULL,
  note TEXT,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  calendar_event_id TEXT,        -- reserved for future Google/Apple Calendar integration
  notify_sms BOOLEAN DEFAULT false, -- reserved for future text reminder
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(email, owner_id)        -- one active reminder per lead per owner
);
```

### `lead_campaign_status`
```sql
CREATE TABLE lead_campaign_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  campaign_id TEXT NOT NULL,     -- Instantly campaign UUID
  campaign_name TEXT NOT NULL,   -- raw campaign name (e.g. "aff-v2")
  owner_id TEXT NOT NULL,
  owner_type TEXT NOT NULL,
  paused BOOLEAN DEFAULT false,
  removed_at TIMESTAMPTZ,        -- NULL = still in campaign
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(email, owner_id)        -- one active campaign record per lead per owner
);
```

### `lead_channel_status`
```sql
CREATE TABLE lead_channel_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  owner_type TEXT NOT NULL,
  paused_email BOOLEAN DEFAULT false,
  paused_call BOOLEAN DEFAULT false,
  paused_text BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(email, owner_id)
);
```

---

## Section 3 — Suppress vs Pause

### Suppress (nuclear — all channels)
- Stored in `geo_suppressed` (already exists)
- Stops ALL communication: Resend sequences, Instantly campaigns, AI conversations, texts, every future channel
- **Every new channel or application that ships MUST check `geo_suppressed` before sending. This is a hard rule.**
- Portals can suppress their own leads. Admin can suppress anyone.
- Reversible — unsuppress restores all channels

### Pause (per channel, granular)
- Stored in `lead_channel_status`
- `paused_email` = stops ALL email applications (Resend, Instantly, any future email tool)
- `paused_call` = stops ALL call applications (Vapi, Twilio, any future call tool)
- `paused_text` = stops ALL text applications (Twilio, GHL, text.com, any future SMS tool)
- Each channel paused independently — a lead can have email paused but calls active
- Campaign pause/resume is a subset of `paused_email` — stored in `lead_campaign_status.paused`

---

## Section 4 — Lead Detail Page (All Portals)

The existing `app/[slug]/leads/[email]/page.tsx` is enhanced. Same file serves all portals via the replication system. V2 client detail page (`app/cashoffer/[slug]/leads/[email]/page.tsx`) is created following the same structure.

### Sections on every lead detail page

**Contact** (exists) — name, email, phone, opted-in date, edit inline

**Status** (exists) — auto cold/warm/hot from email activity + manual: met/no_show/client

**Campaign** (replaces "coming soon" placeholder)
- Shows active campaign with friendly label
- Pause toggle (reversible)
- Remove button with confirm dialog (irreversible — "Remove Jane from V2 Seller Leads? This cannot be undone.")
- "Not in a campaign" state if no campaign found

**Channel Controls** (new)
- Three toggles: Email / Call / Text — each independently pausable
- Suppress button — one action, stops everything, shows warning ("This stops all communication with this lead across every channel.")
- Unsuppress button shown when suppressed

**Reminders** (new)
- Date picker + optional note
- "Set Reminder" saves, replaces any existing reminder
- "Clear" removes it
- "Mark Complete" logs it in the timeline and removes the badge

**Sequences** (new for portals — admin already has this)
- Shows current active sequence name from `geo_email_queue` (existing table, no new API needed)
- Cancel sequence button calls existing sequence cancellation logic

**Activity Timeline** (new for portals — admin already has this)
- Unified chronological feed, newest first
- Timestamp + icon + one-line description
- Events: opted in (with source_tag/source_url), emails sent/opened/clicked, call booked, call outcome, replied to campaign, campaign added/paused/removed, suppressed/unsuppressed, channel paused/resumed, note added, reminder set/completed, status changed
- Legacy events read from existing tables, new events read from updated tables
- Grows naturally — AI call transcripts, text summaries plug in as new row types with no redesign

**Notes** (exists) — unchanged, private to the owner

---

## Section 5 — Lead List Page (All Portals)

Additive changes to lead cards:

- **Reminder badge** — shows due date, color-coded: upcoming (subtle), due today (orange), overdue (red)
- **Campaign tag** — small label showing which campaign, grayed if paused
- **Sequence indicator** — which email sequence is active
- **Activity dot** — cold/warm/hot (already in admin, now in portals)

New filter pill: **"Reminders"** — shows only leads with due/overdue reminders. Daily action queue.

---

## Section 6 — API Routes

All new routes follow existing per-portal prefix pattern. Same structure, scoped to owner's data.

### Reminders
- `GET /api/[portal]/reminders?email=`
- `POST /api/[portal]/reminders` — `{ email, due_date, note }`
- `DELETE /api/[portal]/reminders?email=`
- `POST /api/[portal]/reminders/complete` — `{ email }`
- Admin god view: `GET /api/admin/reminders/overdue` — all overdue across all portals

### Campaign controls
- `GET /api/[portal]/lead-campaign?email=`
- `POST /api/[portal]/lead-campaign/pause` — `{ email }`
- `POST /api/[portal]/lead-campaign/resume` — `{ email }`
- `POST /api/[portal]/lead-campaign/remove` — `{ email }` + Instantly API call server-side

### Channel controls
- `GET /api/[portal]/lead-channels?email=`
- `POST /api/[portal]/lead-channels` — `{ email, paused_email?, paused_call?, paused_text? }`

### Timeline
- `GET /api/[portal]/lead-timeline?email=` — server assembles events from all sources, returns unified array

Where `[portal]` = `affiliate` | `v2client` | `admin` (and future offer portals).

---

## Section 7 — Implementation Phases

Each phase ships independently. Each is additive. No phase removes or changes existing functionality.

### Phase 1 — Source Attribution (foundation)
- Create `lib/source.ts` with `buildLeadSource()` and `buildImportTag()`
- Add `source_tag` + `source_url` columns to existing opt-in tables
- Update all opt-in routes to call `buildLeadSource()` and populate both fields
- Update upload routes to call `buildImportTag()`
- New slug convention enforced in admin affiliate/client creation UI

### Phase 2 — Reminders
- Create `lead_reminders` table
- Reminder API routes for all portals
- Reminder section on lead detail page (all portals)
- Reminder badge on lead list cards (all portals)
- Reminders filter pill on lead list

### Phase 3 — Campaign Controls
- Create `lead_campaign_status` table
- Write to it on every upload
- Campaign section on lead detail page (all portals + admin)
- Pause/resume/remove calling Instantly API server-side

### Phase 4 — Channel Controls + Suppress in Portals
- Create `lead_channel_status` table
- Channel controls section on lead detail page (all portals)
- Suppress/unsuppress available in portals (scoped to own leads)
- Sequence cancel available in portals

### Phase 5 — Activity Timeline
- Timeline API route for all portals
- Timeline section on lead detail page (all portals)
- Reads from existing tables + new tables, unified per offer type

---

## Rules That Must Never Be Broken

1. Every new channel or application MUST check `geo_suppressed` before sending anything
2. `buildLeadSource()` is called by every opt-in route — never hardcode source_tag
3. New affiliate/client slugs always follow `first.last` format
4. Source tag format is always `{offer}_{slug}` — never deviate
5. Import tags always use `import_{offer}_{type}` — derived from campaign selected, never typed
6. Features replicate from admin to all portals — user data (leads, notes, tags) is never touched by any deploy
7. Portal-scoped APIs only return data owned by that portal's user — never cross-contaminate
