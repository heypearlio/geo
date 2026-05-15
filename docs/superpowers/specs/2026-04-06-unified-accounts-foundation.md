# Unified Accounts Foundation — Design Spec

**Date:** 2026-04-06
**Status:** Approved for planning

---

## Problem

geo-landing has three separate auth systems and three separate user tables:

| Table | Auth cookie | Who uses it |
|---|---|---|
| `affiliates` | `affiliate_auth` | Affiliates (Todd, etc.) |
| `v2_clients` | `v2client_auth` | V2 / CashOffer clients |
| *(future)* `geo_clients` | `geoclient_auth` | GEO clients (not built yet) |
| *(future)* `local_clients` | `localclient_auth` | Local clients (not built yet) |

Every new offer adds another table and another auth cookie. When one person buys multiple offers, you either create duplicate accounts or build band-aids (like `cashoffer_client` flag).

This is the broken foundation. The core business rule is: **one person, one login, any number of offers.**

---

## Solution

Replace the fragmented user tables with a unified accounts layer:

### Three new things

**1. `accounts` table** — one row per person, regardless of how many offers they have

```sql
accounts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  session_token TEXT,
  first_name  TEXT,
  last_name   TEXT,
  headshot_url TEXT,
  phone       TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
)
```

**2. `account_offers` junction table** — additive, one row per offer grant

```sql
account_offers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id  UUID REFERENCES accounts(id),
  offer       TEXT NOT NULL,  -- 'affiliate', 'v2', 'geo', 'local', any future offer
  slug        TEXT,           -- their portal slug (e.g. 'todd.smith')
  meta        JSONB,          -- offer-specific config (calendly_url, pixel_id, etc.)
  granted_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(account_id, offer)
)
```

**3. `lib/account.ts`** — single auth function, single cookie `pearlos_auth`

```typescript
// One function to get the current user + their offers
getAccountFromRequest(req) → { account, offers: ['affiliate', 'v2'] } | null
```

### How it replaces the current tables

| Old | New |
|---|---|
| `affiliates` row | `accounts` row + `account_offers` row where `offer = 'affiliate'` |
| `v2_clients` row | `accounts` row + `account_offers` row where `offer = 'v2'` |
| `cashoffer_client = true` flag | Second row in `account_offers` for the same account (`offer = 'v2'`) |
| 3 auth cookies | 1 cookie: `pearlos_auth` |
| 3 login pages | Eventually 1 login page |

---

## What This Enables

- Todd buys V2 → one INSERT into `account_offers`. No band-aid. No new table.
- Todd buys GEO → another INSERT. Same account. Same login.
- New offer launches → one new `offer` value. No new auth system.
- Super admin grants or revokes offers from a single screen.

---

## What Does NOT Change

- All existing pages, routes, and email sequences — untouched
- All existing lead data (`geo_lead_tags`, `cashoffer_lead_status`, etc.) — untouched
- All existing affiliate slugs, Calendly URLs, pixels — migrated to `account_offers.meta`
- geo.heypearl.io stays geo.heypearl.io
- pearlos.ai is paused (reference only, not merged)

---

## Migration Strategy — Parallel Run

The migration is additive. Old auth and new auth run simultaneously until everything is confirmed working.

### Phase 1 — Build the foundation (nothing breaks)
- Create `accounts` + `account_offers` tables
- Build `lib/account.ts` auth functions
- Build `pearlos_auth` cookie handling
- New accounts can be created via new system
- Existing users continue on old auth — zero impact

### Phase 2 — Wire new auth into portals (additive)
- Each portal accepts EITHER old cookie OR new `pearlos_auth` cookie
- Returning users: old cookie still works
- New users: get `pearlos_auth` from day one
- No forced migration yet

### Phase 3 — Migrate existing users (one type at a time)
- Affiliates first (smallest risk, most visible)
- V2 clients second
- Future offer types inherit automatically
- Each migration: create `accounts` row + `account_offers` row, keep old row as fallback until confirmed

### Phase 4 — Remove old tables (only after Phase 3 confirmed)
- Drop `affiliates` auth (keep data columns that lead system needs — `tag`, `offers` array)
- Drop `v2_clients` auth columns
- Remove old auth cookies
- cashoffer_client band-aid becomes irrelevant, remove it

> **Rule:** Nothing in Phase 4 happens until Phase 3 is live for 30 days without issues.

---

## What Super Admin Gets

Single "Manage Account" screen:
- View all offers a person has access to
- Grant a new offer (one click → one INSERT into `account_offers`)
- Revoke an offer
- See login history

This replaces: admin/affiliates + admin/v2 + future admin/geo + future admin/local

---

## pearlos.ai Status

pearlos.ai is paused. It is not merged into geo-landing. It is used as a reference for:
- Supabase Auth patterns (how proper session management works)
- Multi-tenant middleware patterns
- Feature flag per-account patterns

These concepts are re-implemented natively in geo-landing. The pearlos.ai codebase is not wrong — it built the right concepts. The business evolved to need those concepts in the existing live codebase instead.

---

## Out of Scope for This Spec

- Pearl AI integration (future)
- Upsells engine / in-app offer purchasing (future)
- leads.heypearl.io domain migration (wishlist — separate project)
- PearlOS branding rollout (future)
- Super User tier (documented in user tier architecture — not this phase)

---

## Success Criteria

- [ ] Todd can have affiliate + V2 access under one login with one password
- [ ] Adding a third offer to Todd requires one DB insert, no code change
- [ ] A brand new user can be created and granted any offer from admin in under 60 seconds
- [ ] All existing users continue to work exactly as before throughout the migration
- [ ] The `cashoffer_client` band-aid is removed before geo_clients or local_clients are built
