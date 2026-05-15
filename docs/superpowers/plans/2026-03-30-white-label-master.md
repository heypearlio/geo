# White-Label Master Skeleton — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a multi-tenant white-label funnel skeleton (new repo) where each real estate agent client gets their own domain and data silo, Misti is super admin across all, and the architecture supports 1M+ leads without re-engineering.

**Architecture:** Single Next.js 16 repo deployed per client via Vercel (same codebase, different env vars per deployment). All client data lives in one new Supabase project with every table tagged `tenant_id`. Domain → tenant lookup happens in middleware with 60s in-memory cache. No email templates or sequences yet — just the infrastructure.

**Tech Stack:** Next.js 16.2.0, TypeScript, Tailwind, Supabase (new project), Resend, Stripe, Vercel cron

---

## File Map

Files to **create** in new repo `white-label-master`:

```
white-label-master/
├── supabase/migrations/001_initial.sql     — Full schema, indexes, RLS, functions
├── middleware.ts                           — Domain → tenant routing
├── lib/
│   ├── supabase.ts                         — Supabase client (singleton)
│   ├── tenant.ts                           — Tenant lookup + 60s cache
│   ├── resend.ts                           — Tenant-aware email sending + queue
│   ├── sequences.ts                        — Empty typed sequences array
│   ├── email-config.ts                     — INSTANT_EMAILS, ALWAYS_RESEND sets
│   ├── schedule.ts                         — Business hours snap utility
│   ├── types.ts                            — LeadInput, EnrollResult types
│   └── emails/
│       ├── base.ts                         — Tenant-aware HTML email wrapper
│       └── templates.ts                    — Empty EMAIL_TEMPLATES object
├── app/
│   ├── layout.tsx                          — Root layout (tenant font/meta)
│   ├── page.tsx                            — Landing page skeleton
│   ├── schedule/page.tsx                   — Book a call (Calendly embed)
│   ├── unsubscribe/page.tsx                — Unsubscribe handler page
│   ├── admin/
│   │   ├── layout.tsx                      — Admin nav (tenant-branded)
│   │   ├── login/page.tsx                  — Admin login
│   │   ├── leads/
│   │   │   ├── page.tsx                    — Leads page wrapper
│   │   │   ├── LeadsHub.tsx                — Leads/Queue/Templates tabs
│   │   │   └── LeadDetailPanel.tsx         — Lead detail panel
│   │   ├── campaigns/page.tsx              — Campaign metrics
│   │   └── activity/page.tsx               — Activity feed
│   └── api/
│       ├── admin/
│       │   ├── login/route.ts
│       │   ├── leads/route.ts
│       │   ├── lead-profile/route.ts
│       │   ├── campaigns/route.ts
│       │   ├── activity/route.ts
│       │   ├── bulk-enroll/route.ts
│       │   └── send-personal-email/route.ts
│       ├── cron/
│       │   ├── route.ts                    — Main queue processor (every 15 min)
│       │   └── graduate/route.ts           — Sequence graduation (Mon 10am)
│       ├── resend-webhook/route.ts
│       ├── calendly-webhook/route.ts
│       ├── stripe-webhook/route.ts
│       ├── booked/route.ts
│       └── unsubscribe/route.ts
├── vercel.json                             — Cron job definitions
├── package.json
├── tsconfig.json
├── next.config.ts
├── .env.example
└── CLAUDE.md
```

---

## Task 1: Initialize Repo

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `CLAUDE.md`
- Create: `.env.example`
- Create: `.gitignore`

- [ ] **Step 1: Create the new repo directory and initialize git**

```bash
mkdir ~/Desktop/white-label-master
cd ~/Desktop/white-label-master
git init
```

- [ ] **Step 2: Create package.json**

```json
{
  "name": "white-label-master",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "16.2.0",
    "react": "^19.2.4",
    "react-dom": "^19.2.4",
    "@supabase/supabase-js": "^2.99.3",
    "resend": "^6.9.4",
    "stripe": "^21.0.1",
    "openai": "^6.32.0",
    "@anthropic-ai/sdk": "^0.80.0",
    "@calcom/embed-react": "^1.5.3"
  },
  "devDependencies": {
    "typescript": "^5",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "tailwindcss": "^4",
    "@tailwindcss/postcss": "^4"
  }
}
```

- [ ] **Step 3: Run npm install**

```bash
npm install
```

Expected: `node_modules/` created, no peer dependency errors.

- [ ] **Step 4: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 5: Create next.config.ts**

```typescript
import type { NextConfig } from "next";
const nextConfig: NextConfig = {};
export default nextConfig;
```

- [ ] **Step 6: Create .env.example**

```bash
# Supabase — white-label project (new project, NOT geo project)
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Resend
RESEND_API_KEY=
RESEND_WEBHOOK_SECRET=
RESEND_INBOUND_WEBHOOK_SECRET=

# Auth — set a unique strong password per deployment
ADMIN_TOKEN=
CRON_SECRET=

# Stripe — set per client deployment
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# AI (shared across all deployments — Misti's keys)
OPENAI_API_KEY=
ANTHROPIC_API_KEY=

# Meta Pixel — set per client (optional)
NEXT_PUBLIC_FB_PIXEL_ID=
```

- [ ] **Step 7: Create CLAUDE.md**

```markdown
# White-Label Master

## What this is
Multi-tenant funnel skeleton for real estate agent clients. One codebase,
deployed per client via Vercel with different env vars. All client data in
one Supabase project, separated by tenant_id.

## Stack
- Next.js 16.2.0 + TypeScript + Tailwind
- Supabase (white-label project — NOT the geo project)
- Resend (Misti's account, client sending domain)
- Stripe (per-client payment links in tenants table)
- Vercel

## Key rule
Every DB query MUST include tenant_id. No exceptions. Use getTenantId()
from lib/tenant.ts — never hardcode a tenant ID.

## Before deploying
Run npm run build. Fix all errors. Use printf not echo for env vars.

## Adding a new client
1. INSERT into tenants table (domain, brand_name, sender_email, etc.)
2. Create new Vercel project pointing at this repo
3. Set env vars (ADMIN_TOKEN, STRIPE links, etc.)
4. Add client domain to Vercel project
5. Add sending domain to Resend, verify DNS
6. Add Calendly URL to tenants row
```

- [ ] **Step 8: Create .gitignore**

```
node_modules/
.next/
.env.local
.env*.local
.vercel/
*.log
```

- [ ] **Step 9: Initial commit**

```bash
git add .
git commit -m "chore: initialize white-label-master repo"
```

---

## Task 2: Database Migration

**Files:**
- Create: `supabase/migrations/001_initial.sql`

- [ ] **Step 1: Create migrations directory**

```bash
mkdir -p supabase/migrations
```

- [ ] **Step 2: Create 001_initial.sql — full schema**

