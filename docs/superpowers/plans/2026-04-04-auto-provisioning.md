# Auto-Provisioning System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When someone pays via Stripe (or Misti creates them in admin), their account is fully provisioned automatically — DB record, GoDaddy DNS, Vercel domain, invite email — with zero manual steps except LinkJolt.

**Architecture:** A `provisioning_jobs` Supabase table is the single queue. Both Stripe webhook and admin dashboard insert into it. A new cron at `/api/cron/provisioning` runs every 5 minutes, processes each step, and updates status. Admin dashboard shows live provisioning status with a retry button on failures.

**Tech Stack:** Next.js 16 App Router, Supabase, GoDaddy REST API, Vercel REST API, Resend, Stripe

---

## File Map

**New files:**
- `lib/provisioning.ts` — slug generation + job creation helper
- `lib/dns.ts` — GoDaddy + Vercel API helpers
- `lib/emails/provisioning-emails.ts` — 4 invite email senders
- `app/api/cron/provisioning/route.ts` — cron processor
- `app/api/admin/provisioning/route.ts` — list/create jobs
- `app/api/admin/provisioning/[id]/route.ts` — single job status
- `app/api/admin/provisioning/[id]/retry/route.ts` — retry failed job
- `app/admin/provisioning/page.tsx` — job history page

**Modified files:**
- `app/api/stripe-webhook/route.ts` — add provisioning trigger
- `app/api/admin/affiliates/route.ts` — fix slug regex, route create through queue
- `app/api/admin/v2clients/route.ts` — route create through queue
- `app/admin/affiliates/page.tsx` — user_type badge, provisioning status
- `app/admin/v2/page.tsx` — provisioning status after create
- `app/admin/layout.tsx` — add Provisioning nav link
- `app/cashoffer/[slug]/page.tsx` — V2 landing fallback to demo config
- `vercel.json` — add provisioning cron entry

---

## Task 1: DB Migrations

**Files:**
- Supabase migrations via MCP

- [ ] **Step 1: Verify invite_token and invite_used exist on affiliates**

Run in Supabase SQL editor or MCP:
```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'affiliates'
AND column_name IN ('invite_token', 'invite_used', 'user_type', 'email', 'active');
```
Expected: `invite_token` and `invite_used` are present (confirmed in setup route). `user_type`, `email`, `active` may or may not exist — note which are missing.

- [ ] **Step 2: Add user_type and email to affiliates if missing**

Run via Supabase MCP `apply_migration`:
```sql
ALTER TABLE affiliates
  ADD COLUMN IF NOT EXISTS user_type TEXT NOT NULL DEFAULT 'affiliate',
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE;
```

- [ ] **Step 3: Create provisioning_jobs table**

Run via Supabase MCP `apply_migration`:
```sql
CREATE TABLE IF NOT EXISTS provisioning_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_type TEXT NOT NULL,
  slug TEXT,
  first_name TEXT NOT NULL,
  last_name TEXT,
  email TEXT NOT NULL,
  offers TEXT[],
  invite_token TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  db_done BOOLEAN DEFAULT FALSE,
  dns_done BOOLEAN DEFAULT FALSE,
  vercel_done BOOLEAN DEFAULT FALSE,
  invite_done BOOLEAN DEFAULT FALSE,
  error TEXT,
  error_count INTEGER DEFAULT 0,
  stripe_session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
```

- [ ] **Step 4: Verify table created**