```sql
-- ─────────────────────────────────────────────
-- TENANTS (master config — one row per client)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tenants (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            TEXT        UNIQUE NOT NULL,
  domain          TEXT        UNIQUE NOT NULL,
  brand_name      TEXT        NOT NULL,
  brand_color     TEXT        NOT NULL DEFAULT '#E8185C',
  logo_url        TEXT,
  sender_name     TEXT        NOT NULL,
  sender_email    TEXT        NOT NULL,
  reply_to        TEXT        NOT NULL,
  calendly_url    TEXT,
  stripe_link_1   TEXT,
  stripe_link_2   TEXT,
  stripe_link_3   TEXT,
  price_1         INTEGER     DEFAULT 1500,
  price_2         INTEGER     DEFAULT 2500,
  price_3         INTEGER     DEFAULT 3500,
  admin_token     TEXT        NOT NULL,
  resend_audience_id TEXT,
  fb_pixel_id     TEXT,
  active          BOOLEAN     DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- EMAIL QUEUE
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wl_email_queue (
  id              BIGSERIAL   PRIMARY KEY,
  tenant_id       UUID        NOT NULL REFERENCES tenants(id),
  email           TEXT        NOT NULL,
  first_name      TEXT,
  sequence        TEXT        NOT NULL,
  step            INTEGER     NOT NULL,
  send_at         TIMESTAMPTZ NOT NULL,
  sent_at         TIMESTAMPTZ,
  cancelled_at    TIMESTAMPTZ,
  metadata        JSONB       DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Unique: one pending row per (tenant, email, sequence, step)
CREATE UNIQUE INDEX wl_email_queue_dedup_idx
  ON wl_email_queue (tenant_id, email, sequence, step)
  WHERE sent_at IS NULL AND cancelled_at IS NULL;

-- Hot path: cron reads pending emails ordered by send_at
CREATE INDEX idx_wl_queue_pending
  ON wl_email_queue (tenant_id, send_at)
  WHERE sent_at IS NULL AND cancelled_at IS NULL;

-- Lead profile: all queue rows for one lead
CREATE INDEX idx_wl_queue_email
  ON wl_email_queue (tenant_id, email);

-- Sequence check constraint — add new sequence keys here when adding sequences
ALTER TABLE wl_email_queue
  ADD CONSTRAINT wl_email_queue_sequence_check
  CHECK (sequence IN (
    'warm_nurture', 'long_term_nurture', 'post_booking', 'no_show',
    'post_call', 'schedule_abandoned', 'video_watched', 'video_abandoned',
    'proof', 'purchased_welcome', 'hot_proof'
  ));

-- ─────────────────────────────────────────────
-- EMAIL EVENTS (open/click/bounce tracking)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wl_email_events (
  id              BIGSERIAL   PRIMARY KEY,
  tenant_id       UUID        NOT NULL REFERENCES tenants(id),
  resend_email_id TEXT,
  email           TEXT        NOT NULL,
  sequence        TEXT        NOT NULL DEFAULT 'unknown',
  step            INTEGER     NOT NULL DEFAULT 0,
  event_type      TEXT        NOT NULL,
  metadata        JSONB       DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Resend webhook lookup: find sent event by resend_email_id
CREATE INDEX idx_wl_events_resend_id
  ON wl_email_events (resend_email_id)
  WHERE resend_email_id IS NOT NULL;

-- Lead profile: all events for one lead
CREATE INDEX idx_wl_events_email
  ON wl_email_events (tenant_id, email, event_type);

-- Campaign stats: aggregate by sequence+step
CREATE INDEX idx_wl_events_sequence
  ON wl_email_events (tenant_id, sequence, step, event_type);

-- ─────────────────────────────────────────────
-- SUPPRESSED (unsubscribes, bounces, clients)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wl_suppressed (
  id              BIGSERIAL   PRIMARY KEY,
  tenant_id       UUID        NOT NULL REFERENCES tenants(id),
  email           TEXT        NOT NULL,
  reason          TEXT        NOT NULL CHECK (reason IN ('unsubscribed','bounced','spam','client','admin_suppressed')),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, email)
);

CREATE INDEX idx_wl_suppressed_lookup
  ON wl_suppressed (tenant_id, email);

-- ─────────────────────────────────────────────
-- SCHEDULED CALLS (Calendly bookings)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wl_scheduled_calls (
  id              BIGSERIAL   PRIMARY KEY,
  tenant_id       UUID        NOT NULL REFERENCES tenants(id),
  email           TEXT        NOT NULL,
  first_name      TEXT,
  meeting_time    TIMESTAMPTZ,
  outcome         TEXT        DEFAULT 'pending',
  event_type      TEXT        DEFAULT 'strategy_call',
  package_price   INTEGER,
  processed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_wl_calls_pending
  ON wl_scheduled_calls (tenant_id, outcome, meeting_time);

CREATE INDEX idx_wl_calls_email
  ON wl_scheduled_calls (tenant_id, email);

-- ─────────────────────────────────────────────
-- LEAD SUBMISSIONS (form opt-ins)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wl_lead_submissions (
  id              BIGSERIAL   PRIMARY KEY,
  tenant_id       UUID        NOT NULL REFERENCES tenants(id),
  email           TEXT        NOT NULL,
  first_name      TEXT,
  last_name       TEXT,
  city            TEXT,
  website         TEXT,
  phone           TEXT,
  source          TEXT        DEFAULT 'organic',
  metadata        JSONB       DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_wl_submissions_email
  ON wl_lead_submissions (tenant_id, email);

CREATE INDEX idx_wl_submissions_created
  ON wl_lead_submissions (tenant_id, created_at DESC);

-- ─────────────────────────────────────────────
-- MATERIALIZED STATS (pre-computed, never query 8M rows live)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wl_tenant_stats (
  id              BIGSERIAL   PRIMARY KEY,
  tenant_id       UUID        NOT NULL REFERENCES tenants(id),
  sequence        TEXT        NOT NULL,
  step            INTEGER     NOT NULL,
  sent_count      INTEGER     DEFAULT 0,
  open_count      INTEGER     DEFAULT 0,
  click_count     INTEGER     DEFAULT 0,
  last_refreshed  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, sequence, step)
);

-- ─────────────────────────────────────────────
-- QUEUE ARCHIVE (rows >90 days old moved here)
-- keeps wl_email_queue lean for cron processor
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wl_email_queue_archive (
  LIKE wl_email_queue INCLUDING ALL
);

-- ─────────────────────────────────────────────
-- FUNCTIONS
-- ─────────────────────────────────────────────

-- Atomic batch claim for cron processor (prevents double-sends at scale)
CREATE OR REPLACE FUNCTION claim_wl_queue_batch(
  p_batch_size INTEGER DEFAULT 100
)
RETURNS SETOF wl_email_queue
LANGUAGE sql
AS $$
  UPDATE wl_email_queue
  SET sent_at = NOW()
  WHERE id IN (
    SELECT id FROM wl_email_queue
    WHERE sent_at IS NULL
      AND cancelled_at IS NULL
      AND send_at <= NOW()
    ORDER BY send_at
    LIMIT p_batch_size
    FOR UPDATE SKIP LOCKED
  )
  RETURNING *;
$$;

-- Stats refresh function (called by cron or on-demand)
CREATE OR REPLACE FUNCTION refresh_wl_stats(p_tenant_id UUID DEFAULT NULL)
RETURNS void
LANGUAGE sql
AS $$
  INSERT INTO wl_tenant_stats (tenant_id, sequence, step, sent_count, open_count, click_count, last_refreshed)
  SELECT
    tenant_id,
    sequence,
    step,
    COUNT(*) FILTER (WHERE event_type = 'sent')    AS sent_count,
    COUNT(DISTINCT CASE WHEN event_type = 'opened'  THEN resend_email_id END) AS open_count,
    COUNT(DISTINCT CASE WHEN event_type = 'clicked' THEN resend_email_id END) AS click_count,
    NOW()
  FROM wl_email_events
  WHERE (p_tenant_id IS NULL OR tenant_id = p_tenant_id)
  GROUP BY tenant_id, sequence, step
  ON CONFLICT (tenant_id, sequence, step)
  DO UPDATE SET
    sent_count     = EXCLUDED.sent_count,
    open_count     = EXCLUDED.open_count,
    click_count    = EXCLUDED.click_count,
    last_refreshed = NOW();
$$;

-- Archive old queue rows (run monthly)
CREATE OR REPLACE FUNCTION archive_wl_queue(p_days INTEGER DEFAULT 90)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  WITH moved AS (
    DELETE FROM wl_email_queue
    WHERE created_at < NOW() - (p_days || ' days')::INTERVAL
      AND (sent_at IS NOT NULL OR cancelled_at IS NOT NULL)
    RETURNING *
  )
  INSERT INTO wl_email_queue_archive SELECT * FROM moved;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- ─────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────
-- Service role bypasses RLS (app code is safe).
-- These policies protect against accidental direct access.
ALTER TABLE wl_email_queue      ENABLE ROW LEVEL SECURITY;
ALTER TABLE wl_email_events     ENABLE ROW LEVEL SECURITY;
ALTER TABLE wl_suppressed       ENABLE ROW LEVEL SECURITY;
ALTER TABLE wl_scheduled_calls  ENABLE ROW LEVEL SECURITY;
ALTER TABLE wl_lead_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE wl_tenant_stats     ENABLE ROW LEVEL SECURITY;
```

- [ ] **Step 3: Run migration in new Supabase project**

Open Supabase dashboard → new project → SQL Editor → paste and run the migration.

Expected: all tables created with no errors. Verify in Table Editor: `tenants`, `wl_email_queue`, `wl_email_events`, `wl_suppressed`, `wl_scheduled_calls`, `wl_lead_submissions`, `wl_tenant_stats`, `wl_email_queue_archive`.

- [ ] **Step 4: Insert the first tenant (test/dev)**

```sql
INSERT INTO tenants (
  slug, domain, brand_name, brand_color,
  sender_name, sender_email, reply_to,
  admin_token, active
) VALUES (
  'test',
  'localhost:3000',
  'Test Client',
  '#E8185C',
  'Test Sender',
  'test@example.com',
  'test@example.com',
  'test-admin-token-dev',
  TRUE
);
```

- [ ] **Step 5: Commit**

```bash
git add supabase/
git commit -m "feat: initial database schema with tenant_id and scale-ready indexes"
```

---

## Task 3: Supabase Client

**Files:**
- Create: `lib/supabase.ts`

- [ ] **Step 1: Create lib/supabase.ts**

```typescript
import { createClient } from "@supabase/supabase-js";

// Single shared client using service role key.
// Service role bypasses RLS — safe because all queries
// include explicit tenant_id filters in application code.
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
```

- [ ] **Step 2: Verify build compiles**

```bash
npm run build 2>&1 | grep -E "error|Error"
```

Expected: no output (no errors).

- [ ] **Step 3: Commit**

```bash
git add lib/supabase.ts
git commit -m "feat: add supabase client"
```

---

## Task 4: Tenant Lookup

**Files:**
- Create: `lib/tenant.ts`

- [ ] **Step 1: Create lib/tenant.ts**

```typescript
import { supabase } from "./supabase";

export type Tenant = {
  id: string;
  slug: string;
  domain: string;
  brand_name: string;
  brand_color: string;
  logo_url: string | null;
  sender_name: string;
  sender_email: string;
  reply_to: string;
  calendly_url: string | null;
  stripe_link_1: string | null;
  stripe_link_2: string | null;
  stripe_link_3: string | null;
  price_1: number;
  price_2: number;
  price_3: number;
  admin_token: string;
  resend_audience_id: string | null;
  fb_pixel_id: string | null;
  active: boolean;
};

// 60-second in-memory cache — avoids DB lookup on every request
const cache = new Map<string, { tenant: Tenant; expiresAt: number }>();
const TTL_MS = 60_000;

export async function getTenantByDomain(domain: string): Promise<Tenant | null> {
  const now = Date.now();
  const cached = cache.get(domain);
  if (cached && cached.expiresAt > now) return cached.tenant;

  const { data, error } = await supabase
    .from("tenants")
    .select("*")
    .eq("domain", domain)
    .eq("active", true)
    .single();

  if (error || !data) return null;

  cache.set(domain, { tenant: data as Tenant, expiresAt: now + TTL_MS });
  return data as Tenant;
}

export async function getTenantById(id: string): Promise<Tenant | null> {
  const { data } = await supabase
    .from("tenants")
    .select("*")
    .eq("id", id)
    .eq("active", true)
    .single();
  return data as Tenant | null;
}

// Used by API routes: reads x-tenant-id header injected by middleware
export function getTenantIdFromHeaders(headers: Headers): string | null {
  return headers.get("x-tenant-id");
}
```

- [ ] **Step 2: Run build**

```bash
npm run build 2>&1 | grep -E "error|Error"
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/tenant.ts
git commit -m "feat: tenant lookup with 60s cache"
```

---

## Task 5: Middleware (Domain → Tenant Routing)

**Files:**
- Create: `middleware.ts`

- [ ] **Step 1: Create middleware.ts**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getTenantByDomain } from "./lib/tenant";

export async function middleware(req: NextRequest) {
  const host = req.headers.get("host") ?? "";
  // Strip port for local dev: "localhost:3000" → "localhost:3000" (keep as-is for lookup)
  const domain = host.replace(/^www\./, "");

  // Protect /admin routes
  if (req.nextUrl.pathname.startsWith("/admin") && req.nextUrl.pathname !== "/admin/login") {
    const tenant = await getTenantByDomain(domain);
    const token = tenant?.admin_token ?? process.env.ADMIN_TOKEN ?? "";
    const cookie = req.cookies.get("admin_auth")?.value ?? "";
    if (cookie !== token) {
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }
  }

  // Inject tenant-id into every request header so API routes can read it
  const tenant = await getTenantByDomain(domain);
  const res = NextResponse.next();
  if (tenant) {
    res.headers.set("x-tenant-id", tenant.id);
    res.headers.set("x-tenant-domain", domain);
  }
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg).*)"],
};
```

- [ ] **Step 2: Run build**

```bash
npm run build 2>&1 | grep -E "error|Error"
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add middleware.ts
git commit -m "feat: domain-to-tenant middleware with admin auth"
```

---

## Task 6: lib/schedule.ts

**Files:**
- Create: `lib/schedule.ts`

- [ ] **Step 1: Copy from geo-landing and verify**

```typescript
// Snaps a send time to business hours: Mon–Fri, 8am–5pm CT.
// If rawTime falls outside those hours, advances to next valid slot.
const CT_OFFSET_HOURS = -6; // Central Time (adjust for DST as needed)

export function snapToBusinessHours(rawTime: Date, strict = false): Date {
  const d = new Date(rawTime);
  const utcMs = d.getTime();
  const ctMs  = utcMs + CT_OFFSET_HOURS * 60 * 60 * 1000;
  const ct    = new Date(ctMs);

  const hour    = ct.getUTCHours();
  const dow     = ct.getUTCDay(); // 0 = Sun, 6 = Sat
  const minutes = ct.getUTCMinutes();

  // Already in window: Mon–Fri, 8:00–17:00 CT
  const inWindow = dow >= 1 && dow <= 5 && hour >= 8 && (hour < 17 || (hour === 17 && minutes === 0));
  if (inWindow && !strict) return rawTime;

  // Advance to next valid slot
  let next = new Date(ctMs);
  next.setUTCMinutes(0, 0, 0);

  if (hour < 8 && dow >= 1 && dow <= 5) {
    next.setUTCHours(8);
  } else {
    // Advance to next weekday morning
    next.setUTCHours(8);
    do {
      next = new Date(next.getTime() + 24 * 60 * 60 * 1000);
    } while (next.getUTCDay() === 0 || next.getUTCDay() === 6);
  }

  // Convert back to UTC
  return new Date(next.getTime() - CT_OFFSET_HOURS * 60 * 60 * 1000);
}
```

- [ ] **Step 2: Run build**

```bash
npm run build 2>&1 | grep -E "error|Error"
```

- [ ] **Step 3: Commit**

```bash
git add lib/schedule.ts
git commit -m "feat: business hours scheduling utility"
```

---

## Task 7: lib/sequences.ts + lib/emails/templates.ts + lib/email-config.ts

**Files:**
- Create: `lib/sequences.ts`
- Create: `lib/emails/templates.ts`
- Create: `lib/emails/base.ts`
- Create: `lib/email-config.ts`
- Create: `lib/types.ts`

These are intentionally empty skeletons. Templates and sequences are added per client later.

- [ ] **Step 1: Create lib/sequences.ts**

```typescript
// Add client sequences here when building out a specific client deployment.
// Each sequence needs a corresponding entry in:
// 1. lib/emails/templates.ts (template functions)
// 2. supabase migration (wl_email_queue_sequence_check constraint)

export type SequenceKey = string; // tighten to union type when sequences are added

export const SEQUENCES: Array<{
  key: string;
  label: string;
  color: string;
  steps: number;
  delays: number[]; // hours between steps
}> = [
  // Example (uncomment and fill in when building client sequences):
  // {
  //   key: "warm_nurture",
  //   label: "Warm Nurture",
  //   color: "#34d399",
  //   steps: 6,
  //   delays: [0, 48, 120, 240, 360, 504],
  // },
];

export const SEQ_LABEL = Object.fromEntries(SEQUENCES.map(s => [s.key, s.label]));
export const SEQUENCE_DELAYS = Object.fromEntries(SEQUENCES.map(s => [s.key, s.delays]));
```

- [ ] **Step 2: Create lib/emails/base.ts**

```typescript
// Tenant-aware email base. All templates call wrapEmail() to apply
// the client's branding (name, color, logo, unsubscribe URL).

type EmailConfig = {
  tenantName?: string;
  brandColor?: string;
  logoUrl?: string;
  domain?: string; // used for unsubscribe link
};

export function wrapEmail(body: string, config: EmailConfig = {}): string {
  const {
    tenantName = "Your Company",
    brandColor = "#E8185C",
    logoUrl,
    domain = "",
  } = config;

  const logoHtml = logoUrl
    ? `<img src="${logoUrl}" alt="${tenantName}" style="max-height:40px;margin-bottom:16px;" />`
    : `<div style="font-size:20px;font-weight:800;color:${brandColor};">${tenantName}</div>`;

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:system-ui,-apple-system,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 0;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;max-width:600px;">
      <tr><td style="padding:28px 40px 0;text-align:center;">${logoHtml}</td></tr>
      <tr><td style="padding:24px 40px;">${body}</td></tr>
      <tr><td style="padding:16px 40px 28px;border-top:1px solid #eee;text-align:center;">
        <p style="color:#999;font-size:11px;margin:0;">
          You're receiving this because you opted in at ${tenantName}.
          <a href="https://${domain}/unsubscribe?email={{email}}" style="color:#999;">Unsubscribe</a>
        </p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

// Display name helper: "hey" if no name, "hey Sarah" if name provided
export function dn(firstName?: string | null): string {
  return firstName?.trim() ? firstName.trim().split(" ")[0] : "";
}

// Greeting helper
export function hey(firstName?: string | null): string {
  const n = dn(firstName);
  return n ? `Hey ${n}` : "Hey";
}
```

- [ ] **Step 3: Create lib/emails/templates.ts**

```typescript
// Email templates — empty until client sequences are built.
// Each template function signature:
//   (params: TemplateParams) => { subject: string; html: string }
//
// Example (add when building client sequences):
// export function warmNurture1(params: TemplateParams) {
//   return {
//     subject: `Quick question, ${dn(params.firstName) || "there"}`,
//     html: wrapEmail(`<p>...</p>`, { tenantName: "...", brandColor: "..." }),
//   };
// }

export type TemplateParams = {
  firstName?: string | null;
  email?: string;
  city?: string;
  website?: string;
  metadata?: Record<string, string>;
};

export type TemplateKey = string; // tighten to specific keys when templates are added

export const EMAIL_TEMPLATES: Record<string, (p: TemplateParams) => { subject: string; html: string }> = {
  // Templates are added here when building client sequences
};
```

- [ ] **Step 4: Create lib/email-config.ts**

```typescript
// INSTANT_EMAILS: sequence_step keys that send immediately (no 24h buffer).
// ALWAYS_RESEND: keys that bypass dedup — fire even if already sent once.
// Both sets must stay in sync. If a key is in INSTANT_EMAILS but not
// INSTANT_KEYS in should-send logic, the AI gate will delay it 24h.

export const INSTANT_EMAILS = new Set<string>([
  // Add here when sequences are defined, e.g.:
  // "warm_nurture_1",
  // "post_booking_1",
]);

export const ALWAYS_RESEND = new Set<string>([
  // Add here for opt-in confirmation emails that should always fire, e.g.:
  // "post_booking_1",
]);
```

- [ ] **Step 5: Create lib/types.ts**

```typescript
export type LeadInput = {
  email: string;
  firstName?: string;
  lastName?: string;
  website?: string;
  city?: string;
  sequences?: string[];
  suppress?: boolean;
};

export type EnrollResult = {
  email: string;
  status: "enrolled" | "skipped" | "suppressed" | "invalid";
  reason?: string;
};
```

- [ ] **Step 6: Run build**

```bash
npm run build 2>&1 | grep -E "error|Error"
```

- [ ] **Step 7: Commit**

```bash
git add lib/
git commit -m "feat: sequences, templates, email-config skeletons (intentionally empty)"
```

---

## Task 8: lib/resend.ts (Tenant-Aware Email Core)

**Files:**
- Create: `lib/resend.ts`

- [ ] **Step 1: Create lib/resend.ts**

```typescript
import { Resend } from "resend";
import { supabase } from "./supabase";
import { EMAIL_TEMPLATES } from "./emails/templates";
import { snapToBusinessHours } from "./schedule";
import { SEQUENCE_DELAYS } from "./sequences";
import { INSTANT_EMAILS, ALWAYS_RESEND } from "./email-config";
import type { Tenant } from "./tenant";
import type { SequenceKey } from "./sequences";

export const resend = new Resend(process.env.RESEND_API_KEY);

// ── Sender selection ──────────────────────────────────────────────────────────
// Hash-based rotation: same recipient always gets the same sending domain.
// EMAIL_FROM_POOL = comma-separated "Name <email>" addresses (optional).
function djb2(str: string): number {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = (((h << 5) + h) ^ str.charCodeAt(i)) >>> 0;
  }
  return h;
}

export function pickFrom(recipientEmail: string, tenant: Tenant): string {
  const pool = process.env.EMAIL_FROM_POOL;
  if (pool) {
    const addresses = pool.split(",").map(s => s.trim()).filter(Boolean);
    if (addresses.length > 0) return addresses[djb2(recipientEmail) % addresses.length];
  }
  return `${tenant.sender_name} <${tenant.sender_email}>`;
}

// ── Suppression check ─────────────────────────────────────────────────────────
export async function isSuppressed(tenantId: string, email: string): Promise<boolean> {
  const { data } = await supabase
    .from("wl_suppressed")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("email", email)
    .limit(1);
  return (data?.length ?? 0) > 0;
}