```sql
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'provisioning_jobs'
ORDER BY ordinal_position;
```
Expected: 17 rows, all columns present.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "db: add provisioning_jobs table and user_type/email to affiliates"
```

---

## Task 2: Fix Pre-existing Slug Validation Bug

**Files:**
- Modify: `app/api/admin/affiliates/route.ts:58`

- [ ] **Step 1: Read the current validation**

Open `app/api/admin/affiliates/route.ts`. Find this line (around line 57-58):
```typescript
// Validate slug format: lowercase letters, numbers, hyphens only
if (!/^[a-z0-9-]+$/.test(slug)) {
```

- [ ] **Step 2: Fix the regex to accept first.last format**

Replace those two lines with:
```typescript
// Validate slug format: first.last (e.g. todd.smith, todd.smith2)
if (!/^[a-z0-9]+(\.[a-z0-9]+)+$/.test(slug)) {
```

- [ ] **Step 3: Build to verify no type errors**

```bash
npm run build 2>&1 | tail -5
```
Expected: no errors related to affiliates route.

- [ ] **Step 4: Commit**

```bash
git add app/api/admin/affiliates/route.ts
git commit -m "fix: affiliate slug regex — accept first.last dots (was hyphens-only)"
```

---

## Task 3: lib/provisioning.ts

**Files:**
- Create: `lib/provisioning.ts`

- [ ] **Step 1: Create the file**

```typescript
// lib/provisioning.ts
import { supabase } from "./resend";

/**
 * Generate a unique first.last slug.
 * Checks both affiliates and v2_clients tables.
 * Falls back to first.last2, first.last3, etc.
 */
export async function generateSlug(firstName: string, lastName: string | null): Promise<string> {
  const clean = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const first = clean(firstName);
  const last = lastName ? clean(lastName) : "";
  const base = last ? `${first}.${last}` : first || "user";

  let candidate = base;
  let suffix = 2;

  while (true) {
    const [{ data: aff }, { data: v2 }] = await Promise.all([
      supabase.from("affiliates").select("id").eq("slug", candidate).maybeSingle(),
      supabase.from("v2_clients").select("id").eq("slug", candidate).maybeSingle(),
    ]);
    if (!aff && !v2) return candidate;
    candidate = `${base}${suffix}`;
    suffix++;
  }
}

export interface ProvisioningInput {
  user_type: "affiliate" | "geo_client" | "local_client" | "v2_client";
  first_name: string;
  last_name?: string | null;
  email: string;
  offers?: string[];
  stripe_session_id?: string;
}

/**
 * Insert a new provisioning job. Returns the job ID.
 */
export async function createProvisioningJob(input: ProvisioningInput): Promise<string> {
  const { data, error } = await supabase
    .from("provisioning_jobs")
    .insert({
      user_type: input.user_type,
      first_name: input.first_name,
      last_name: input.last_name ?? null,
      email: input.email.toLowerCase(),
      offers: input.offers ?? null,
      stripe_session_id: input.stripe_session_id ?? null,
    })
    .select("id")
    .single();

  if (error || !data) throw new Error(`Failed to create provisioning job: ${error?.message}`);
  return data.id as string;
}
```

- [ ] **Step 2: Build to verify no type errors**

```bash
npm run build 2>&1 | grep -E "error|Error" | head -10
```
Expected: no errors from provisioning.ts.

- [ ] **Step 3: Commit**

```bash
git add lib/provisioning.ts
git commit -m "feat: add lib/provisioning.ts — slug generation and job creation"
```

---

## Task 4: lib/dns.ts

**Files:**
- Create: `lib/dns.ts`

- [ ] **Step 1: Create the file**

```typescript
// lib/dns.ts
// GoDaddy and Vercel API helpers for affiliate subdomain provisioning.
// Only called for user_type === "affiliate" — other user types skip DNS.

const GODADDY_BASE = "https://api.godaddy.com/v1";
const VERCEL_BASE = "https://api.vercel.com";
const DOMAIN = "heypearl.io";

function godaddyHeaders() {
  return {
    Authorization: `sso-key ${process.env.GODADDY_API_KEY}:${process.env.GODADDY_API_SECRET}`,
    "Content-Type": "application/json",
  };
}

function vercelHeaders() {
  return {
    Authorization: `Bearer ${process.env.VERCEL_API_TOKEN}`,
    "Content-Type": "application/json",
  };
}

function vercelProjectPath(path: string, queryParams = "") {
  const teamId = process.env.VERCEL_TEAM_ID;
  const projectId = process.env.VERCEL_PROJECT_ID;
  const sep = queryParams ? "&" : "?";
  const team = teamId ? `${queryParams ? queryParams + "&" : "?"}teamId=${teamId}` : queryParams ? `?${queryParams}` : "";
  return `${VERCEL_BASE}/v10/projects/${projectId}${path}${team}`;
}

/** Add CNAME record: [slug] -> cname.vercel-dns.com */
export async function addCnameRecord(slug: string): Promise<void> {
  const res = await fetch(
    `${GODADDY_BASE}/domains/${DOMAIN}/records/CNAME/${slug}`,
    {
      method: "PUT",
      headers: godaddyHeaders(),
      body: JSON.stringify([{ data: "cname.vercel-dns.com", ttl: 600 }]),
    }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GoDaddy CNAME failed (${res.status}): ${text}`);
  }
}

/**
 * Add domain to Vercel project.
 * Returns the TXT verification value to add to GoDaddy _vercel record.
 */
export async function addVercelDomain(slug: string): Promise<string> {
  const teamId = process.env.VERCEL_TEAM_ID;
  const projectId = process.env.VERCEL_PROJECT_ID;
  const params = teamId ? `?teamId=${teamId}` : "";

  const res = await fetch(
    `${VERCEL_BASE}/v10/projects/${projectId}/domains${params}`,
    {
      method: "POST",
      headers: vercelHeaders(),
      body: JSON.stringify({ name: `${slug}.${DOMAIN}` }),
    }
  );

  // 409 = domain already added — that's fine, fetch it to get the verification value
  if (res.status === 409) {
    return await getVercelDomainTxtValue(slug);
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Vercel domain add failed (${res.status}): ${text}`);
  }

  const data = await res.json() as { verification?: Array<{ type: string; value: string }> };
  const txtEntry = data.verification?.find((v) => v.type === "TXT");
  if (!txtEntry?.value) return await getVercelDomainTxtValue(slug);
  return txtEntry.value;
}

async function getVercelDomainTxtValue(slug: string): Promise<string> {
  const teamId = process.env.VERCEL_TEAM_ID;
  const projectId = process.env.VERCEL_PROJECT_ID;
  const params = teamId ? `?teamId=${teamId}` : "";

  const res = await fetch(
    `${VERCEL_BASE}/v9/projects/${projectId}/domains/${slug}.${DOMAIN}${params}`,
    { headers: vercelHeaders() }
  );
  const data = await res.json() as { verification?: Array<{ type: string; value: string }> };
  const txtEntry = data.verification?.find((v) => v.type === "TXT");
  if (!txtEntry?.value) throw new Error(`Could not get Vercel TXT value for ${slug}`);
  return txtEntry.value;
}

/**
 * Append a _vercel TXT record to GoDaddy.
 * Reads existing values first and appends — never overwrites other affiliates' entries.
 */
export async function appendVercelTxtRecord(verificationValue: string): Promise<void> {
  // 1. Fetch existing _vercel TXT records
  const getRes = await fetch(
    `${GODADDY_BASE}/domains/${DOMAIN}/records/TXT/_vercel`,
    { headers: godaddyHeaders() }
  );

  let existing: Array<{ data: string; ttl: number }> = [];
  if (getRes.ok) {
    const parsed = await getRes.json() as typeof existing;
    existing = Array.isArray(parsed) ? parsed : [];
  }

  // 2. Dedup — skip if already present
  if (existing.some((r) => r.data === verificationValue)) return;

  // 3. PUT the full array with new value appended
  const putRes = await fetch(
    `${GODADDY_BASE}/domains/${DOMAIN}/records/TXT/_vercel`,
    {
      method: "PUT",
      headers: godaddyHeaders(),
      body: JSON.stringify([...existing, { data: verificationValue, ttl: 600 }]),
    }
  );

  if (!putRes.ok) {
    const text = await putRes.text();
    throw new Error(`GoDaddy TXT append failed (${putRes.status}): ${text}`);
  }
}

/** Check if Vercel has verified the domain. Returns true when live. */
export async function checkDomainVerified(slug: string): Promise<boolean> {
  const teamId = process.env.VERCEL_TEAM_ID;
  const projectId = process.env.VERCEL_PROJECT_ID;
  const params = teamId ? `?teamId=${teamId}` : "";

  const res = await fetch(
    `${VERCEL_BASE}/v9/projects/${projectId}/domains/${slug}.${DOMAIN}${params}`,
    { headers: vercelHeaders() }
  );

  if (!res.ok) return false;
  const data = await res.json() as { verified?: boolean };
  return data.verified === true;
}
```

- [ ] **Step 2: Build to verify**

```bash
npm run build 2>&1 | grep -E "error|Error" | head -10
```
Expected: no errors from dns.ts.

- [ ] **Step 3: Commit**

```bash
git add lib/dns.ts
git commit -m "feat: add lib/dns.ts — GoDaddy and Vercel API helpers"
```

---

## Task 5: lib/emails/provisioning-emails.ts

**Files:**
- Create: `lib/emails/provisioning-emails.ts`

These are one-time transactional emails sent directly via Resend — NOT through the sequence queue.

- [ ] **Step 1: Create the file**

```typescript
// lib/emails/provisioning-emails.ts
import { resend, pickFrom, REPLY_TO } from "../resend";

interface InviteParams {
  email: string;
  firstName: string;
  slug: string;
  inviteToken: string;
}

export async function sendAffiliateInvite({ email, firstName, slug, inviteToken }: InviteParams) {
  const skoolUrl = process.env.SKOOL_INVITE_URL ?? "https://skool.com";
  await resend.emails.send({
    from: pickFrom(email),
    replyTo: REPLY_TO,
    to: email,
    subject: "Your HeyPearl Partner Account is Ready",
    html: `<p>Hi ${firstName},</p>
<p>Your HeyPearl partner account has been created. Here is everything you need:</p>
<p><strong>Set up your account (password, headshot, Calendly):</strong><br>
<a href="https://geo.heypearl.io/${slug}/setup?token=${inviteToken}">https://geo.heypearl.io/${slug}/setup?token=${inviteToken}</a></p>
<p><strong>Your business card (live within 15 min):</strong><br>
<a href="https://${slug}.heypearl.io">https://${slug}.heypearl.io</a></p>
<p><strong>Your leads dashboard:</strong><br>
<a href="https://geo.heypearl.io/${slug}/leads">https://geo.heypearl.io/${slug}/leads</a></p>
<p><strong>Join HeyPearl HQ community:</strong><br>
<a href="${skoolUrl}">${skoolUrl}</a></p>
<p>Reply to this email if you need anything.</p>`,
  });
}

export async function sendGeoClientInvite({ email, firstName, slug, inviteToken }: InviteParams) {
  await resend.emails.send({
    from: pickFrom(email),
    replyTo: REPLY_TO,
    to: email,
    subject: "Your GEO AI Visibility Engine is Ready",
    html: `<p>Hi ${firstName},</p>
<p>Your GEO AI Visibility Engine account has been created.</p>
<p><strong>Set up your account:</strong><br>
<a href="https://geo.heypearl.io/${slug}/setup?token=${inviteToken}">https://geo.heypearl.io/${slug}/setup?token=${inviteToken}</a></p>
<p><strong>Your leads dashboard:</strong><br>
<a href="https://geo.heypearl.io/${slug}/leads">https://geo.heypearl.io/${slug}/leads</a></p>
<p>Reply to this email if you need anything.</p>`,
  });
}

export async function sendLocalClientInvite({ email, firstName, slug, inviteToken }: InviteParams) {
  await resend.emails.send({
    from: pickFrom(email),
    replyTo: REPLY_TO,
    to: email,
    subject: "Your HeyLocal Account is Ready",
    html: `<p>Hi ${firstName},</p>
<p>Your HeyLocal account has been created.</p>
<p><strong>Set up your account:</strong><br>
<a href="https://geo.heypearl.io/${slug}/setup?token=${inviteToken}">https://geo.heypearl.io/${slug}/setup?token=${inviteToken}</a></p>
<p><strong>Your leads dashboard:</strong><br>
<a href="https://geo.heypearl.io/${slug}/leads">https://geo.heypearl.io/${slug}/leads</a></p>
<p>Reply to this email if you need anything.</p>`,
  });
}

export async function sendV2ClientInvite({ email, firstName, slug, inviteToken }: InviteParams) {
  await resend.emails.send({
    from: pickFrom(email),
    replyTo: REPLY_TO,
    to: email,
    subject: "Your V2 Seller Attraction Engine is Ready",
    html: `<p>Hi ${firstName},</p>
<p>Your V2 Seller Attraction Engine account has been created.</p>
<p><strong>Set up your account:</strong><br>
<a href="https://v2.heypearl.io/cashoffer/${slug}/setup?token=${inviteToken}">https://v2.heypearl.io/cashoffer/${slug}/setup?token=${inviteToken}</a></p>
<p><strong>Your leads dashboard:</strong><br>
<a href="https://v2.heypearl.io/cashoffer/${slug}/leads">https://v2.heypearl.io/cashoffer/${slug}/leads</a></p>
<p>Reply to this email if you need anything.</p>`,
  });
}
```

- [ ] **Step 2: Build to verify**

```bash
npm run build 2>&1 | grep -E "error|Error" | head -10
```

- [ ] **Step 3: Commit**

```bash
git add lib/emails/provisioning-emails.ts
git commit -m "feat: add provisioning invite emails — 4 variants via Resend"
```

---

## Task 6: app/api/cron/provisioning/route.ts

**Files:**
- Create: `app/api/cron/provisioning/route.ts`

This is the heart of the system. It runs every 5 min, picks up pending jobs, and executes the next incomplete step for each.

- [ ] **Step 1: Create the file**

```typescript
// app/api/cron/provisioning/route.ts
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { supabase } from "../../../../lib/resend";
import { generateSlug } from "../../../../lib/provisioning";
import { addCnameRecord, addVercelDomain, appendVercelTxtRecord, checkDomainVerified } from "../../../../lib/dns";
import {
  sendAffiliateInvite,
  sendGeoClientInvite,
  sendLocalClientInvite,
  sendV2ClientInvite,
} from "../../../../lib/emails/provisioning-emails";

export const maxDuration = 60;

type Job = {
  id: string;
  user_type: string;
  slug: string | null;
  first_name: string;
  last_name: string | null;
  email: string;
  offers: string[] | null;
  invite_token: string | null;
  db_done: boolean;
  dns_done: boolean;
  invite_done: boolean;
  error_count: number;
};

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: jobs, error } = await supabase
    .from("provisioning_jobs")
    .select("id,user_type,slug,first_name,last_name,email,offers,invite_token,db_done,dns_done,invite_done,error_count")
    .not("status", "in", '("complete","failed")')
    .lt("error_count", 10)
    .order("created_at", { ascending: true })
    .limit(10);

  if (error) {
    console.error("Provisioning cron fetch error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const results: Array<{ id: string; result?: string; error?: string }> = [];

  for (const job of (jobs ?? []) as Job[]) {
    try {
      const result = await processJob(job);
      results.push({ id: job.id, result });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`Provisioning job ${job.id} error:`, msg);
      await supabase
        .from("provisioning_jobs")
        .update({ status: "failed", error: msg, error_count: (job.error_count ?? 0) + 1 })
        .eq("id", job.id);
      results.push({ id: job.id, error: msg });
    }
  }

  return NextResponse.json({ processed: results.length, results });
}