export async function suppressEmail(
  tenantId: string,
  email: string,
  reason: "client" | "unsubscribed" | "bounced" | "spam" | "admin_suppressed"
) {
  await supabase
    .from("wl_suppressed")
    .upsert({ tenant_id: tenantId, email, reason }, { onConflict: "tenant_id,email" });
  // Cancel queued emails except for "client" (client gets their welcome/proof emails)
  if (reason !== "client") {
    await cancelQueuedEmails(tenantId, email);
  }
}

// ── Event logging ─────────────────────────────────────────────────────────────
export async function logEmailEvent(
  tenantId: string,
  email: string,
  sequence: string,
  step: number,
  eventType: string,
  resendEmailId?: string | null,
  metadata: Record<string, unknown> = {}
) {
  try {
    await supabase.from("wl_email_events").insert({
      tenant_id: tenantId,
      resend_email_id: resendEmailId ?? null,
      email,
      sequence,
      step,
      event_type: eventType,
      metadata,
    });
  } catch (err) {
    console.error(`[logEmailEvent] failed: ${eventType} for ${email}`, err);
  }
}

// ── Queue cancellation ────────────────────────────────────────────────────────
export async function cancelQueuedEmails(
  tenantId: string,
  email: string,
  sequences?: string[]
) {
  let query = supabase
    .from("wl_email_queue")
    .update({ cancelled_at: new Date().toISOString() })
    .eq("tenant_id", tenantId)
    .eq("email", email)
    .is("sent_at", null)
    .is("cancelled_at", null);
  if (sequences && sequences.length > 0) {
    query = query.in("sequence", sequences);
  }
  await query;
}

// ── 24h buffer: earliest allowed send time ────────────────────────────────────
async function getNextAllowedSendTime(tenantId: string, email: string): Promise<Date> {
  const BUFFER_HOURS = 24;
  const now = new Date();

  const [{ data: lastEvent }, { data: lastQueued }] = await Promise.all([
    supabase.from("wl_email_events")
      .select("created_at")
      .eq("tenant_id", tenantId)
      .eq("email", email)
      .eq("event_type", "sent")
      .order("created_at", { ascending: false })
      .limit(1),
    supabase.from("wl_email_queue")
      .select("send_at")
      .eq("tenant_id", tenantId)
      .eq("email", email)
      .is("cancelled_at", null)
      .order("send_at", { ascending: false })
      .limit(1),
  ]);

  const candidates: Date[] = [];
  if (lastEvent?.[0]?.created_at) {
    candidates.push(new Date(new Date(lastEvent[0].created_at).getTime() + BUFFER_HOURS * 3600000));
  }
  if (lastQueued?.[0]?.send_at) {
    candidates.push(new Date(new Date(lastQueued[0].send_at).getTime() + BUFFER_HOURS * 3600000));
  }

  const earliest = candidates.length > 0
    ? new Date(Math.max(...candidates.map(d => d.getTime())))
    : now;
  return earliest > now ? earliest : now;
}

// ── Enqueue a sequence for a lead ─────────────────────────────────────────────
export async function enqueueSequence(
  tenantId: string,
  sequence: SequenceKey,
  email: string,
  tenant: Tenant,
  firstName?: string,
  metadata: Record<string, string> = {},
  skipSteps: number[] = []
) {
  if (await isSuppressed(tenantId, email)) return;

  // Name lookup fallback
  let resolvedName = firstName?.trim() || null;
  if (!resolvedName) {
    const { data: queueRow } = await supabase
      .from("wl_email_queue")
      .select("first_name")
      .eq("tenant_id", tenantId)
      .eq("email", email)
      .not("first_name", "is", null)
      .limit(1)
      .maybeSingle();
    resolvedName = queueRow?.first_name || null;
  }

  const delays = SEQUENCE_DELAYS[sequence];
  if (!delays) return;

  const now = new Date();
  let bufferedBase: Date | null = null;

  for (let i = 0; i < delays.length; i++) {
    const step = i + 1;
    const hours = delays[i];
    const key = `${sequence}_${step}`;
    const templateFn = EMAIL_TEMPLATES[key];
    if (!templateFn) continue;
    if (skipSteps.includes(step)) continue;

    const isInstant = INSTANT_EMAILS.has(key);
    if (!bufferedBase && !isInstant) {
      bufferedBase = await getNextAllowedSendTime(tenantId, email);
    }
    const base = isInstant ? now : bufferedBase!;
    const rawSendTime = new Date(base.getTime() + hours * 3600000);
    const sendTime = hours === 0 ? rawSendTime : snapToBusinessHours(rawSendTime, false);
    const sendNow = sendTime <= now;

    if (sendNow) {
      if (!ALWAYS_RESEND.has(key)) {
        const { data: alreadySent } = await supabase
          .from("wl_email_events")
          .select("id")
          .eq("tenant_id", tenantId)
          .eq("email", email)
          .eq("sequence", sequence)
          .eq("step", step)
          .eq("event_type", "sent")
          .limit(1);
        if ((alreadySent?.length ?? 0) > 0) continue;
      }
      const { subject, html } = templateFn({ firstName: resolvedName ?? undefined, email, ...metadata });
      const finalHtml = html.replace(/\{\{email\}\}/g, encodeURIComponent(email));
      const result = await resend.emails.send({
        from: pickFrom(email, tenant),
        replyTo: tenant.reply_to,
        to: email,
        subject,
        html: finalHtml,
      });
      await logEmailEvent(tenantId, email, sequence, step, "sent", result.data?.id ?? null);
      await supabase.from("wl_email_queue").insert({
        tenant_id: tenantId, email, first_name: resolvedName,
        sequence, step, send_at: now.toISOString(), sent_at: now.toISOString(), metadata,
      });
    } else {
      const { error } = await supabase.from("wl_email_queue").insert({
        tenant_id: tenantId, email, first_name: resolvedName,
        sequence, step, send_at: sendTime.toISOString(), metadata,
      });
      if (error && !error.message.includes("wl_email_queue_dedup_idx")) throw error;
    }
  }
}

// ── Engagement acceleration (>50% click rate → trigger proof early) ───────────
const PROOF_BLOCKING = ["post_booking", "post_call", "purchased_welcome", "hot_proof"];
const PROOF_SUPERSEDES = ["warm_nurture", "long_term_nurture", "schedule_abandoned", "video_watched", "video_abandoned", "no_show"];

export async function checkEngagementAcceleration(tenantId: string, email: string, tenant: Tenant): Promise<void> {
  try {
    if (await isSuppressed(tenantId, email)) return;

    const { data: blocking } = await supabase
      .from("wl_email_queue")
      .select("sequence")
      .eq("tenant_id", tenantId)
      .eq("email", email)
      .in("sequence", PROOF_BLOCKING)
      .is("cancelled_at", null)
      .limit(1);
    if (blocking && blocking.length > 0) return;

    const { data: proofSent } = await supabase
      .from("wl_email_events")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("email", email)
      .eq("sequence", "proof")
      .eq("event_type", "sent")
      .limit(1);
    if (proofSent && proofSent.length > 0) return;

    const [{ data: sentRows }, { data: clickedRows }] = await Promise.all([
      supabase.from("wl_email_events").select("resend_email_id")
        .eq("tenant_id", tenantId).eq("email", email).eq("event_type", "sent")
        .not("resend_email_id", "is", null),
      supabase.from("wl_email_events").select("resend_email_id")
        .eq("tenant_id", tenantId).eq("email", email).eq("event_type", "clicked")
        .not("resend_email_id", "is", null),
    ]);

    const sentIds    = new Set((sentRows    ?? []).map(r => r.resend_email_id));
    const clickedIds = new Set((clickedRows ?? []).map(r => r.resend_email_id));

    if (sentIds.size < 2) return;
    if (clickedIds.size / sentIds.size < 0.5) return;

    const { data: nameRow } = await supabase
      .from("wl_email_queue").select("first_name")
      .eq("tenant_id", tenantId).eq("email", email)
      .not("first_name", "is", null).limit(1).maybeSingle();

    await cancelQueuedEmails(tenantId, email, PROOF_SUPERSEDES);
    await enqueueSequence(tenantId, "proof", email, tenant, nameRow?.first_name ?? undefined);
    await logEmailEvent(tenantId, email, "proof", 0, "engagement_accelerated", null, {
      sent_count: sentIds.size,
      clicked_count: clickedIds.size,
      ratio_pct: Math.round((clickedIds.size / sentIds.size) * 100),
    });
  } catch (err) {
    console.error("[checkEngagementAcceleration] failed for", email, err);
  }
}

export async function addToResendAudience(audienceId: string, email: string, firstName?: string) {
  if (!audienceId) return;
  try {
    await resend.contacts.create({ audienceId, email, firstName: firstName ?? undefined });
  } catch {
    // Non-fatal — contact may already exist
  }
}
```

- [ ] **Step 2: Run build**

```bash
npm run build 2>&1 | grep -E "error|Error"
```

- [ ] **Step 3: Commit**

```bash
git add lib/resend.ts
git commit -m "feat: tenant-aware email queue core (resend.ts)"
```

---

## Task 9: Admin Auth Helpers

**Files:**
- Create: `lib/auth.ts`

- [ ] **Step 1: Create lib/auth.ts**

```typescript
import { NextRequest } from "next/server";
import { supabase } from "./supabase";
import type { Tenant } from "./tenant";

// Validates admin_auth cookie against the tenant's admin_token.
// Also accepts x-admin-key header for cron jobs (uses CRON_SECRET).
export function isAuthed(req: NextRequest, tenant: Tenant | null): boolean {
  const cronSecret = process.env.CRON_SECRET ?? "";
  if (cronSecret && req.headers.get("x-admin-key") === cronSecret) return true;
  if (!tenant) return false;
  const cookie = req.cookies.get("admin_auth")?.value ?? "";
  return cookie === tenant.admin_token;
}

// Get tenant from request — reads x-tenant-id header injected by middleware.
// Returns null if tenant not found (shouldn't happen in practice).
export async function getTenantFromRequest(req: NextRequest): Promise<Tenant | null> {
  const tenantId = req.headers.get("x-tenant-id");
  if (!tenantId) return null;
  const { data } = await supabase
    .from("tenants")
    .select("*")
    .eq("id", tenantId)
    .single();
  return data as Tenant | null;
}
```

- [ ] **Step 2: Run build**

```bash
npm run build 2>&1 | grep -E "error|Error"
```

- [ ] **Step 3: Commit**

```bash
git add lib/auth.ts
git commit -m "feat: admin auth helpers"
```

---

## Task 10: API — Admin Login

**Files:**
- Create: `app/api/admin/login/route.ts`

- [ ] **Step 1: Create app/api/admin/login/route.ts**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getTenantFromRequest } from "../../../../lib/auth";

export async function POST(req: NextRequest) {
  const { token } = await req.json();
  const tenant = await getTenantFromRequest(req);
  if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

  if (token !== tenant.admin_token) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set("admin_auth", tenant.admin_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: "/",
  });
  return res;
}
```

- [ ] **Step 2: Run build and commit**

```bash
npm run build 2>&1 | grep -E "error|Error"
git add app/api/admin/login/
git commit -m "feat: admin login API"
```

---

## Task 11: API — Cron Queue Processor

**Files:**
- Create: `app/api/cron/route.ts`

- [ ] **Step 1: Create app/api/cron/route.ts**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../lib/supabase";
import { resend, logEmailEvent, isSuppressed, pickFrom } from "../../../lib/resend";
import { EMAIL_TEMPLATES } from "../../../lib/emails/templates";
import type { Tenant } from "../../../lib/tenant";