async function processJob(job: Job): Promise<string> {
  // ── Step 1: Create DB record ──────────────────────────────────────────────
  if (!job.db_done) {
    const slug = await generateSlug(job.first_name, job.last_name);
    const inviteToken = randomUUID();

    if (job.user_type === "v2_addon") {
      // Add V2 to an existing GEO affiliate account — don't create new record
      const { data: existing } = await supabase
        .from("affiliates")
        .select("id, offers")
        .eq("email", job.email)
        .maybeSingle();
      if (existing) {
        const current = (existing.offers as string[]) ?? [];
        if (!current.includes("v2")) {
          await supabase.from("affiliates").update({ offers: [...current, "v2"] }).eq("id", existing.id);
        }
        // Job is done — no DNS, no invite needed (they already have an account)
        await supabase.from("provisioning_jobs").update({ db_done: true, invite_done: true, status: "complete", completed_at: new Date().toISOString() }).eq("id", job.id);
        return "v2_addon_applied";
      }
      // No existing account — fall through and create a standalone v2_client
    }

    if (job.user_type === "v2_client" || job.user_type === "v2_addon") {
      const { error } = await supabase.from("v2_clients").insert({
        name: [job.first_name, job.last_name].filter(Boolean).join(" "),
        slug,
        email: job.email,
        invite_token: inviteToken,
        active: true,
      });
      if (error) throw new Error(`v2_clients insert failed: ${error.message}`);
    } else {
      const defaultOffers =
        job.user_type === "affiliate" ? ["geo", "v2", "local"] :
        job.user_type === "geo_client" ? ["geo"] : ["local"];
      const offers = job.offers ?? defaultOffers;
      const { error } = await supabase.from("affiliates").insert({
        name: [job.first_name, job.last_name].filter(Boolean).join(" "),
        slug,
        tag: slug,
        email: job.email,
        offers,
        user_type: job.user_type,
        invite_token: inviteToken,
        invite_used: false,
        active: true,
      });
      if (error) throw new Error(`affiliates insert failed: ${error.message}`);
    }

    await supabase
      .from("provisioning_jobs")
      .update({ db_done: true, slug, invite_token: inviteToken, status: "db_created" })
      .eq("id", job.id);

    // Update local reference for subsequent steps in this same cron run
    job.db_done = true;
    job.slug = slug;
    job.invite_token = inviteToken;
  }

  // ── Step 2: DNS (affiliates only) ─────────────────────────────────────────
  if (job.user_type === "affiliate" && !job.dns_done) {
    await addCnameRecord(job.slug!);
    const txtValue = await addVercelDomain(job.slug!);
    await appendVercelTxtRecord(txtValue);

    await supabase
      .from("provisioning_jobs")
      .update({ dns_done: true, vercel_done: true, status: "dns_added" })
      .eq("id", job.id);

    job.dns_done = true;
    // Domain verification takes time — let next cron run check it
    return "dns_added";
  }

  // ── Step 3: Verify domain (affiliates only) ───────────────────────────────
  if (job.user_type === "affiliate" && job.dns_done && !job.invite_done) {
    const verified = await checkDomainVerified(job.slug!);
    if (!verified) return "domain_pending";
    // Domain is verified — fall through to send invite
  }

  // ── Step 4: Send invite email ─────────────────────────────────────────────
  if (!job.invite_done) {
    const params = {
      email: job.email,
      firstName: job.first_name,
      slug: job.slug!,
      inviteToken: job.invite_token!,
    };

    if (job.user_type === "affiliate") await sendAffiliateInvite(params);
    else if (job.user_type === "geo_client") await sendGeoClientInvite(params);
    else if (job.user_type === "local_client") await sendLocalClientInvite(params);
    else await sendV2ClientInvite(params);

    await supabase
      .from("provisioning_jobs")
      .update({ invite_done: true, status: "complete", completed_at: new Date().toISOString() })
      .eq("id", job.id);

    return "complete";
  }

  return "nothing_to_do";
}
```

- [ ] **Step 2: Build to verify no type errors**

```bash
npm run build 2>&1 | grep -E "error|Error" | head -15
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/api/cron/provisioning/route.ts
git commit -m "feat: add provisioning cron processor"
```

---

## Task 7: Admin Provisioning API Routes

**Files:**
- Create: `app/api/admin/provisioning/route.ts`
- Create: `app/api/admin/provisioning/[id]/route.ts`
- Create: `app/api/admin/provisioning/[id]/retry/route.ts`

- [ ] **Step 1: Create app/api/admin/provisioning/route.ts**

```typescript
// app/api/admin/provisioning/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../../lib/resend";
import { createProvisioningJob, ProvisioningInput } from "../../../../lib/provisioning";

function adminAuth(req: NextRequest) {
  const cookieAuth = req.cookies.get("admin_auth")?.value === (process.env.ADMIN_TOKEN ?? "geo-admin-authenticated");
  const keyAuth = req.headers.get("x-admin-key") === process.env.ADMIN_TOKEN;
  return cookieAuth || keyAuth;
}

export async function GET(req: NextRequest) {
  if (!adminAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("provisioning_jobs")
    .select("id,user_type,slug,first_name,last_name,email,status,db_done,dns_done,invite_done,error,error_count,created_at,completed_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ jobs: data ?? [] });
}

export async function POST(req: NextRequest) {
  if (!adminAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as ProvisioningInput;
  if (!body.user_type || !body.first_name || !body.email) {
    return NextResponse.json({ error: "user_type, first_name, email required" }, { status: 400 });
  }

  const id = await createProvisioningJob(body);
  return NextResponse.json({ id });
}
```

- [ ] **Step 2: Create app/api/admin/provisioning/[id]/route.ts**

```typescript
// app/api/admin/provisioning/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../../../lib/resend";

function adminAuth(req: NextRequest) {
  const cookieAuth = req.cookies.get("admin_auth")?.value === (process.env.ADMIN_TOKEN ?? "geo-admin-authenticated");
  const keyAuth = req.headers.get("x-admin-key") === process.env.ADMIN_TOKEN;
  return cookieAuth || keyAuth;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!adminAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { data, error } = await supabase
    .from("provisioning_jobs")
    .select("id,user_type,slug,first_name,last_name,email,status,db_done,dns_done,invite_done,error,error_count,created_at,completed_at")
    .eq("id", id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ job: data });
}
```

- [ ] **Step 3: Create app/api/admin/provisioning/[id]/retry/route.ts**

```typescript
// app/api/admin/provisioning/[id]/retry/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../../../../lib/resend";

function adminAuth(req: NextRequest) {
  const cookieAuth = req.cookies.get("admin_auth")?.value === (process.env.ADMIN_TOKEN ?? "geo-admin-authenticated");
  const keyAuth = req.headers.get("x-admin-key") === process.env.ADMIN_TOKEN;
  return cookieAuth || keyAuth;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!adminAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { error } = await supabase
    .from("provisioning_jobs")
    .update({ status: "pending", error: null, error_count: 0 })
    .eq("id", id)
    .eq("status", "failed"); // Only retry failed jobs

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 4: Build to verify**

```bash
npm run build 2>&1 | grep -E "error|Error" | head -15
```

- [ ] **Step 5: Commit**

```bash
git add app/api/admin/provisioning/
git commit -m "feat: add admin provisioning API routes (list, status, retry)"
```

---

## Task 8: Stripe Webhook Extension

**Files:**
- Modify: `app/api/stripe-webhook/route.ts`

- [ ] **Step 1: Read the current file**

Open `app/api/stripe-webhook/route.ts`. The current `checkout.session.completed` block extracts email and marks `paid_at`. We're adding provisioning job creation alongside the existing logic.

- [ ] **Step 2: Add import at top of file**

After the existing imports, add:
```typescript
import { createProvisioningJob } from "../../../lib/provisioning";
```

- [ ] **Step 3: Add provisioning trigger inside the checkout.session.completed block**

Find the existing block:
```typescript
if (event.type === "checkout.session.completed" || event.type === "payment_intent.succeeded") {
```

Inside that block, after extracting `email`, add the following after the `paid_at` update and `cancelQueuedEmails` calls:

```typescript
    // Auto-provision if this is a new offer purchase
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const meta = session.metadata ?? {};
      const userType = meta.user_type as string | undefined;
      const offersRaw = meta.offers as string | undefined;
      const name = session.customer_details?.name ?? "";
      const [firstName, ...rest] = name.trim().split(" ");
      const lastName = rest.join(" ") || null;

      if (userType && email && firstName) {
        // Dedup: skip if this Stripe session already created a job
        const { data: existing } = await supabase
          .from("provisioning_jobs")
          .select("id")
          .eq("stripe_session_id", session.id)
          .maybeSingle();

        if (!existing) {
          const offers = offersRaw ? offersRaw.split(",").map((s) => s.trim()) : undefined;
          await createProvisioningJob({
            user_type: userType as "affiliate" | "geo_client" | "local_client" | "v2_client",
            first_name: firstName,
            last_name: lastName,
            email: email.toLowerCase(),
            offers,
            stripe_session_id: session.id,
          });
          console.log(`Provisioning job created for ${email} (${userType})`);
        }
      }
    }
```

- [ ] **Step 4: Build to verify**

```bash
npm run build 2>&1 | grep -E "error|Error" | head -15
```

- [ ] **Step 5: Commit**

```bash
git add app/api/stripe-webhook/route.ts
git commit -m "feat: stripe webhook triggers provisioning job on checkout.session.completed"
```

---

## Task 9: Admin Affiliates Page — Provisioning Flow + User Type Badge

**Files:**
- Modify: `app/admin/affiliates/page.tsx`

The affiliates page currently calls `POST /api/admin/affiliates` to create directly. Change it to call `POST /api/admin/provisioning` instead and show inline status.

- [ ] **Step 1: Read the current create form handler**

Open `app/admin/affiliates/page.tsx`. Find the `handleCreate` (or similar) function that POSTs to `/api/admin/affiliates`. Note its current structure.

- [ ] **Step 2: Add provisioning state and replace create handler**

Add to the component state:
```typescript
const [provJobId, setProvJobId] = useState<string | null>(null);
const [provStatus, setProvStatus] = useState<string>("");
```

Replace the create form submit handler. Find the existing submit function and replace it with:
```typescript
async function handleCreate(e: React.FormEvent) {
  e.preventDefault();
  setCreating(true);
  setError("");
  setProvJobId(null);
  setProvStatus("");

  // Determine user_type from offers selection
  // If offers includes multiple or "v2"/"geo"/"local", it's an affiliate
  // Admin can also select geo_client or local_client via a selector
  const userType = form.user_type || "affiliate";
  const offersArr = form.offers ?? [];

  try {
    const res = await fetch("/api/admin/provisioning", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_type: userType,
        first_name: form.firstName,
        last_name: form.lastName || null,
        email: form.email,
        offers: offersArr.length > 0 ? offersArr : undefined,
      }),
    });
    if (!res.ok) {
      const d = await res.json() as { error?: string };
      setError(d.error ?? "Failed to create");
      return;
    }
    const { id } = await res.json() as { id: string };
    setProvJobId(id);
    setProvStatus("pending");
    pollJobStatus(id);
  } finally {
    setCreating(false);
  }
}

function pollJobStatus(jobId: string) {
  const interval = setInterval(async () => {
    const res = await fetch(`/api/admin/provisioning/${jobId}`);
    if (!res.ok) return;
    const { job } = await res.json() as { job: { status: string; slug?: string } };
    setProvStatus(job.status);
    if (job.status === "complete" || job.status === "failed") {
      clearInterval(interval);
      if (job.status === "complete") loadAffiliates(); // refresh list
    }
  }, 5000);
}
```

- [ ] **Step 3: Add user_type badge to each affiliate row in the list**

Find where each affiliate is rendered in the list. Add a badge after the name:

```typescript
const USER_TYPE_LABEL: Record<string, { label: string; color: string }> = {
  affiliate: { label: "Affiliate", color: "#3B82F6" },
  geo_client: { label: "GEO Client", color: "#E8185C" },
  local_client: { label: "Local Client", color: "#16A34A" },
};

// In the row render:
const typeInfo = USER_TYPE_LABEL[affiliate.user_type ?? "affiliate"] ?? USER_TYPE_LABEL.affiliate;
// Add next to name:
<span style={{ background: typeInfo.color, color: "#fff", borderRadius: 4, padding: "2px 7px", fontSize: 11, fontWeight: 700, marginLeft: 8 }}>
  {typeInfo.label}
</span>
```

- [ ] **Step 4: Show provisioning status inline after create**

After the create form submit button, add:
```typescript
{provJobId && (
  <div style={{ marginTop: 12, padding: "10px 14px", background: provStatus === "complete" ? "#F0FDF4" : provStatus === "failed" ? "#FEF2F2" : "#EFF6FF", borderRadius: 8, fontSize: 13 }}>
    {provStatus === "complete" && "Account provisioned. Invite email sent."}
    {provStatus === "failed" && "Provisioning failed — check /admin/provisioning to retry."}
    {!["complete", "failed"].includes(provStatus) && `Provisioning... (${provStatus})`}
  </div>
)}
```

- [ ] **Step 5: Add user_type selector to the create form**

Add before the submit button in the create form:
```typescript
<select
  value={form.user_type ?? "affiliate"}
  onChange={(e) => setForm({ ...form, user_type: e.target.value })}
  style={inputStyle}
>
  <option value="affiliate">Affiliate</option>
  <option value="geo_client">GEO Client</option>
  <option value="local_client">Local Client</option>
</select>
```

And add `user_type: string` to the form state type.

- [ ] **Step 6: Build to verify**

```bash
npm run build 2>&1 | grep -E "error|Error" | head -15
```

- [ ] **Step 7: Commit**

```bash
git add app/admin/affiliates/page.tsx
git commit -m "feat: affiliate admin create routes through provisioning queue, adds user_type badge"
```

---

## Task 10: Admin V2 Page — Provisioning Flow

**Files:**
- Modify: `app/admin/v2/page.tsx`

Same pattern as Task 9 but for V2 clients. The create form POSTs to provisioning instead of directly to `/api/admin/v2clients`.

- [ ] **Step 1: Read the current create handler in app/admin/v2/page.tsx**

Find the `handleCreate` or submit function. It currently POSTs to `/api/admin/v2clients`.

- [ ] **Step 2: Add provisioning state**

```typescript
const [provJobId, setProvJobId] = useState<string | null>(null);
const [provStatus, setProvStatus] = useState<string>("");
```

- [ ] **Step 3: Replace create handler**

```typescript
async function handleCreate(e: React.FormEvent) {
  e.preventDefault();
  setCreating(true);
  setError("");
  setProvJobId(null);
  setProvStatus("");

  // Parse first/last from full name
  const parts = form.name.trim().split(" ");
  const firstName = parts[0] ?? form.name;
  const lastName = parts.slice(1).join(" ") || null;

  try {
    const res = await fetch("/api/admin/provisioning", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_type: "v2_client",
        first_name: firstName,
        last_name: lastName,
        email: form.email || "",
      }),
    });
    if (!res.ok) {
      const d = await res.json() as { error?: string };
      setError(d.error ?? "Failed to create");
      return;
    }
    const { id } = await res.json() as { id: string };
    setProvJobId(id);
    setProvStatus("pending");
    pollV2JobStatus(id);
  } finally {
    setCreating(false);
  }
}

function pollV2JobStatus(jobId: string) {
  const interval = setInterval(async () => {
    const res = await fetch(`/api/admin/provisioning/${jobId}`);
    if (!res.ok) return;
    const { job } = await res.json() as { job: { status: string; slug?: string } };
    setProvStatus(job.status);
    if (job.status === "complete" || job.status === "failed") {
      clearInterval(interval);
      if (job.status === "complete") loadClients();
    }
  }, 5000);
}
```

Note: The V2 create form may not currently have an `email` field. Add one to the form state and form UI if missing:
```typescript
// Add to form state:
const [form, setForm] = useState({ name: "", slug: "", email: "" });

// Add to form UI between name and slug fields:
<input
  placeholder="Email"
  value={form.email}
  onChange={(e) => setForm({ ...form, email: e.target.value })}
  style={inputStyle}
/>
```

- [ ] **Step 4: Show provisioning status inline**

```typescript
{provJobId && (
  <div style={{ marginTop: 12, padding: "10px 14px", background: provStatus === "complete" ? "#F0FDF4" : provStatus === "failed" ? "#FEF2F2" : "#EFF6FF", borderRadius: 8, fontSize: 13 }}>
    {provStatus === "complete" && "Account provisioned. Invite email sent."}
    {provStatus === "failed" && "Provisioning failed — check /admin/provisioning to retry."}
    {!["complete", "failed"].includes(provStatus) && `Provisioning... (${provStatus})`}
  </div>
)}
```

- [ ] **Step 5: Build to verify**

```bash
npm run build 2>&1 | grep -E "error|Error" | head -15
```

- [ ] **Step 6: Commit**

```bash
git add app/admin/v2/page.tsx
git commit -m "feat: V2 admin create routes through provisioning queue"
```

---

## Task 11: Admin Provisioning Page + Nav Link

**Files:**
- Create: `app/admin/provisioning/page.tsx`
- Modify: `app/admin/layout.tsx`

- [ ] **Step 1: Read app/admin/layout.tsx to find the NAV_LINKS pattern**

Open `app/admin/layout.tsx`, find the `NAV_LINKS` array or equivalent nav structure.

- [ ] **Step 2: Add Provisioning to nav**

In the NAV_LINKS array, add:
```typescript
{ href: "/admin/provisioning", label: "Provisioning" },
```
Place it after the Affiliates entry.

- [ ] **Step 3: Create app/admin/provisioning/page.tsx**

```typescript
"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

const S = {
  bg: "#F0F2F8", card: "#ffffff", border: "#E2E8F2",
  text: "#0F1E3A", muted: "#8A9AB5",
  green: "#16a34a", pink: "#E8185C", blue: "#3B82F6",
  red: "#dc2626", orange: "#f97316",
};

type Job = {
  id: string;
  user_type: string;
  slug: string | null;
  first_name: string;
  last_name: string | null;
  email: string;
  status: string;
  error: string | null;
  error_count: number;
  created_at: string;
  completed_at: string | null;
};

const STATUS_COLOR: Record<string, string> = {
  pending: S.muted,
  db_created: S.blue,
  dns_added: S.orange,
  domain_pending: S.orange,
  complete: S.green,
  failed: S.red,
};

export default function ProvisioningPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/provisioning");
    if (res.status === 401) { router.push("/admin"); return; }
    const { jobs: data } = await res.json() as { jobs: Job[] };
    setJobs(data ?? []);
    setLoading(false);
  }, [router]);

  useEffect(() => { load(); }, [load]);

  async function handleRetry(id: string) {
    setRetrying(id);
    await fetch(`/api/admin/provisioning/${id}/retry`, { method: "POST" });
    setRetrying(null);
    load();
  }

  if (loading) return <div style={{ padding: 40, color: S.muted }}>Loading...</div>;

  return (
    <div style={{ background: S.bg, minHeight: "100vh", padding: "32px 24px" }}>
      <h1 style={{ color: S.text, fontSize: 22, fontWeight: 700, marginBottom: 24 }}>Provisioning Jobs</h1>
      <div style={{ background: S.card, borderRadius: 12, border: `1px solid ${S.border}`, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${S.border}` }}>
              {["Name", "Email", "Type", "Slug", "Status", "Created", ""].map((h) => (
                <th key={h} style={{ padding: "10px 14px", color: S.muted, fontWeight: 600, textAlign: "left" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => (
              <tr key={job.id} style={{ borderBottom: `1px solid ${S.border}` }}>
                <td style={{ padding: "10px 14px", color: S.text }}>{job.first_name} {job.last_name ?? ""}</td>
                <td style={{ padding: "10px 14px", color: S.muted }}>{job.email}</td>
                <td style={{ padding: "10px 14px" }}>
                  <span style={{ background: S.border, color: S.text, borderRadius: 4, padding: "2px 7px", fontSize: 11, fontWeight: 700 }}>
                    {job.user_type}
                  </span>
                </td>
                <td style={{ padding: "10px 14px", color: S.muted, fontFamily: "monospace" }}>{job.slug ?? "—"}</td>
                <td style={{ padding: "10px 14px" }}>
                  <span style={{ color: STATUS_COLOR[job.status] ?? S.muted, fontWeight: 600 }}>{job.status}</span>
                  {job.error && <div style={{ color: S.red, fontSize: 11, marginTop: 2 }}>{job.error}</div>}
                </td>
                <td style={{ padding: "10px 14px", color: S.muted }}>
                  {new Date(job.created_at).toLocaleDateString()}
                </td>
                <td style={{ padding: "10px 14px" }}>
                  {job.status === "failed" && (
                    <button
                      onClick={() => handleRetry(job.id)}
                      disabled={retrying === job.id}
                      style={{ background: S.blue, color: "#fff", border: "none", borderRadius: 6, padding: "5px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                    >
                      {retrying === job.id ? "Retrying..." : "Retry"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {jobs.length === 0 && (
              <tr><td colSpan={7} style={{ padding: "24px", color: S.muted, textAlign: "center" }}>No provisioning jobs yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Build to verify**

```bash
npm run build 2>&1 | grep -E "error|Error" | head -15
```

- [ ] **Step 5: Commit**

```bash
git add app/admin/provisioning/page.tsx app/admin/layout.tsx
git commit -m "feat: add /admin/provisioning page and nav link"
```

---

## Task 12: V2 Landing Page Fallback

**Files:**
- Modify: `app/cashoffer/[slug]/page.tsx:13`

- [ ] **Step 1: Open the file and find line 12-13**

```typescript
const staticConfig = cashOfferConfigs[slug];
if (!staticConfig) notFound();
```

- [ ] **Step 2: Replace with fallback to demo**

```typescript
const staticConfig = cashOfferConfigs[slug] ?? cashOfferConfigs["demo"];
if (!staticConfig) notFound();
```

This means V2 clients provisioned via the queue (no config file) will use the demo landing page config with their `calendly_url` and `meta_pixel_id` overlaid from the DB. Existing clients with config files are unaffected.

- [ ] **Step 3: Build to verify**

```bash
npm run build 2>&1 | grep -E "error|Error" | head -10
```

- [ ] **Step 4: Commit**

```bash
git add app/cashoffer/[slug]/page.tsx
git commit -m "fix: V2 landing page falls back to demo config for slugs without a config file"
```

---

## Task 13: vercel.json Cron Entry + Deploy

**Files:**
- Modify: `vercel.json`

- [ ] **Step 1: Add the provisioning cron entry**

Open `vercel.json`. In the `"crons"` array, add:
```json
{
  "path": "/api/cron/provisioning",
  "schedule": "*/5 * * * *"
}
```

Full file after change:
```json
{
  "crons": [
    { "path": "/api/cron", "schedule": "*/15 * * * *" },
    { "path": "/api/cron/graduate", "schedule": "0 10 * * *" },
    { "path": "/api/cron/refresh-templates", "schedule": "0 11 * * 1" },
    { "path": "/api/cron/process-calls", "schedule": "*/30 * * * *" },
    { "path": "/api/cron/audit-emails", "schedule": "*/30 * * * *" },
    { "path": "/api/cron/provisioning", "schedule": "*/5 * * * *" }
  ]
}
```

- [ ] **Step 2: Pull updated env vars to .env.local**

```bash
cd /Users/mistibruton/Desktop/geo-landing && /opt/homebrew/bin/vercel env pull .env.local
```
Expected: `.env.local` updated with `GODADDY_API_KEY`, `GODADDY_API_SECRET`, `VERCEL_API_TOKEN`, `VERCEL_PROJECT_ID`, `VERCEL_TEAM_ID`, `SKOOL_INVITE_URL`.

- [ ] **Step 3: Final build**

```bash
npm run build 2>&1 | tail -10
```
Expected: `✓ Compiled successfully` with no errors.

- [ ] **Step 4: Commit**

```bash
git add vercel.json .env.local
git commit -m "feat: add provisioning cron to vercel.json (every 5 min)"
```

- [ ] **Step 5: Deploy**

```bash
/opt/homebrew/bin/vercel --prod
```

- [ ] **Step 6: Smoke test — create a test provisioning job**

In the admin dashboard, go to `geo.heypearl.io/admin/affiliates`, create a test affiliate (e.g. `test.user` with email `misti@heypearl.io`). Verify:
- Status badge shows "Provisioning..."
- After up to 5 min, status changes to "dns_added" then eventually "complete"
- Check `geo.heypearl.io/admin/provisioning` for job history

- [ ] **Step 7: Update CLAUDE.md foundation lock**

Add to the "What Is Currently Live" section:
```
- ✅ Auto-provisioning system — provisioning_jobs queue, GoDaddy/Vercel API, invite emails. Stripe webhook triggers on checkout.session.completed with metadata.user_type.
```

---

## Stripe Product Setup (Manual — Misti does this in Stripe Dashboard)

After deploy, create these 4 products in Stripe dashboard at `dashboard.stripe.com`:

For each product, go to Product → Metadata and add the key-value pairs below. Enable "Collect customer name" in the checkout session settings for each price's payment link.

| Product | metadata.user_type | metadata.offers |
|---|---|---|
| Affiliate Partner | `affiliate` | `geo,v2,local` |
| GEO AI Visibility Engine | `geo_client` | `geo` |
| V2 Seller Attraction Engine | `v2_client` | `v2` |
| Local Business Growth Engine | `local_client` | `local` |