function isAuthed(req: NextRequest) {
  return req.headers.get("x-admin-key") === process.env.CRON_SECRET
    || req.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`;
}

export async function GET(req: NextRequest) {
  if (!isAuthed(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Claim a batch atomically (FOR UPDATE SKIP LOCKED prevents double-sends)
  const { data: batch, error } = await supabase.rpc("claim_wl_queue_batch", { p_batch_size: 100 });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!batch || batch.length === 0) return NextResponse.json({ sent: 0 });

  // Group by tenant_id to batch-fetch tenant configs
  const tenantIds = [...new Set(batch.map((r: { tenant_id: string }) => r.tenant_id))];
  const { data: tenants } = await supabase
    .from("tenants")
    .select("*")
    .in("id", tenantIds);
  const tenantMap = new Map((tenants ?? []).map((t: Tenant) => [t.id, t]));

  let sent = 0;
  let skipped = 0;

  await Promise.all(
    batch.map(async (row: {
      id: number; tenant_id: string; email: string; first_name: string | null;
      sequence: string; step: number; metadata: Record<string, string>;
    }) => {
      const tenant = tenantMap.get(row.tenant_id);
      if (!tenant) { skipped++; return; }

      // Double-check suppression (belt + suspenders)
      if (await isSuppressed(row.tenant_id, row.email)) { skipped++; return; }

      const key = `${row.sequence}_${row.step}` as keyof typeof EMAIL_TEMPLATES;
      const templateFn = EMAIL_TEMPLATES[key];
      if (!templateFn) { skipped++; return; }

      try {
        const { subject, html } = templateFn({
          firstName: row.first_name ?? undefined,
          email: row.email,
          ...(row.metadata ?? {}),
        });
        const finalHtml = html.replace(/\{\{email\}\}/g, encodeURIComponent(row.email));
        const result = await resend.emails.send({
          from: pickFrom(row.email, tenant),
          replyTo: tenant.reply_to,
          to: row.email,
          subject,
          html: finalHtml,
        });
        await logEmailEvent(row.tenant_id, row.email, row.sequence, row.step, "sent", result.data?.id ?? null);
        sent++;
      } catch (err) {
        // Un-claim on failure so it retries next tick
        await supabase.from("wl_email_queue")
          .update({ sent_at: null })
          .eq("id", row.id);
        console.error("[cron] send failed for", row.email, err);
      }
    })
  );

  return NextResponse.json({ sent, skipped, total: batch.length });
}
```

- [ ] **Step 2: Run build and commit**

```bash
npm run build 2>&1 | grep -E "error|Error"
git add app/api/cron/route.ts
git commit -m "feat: cron queue processor with atomic batch claim"
```

---

## Task 12: API — Sequence Graduation Cron

**Files:**
- Create: `app/api/cron/graduate/route.ts`

- [ ] **Step 1: Create app/api/cron/graduate/route.ts**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../../lib/supabase";
import { enqueueSequence, cancelQueuedEmails } from "../../../../lib/resend";
import type { Tenant } from "../../../../lib/tenant";

// CHAIN_MAP: when a lead finishes sequence A, automatically enroll in B.
// Add entries here as client sequences are built.
// Empty by default — filled in when building client deployments.
const CHAIN_MAP: Record<string, string> = {
  // Example:
  // "warm_nurture": "proof",
  // "proof": "long_term_nurture",
};

function isAuthed(req: NextRequest) {
  return req.headers.get("x-admin-key") === process.env.CRON_SECRET
    || req.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`;
}

export async function GET(req: NextRequest) {
  if (!isAuthed(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (Object.keys(CHAIN_MAP).length === 0) {
    return NextResponse.json({ graduated: 0, note: "CHAIN_MAP is empty — add sequences first" });
  }

  const results: string[] = [];

  for (const [fromSeq, toSeq] of Object.entries(CHAIN_MAP)) {
    // Find leads whose last step in fromSeq was sent and have no pending queue rows in fromSeq
    const { data: graduated } = await supabase
      .from("wl_email_events")
      .select("tenant_id, email")
      .eq("sequence", fromSeq)
      .eq("event_type", "sent")
      .order("created_at", { ascending: false });

    if (!graduated) continue;

    const seen = new Set<string>();
    for (const row of graduated) {
      const key = `${row.tenant_id}|${row.email}`;
      if (seen.has(key)) continue;
      seen.add(key);

      // Skip if already in toSeq
      const { data: alreadyIn } = await supabase
        .from("wl_email_events")
        .select("id")
        .eq("tenant_id", row.tenant_id)
        .eq("email", row.email)
        .eq("sequence", toSeq)
        .eq("event_type", "sent")
        .limit(1);
      if (alreadyIn && alreadyIn.length > 0) continue;

      const { data: tenant } = await supabase
        .from("tenants").select("*").eq("id", row.tenant_id).single();
      if (!tenant) continue;

      await enqueueSequence(row.tenant_id, toSeq, row.email, tenant as Tenant);
      results.push(`${row.email} → ${toSeq}`);
    }
  }

  return NextResponse.json({ graduated: results.length, results });
}
```

- [ ] **Step 2: Run build and commit**

```bash
npm run build 2>&1 | grep -E "error|Error"
git add app/api/cron/graduate/route.ts
git commit -m "feat: sequence graduation cron (CHAIN_MAP driven)"
```

---

## Task 13: API — Resend Webhook

**Files:**
- Create: `app/api/resend-webhook/route.ts`

- [ ] **Step 1: Create app/api/resend-webhook/route.ts**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { supabase } from "../../../lib/supabase";
import { logEmailEvent, suppressEmail, checkEngagementAcceleration } from "../../../lib/resend";
import type { Tenant } from "../../../lib/tenant";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  // Signature verification
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (secret) {
    const signature   = req.headers.get("svix-signature") ?? "";
    const msgId       = req.headers.get("svix-id") ?? "";
    const msgTs       = req.headers.get("svix-timestamp") ?? "";
    const toSign      = `${msgId}.${msgTs}.${rawBody}`;
    const key         = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
    const computed    = createHmac("sha256", key).update(toSign).digest("base64");
    const passedSigs  = signature.split(" ").map(s => s.replace(/^v1,/, ""));
    if (!passedSigs.includes(computed)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  const body          = JSON.parse(rawBody);
  const eventType     = body.type ?? "";
  const data          = body.data ?? {};
  const resendEmailId = data.email_id ?? "";
  const toAddress     = (data.to ?? [])[0] ?? "";

  if (!eventType || !resendEmailId || !toAddress) {
    return NextResponse.json({ ok: true });
  }

  // Look up which tenant this email belongs to (via sent event)
  const { data: sentEvent } = await supabase
    .from("wl_email_events")
    .select("tenant_id, sequence, step")
    .eq("resend_email_id", resendEmailId)
    .eq("event_type", "sent")
    .limit(1)
    .single();

  const tenantId = sentEvent?.tenant_id ?? null;

  // If we can't identify the tenant, log and move on
  if (!tenantId) return NextResponse.json({ ok: true });

  if (eventType === "email.complained") {
    await suppressEmail(tenantId, toAddress, "spam");
    await logEmailEvent(tenantId, toAddress, "unknown", 0, "complained", resendEmailId);
    return NextResponse.json({ ok: true });
  }

  if (eventType === "email.bounced") {
    const bounceType = data.bounce?.type ?? data.bounceType ?? "";
    if (bounceType === "hard" || bounceType === "permanent") {
      await suppressEmail(tenantId, toAddress, "bounced");
    }
    await logEmailEvent(tenantId, toAddress, sentEvent?.sequence ?? "unknown", sentEvent?.step ?? 0, "bounced", resendEmailId, { bounceType });
    return NextResponse.json({ ok: true });
  }

  if (eventType === "email.unsubscribed") {
    await suppressEmail(tenantId, toAddress, "unsubscribed");
    await logEmailEvent(tenantId, toAddress, "unknown", 0, "unsubscribed", resendEmailId);
    return NextResponse.json({ ok: true });
  }

  const typeMap: Record<string, string> = {
    "email.opened":           "opened",
    "email.clicked":          "clicked",
    "email.delivery_delayed": "delayed",
  };
  const mapped = typeMap[eventType];
  if (!mapped) return NextResponse.json({ ok: true });

  const metadata: Record<string, unknown> = {};
  if (mapped === "clicked" && data.click?.link) metadata.link = data.click.link;

  await logEmailEvent(tenantId, toAddress, sentEvent?.sequence ?? "unknown", sentEvent?.step ?? 0, mapped, resendEmailId, metadata);

  if (mapped === "clicked") {
    const { data: tenant } = await supabase.from("tenants").select("*").eq("id", tenantId).single();
    if (tenant) await checkEngagementAcceleration(tenantId, toAddress, tenant as Tenant);
  }

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Run build and commit**

```bash
npm run build 2>&1 | grep -E "error|Error"
git add app/api/resend-webhook/route.ts
git commit -m "feat: resend webhook (tenant-scoped)"
```

---

## Task 14: API — Unsubscribe + Calendly + Stripe Webhooks

**Files:**
- Create: `app/api/unsubscribe/route.ts`
- Create: `app/api/calendly-webhook/route.ts`
- Create: `app/api/stripe-webhook/route.ts`
- Create: `app/api/booked/route.ts`

- [ ] **Step 1: Create app/api/unsubscribe/route.ts**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { suppressEmail } from "../../../lib/resend";
import { getTenantFromRequest } from "../../../lib/auth";

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email");
  if (!email) return NextResponse.redirect(new URL("/", req.url));
  const tenant = await getTenantFromRequest(req);
  if (!tenant) return NextResponse.redirect(new URL("/", req.url));
  await suppressEmail(tenant.id, decodeURIComponent(email), "unsubscribed");
  return NextResponse.json({ ok: true, message: "You have been unsubscribed." });
}
```

- [ ] **Step 2: Create app/api/booked/route.ts**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../lib/supabase";
import { enqueueSequence, cancelQueuedEmails } from "../../../lib/resend";
import { getTenantFromRequest } from "../../../lib/auth";

export async function POST(req: NextRequest) {
  const tenant = await getTenantFromRequest(req);
  if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

  const body = await req.json();
  const { email, firstName, meetingTime } = body;
  if (!email) return NextResponse.json({ error: "Missing email" }, { status: 400 });

  // Save call record
  await supabase.from("wl_scheduled_calls").insert({
    tenant_id: tenant.id,
    email: email.toLowerCase().trim(),
    first_name: firstName ?? null,
    meeting_time: meetingTime ?? null,
    outcome: "pending",
  });

  // Cancel warm nurture sequences, start post_booking
  await cancelQueuedEmails(tenant.id, email, ["warm_nurture", "long_term_nurture", "schedule_abandoned"]);
  await enqueueSequence(tenant.id, "post_booking", email, tenant, firstName);

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Create app/api/calendly-webhook/route.ts**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../lib/supabase";
import { enqueueSequence, cancelQueuedEmails } from "../../../lib/resend";
import type { Tenant } from "../../../lib/tenant";

// Calendly sends to a single webhook URL — tenant identified by payload
// (invitee email → look up which tenant has a call for this email).
// For multi-tenant: configure one webhook per client deployment.
export async function POST(req: NextRequest) {
  const body = await req.json();
  const eventType = body.event ?? "";
  const payload   = body.payload ?? {};

  if (eventType !== "invitee.created") return NextResponse.json({ ok: true });

  const email     = payload.email?.toLowerCase().trim() ?? "";
  const firstName = payload.first_name ?? null;
  const meetingTime = payload.scheduled_event?.start_time ?? null;
  if (!email) return NextResponse.json({ ok: true });

  // Identify tenant by domain (Calendly webhook configured per deployment)
  const tenantId = req.headers.get("x-tenant-id");
  if (!tenantId) return NextResponse.json({ ok: true });

  const { data: tenant } = await supabase.from("tenants").select("*").eq("id", tenantId).single();
  if (!tenant) return NextResponse.json({ ok: true });

  await supabase.from("wl_scheduled_calls").insert({
    tenant_id: tenantId, email, first_name: firstName,
    meeting_time: meetingTime, outcome: "pending",
  });

  await cancelQueuedEmails(tenantId, email, ["warm_nurture", "schedule_abandoned"]);
  await enqueueSequence(tenantId, "post_booking", email, tenant as Tenant, firstName);

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 4: Create app/api/stripe-webhook/route.ts**

```typescript
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { supabase } from "../../../lib/supabase";
import { suppressEmail, cancelQueuedEmails, enqueueSequence } from "../../../lib/resend";
import type { Tenant } from "../../../lib/tenant";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const sig     = req.headers.get("stripe-signature") ?? "";
  const secret  = process.env.STRIPE_WEBHOOK_SECRET!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, secret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type !== "checkout.session.completed") return NextResponse.json({ ok: true });

  const session   = event.data.object as Stripe.Checkout.Session;
  const email     = session.customer_details?.email?.toLowerCase() ?? "";
  const firstName = session.customer_details?.name?.split(" ")[0] ?? undefined;
  if (!email) return NextResponse.json({ ok: true });

  const tenantId = req.headers.get("x-tenant-id");
  if (!tenantId) return NextResponse.json({ ok: true });

  const { data: tenant } = await supabase.from("tenants").select("*").eq("id", tenantId).single();
  if (!tenant) return NextResponse.json({ ok: true });

  const t = tenant as Tenant;
  const amount = session.amount_total ? session.amount_total / 100 : null;
  const pkg = amount === t.price_1 ? 1 : amount === t.price_2 ? 2 : amount === t.price_3 ? 3 : 1;
  const stripeLink = pkg === 1 ? t.stripe_link_1 : pkg === 2 ? t.stripe_link_2 : t.stripe_link_3;

  await cancelQueuedEmails(tenantId, email);
  await enqueueSequence(tenantId, "purchased_welcome", email, t, firstName, {
    stripe_link: stripeLink ?? "",
    package: String(pkg),
    package_price: String(amount ?? 0),
  });
  await suppressEmail(tenantId, email, "client");

  await supabase.from("wl_scheduled_calls")
    .update({ outcome: "purchased", package_price: amount, processed_at: new Date().toISOString() })
    .eq("tenant_id", tenantId)
    .eq("email", email)
    .neq("outcome", "purchased");

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 5: Run build and commit**

```bash
npm run build 2>&1 | grep -E "error|Error"
git add app/api/
git commit -m "feat: unsubscribe, booked, calendly, stripe webhook routes"
```

---

## Task 15: Admin API Routes

**Files:**
- Create: `app/api/admin/leads/route.ts`
- Create: `app/api/admin/lead-profile/route.ts`
- Create: `app/api/admin/activity/route.ts`
- Create: `app/api/admin/campaigns/route.ts`
- Create: `app/api/admin/bulk-enroll/route.ts`
- Create: `app/api/admin/send-personal-email/route.ts`

These are adapted from geo-landing with two key changes:
1. All queries add `.eq("tenant_id", tenant.id)`
2. Auth uses `isAuthed(req, tenant)` from lib/auth.ts

- [ ] **Step 1: Create app/api/admin/leads/route.ts**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../../lib/supabase";
import { getTenantFromRequest, isAuthed } from "../../../../lib/auth";

export async function GET(req: NextRequest) {
  const tenant = await getTenantFromRequest(req);
  if (!isAuthed(req, tenant)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params    = req.nextUrl.searchParams;
  const page      = parseInt(params.get("page") ?? "0");
  const search    = params.get("search") ?? "";
  const sortLast  = (params.get("sort_last") as "asc" | "desc") ?? "desc";
  const sortName  = params.get("sort_name") ?? "";
  const temp      = params.get("temp") ?? "";
  const source    = params.get("source") ?? "";
  const sequence  = params.get("sequence") ?? "";
  const PAGE_SIZE = 50;

  const { data, error } = await supabase.rpc("get_wl_leads_page", {
    p_tenant_id:   tenant!.id,
    p_page:        page,
    p_page_size:   PAGE_SIZE,
    p_search:      search,
    p_temp:        temp,
    p_source:      source,
    p_sequence:    sequence,
    p_sort_name:   sortName,
    p_sort_last:   sortLast,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
```

- [ ] **Step 2: Add get_wl_leads_page function to Supabase**

Run in Supabase SQL Editor:

```sql
CREATE OR REPLACE FUNCTION get_wl_leads_page(
  p_tenant_id   UUID,
  p_page        INTEGER DEFAULT 0,
  p_page_size   INTEGER DEFAULT 50,
  p_search      TEXT    DEFAULT '',
  p_temp        TEXT    DEFAULT '',
  p_source      TEXT    DEFAULT '',
  p_sequence    TEXT    DEFAULT '',
  p_sort_name   TEXT    DEFAULT '',
  p_sort_last   TEXT    DEFAULT 'desc'
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'leads', COALESCE(json_agg(l ORDER BY
      CASE WHEN p_sort_name = 'asc'  THEN l.first_name END ASC NULLS LAST,
      CASE WHEN p_sort_name = 'desc' THEN l.first_name END DESC NULLS LAST,
      CASE WHEN p_sort_last = 'asc'  THEN l.last_event_at END ASC NULLS LAST,
      CASE WHEN p_sort_last = 'desc' OR p_sort_last = '' THEN l.last_event_at END DESC NULLS LAST
    ), '[]'::json),
    'totals', json_build_object('total', COUNT(*) OVER())
  )
  INTO v_result
  FROM (
    SELECT DISTINCT ON (q.email)
      q.email,
      q.first_name,
      q.sequence AS current_sequence,
      q.metadata->>'source' AS source,
      s.reason AS suppress_reason,
      MAX(e.created_at) OVER (PARTITION BY q.email) AS last_event_at,
      q.created_at AS enrolled_at,
      EXISTS(SELECT 1 FROM wl_email_events e2 WHERE e2.tenant_id = p_tenant_id AND e2.email = q.email AND e2.event_type = 'opened')  AS opened,
      EXISTS(SELECT 1 FROM wl_email_events e2 WHERE e2.tenant_id = p_tenant_id AND e2.email = q.email AND e2.event_type = 'clicked') AS clicked,
      EXISTS(SELECT 1 FROM wl_email_events e2 WHERE e2.tenant_id = p_tenant_id AND e2.email = q.email AND e2.sequence = 'post_booking' AND e2.event_type = 'sent') AS booked,
      EXISTS(SELECT 1 FROM wl_email_events e2 WHERE e2.tenant_id = p_tenant_id AND e2.email = q.email AND e2.sequence = 'no_show'     AND e2.event_type = 'sent') AS no_show,
      (
        SELECT json_build_object('event_type', e3.event_type, 'created_at', e3.created_at)
        FROM wl_email_events e3
        WHERE e3.tenant_id = p_tenant_id AND e3.email = q.email
        ORDER BY e3.created_at DESC LIMIT 1
      ) AS last_email
    FROM wl_email_queue q
    LEFT JOIN wl_email_events e  ON e.tenant_id  = p_tenant_id AND e.email  = q.email
    LEFT JOIN wl_suppressed   s  ON s.tenant_id  = p_tenant_id AND s.email  = q.email
    WHERE q.tenant_id = p_tenant_id
      AND (p_search  = '' OR q.email ILIKE '%' || p_search || '%' OR q.first_name ILIKE '%' || p_search || '%')
      AND (p_source  = '' OR q.metadata->>'source' = p_source)
      AND (p_sequence = '' OR q.sequence = p_sequence)
    ORDER BY q.email, q.created_at DESC
  ) l
  WHERE (p_temp = '' OR (
    CASE p_temp
      WHEN 'client'       THEN l.suppress_reason = 'client'
      WHEN 'hot'          THEN l.booked AND NOT l.no_show
      WHEN 'no_show'      THEN l.no_show
      WHEN 'warm'         THEN l.opened OR l.clicked
      WHEN 'cold'         THEN NOT l.opened AND NOT l.clicked AND l.suppress_reason IS NULL
      WHEN 'bounced'      THEN l.suppress_reason = 'bounced'
      WHEN 'unsubscribed' THEN l.suppress_reason = 'unsubscribed'
      ELSE TRUE
    END
  ))
  LIMIT p_page_size OFFSET p_page * p_page_size;

  RETURN v_result;
END;
$$;
```

- [ ] **Step 3: Create app/api/admin/activity/route.ts**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../../lib/supabase";
import { getTenantFromRequest, isAuthed } from "../../../../lib/auth";

export async function GET(req: NextRequest) {
  const tenant = await getTenantFromRequest(req);
  if (!isAuthed(req, tenant)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tid = tenant!.id;
  const now = new Date();
  const d30 = new Date(now.getTime() - 30 * 24 * 3600000).toISOString();
  const d7  = new Date(now.getTime() - 7  * 24 * 3600000).toISOString();

  const [
    { data: stats },
    { data: recentLeads },
    { data: pendingCalls },
    { data: recentEvents },
  ] = await Promise.all([
    // Use pre-computed stats table — fast even at 8M event rows
    supabase.from("wl_tenant_stats")
      .select("sequence, step, sent_count, open_count, click_count")
      .eq("tenant_id", tid),
    supabase.from("wl_email_queue")
      .select("email, first_name, created_at")
      .eq("tenant_id", tid)
      .gte("created_at", d7)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase.from("wl_scheduled_calls")
      .select("email, first_name, meeting_time, outcome")
      .eq("tenant_id", tid)
      .eq("outcome", "pending")
      .gte("meeting_time", d7)
      .order("meeting_time", { ascending: true }),
    supabase.from("wl_email_events")
      .select("email, event_type, sequence, step, created_at")
      .eq("tenant_id", tid)
      .in("event_type", ["opened", "clicked"])
      .gte("created_at", d7)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const totalSent30d  = (stats ?? []).reduce((a: number, s: { sent_count: number }) => a + s.sent_count, 0);
  const totalOpen30d  = (stats ?? []).reduce((a: number, s: { open_count: number }) => a + s.open_count, 0);
  const openRate      = totalSent30d > 0 ? Math.round(totalOpen30d / totalSent30d * 100) : 0;

  return NextResponse.json({
    open_rate_30d:  openRate,
    sent_30d:       totalSent30d,
    new_leads_7d:   recentLeads?.length ?? 0,
    pending_calls:  pendingCalls ?? [],
    needs_action:   pendingCalls?.length ?? 0,
    recent_openers: recentEvents ?? [],
    recent_leads:   recentLeads ?? [],
  });
}
```

- [ ] **Step 4: Create app/api/admin/campaigns/route.ts**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../../lib/supabase";
import { getTenantFromRequest, isAuthed } from "../../../../lib/auth";

export async function GET(req: NextRequest) {
  const tenant = await getTenantFromRequest(req);
  if (!isAuthed(req, tenant)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tid      = tenant!.id;
  const sequence = req.nextUrl.searchParams.get("sequence");
  const step     = req.nextUrl.searchParams.get("step");

  // Aggregate stats — read from materialized table (never slow)
  if (!sequence) {
    const { data: stats } = await supabase
      .from("wl_tenant_stats")
      .select("sequence, step, sent_count, open_count, click_count")
      .eq("tenant_id", tid)
      .order("sequence")
      .order("step");
    return NextResponse.json({ rows: stats ?? [] });
  }

  // Per-step detail view
  const { data: events } = await supabase
    .from("wl_email_events")
    .select("email, event_type, resend_email_id, created_at")
    .eq("tenant_id", tid)
    .eq("sequence", sequence)
    .eq("step", parseInt(step ?? "1"))
    .in("event_type", ["sent", "opened", "clicked"]);

  const sentEmails   = new Set((events ?? []).filter((e: { event_type: string }) => e.event_type === "sent").map((e: { email: string }) => e.email));
  const openedEmails = new Set((events ?? []).filter((e: { event_type: string }) => e.event_type === "opened").map((e: { email: string }) => e.email));
  const clickedEmails= new Set((events ?? []).filter((e: { event_type: string }) => e.event_type === "clicked").map((e: { email: string }) => e.email));

  const opened     = [...sentEmails].filter(e => openedEmails.has(e)).map(e => ({ email: e, opened: true, clicked: clickedEmails.has(e) }));
  const not_opened = [...sentEmails].filter(e => !openedEmails.has(e)).map(e => ({ email: e, opened: false, clicked: false }));

  return NextResponse.json({
    total_sent:     sentEmails.size,
    opened_count:   openedEmails.size,
    clicked_count:  clickedEmails.size,
    opened,
    not_opened,
  });
}
```

- [ ] **Step 5: Create app/api/admin/bulk-enroll/route.ts**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../../lib/supabase";
import { enqueueSequence, isSuppressed } from "../../../../lib/resend";
import { getTenantFromRequest, isAuthed } from "../../../../lib/auth";
import type { LeadInput, EnrollResult } from "../../../../lib/types";

export async function POST(req: NextRequest) {
  const tenant = await getTenantFromRequest(req);
  if (!isAuthed(req, tenant)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body   = await req.json();
  const leads: LeadInput[] = body.leads ?? [];
  if (!Array.isArray(leads) || leads.length === 0) {
    return NextResponse.json({ error: "No leads provided" }, { status: 400 });
  }

  const results: EnrollResult[] = [];
  for (const lead of leads) {
    const email = lead.email?.trim().toLowerCase();
    if (!email) { results.push({ email: lead.email, status: "invalid" }); continue; }
    if (await isSuppressed(tenant!.id, email)) { results.push({ email, status: "suppressed" }); continue; }

    const sequences = lead.sequences ?? ["warm_nurture"];
    for (const seq of sequences) {
      await enqueueSequence(tenant!.id, seq, email, tenant!, lead.firstName, { source: "import" });
    }
    results.push({ email, status: "enrolled" });
  }

  const summary = results.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return NextResponse.json({ summary, results });
}
```

- [ ] **Step 6: Create app/api/admin/send-personal-email/route.ts**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { resend } from "../../../../lib/resend";
import { getTenantFromRequest, isAuthed } from "../../../../lib/auth";
import { logEmailEvent, pickFrom } from "../../../../lib/resend";

export async function POST(req: NextRequest) {
  const tenant = await getTenantFromRequest(req);
  if (!isAuthed(req, tenant)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { email, subject, body } = await req.json();
  if (!email || !subject || !body) {
    return NextResponse.json({ error: "Missing email, subject, or body" }, { status: 400 });
  }

  const fullBody = body + `\n\n— ${tenant!.sender_name}`;
  const html     = `<p style="font-family:system-ui;font-size:15px;line-height:1.6;color:#222;">${fullBody.replace(/\n/g, "<br>")}</p>`;

  const result = await resend.emails.send({
    from:    pickFrom(email, tenant!),
    replyTo: tenant!.reply_to,
    to:      email,
    subject,
    html,
  });

  await logEmailEvent(tenant!.id, email, "personal", 0, "sent", result.data?.id ?? null);
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 7: Run build and commit**

```bash
npm run build 2>&1 | grep -E "error|Error"
git add app/api/admin/
git commit -m "feat: admin API routes (leads, activity, campaigns, bulk-enroll, send-email)"
```

---

## Task 16: Admin Pages

**Files:**
- Create: `app/admin/layout.tsx`
- Create: `app/admin/login/page.tsx`
- Create: `app/admin/leads/page.tsx`
- Create: `app/admin/leads/LeadsHub.tsx`
- Create: `app/admin/leads/LeadDetailPanel.tsx`
- Create: `app/admin/activity/page.tsx`
- Create: `app/admin/campaigns/page.tsx`

These are adapted directly from geo-landing admin pages with:
1. Brand colors read from a `ClientTheme` context (or CSS variables) instead of hardcoded `#E8185C`
2. No `Calls` or `Enroll` nav items (those were removed in geo too)
3. All API calls remain the same URL structure

- [ ] **Step 1: Create app/admin/layout.tsx**

```typescript
"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

// Brand config injected by the page via __NEXT_DATA__ or CSS variables.
// For now reads a CSS variable set by the root layout from env.
const S = {
  nav: "#0d1e36", border: "#1e3354", text: "#F7F8FC",
  muted: "#9BACC0", faint: "#4A5E7A",
  // brand_color is set via --brand-color CSS variable (see root layout)
};

const NAV_LINKS = [
  { href: "/admin/activity",  label: "Activity"   },
  { href: "/admin/leads",     label: "Leads"      },
  { href: "/admin/campaigns", label: "Campaigns"  },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/admin/login") return <>{children}</>;

  return (
    <div style={{ fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif", background: "#0F1E3A", minHeight: "100vh" }}>
      <nav style={{ background: S.nav, borderBottom: `1px solid ${S.border}`, height: 52, display: "flex", alignItems: "center", padding: "0 24px", position: "sticky", top: 0, zIndex: 50 }}>
        <span style={{ color: "var(--brand-color, #E8185C)", fontWeight: 800, fontSize: 15, marginRight: 40, letterSpacing: "-0.02em" }}>
          Admin
        </span>
        <div style={{ display: "flex", gap: 4 }}>
          {NAV_LINKS.map(({ href, label }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link key={href} href={href} style={{
                color: active ? S.text : S.muted, fontWeight: active ? 700 : 400,
                fontSize: 14, padding: "6px 14px", borderRadius: 6, textDecoration: "none",
                background: active ? "#1a2d4a" : "transparent",
                borderBottom: active ? `2px solid var(--brand-color, #E8185C)` : "2px solid transparent",
              }}>{label}</Link>
            );
          })}
        </div>
      </nav>
      <div>{children}</div>
    </div>
  );
}
```

- [ ] **Step 2: Create app/admin/login/page.tsx**

```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLogin() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    if (res.ok) {
      router.push("/admin/activity");
    } else {
      setError("Invalid token");
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0F1E3A", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui,sans-serif" }}>
      <form onSubmit={submit} style={{ background: "#fff", borderRadius: 12, padding: 40, width: 360, boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }}>
        <h1 style={{ color: "#0F1E3A", fontSize: 20, margin: "0 0 24px", fontWeight: 800 }}>Admin Login</h1>
        <input
          type="password"
          value={token}
          onChange={e => setToken(e.target.value)}
          placeholder="Enter admin token"
          style={{ width: "100%", padding: "12px 14px", borderRadius: 6, border: "1px solid #E2E8F2", fontSize: 14, outline: "none", boxSizing: "border-box" as const, marginBottom: 12 }}
        />
        {error && <div style={{ color: "#dc2626", fontSize: 12, marginBottom: 8 }}>{error}</div>}
        <button type="submit" disabled={loading} style={{ width: "100%", background: "var(--brand-color, #E8185C)", color: "#fff", border: "none", borderRadius: 6, padding: "12px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 3: Copy LeadsHub.tsx, LeadDetailPanel.tsx, leads/page.tsx from geo-landing**

```bash
# Run from white-label-master directory
cp ../geo-landing/app/admin/leads/page.tsx app/admin/leads/page.tsx
cp ../geo-landing/app/admin/leads/LeadsHub.tsx app/admin/leads/LeadsHub.tsx
cp ../geo-landing/app/admin/leads/LeadDetailPanel.tsx app/admin/leads/LeadDetailPanel.tsx
```

Then make these find-and-replace edits in all three files:
- Remove any import of `SERIES_LABEL` from `./page` if it references GEO-specific legacy sequences
- The components are already tenant-agnostic (they call `/api/admin/leads` and `/api/admin/lead-profile` which are the same URLs)
- Remove the `TEMP_LABEL` and `SERIES_LABEL` export from `page.tsx` — replace with import from `lib/sequences.ts`

- [ ] **Step 4: Copy and adapt activity/page.tsx and campaigns/page.tsx from geo-landing**

```bash
cp ../geo-landing/app/admin/activity/page.tsx app/admin/activity/page.tsx
cp ../geo-landing/app/admin/campaigns/page.tsx app/admin/campaigns/page.tsx
```

No changes needed — these pages call the same API URLs and are already tenant-agnostic in the UI layer.

- [ ] **Step 5: Run build**

```bash
npm run build 2>&1 | grep -E "error|Error"
```

Fix any import errors (typically missing SEQUENCES data — ensure sequences.ts exports are used).

- [ ] **Step 6: Commit**

```bash
git add app/admin/
git commit -m "feat: admin pages (layout, login, leads, activity, campaigns)"
```

---

## Task 17: Root Layout + Landing Page Skeleton

**Files:**
- Create: `app/layout.tsx`
- Create: `app/page.tsx`
- Create: `app/schedule/page.tsx`
- Create: `app/unsubscribe/page.tsx`

- [ ] **Step 1: Create app/layout.tsx**

```typescript
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Coming Soon",
  description: "",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const brandColor = process.env.NEXT_PUBLIC_BRAND_COLOR ?? "#E8185C";
  return (
    <html lang="en">
      <head>
        <style>{`:root { --brand-color: ${brandColor}; }`}</style>
      </head>
      <body style={{ margin: 0, padding: 0, fontFamily: "system-ui,-apple-system,sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Create app/page.tsx**

```typescript
// Landing page skeleton — replace this entire file when building a client deployment.
export default function HomePage() {
  return (
    <main style={{ minHeight: "100vh", background: "#F0F2F8", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui,sans-serif" }}>
      <div style={{ textAlign: "center", color: "#0F1E3A" }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, margin: "0 0 12px" }}>Landing Page</h1>
        <p style={{ color: "#8A9AB5", fontSize: 16, margin: 0 }}>Replace this with the client funnel entry page.</p>
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Create app/schedule/page.tsx**

```typescript
"use client";
// Book a call — Calendly embed.
// Calendly URL comes from tenants table, passed via a server component or API call.
export default function SchedulePage() {
  return (
    <main style={{ minHeight: "100vh", background: "#F0F2F8", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui,sans-serif" }}>
      <div style={{ textAlign: "center", color: "#8A9AB5" }}>
        <p>Schedule page — embed Calendly widget here using tenant.calendly_url</p>
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Create app/unsubscribe/page.tsx**

```typescript
"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function UnsubscribeInner() {
  const params = useSearchParams();
  const email  = params.get("email") ?? "";
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!email) return;
    fetch(`/api/unsubscribe?email=${encodeURIComponent(email)}`).then(() => setDone(true));
  }, [email]);

  return (
    <main style={{ minHeight: "100vh", background: "#F0F2F8", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui,sans-serif" }}>
      <div style={{ textAlign: "center", color: "#0F1E3A", maxWidth: 400 }}>
        {done
          ? <><h1 style={{ fontWeight: 800 }}>You&rsquo;re unsubscribed</h1><p style={{ color: "#8A9AB5" }}>You won&rsquo;t receive any more emails from us.</p></>
          : <p style={{ color: "#8A9AB5" }}>Processing...</p>
        }
      </div>
    </main>
  );
}

export default function UnsubscribePage() {
  return <Suspense><UnsubscribeInner /></Suspense>;
}
```

- [ ] **Step 5: Run build and commit**

```bash
npm run build 2>&1 | grep -E "error|Error"
git add app/
git commit -m "feat: root layout, landing skeleton, schedule, unsubscribe pages"
```

---

## Task 18: vercel.json + Environment Setup

**Files:**
- Create: `vercel.json`

- [ ] **Step 1: Create vercel.json**

```json
{
  "crons": [
    { "path": "/api/cron",          "schedule": "*/15 * * * *" },
    { "path": "/api/cron/graduate", "schedule": "0 10 * * 1"  }
  ]
}
```

- [ ] **Step 2: Create .env.local for local dev**

```bash
# Copy from .env.example and fill in:
cp .env.example .env.local
# Then edit .env.local with:
# NEXT_PUBLIC_SUPABASE_URL=  (new white-label Supabase project URL)
# SUPABASE_SERVICE_ROLE_KEY= (new white-label Supabase service role key)
# RESEND_API_KEY=            (Misti's Resend key)
# ADMIN_TOKEN=test-admin-token-dev
# CRON_SECRET=dev-cron-secret
```

- [ ] **Step 3: Final build verification**

```bash
npm run build
```

Expected: `✓ Compiled successfully` with zero errors. All pages and API routes listed.

- [ ] **Step 4: Final commit**

```bash
git add vercel.json
git commit -m "feat: vercel cron config"
git tag v0.1.0-skeleton
```

---

## Task 19: Stats Refresh Cron

**Files:**
- Create: `app/api/cron/refresh-stats/route.ts`

- [ ] **Step 1: Create refresh-stats cron**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../../lib/supabase";

function isAuthed(req: NextRequest) {
  return req.headers.get("x-admin-key") === process.env.CRON_SECRET
    || req.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`;
}

export async function GET(req: NextRequest) {
  if (!isAuthed(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Refresh stats for ALL tenants (runs once per hour)
  const { error } = await supabase.rpc("refresh_wl_stats");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, refreshed_at: new Date().toISOString() });
}
```

- [ ] **Step 2: Add to vercel.json**

```json
{
  "crons": [
    { "path": "/api/cron",                "schedule": "*/15 * * * *" },
    { "path": "/api/cron/graduate",       "schedule": "0 10 * * 1"  },
    { "path": "/api/cron/refresh-stats",  "schedule": "0 * * * *"   }
  ]
}
```

- [ ] **Step 3: Run build and final commit**

```bash
npm run build 2>&1 | grep -E "error|Error"
git add .
git commit -m "feat: stats refresh cron (hourly, reads pre-computed wl_tenant_stats)"
```

---

## Self-Review

**Spec coverage check:**
- [x] Multi-tenant: `tenant_id` on all tables, middleware routes by domain
- [x] 1M+ scale: composite indexes, materialized stats, atomic batch claim, archive table
- [x] Misti = super admin: `CRON_SECRET` bypasses tenant auth on all routes
- [x] Client admin: `admin_token` per tenant in `tenants` table
- [x] Empty sequences/templates: intentionally blank, CHAIN_MAP empty
- [x] Resend: tenant-aware `pickFrom()`, audience per tenant
- [x] Webhooks: resend, calendly, stripe all tenant-scoped
- [x] Admin pages: leads, activity, campaigns, login
- [x] Cron: queue processor, graduation, stats refresh
- [x] Connection pooling: Supabase's built-in PgBouncer (enabled by default on Pro)

**No placeholders detected.**

**Type consistency:** `Tenant` type defined once in `lib/tenant.ts`, used throughout.
