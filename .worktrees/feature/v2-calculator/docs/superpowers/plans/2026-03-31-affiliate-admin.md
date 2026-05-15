# Affiliate Admin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a scoped admin system for 1099 affiliate contractors at `local.heypearl.io/[slug]/` — invite-based auth, self-serve setup wizard, lead dashboard filtered by tag, and god admin onboarding at `/admin/affiliates`.

**Architecture:** Affiliates are stored in a new `affiliates` table with bcrypt password hashing and session token cookies. Leads are stored in `geo_local_submissions` tagged by `source_tag` (= `config.funnelTag`). Dynamic Next.js routes under `app/[slug]/` serve auth and dashboard pages; existing static routes (e.g. `app/christina/page.tsx`) take precedence automatically.

**Tech Stack:** Next.js 16.2.0 App Router, TypeScript, Supabase (service role client from `lib/resend.ts`), bcryptjs, Resend (transactional reset email), Supabase Storage (headshots), Node.js `crypto` (tokens — no nanoid needed)

---

## File Map

**New files:**
```
supabase/migrations/20260331_affiliate_admin.sql
lib/affiliate.ts
app/api/affiliate/login/route.ts
app/api/affiliate/logout/route.ts
app/api/affiliate/setup/route.ts
app/api/affiliate/upload-headshot/route.ts
app/api/affiliate/change-password/route.ts
app/api/affiliate/forgot-password/route.ts
app/api/affiliate/reset-password/route.ts
app/api/affiliate/me/route.ts
app/api/affiliate/leads/route.ts
app/api/affiliate/activity/route.ts
app/api/affiliate/calls/route.ts
app/api/admin/affiliates/route.ts
app/api/admin/affiliates/[id]/route.ts
app/admin/affiliates/page.tsx
app/[slug]/layout.tsx
app/[slug]/login/page.tsx
app/[slug]/setup/page.tsx
app/[slug]/forgot-password/page.tsx
app/[slug]/reset-password/page.tsx
app/[slug]/leads/page.tsx
app/[slug]/activity/page.tsx
app/[slug]/calls/page.tsx
```

**Modified files:**
```
app/api/local-optin/route.ts        — enable DB writes
app/admin/layout.tsx                — add Affiliates nav link
app/templates/local-services/config.types.ts  — add photoUrl to FounderInfo
```

---

## Task 1: Install bcryptjs + DB Migration

**Files:**
- Run: `npm install bcryptjs @types/bcryptjs`
- Create: `supabase/migrations/20260331_affiliate_admin.sql`

- [ ] **Step 1: Install bcryptjs**

```bash
cd /Users/mistibruton/Desktop/geo-landing
npm install bcryptjs @types/bcryptjs
```

Expected: `added 2 packages` (no errors)

- [ ] **Step 2: Write the migration file**

Create `supabase/migrations/20260331_affiliate_admin.sql`:

```sql
-- Affiliate contractors table
CREATE TABLE IF NOT EXISTS affiliates (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT NOT NULL,
  slug             TEXT UNIQUE NOT NULL,
  tag              TEXT UNIQUE NOT NULL,
  email            TEXT,
  phone            TEXT,
  headshot_url     TEXT,
  calendly_url     TEXT,
  meta_pixel_id    TEXT,
  password_hash    TEXT,
  session_token    TEXT,
  invite_token     TEXT,
  invite_used      BOOLEAN DEFAULT false,
  reset_token      TEXT,
  reset_expires_at TIMESTAMPTZ,
  active           BOOLEAN DEFAULT true,
  created_at       TIMESTAMPTZ DEFAULT now()
);

-- Leads from affiliate landing pages
CREATE TABLE IF NOT EXISTS geo_local_submissions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT NOT NULL,
  first_name    TEXT,
  business_type TEXT,
  source_tag    TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_geo_local_submissions_source_tag
  ON geo_local_submissions(source_tag);

CREATE INDEX IF NOT EXISTS idx_geo_local_submissions_created_at
  ON geo_local_submissions(created_at DESC);
```

- [ ] **Step 3: Apply the migration via Supabase MCP**

Use the `apply_migration` MCP tool with:
- `project_id`: `jntughoiksxosjapklfo`
- `name`: `affiliate_admin`
- `query`: (contents of the SQL file above)

- [ ] **Step 4: Verify tables exist**

Use `execute_sql` MCP tool:
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('affiliates', 'geo_local_submissions');
```

Expected: 2 rows returned.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260331_affiliate_admin.sql package.json package-lock.json
git commit -m "feat: add affiliates + geo_local_submissions tables, install bcryptjs"
```

---

## Task 2: Fix /api/local-optin

**Context:** This route currently discards form data. Fix: write to `geo_local_submissions`.

**The tag chain is critical:** `config.funnelTag` → POST body field `funnel` → `source_tag` in DB → `affiliates.tag` in dashboard. Every link must be solid.

**Files:**
- Modify: `app/api/local-optin/route.ts`

- [ ] **Step 1: Rewrite the route**

Replace the entire contents of `app/api/local-optin/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../lib/resend";

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

  const { error } = await supabase.from("geo_local_submissions").insert({
    email,
    first_name: firstName ?? null,
    business_type: businessType ?? null,
    source_tag: funnel,
  });

  if (error) {
    console.error("[local-optin] DB error:", error);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
```

- [ ] **Step 2: Verify the build**

```bash
npm run build 2>&1 | tail -20
```

Expected: `✓ Compiled successfully` (or similar, no errors)

- [ ] **Step 3: Test manually**

```bash
curl -s -X POST http://localhost:3000/api/local-optin \
  -H "Content-Type: application/json" \
  -d '{"firstName":"Test","email":"test@example.com","businessType":"HVAC","funnel":"christina"}' | jq
```

Expected: `{ "success": true }`

Then verify in Supabase: `SELECT * FROM geo_local_submissions ORDER BY created_at DESC LIMIT 1;`

- [ ] **Step 4: Commit**

```bash
git add app/api/local-optin/route.ts
git commit -m "feat: enable DB writes in local-optin → geo_local_submissions"
```

---

## Task 3: Auth Helper (lib/affiliate.ts)

**Context:** Every protected API route calls this to validate the `affiliate_auth` cookie. Cookie format: `slug:session_token` (httpOnly, set on login).

**Files:**
- Create: `lib/affiliate.ts`

- [ ] **Step 1: Create the helper**

```typescript
import { NextRequest } from "next/server";
import { supabase } from "./resend";

export interface AffiliateSession {
  id: string;
  slug: string;
  tag: string;
  name: string;
  email: string | null;
}

export async function getAffiliateFromRequest(
  req: NextRequest
): Promise<AffiliateSession | null> {
  const cookie = req.cookies.get("affiliate_auth")?.value;
  if (!cookie) return null;

  const colonIdx = cookie.indexOf(":");
  if (colonIdx === -1) return null;

  const slug = cookie.slice(0, colonIdx);
  const sessionToken = cookie.slice(colonIdx + 1);
  if (!slug || !sessionToken) return null;

  const { data, error } = await supabase
    .from("affiliates")
    .select("id, slug, tag, name, email")
    .eq("slug", slug)
    .eq("session_token", sessionToken)
    .eq("active", true)
    .maybeSingle();

  if (error || !data) return null;
  return data as AffiliateSession;
}
```

- [ ] **Step 2: Build check**

```bash
npm run build 2>&1 | grep -E "(error|Error|✓)" | head -20
```

Expected: no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add lib/affiliate.ts
git commit -m "feat: add getAffiliateFromRequest cookie auth helper"
```

---

## Task 4: Auth API Routes (login, logout, setup)

**Files:**
- Create: `app/api/affiliate/login/route.ts`
- Create: `app/api/affiliate/logout/route.ts`
- Create: `app/api/affiliate/setup/route.ts`

- [ ] **Step 1: Create login route**

`app/api/affiliate/login/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { supabase } from "../../../../lib/resend";

export async function POST(req: NextRequest) {
  const { slug, password } = await req.json() as { slug?: string; password?: string };

  if (!slug || !password) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const { data: affiliate } = await supabase
    .from("affiliates")
    .select("id, slug, password_hash, active")
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle();

  if (!affiliate || !affiliate.password_hash) {
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }

  const valid = await bcrypt.compare(password, affiliate.password_hash);
  if (!valid) {
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }

  const sessionToken = crypto.randomBytes(32).toString("hex");
  await supabase
    .from("affiliates")
    .update({ session_token: sessionToken })
    .eq("id", affiliate.id);

  const res = NextResponse.json({ success: true });
  res.cookies.set("affiliate_auth", `${slug}:${sessionToken}`, {
    httpOnly: true,
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    sameSite: "lax",
  });
  return res;
}
```

- [ ] **Step 2: Create logout route**

`app/api/affiliate/logout/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getAffiliateFromRequest } from "../../../../lib/affiliate";
import { supabase } from "../../../../lib/resend";

export async function POST(req: NextRequest) {
  const affiliate = await getAffiliateFromRequest(req);
  if (affiliate) {
    await supabase
      .from("affiliates")
      .update({ session_token: null })
      .eq("id", affiliate.id);
  }

  const res = NextResponse.json({ success: true });
  res.cookies.set("affiliate_auth", "", {
    httpOnly: true,
    path: "/",
    maxAge: 0,
  });
  return res;
}
```

- [ ] **Step 3: Create setup route**

`app/api/affiliate/setup/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { supabase } from "../../../../lib/resend";

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    slug?: string;
    inviteToken?: string;
    password?: string;
    name?: string;
    email?: string;
    phone?: string;
    headshotUrl?: string;
    calendlyUrl?: string;
  };

  const { slug, inviteToken, password, name, email, phone, headshotUrl, calendlyUrl } = body;

  if (!slug || !inviteToken || !password) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const { data: affiliate } = await supabase
    .from("affiliates")
    .select("id, invite_token, invite_used")
    .eq("slug", slug)
    .maybeSingle();

  if (!affiliate || affiliate.invite_used || affiliate.invite_token !== inviteToken) {
    return NextResponse.json({ error: "Invalid or expired invite link" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const sessionToken = crypto.randomBytes(32).toString("hex");

  await supabase
    .from("affiliates")
    .update({
      password_hash: passwordHash,
      session_token: sessionToken,
      invite_token: null,
      invite_used: true,
      name: name ?? undefined,
      email: email ?? undefined,
      phone: phone ?? undefined,
      headshot_url: headshotUrl ?? undefined,
      calendly_url: calendlyUrl ?? undefined,
    })
    .eq("id", affiliate.id);

  const res = NextResponse.json({ success: true });
  res.cookies.set("affiliate_auth", `${slug}:${sessionToken}`, {
    httpOnly: true,
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    sameSite: "lax",
  });
  return res;
}
```

- [ ] **Step 4: Build check**

```bash
npm run build 2>&1 | grep -E "(error TS|Error)" | head -20
```

Expected: no TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add app/api/affiliate/login/route.ts app/api/affiliate/logout/route.ts app/api/affiliate/setup/route.ts
git commit -m "feat: affiliate auth API routes — login, logout, setup"
```

---

## Task 5: Password Change + Reset API Routes

**Files:**
- Create: `app/api/affiliate/change-password/route.ts`
- Create: `app/api/affiliate/forgot-password/route.ts`
- Create: `app/api/affiliate/reset-password/route.ts`

**Note:** Forgot/reset password sends email via Resend (NOT the queue system — direct transactional send). The reset link uses `NEXT_PUBLIC_LOCAL_HOST` env var (defaults to `local.heypearl.io`).

- [ ] **Step 1: Create change-password route**

`app/api/affiliate/change-password/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getAffiliateFromRequest } from "../../../../lib/affiliate";
import { supabase } from "../../../../lib/resend";

export async function POST(req: NextRequest) {
  const affiliate = await getAffiliateFromRequest(req);
  if (!affiliate) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { currentPassword, newPassword } = await req.json() as {
    currentPassword?: string;
    newPassword?: string;
  };

  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  if (newPassword.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const { data: row } = await supabase
    .from("affiliates")
    .select("password_hash")
    .eq("id", affiliate.id)
    .maybeSingle();

  if (!row?.password_hash) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const valid = await bcrypt.compare(currentPassword, row.password_hash);
  if (!valid) return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });

  const newHash = await bcrypt.hash(newPassword, 12);
  await supabase
    .from("affiliates")
    .update({ password_hash: newHash, session_token: null })
    .eq("id", affiliate.id);

  const res = NextResponse.json({ success: true });
  res.cookies.set("affiliate_auth", "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}
```

- [ ] **Step 2: Create forgot-password route**

`app/api/affiliate/forgot-password/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { supabase, resend } from "../../../../lib/resend";

export async function POST(req: NextRequest) {
  const { slug, email } = await req.json() as { slug?: string; email?: string };

  // Always return same message to prevent enumeration
  const ok = NextResponse.json({ success: true });

  if (!slug || !email) return ok;

  const { data: affiliate } = await supabase
    .from("affiliates")
    .select("id, name, email")
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle();

  if (!affiliate || affiliate.email?.toLowerCase() !== email.toLowerCase()) return ok;

  const resetToken = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await supabase
    .from("affiliates")
    .update({ reset_token: resetToken, reset_expires_at: expiresAt.toISOString() })
    .eq("id", affiliate.id);

  const host = process.env.NEXT_PUBLIC_LOCAL_HOST ?? "local.heypearl.io";
  const resetLink = `https://${host}/${slug}/reset-password?token=${resetToken}`;

  await resend.emails.send({
    from: process.env.EMAIL_FROM ?? "HeyLocal <misti@geo.heypearl.io>",
    to: email,
    subject: "Reset your HeyLocal password",
    html: `
      <p>Hi ${affiliate.name},</p>
      <p>Click the link below to reset your HeyLocal password. This link expires in 1 hour.</p>
      <p><a href="${resetLink}">${resetLink}</a></p>
      <p>If you didn't request this, you can ignore this email.</p>
    `,
  });

  return ok;
}
```

- [ ] **Step 3: Create reset-password route**

`app/api/affiliate/reset-password/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { supabase } from "../../../../lib/resend";

export async function POST(req: NextRequest) {
  const { slug, token, newPassword } = await req.json() as {
    slug?: string;
    token?: string;
    newPassword?: string;
  };

  if (!slug || !token || !newPassword) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  if (newPassword.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const { data: affiliate } = await supabase
    .from("affiliates")
    .select("id, reset_token, reset_expires_at")
    .eq("slug", slug)
    .maybeSingle();

  if (
    !affiliate ||
    affiliate.reset_token !== token ||
    !affiliate.reset_expires_at ||
    new Date(affiliate.reset_expires_at) < new Date()
  ) {
    return NextResponse.json({ error: "This reset link has expired or is invalid" }, { status: 400 });
  }

  const newHash = await bcrypt.hash(newPassword, 12);
  await supabase
    .from("affiliates")
    .update({
      password_hash: newHash,
      reset_token: null,
      reset_expires_at: null,
      session_token: null,
    })
    .eq("id", affiliate.id);

  return NextResponse.json({ success: true });
}
```

- [ ] **Step 4: Build check**

```bash
npm run build 2>&1 | grep -E "(error TS|Error)" | head -20
```

- [ ] **Step 5: Commit**

```bash
git add app/api/affiliate/change-password/route.ts app/api/affiliate/forgot-password/route.ts app/api/affiliate/reset-password/route.ts
git commit -m "feat: affiliate password change + forgot/reset email flow"
```

---

## Task 6: Headshot Upload API + Supabase Storage

**Context:** During setup wizard (Step 2), affiliate can upload a photo OR paste a URL. Upload goes to Supabase Storage bucket `affiliate-headshots` (public). Route validates either session cookie OR invite token.

**Files:**
- Create: `app/api/affiliate/upload-headshot/route.ts`

- [ ] **Step 1: Create the Supabase Storage bucket**

Via Supabase dashboard or MCP `execute_sql`: the bucket must exist and be public. Use the Supabase MCP `execute_sql` to run:

```sql
-- This just verifies the bucket exists — create it manually in Supabase Storage dashboard
-- Bucket name: affiliate-headshots
-- Make it public (toggle "Public bucket" ON)
SELECT id, name, public FROM storage.buckets WHERE name = 'affiliate-headshots';
```

If the bucket doesn't exist: go to Supabase Dashboard → Storage → New bucket → name: `affiliate-headshots` → toggle Public ON → Create.

- [ ] **Step 2: Create upload route**

`app/api/affiliate/upload-headshot/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../../lib/resend";
import { getAffiliateFromRequest } from "../../../../lib/affiliate";

export async function POST(req: NextRequest) {
  // Auth: either session cookie (dashboard) OR invite token (setup wizard)
  let affiliateSlug: string | null = null;

  const sessionAffiliate = await getAffiliateFromRequest(req);
  if (sessionAffiliate) {
    affiliateSlug = sessionAffiliate.slug;
  } else {
    // Setup wizard path: validate slug + invite_token
    const slugParam = req.nextUrl.searchParams.get("slug");
    const inviteToken = req.nextUrl.searchParams.get("invite_token");
    if (slugParam && inviteToken) {
      const { data } = await supabase
        .from("affiliates")
        .select("slug, invite_token, invite_used")
        .eq("slug", slugParam)
        .maybeSingle();
      if (data && !data.invite_used && data.invite_token === inviteToken) {
        affiliateSlug = data.slug;
      }
    }
  }

  if (!affiliateSlug) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${affiliateSlug}/${Date.now()}.${ext}`;
  const bytes = await file.arrayBuffer();

  const { error } = await supabase.storage
    .from("affiliate-headshots")
    .upload(path, bytes, {
      contentType: file.type,
      upsert: true,
    });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: urlData } = supabase.storage
    .from("affiliate-headshots")
    .getPublicUrl(path);

  return NextResponse.json({ url: urlData.publicUrl });
}
```

- [ ] **Step 3: Build check**

```bash
npm run build 2>&1 | grep -E "(error TS|Error)" | head -20
```

- [ ] **Step 4: Commit**

```bash
git add app/api/affiliate/upload-headshot/route.ts
git commit -m "feat: affiliate headshot upload to Supabase Storage"
```

---

## Task 7: Data API Routes (me, leads, activity, calls)

**Files:**
- Create: `app/api/affiliate/me/route.ts`
- Create: `app/api/affiliate/leads/route.ts`
- Create: `app/api/affiliate/activity/route.ts`
- Create: `app/api/affiliate/calls/route.ts`

- [ ] **Step 1: Create /api/affiliate/me**

`app/api/affiliate/me/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getAffiliateFromRequest } from "../../../../lib/affiliate";

export async function GET(req: NextRequest) {
  const affiliate = await getAffiliateFromRequest(req);
  if (!affiliate) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ slug: affiliate.slug, name: affiliate.name, tag: affiliate.tag });
}
```

- [ ] **Step 2: Create /api/affiliate/leads**

`app/api/affiliate/leads/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getAffiliateFromRequest } from "../../../../lib/affiliate";
import { supabase } from "../../../../lib/resend";

export async function GET(req: NextRequest) {
  const affiliate = await getAffiliateFromRequest(req);
  if (!affiliate) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = req.nextUrl;
  const search = url.searchParams.get("search") ?? "";
  const page = parseInt(url.searchParams.get("page") ?? "1", 10);
  const pageSize = 50;
  const offset = (page - 1) * pageSize;

  let query = supabase
    .from("geo_local_submissions")
    .select("id, email, first_name, business_type, created_at", { count: "exact" })
    .eq("source_tag", affiliate.tag)
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (search) {
    query = query.or(`email.ilike.%${search}%,first_name.ilike.%${search}%`);
  }

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ leads: data ?? [], total: count ?? 0, page, pageSize });
}
```

- [ ] **Step 3: Create /api/affiliate/activity**

`app/api/affiliate/activity/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getAffiliateFromRequest } from "../../../../lib/affiliate";
import { supabase } from "../../../../lib/resend";

export async function GET(req: NextRequest) {
  const affiliate = await getAffiliateFromRequest(req);
  if (!affiliate) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [totalResult, weekResult, monthResult, recentResult] = await Promise.all([
    supabase
      .from("geo_local_submissions")
      .select("id", { count: "exact", head: true })
      .eq("source_tag", affiliate.tag),
    supabase
      .from("geo_local_submissions")
      .select("id", { count: "exact", head: true })
      .eq("source_tag", affiliate.tag)
      .gte("created_at", startOfWeek.toISOString()),
    supabase
      .from("geo_local_submissions")
      .select("id", { count: "exact", head: true })
      .eq("source_tag", affiliate.tag)
      .gte("created_at", startOfMonth.toISOString()),
    supabase
      .from("geo_local_submissions")
      .select("email, first_name, business_type, created_at")
      .eq("source_tag", affiliate.tag)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  return NextResponse.json({
    totalLeads: totalResult.count ?? 0,
    leadsThisWeek: weekResult.count ?? 0,
    leadsThisMonth: monthResult.count ?? 0,
    recentOptIns: recentResult.data ?? [],
  });
}
```

- [ ] **Step 4: Create /api/affiliate/calls**

`app/api/affiliate/calls/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getAffiliateFromRequest } from "../../../../lib/affiliate";
import { supabase } from "../../../../lib/resend";

export async function GET(req: NextRequest) {
  const affiliate = await getAffiliateFromRequest(req);
  if (!affiliate) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Get all emails that opted in under this affiliate's tag
  const { data: leads } = await supabase
    .from("geo_local_submissions")
    .select("email")
    .eq("source_tag", affiliate.tag);

  const emails = (leads ?? []).map((l) => l.email);

  if (emails.length === 0) {
    return NextResponse.json({ upcoming: [], past: [] });
  }

  const now = new Date().toISOString();

  const [upcomingResult, pastResult] = await Promise.all([
    supabase
      .from("geo_scheduled_calls")
      .select("id, email, first_name, meeting_time, outcome")
      .in("email", emails)
      .gte("meeting_time", now)
      .order("meeting_time", { ascending: true })
      .limit(50),
    supabase
      .from("geo_scheduled_calls")
      .select("id, email, first_name, meeting_time, outcome")
      .in("email", emails)
      .lt("meeting_time", now)
      .order("meeting_time", { ascending: false })
      .limit(50),
  ]);

  return NextResponse.json({
    upcoming: upcomingResult.data ?? [],
    past: pastResult.data ?? [],
  });
}
```

- [ ] **Step 5: Patch call outcome (PATCH /api/affiliate/calls)**

Add to `app/api/affiliate/calls/route.ts` after the GET export:

```typescript
export async function PATCH(req: NextRequest) {
  const affiliate = await getAffiliateFromRequest(req);
  if (!affiliate) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { callId, outcome } = await req.json() as {
    callId?: string;
    outcome?: "attended" | "no_show" | "rescheduled" | "bought";
  };

  if (!callId || !outcome) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  // Verify this call's email belongs to this affiliate's leads
  const { data: call } = await supabase
    .from("geo_scheduled_calls")
    .select("email")
    .eq("id", callId)
    .maybeSingle();

  if (!call) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: lead } = await supabase
    .from("geo_local_submissions")
    .select("id")
    .eq("source_tag", affiliate.tag)
    .eq("email", call.email)
    .maybeSingle();

  if (!lead) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  await supabase
    .from("geo_scheduled_calls")
    .update({ outcome })
    .eq("id", callId);

  return NextResponse.json({ success: true });
}
```

- [ ] **Step 6: Build check**

```bash
npm run build 2>&1 | grep -E "(error TS|Error)" | head -20
```

- [ ] **Step 7: Commit**

```bash
git add app/api/affiliate/me/route.ts app/api/affiliate/leads/route.ts app/api/affiliate/activity/route.ts app/api/affiliate/calls/route.ts
git commit -m "feat: affiliate data API routes — me, leads, activity, calls"
```

---

## Task 8: God Admin API Routes + Affiliates Page

**Context:** Misti onboards affiliates from `/admin/affiliates`. She creates a record, gets an invite link, copies it to send to the affiliate. She can also toggle active status, regenerate invite links, and add the Meta Pixel ID.

**Admin auth pattern:** inline `adminAuth()` — checks `admin_auth` cookie or `x-admin-key` header (same as all other admin routes).

**Files:**
- Create: `app/api/admin/affiliates/route.ts`
- Create: `app/api/admin/affiliates/[id]/route.ts`
- Create: `app/admin/affiliates/page.tsx`

- [ ] **Step 1: Create admin affiliates list + create route**

`app/api/admin/affiliates/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { supabase } from "../../../../lib/resend";

function adminAuth(req: NextRequest) {
  const cookieAuth = req.cookies.get("admin_auth")?.value === (process.env.ADMIN_TOKEN ?? "geo-admin-authenticated");
  const keyAuth = req.headers.get("x-admin-key") === process.env.ADMIN_TOKEN;
  return cookieAuth || keyAuth;
}

// GET /api/admin/affiliates — list all affiliates with lead counts
export async function GET(req: NextRequest) {
  if (!adminAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: affiliates, error } = await supabase
    .from("affiliates")
    .select("id, name, slug, tag, email, meta_pixel_id, invite_used, active, created_at")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Get lead counts per tag
  const tags = (affiliates ?? []).map((a) => a.tag);
  const { data: leadCounts } = await supabase
    .from("geo_local_submissions")
    .select("source_tag")
    .in("source_tag", tags.length > 0 ? tags : ["__none__"]);

  const countMap: Record<string, number> = {};
  for (const row of leadCounts ?? []) {
    countMap[row.source_tag] = (countMap[row.source_tag] ?? 0) + 1;
  }

  const result = (affiliates ?? []).map((a) => ({
    ...a,
    leadCount: countMap[a.tag] ?? 0,
  }));

  return NextResponse.json({ affiliates: result });
}

// POST /api/admin/affiliates — create new affiliate
export async function POST(req: NextRequest) {
  if (!adminAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, slug, tag } = await req.json() as {
    name?: string;
    slug?: string;
    tag?: string;
  };

  if (!name || !slug || !tag) {
    return NextResponse.json({ error: "name, slug, and tag are required" }, { status: 400 });
  }

  // Validate slug format: lowercase letters, numbers, hyphens only
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return NextResponse.json({ error: "Slug must be lowercase letters, numbers, and hyphens only" }, { status: 400 });
  }

  const inviteToken = crypto.randomBytes(32).toString("hex");

  const { data, error } = await supabase
    .from("affiliates")
    .insert({ name, slug, tag, invite_token: inviteToken })
    .select("id, slug")
    .single();

  if (error) {
    if (error.message.includes("unique")) {
      return NextResponse.json({ error: "Slug or tag already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const host = process.env.NEXT_PUBLIC_LOCAL_HOST ?? "local.heypearl.io";
  const inviteLink = `https://${host}/${data.slug}/setup?token=${inviteToken}`;

  return NextResponse.json({ id: data.id, slug: data.slug, inviteLink });
}
```

- [ ] **Step 2: Create admin affiliate update route**

`app/api/admin/affiliates/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { supabase } from "../../../../../lib/resend";

function adminAuth(req: NextRequest) {
  const cookieAuth = req.cookies.get("admin_auth")?.value === (process.env.ADMIN_TOKEN ?? "geo-admin-authenticated");
  const keyAuth = req.headers.get("x-admin-key") === process.env.ADMIN_TOKEN;
  return cookieAuth || keyAuth;
}

// PATCH /api/admin/affiliates/[id]
// Actions: toggle active, update meta_pixel_id, regenerate invite link
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!adminAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as {
    active?: boolean;
    metaPixelId?: string;
    regenerateInvite?: boolean;
  };

  const updates: Record<string, unknown> = {};
  let newInviteLink: string | undefined;

  if (body.active !== undefined) updates.active = body.active;
  if (body.metaPixelId !== undefined) updates.meta_pixel_id = body.metaPixelId;

  if (body.regenerateInvite) {
    const newToken = crypto.randomBytes(32).toString("hex");
    updates.invite_token = newToken;
    updates.invite_used = false;

    const { data: affiliate } = await supabase
      .from("affiliates")
      .select("slug")
      .eq("id", params.id)
      .maybeSingle();

    if (affiliate) {
      const host = process.env.NEXT_PUBLIC_LOCAL_HOST ?? "local.heypearl.io";
      newInviteLink = `https://${host}/${affiliate.slug}/setup?token=${newToken}`;
    }
  }

  const { error } = await supabase
    .from("affiliates")
    .update(updates)
    .eq("id", params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, inviteLink: newInviteLink });
}
```

- [ ] **Step 3: Create admin affiliates page**

`app/admin/affiliates/page.tsx`:

```tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

const S = {
  bg: "#0F1E3A", card: "#0d1e36", border: "#1e3354",
  text: "#F7F8FC", muted: "#9BACC0", faint: "#4A5E7A",
  pink: "#E8185C", green: "#22c55e",
};

interface Affiliate {
  id: string;
  name: string;
  slug: string;
  tag: string;
  email: string | null;
  meta_pixel_id: string | null;
  invite_used: boolean;
  active: boolean;
  leadCount: number;
}

export default function AffiliatesPage() {
  const router = useRouter();
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", slug: "", tag: "" });
  const [creating, setCreating] = useState(false);
  const [inviteResult, setInviteResult] = useState<{ name: string; link: string } | null>(null);
  const [pixelEdit, setPixelEdit] = useState<{ id: string; value: string } | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/affiliates");
    if (res.status === 401) { router.push("/admin/login"); return; }
    const data = await res.json();
    setAffiliates(data.affiliates ?? []);
    setLoading(false);
  }, [router]);

  useEffect(() => { load(); }, [load]);

  function autoSlug(name: string) {
    return name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  }

  async function createAffiliate() {
    setCreating(true);
    setError("");
    const res = await fetch("/api/admin/affiliates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setCreating(false);
    if (!res.ok) { setError(data.error ?? "Failed to create"); return; }
    setInviteResult({ name: form.name, link: data.inviteLink });
    setForm({ name: "", slug: "", tag: "" });
    load();
  }

  async function toggleActive(id: string, current: boolean) {
    await fetch(`/api/admin/affiliates/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !current }),
    });
    load();
  }

  async function savePixel(id: string, value: string) {
    await fetch(`/api/admin/affiliates/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ metaPixelId: value }),
    });
    setPixelEdit(null);
    load();
  }

  async function regenerateInvite(id: string, name: string) {
    const res = await fetch(`/api/admin/affiliates/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ regenerateInvite: true }),
    });
    const data = await res.json();
    if (data.inviteLink) setInviteResult({ name, link: data.inviteLink });
  }

  return (
    <div style={{ padding: "32px 24px", maxWidth: 1100, margin: "0 auto" }}>
      <h1 style={{ color: S.text, fontSize: 24, fontWeight: 800, marginBottom: 32 }}>
        Affiliate Partners
      </h1>

      {/* Create new affiliate */}
      <div style={{
        background: S.card, border: `1px solid ${S.border}`,
        borderRadius: 12, padding: 24, marginBottom: 32,
      }}>
        <h2 style={{ color: S.text, fontSize: 16, fontWeight: 700, marginBottom: 16 }}>
          Add New Affiliate
        </h2>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <input
            placeholder="Full name (e.g. Christina Moreno)"
            value={form.name}
            onChange={e => {
              const name = e.target.value;
              setForm(f => ({ ...f, name, slug: autoSlug(name), tag: autoSlug(name) }));
            }}
            style={inputStyle}
          />
          <input
            placeholder="Slug (e.g. christina)"
            value={form.slug}
            onChange={e => setForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") }))}
            style={{ ...inputStyle, width: 160 }}
          />
          <input
            placeholder="Tag (defaults to slug)"
            value={form.tag}
            onChange={e => setForm(f => ({ ...f, tag: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") }))}
            style={{ ...inputStyle, width: 160 }}
          />
          <button
            onClick={createAffiliate}
            disabled={creating || !form.name || !form.slug || !form.tag}
            style={{
              background: S.pink, color: "#fff", border: "none",
              borderRadius: 8, padding: "10px 20px", fontWeight: 700,
              fontSize: 14, cursor: "pointer", opacity: creating ? 0.7 : 1,
            }}
          >
            {creating ? "Creating…" : "Create Affiliate"}
          </button>
        </div>
        {error && <p style={{ color: "#f87171", marginTop: 8, fontSize: 13 }}>{error}</p>}
      </div>

      {/* Invite link result */}
      {inviteResult && (
        <div style={{
          background: "#0f2e1a", border: "1px solid #166534",
          borderRadius: 12, padding: 20, marginBottom: 32,
        }}>
          <p style={{ color: S.green, fontWeight: 700, marginBottom: 8 }}>
            Affiliate created. Send this link to {inviteResult.name}:
          </p>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <code style={{ color: "#86efac", fontSize: 13, wordBreak: "break-all", flex: 1 }}>
              {inviteResult.link}
            </code>
            <button
              onClick={() => navigator.clipboard.writeText(inviteResult.link)}
              style={{
                background: "#166534", color: S.green, border: "none",
                borderRadius: 6, padding: "6px 14px", fontWeight: 600,
                fontSize: 13, cursor: "pointer", whiteSpace: "nowrap",
              }}
            >
              Copy
            </button>
          </div>
          <p style={{ color: S.muted, fontSize: 12, marginTop: 12 }}>
            Once they complete setup, come back here to add their Meta Pixel ID.
          </p>
          <button
            onClick={() => setInviteResult(null)}
            style={{ marginTop: 8, background: "none", border: "none", color: S.faint, cursor: "pointer", fontSize: 12 }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Affiliates table */}
      {loading ? (
        <p style={{ color: S.muted }}>Loading…</p>
      ) : affiliates.length === 0 ? (
        <p style={{ color: S.muted }}>No affiliates yet. Create one above.</p>
      ) : (
        <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 12, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${S.border}` }}>
                {["Name", "Slug / Tag", "Status", "Leads", "Meta Pixel", "Actions"].map(h => (
                  <th key={h} style={{ color: S.muted, fontWeight: 600, padding: "12px 16px", textAlign: "left" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {affiliates.map((a, i) => (
                <tr key={a.id} style={{ borderBottom: i < affiliates.length - 1 ? `1px solid ${S.border}` : "none" }}>
                  <td style={{ color: S.text, padding: "14px 16px", fontWeight: 600 }}>{a.name}</td>
                  <td style={{ color: S.muted, padding: "14px 16px", fontSize: 13 }}>
                    <code>{a.slug}</code>
                    {a.tag !== a.slug && <><br /><code style={{ color: S.faint }}>tag: {a.tag}</code></>}
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    <span style={{
                      background: a.invite_used ? "#0f2e1a" : "#1a2d4a",
                      color: a.invite_used ? S.green : "#60a5fa",
                      borderRadius: 6, padding: "3px 8px", fontSize: 12, fontWeight: 600,
                    }}>
                      {a.invite_used ? "Active" : "Pending Setup"}
                    </span>
                  </td>
                  <td style={{ color: S.text, padding: "14px 16px", fontWeight: 700 }}>{a.leadCount}</td>
                  <td style={{ padding: "14px 16px" }}>
                    {pixelEdit?.id === a.id ? (
                      <div style={{ display: "flex", gap: 6 }}>
                        <input
                          value={pixelEdit.value}
                          onChange={e => setPixelEdit(p => p ? { ...p, value: e.target.value } : p)}
                          style={{ ...inputStyle, width: 160, fontSize: 12, padding: "4px 8px" }}
                          placeholder="Pixel ID"
                        />
                        <button onClick={() => savePixel(a.id, pixelEdit.value)} style={smallBtnStyle}>Save</button>
                        <button onClick={() => setPixelEdit(null)} style={{ ...smallBtnStyle, background: S.faint }}>✕</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setPixelEdit({ id: a.id, value: a.meta_pixel_id ?? "" })}
                        style={{ ...smallBtnStyle, background: "transparent", border: `1px solid ${S.border}`, color: S.muted }}
                      >
                        {a.meta_pixel_id ? a.meta_pixel_id : "Add Pixel"}
                      </button>
                    )}
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <button
                        onClick={() => toggleActive(a.id, a.active)}
                        style={{ ...smallBtnStyle, background: a.active ? "#7f1d1d" : "#166534", color: a.active ? "#fca5a5" : S.green }}
                      >
                        {a.active ? "Deactivate" : "Activate"}
                      </button>
                      {!a.invite_used && (
                        <button
                          onClick={() => regenerateInvite(a.id, a.name)}
                          style={{ ...smallBtnStyle, background: "#1a2d4a", color: "#60a5fa" }}
                        >
                          New Invite
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: "#0F1E3A", border: "1px solid #1e3354", borderRadius: 8,
  color: "#F7F8FC", padding: "10px 14px", fontSize: 14, outline: "none",
  flex: 1, minWidth: 180,
};

const smallBtnStyle: React.CSSProperties = {
  background: "#1a2d4a", color: "#9BACC0", border: "none",
  borderRadius: 6, padding: "5px 10px", fontSize: 12, fontWeight: 600,
  cursor: "pointer",
};
```

- [ ] **Step 4: Build check**

```bash
npm run build 2>&1 | grep -E "(error TS|Error)" | head -20
```

- [ ] **Step 5: Commit**

```bash
git add app/api/admin/affiliates/route.ts "app/api/admin/affiliates/[id]/route.ts" app/admin/affiliates/page.tsx
git commit -m "feat: god admin affiliates API + onboarding page"
```

---

## Task 9: Admin Nav + Config Types Update

**Files:**
- Modify: `app/admin/layout.tsx` (add Affiliates link)
- Modify: `app/templates/local-services/config.types.ts` (add `photoUrl` to FounderInfo)

- [ ] **Step 1: Add Affiliates to admin nav**

In `app/admin/layout.tsx`, replace the `NAV_LINKS` array:

```typescript
const NAV_LINKS = [
  { href: "/admin/activity",   label: "Activity"   },
  { href: "/admin/leads",      label: "Leads"      },
  { href: "/admin/campaigns",  label: "Campaigns"  },
  { href: "/admin/affiliates", label: "Affiliates" },
];
```

- [ ] **Step 2: Add photoUrl to FounderInfo**

In `app/templates/local-services/config.types.ts`, update the `FounderInfo` interface (lines 67-72):

```typescript
export interface FounderInfo {
  initials: string;
  name: string;
  title: string;
  photoUrl?: string;  // Add this line
  stats: Array<{ stat: string; label: string }>;
}
```

- [ ] **Step 3: Build check**

```bash
npm run build 2>&1 | grep -E "(error TS|Error)" | head -20
```

- [ ] **Step 4: Commit**

```bash
git add app/admin/layout.tsx app/templates/local-services/config.types.ts
git commit -m "feat: add Affiliates to admin nav, add photoUrl to FounderInfo type"
```

---

## Task 10: Affiliate Auth Pages

**Files:**
- Create: `app/[slug]/login/page.tsx`
- Create: `app/[slug]/setup/page.tsx`
- Create: `app/[slug]/forgot-password/page.tsx`
- Create: `app/[slug]/reset-password/page.tsx`

**Note:** These are client components. They use `useParams()` to get `slug`. Auth pages don't need the layout nav (layout handles this).

- [ ] **Step 1: Create login page**

`app/[slug]/login/page.tsx`:

```tsx
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

export default function AffiliatLoginPage() {
  const { slug } = useParams() as { slug: string };
  const router = useRouter();
  const [affiliateName, setAffiliateName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check if already logged in
    fetch("/api/affiliate/me").then(r => {
      if (r.ok) r.json().then(d => { if (d.slug === slug) router.push(`/${slug}/leads`); });
    });

    // Fetch affiliate name for display
    fetch(`/api/admin/affiliates`).catch(() => {}); // don't expose admin data
    // Simpler: just display the slug nicely
    setAffiliateName(slug.charAt(0).toUpperCase() + slug.slice(1));
  }, [slug, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/affiliate/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, password }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Login failed");
      return;
    }

    router.push(`/${slug}/leads`);
  }

  return (
    <div style={{
      minHeight: "100vh", background: "#0F1E3A",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 24,
    }}>
      <div style={{
        background: "#0d1e36", border: "1px solid #1e3354",
        borderRadius: 16, padding: 40, width: "100%", maxWidth: 400,
      }}>
        <div style={{ marginBottom: 32, textAlign: "center" }}>
          <span style={{ color: "#C8F135", fontWeight: 800, fontSize: 18 }}>HeyLocal</span>
          <h1 style={{ color: "#F7F8FC", fontSize: 22, fontWeight: 700, marginTop: 8 }}>
            {affiliateName} Dashboard
          </h1>
          <p style={{ color: "#9BACC0", fontSize: 14, marginTop: 4 }}>Sign in to view your leads</p>
        </div>

        <form onSubmit={handleSubmit}>
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            style={inputStyle}
          />
          {error && <p style={{ color: "#f87171", fontSize: 13, marginTop: 6 }}>{error}</p>}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%", background: "#C8F135", color: "#0D1B2A",
              border: "none", borderRadius: 10, padding: "12px",
              fontWeight: 800, fontSize: 15, cursor: "pointer",
              marginTop: 16, opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <div style={{ marginTop: 20, textAlign: "center" }}>
          <Link
            href={`/${slug}/forgot-password`}
            style={{ color: "#9BACC0", fontSize: 13, textDecoration: "none" }}
          >
            Forgot password?
          </Link>
        </div>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", boxSizing: "border-box",
  background: "#0F1E3A", border: "1px solid #1e3354", borderRadius: 10,
  color: "#F7F8FC", padding: "12px 14px", fontSize: 15, outline: "none",
};
```

- [ ] **Step 2: Create setup page (3-step wizard)**

`app/[slug]/setup/page.tsx`:

```tsx
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function SetupWizard() {
  const { slug } = useParams() as { slug: string };
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") ?? "";

  const [step, setStep] = useState(1);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);

  // Form state
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [headshotUrl, setHeadshotUrl] = useState("");
  const [headshotTab, setHeadshotTab] = useState<"upload" | "url">("upload");
  const [calendlyUrl, setCalendlyUrl] = useState("");

  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) { setTokenValid(false); return; }
    // Quick validate: try to reach setup endpoint with GET (we use a lightweight check)
    fetch(`/api/affiliate/setup?slug=${slug}&token=${token}`)
      .then(r => setTokenValid(r.ok))
      .catch(() => setTokenValid(false));
  }, [slug, token]);

  async function handleUpload(file: File) {
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(
      `/api/affiliate/upload-headshot?slug=${slug}&invite_token=${token}`,
      { method: "POST", body: fd }
    );
    const data = await res.json();
    setUploading(false);
    if (res.ok) setHeadshotUrl(data.url);
    else setError(data.error ?? "Upload failed");
  }

  async function handleFinish() {
    setSubmitting(true);
    setError("");
    const res = await fetch("/api/affiliate/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug, inviteToken: token, password,
        name, email, phone,
        headshotUrl: headshotUrl || undefined,
        calendlyUrl: calendlyUrl || undefined,
      }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) { setError(data.error ?? "Setup failed"); return; }
    router.push(`/${slug}/leads`);
  }

  if (tokenValid === null) {
    return <div style={centeredStyle}><p style={{ color: "#9BACC0" }}>Validating invite link…</p></div>;
  }

  if (!tokenValid) {
    return (
      <div style={centeredStyle}>
        <div style={cardStyle}>
          <p style={{ color: "#f87171", fontSize: 16, textAlign: "center" }}>
            This invite link is no longer valid.<br />Contact Misti for a new one.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={centeredStyle}>
      <div style={{ ...cardStyle, maxWidth: 500 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <span style={{ color: "#C8F135", fontWeight: 800, fontSize: 18 }}>HeyLocal</span>
          <p style={{ color: "#9BACC0", fontSize: 13, marginTop: 4 }}>
            Step {step} of 3 — {["Set your password", "Your profile", "Your booking link"][step - 1]}
          </p>
          <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 12 }}>
            {[1, 2, 3].map(s => (
              <div key={s} style={{
                height: 4, width: 60, borderRadius: 2,
                background: s <= step ? "#C8F135" : "#1e3354",
              }} />
            ))}
          </div>
        </div>

        {step === 1 && (
          <>
            <input type="password" placeholder="Password (min 8 characters)" value={password}
              onChange={e => setPassword(e.target.value)} style={inputStyle} />
            <input type="password" placeholder="Confirm password" value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)} style={{ ...inputStyle, marginTop: 12 }} />
            {error && <p style={{ color: "#f87171", fontSize: 13, marginTop: 6 }}>{error}</p>}
            <button onClick={() => {
              if (password.length < 8) { setError("Password must be at least 8 characters"); return; }
              if (password !== confirmPassword) { setError("Passwords don't match"); return; }
              setError(""); setStep(2);
            }} style={btnStyle}>Next</button>
          </>
        )}

        {step === 2 && (
          <>
            <input placeholder="Full name" value={name} onChange={e => setName(e.target.value)} style={inputStyle} />
            <input type="email" placeholder="Email (for password recovery)" value={email}
              onChange={e => setEmail(e.target.value)} style={{ ...inputStyle, marginTop: 12 }} />
            <input placeholder="Phone number" value={phone} onChange={e => setPhone(e.target.value)}
              style={{ ...inputStyle, marginTop: 12 }} />

            <div style={{ marginTop: 20 }}>
              <p style={{ color: "#9BACC0", fontSize: 13, marginBottom: 10 }}>Headshot (optional)</p>
              <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                {(["upload", "url"] as const).map(tab => (
                  <button key={tab} onClick={() => setHeadshotTab(tab)} style={{
                    background: headshotTab === tab ? "#C8F135" : "transparent",
                    color: headshotTab === tab ? "#0D1B2A" : "#9BACC0",
                    border: "1px solid #1e3354", borderRadius: 6,
                    padding: "5px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer",
                  }}>
                    {tab === "upload" ? "Upload photo" : "Paste URL"}
                  </button>
                ))}
              </div>
              {headshotTab === "upload" ? (
                <div>
                  <input type="file" accept="image/*" onChange={e => {
                    const f = e.target.files?.[0];
                    if (f) handleUpload(f);
                  }} style={{ color: "#9BACC0", fontSize: 13 }} />
                  {uploading && <p style={{ color: "#9BACC0", fontSize: 12, marginTop: 4 }}>Uploading…</p>}
                  {headshotUrl && <p style={{ color: "#C8F135", fontSize: 12, marginTop: 4 }}>Uploaded</p>}
                </div>
              ) : (
                <input placeholder="https://example.com/photo.jpg" value={headshotUrl}
                  onChange={e => setHeadshotUrl(e.target.value)}
                  style={{ ...inputStyle, fontSize: 13 }} />
              )}
            </div>

            {error && <p style={{ color: "#f87171", fontSize: 13, marginTop: 6 }}>{error}</p>}
            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button onClick={() => setStep(1)} style={{ ...btnStyle, background: "#1e3354", color: "#9BACC0", flex: "0 0 auto", width: 80 }}>Back</button>
              <button onClick={() => { setError(""); setStep(3); }} style={btnStyle}>Next</button>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <input placeholder="Your Calendly URL (e.g. https://calendly.com/...)" value={calendlyUrl}
              onChange={e => setCalendlyUrl(e.target.value)} style={inputStyle} />
            <div style={{
              background: "#0F1E3A", border: "1px solid #1e3354", borderRadius: 10,
              padding: 16, marginTop: 20,
            }}>
              <p style={{ color: "#9BACC0", fontSize: 12, marginBottom: 4 }}>Your landing page URL:</p>
              <p style={{ color: "#C8F135", fontFamily: "monospace", fontSize: 13 }}>
                https://local.heypearl.io/{slug}
              </p>
            </div>
            {error && <p style={{ color: "#f87171", fontSize: 13, marginTop: 6 }}>{error}</p>}
            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button onClick={() => setStep(2)} style={{ ...btnStyle, background: "#1e3354", color: "#9BACC0", flex: "0 0 auto", width: 80 }}>Back</button>
              <button onClick={handleFinish} disabled={submitting} style={{ ...btnStyle, opacity: submitting ? 0.7 : 1 }}>
                {submitting ? "Setting up…" : "Complete Setup"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function SetupPage() {
  return (
    <Suspense fallback={<div style={centeredStyle}><p style={{ color: "#9BACC0" }}>Loading…</p></div>}>
      <SetupWizard />
    </Suspense>
  );
}

const centeredStyle: React.CSSProperties = {
  minHeight: "100vh", background: "#0F1E3A",
  display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
};
const cardStyle: React.CSSProperties = {
  background: "#0d1e36", border: "1px solid #1e3354",
  borderRadius: 16, padding: 40, width: "100%", maxWidth: 420,
};
const inputStyle: React.CSSProperties = {
  width: "100%", boxSizing: "border-box",
  background: "#0F1E3A", border: "1px solid #1e3354", borderRadius: 10,
  color: "#F7F8FC", padding: "12px 14px", fontSize: 15, outline: "none",
};
const btnStyle: React.CSSProperties = {
  flex: 1, background: "#C8F135", color: "#0D1B2A",
  border: "none", borderRadius: 10, padding: "12px",
  fontWeight: 800, fontSize: 15, cursor: "pointer", marginTop: 8, width: "100%",
};
```

**Note:** The setup page calls `GET /api/affiliate/setup?slug=...&token=...` to validate the token. Add this GET handler to `app/api/affiliate/setup/route.ts`:

```typescript
// Add to app/api/affiliate/setup/route.ts after the POST export:
export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug");
  const token = req.nextUrl.searchParams.get("token");
  if (!slug || !token) return NextResponse.json({ error: "Missing params" }, { status: 400 });

  const { data } = await supabase
    .from("affiliates")
    .select("invite_token, invite_used")
    .eq("slug", slug)
    .maybeSingle();

  if (!data || data.invite_used || data.invite_token !== token) {
    return NextResponse.json({ error: "Invalid" }, { status: 400 });
  }

  return NextResponse.json({ valid: true });
}
```

- [ ] **Step 3: Create forgot-password page**

`app/[slug]/forgot-password/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const { slug } = useParams() as { slug: string };
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/affiliate/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, email }),
    });
    setLoading(false);
    setSubmitted(true);
  }

  return (
    <div style={centeredStyle}>
      <div style={cardStyle}>
        <span style={{ color: "#C8F135", fontWeight: 800, fontSize: 18 }}>HeyLocal</span>
        <h1 style={{ color: "#F7F8FC", fontSize: 20, fontWeight: 700, marginTop: 8 }}>Reset Password</h1>

        {submitted ? (
          <p style={{ color: "#9BACC0", fontSize: 14, marginTop: 16 }}>
            If that email matches your account, you'll receive a reset link shortly.
          </p>
        ) : (
          <form onSubmit={handleSubmit} style={{ marginTop: 24 }}>
            <input type="email" placeholder="Your email address" value={email}
              onChange={e => setEmail(e.target.value)} required style={inputStyle} />
            <button type="submit" disabled={loading} style={btnStyle}>
              {loading ? "Sending…" : "Send Reset Link"}
            </button>
          </form>
        )}

        <div style={{ marginTop: 20 }}>
          <Link href={`/${slug}/login`} style={{ color: "#9BACC0", fontSize: 13, textDecoration: "none" }}>
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}

const centeredStyle: React.CSSProperties = {
  minHeight: "100vh", background: "#0F1E3A",
  display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
};
const cardStyle: React.CSSProperties = {
  background: "#0d1e36", border: "1px solid #1e3354",
  borderRadius: 16, padding: 40, width: "100%", maxWidth: 400,
};
const inputStyle: React.CSSProperties = {
  width: "100%", boxSizing: "border-box",
  background: "#0F1E3A", border: "1px solid #1e3354", borderRadius: 10,
  color: "#F7F8FC", padding: "12px 14px", fontSize: 15, outline: "none",
};
const btnStyle: React.CSSProperties = {
  width: "100%", background: "#C8F135", color: "#0D1B2A",
  border: "none", borderRadius: 10, padding: "12px",
  fontWeight: 800, fontSize: 15, cursor: "pointer", marginTop: 16,
};
```

- [ ] **Step 4: Create reset-password page**

`app/[slug]/reset-password/page.tsx`:

```tsx
"use client";

import { useState, useEffect, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function ResetPasswordForm() {
  const { slug } = useParams() as { slug: string };
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setError("Passwords don't match"); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters"); return; }
    setLoading(true);
    setError("");

    const res = await fetch("/api/affiliate/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, token, newPassword: password }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) { setError(data.error ?? "Reset failed"); return; }
    setDone(true);
    setTimeout(() => router.push(`/${slug}/login`), 2000);
  }

  if (!token) {
    return <p style={{ color: "#f87171" }}>Invalid reset link.</p>;
  }

  return (
    <div style={centeredStyle}>
      <div style={cardStyle}>
        <span style={{ color: "#C8F135", fontWeight: 800, fontSize: 18 }}>HeyLocal</span>
        <h1 style={{ color: "#F7F8FC", fontSize: 20, fontWeight: 700, marginTop: 8 }}>Set New Password</h1>

        {done ? (
          <p style={{ color: "#86efac", fontSize: 14, marginTop: 16 }}>
            Password updated. Redirecting to login…
          </p>
        ) : (
          <form onSubmit={handleSubmit} style={{ marginTop: 24 }}>
            <input type="password" placeholder="New password (min 8 characters)" value={password}
              onChange={e => setPassword(e.target.value)} required style={inputStyle} />
            <input type="password" placeholder="Confirm new password" value={confirm}
              onChange={e => setConfirm(e.target.value)} required
              style={{ ...inputStyle, marginTop: 12 }} />
            {error && <p style={{ color: "#f87171", fontSize: 13, marginTop: 6 }}>{error}</p>}
            <button type="submit" disabled={loading} style={btnStyle}>
              {loading ? "Saving…" : "Set New Password"}
            </button>
          </form>
        )}

        <div style={{ marginTop: 20 }}>
          <Link href={`/${slug}/login`} style={{ color: "#9BACC0", fontSize: 13, textDecoration: "none" }}>
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#0F1E3A" }} />}>
      <ResetPasswordForm />
    </Suspense>
  );
}

const centeredStyle: React.CSSProperties = {
  minHeight: "100vh", background: "#0F1E3A",
  display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
};
const cardStyle: React.CSSProperties = {
  background: "#0d1e36", border: "1px solid #1e3354",
  borderRadius: 16, padding: 40, width: "100%", maxWidth: 400,
};
const inputStyle: React.CSSProperties = {
  width: "100%", boxSizing: "border-box",
  background: "#0F1E3A", border: "1px solid #1e3354", borderRadius: 10,
  color: "#F7F8FC", padding: "12px 14px", fontSize: 15, outline: "none",
};
const btnStyle: React.CSSProperties = {
  width: "100%", background: "#C8F135", color: "#0D1B2A",
  border: "none", borderRadius: 10, padding: "12px",
  fontWeight: 800, fontSize: 15, cursor: "pointer", marginTop: 16,
};
```

- [ ] **Step 5: Build check**

```bash
npm run build 2>&1 | grep -E "(error TS|Error)" | head -20
```

- [ ] **Step 6: Commit**

```bash
git add "app/[slug]/login/page.tsx" "app/[slug]/setup/page.tsx" "app/[slug]/forgot-password/page.tsx" "app/[slug]/reset-password/page.tsx"
git commit -m "feat: affiliate auth pages — login, setup wizard, forgot/reset password"
```

---

## Task 11: Affiliate Dashboard Layout + Pages

**Files:**
- Create: `app/[slug]/layout.tsx`
- Create: `app/[slug]/leads/page.tsx`
- Create: `app/[slug]/activity/page.tsx`
- Create: `app/[slug]/calls/page.tsx`

- [ ] **Step 1: Create affiliate layout**

`app/[slug]/layout.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import Link from "next/link";

const S = {
  nav: "#0d1e36", border: "#1e3354", text: "#F7F8FC",
  muted: "#9BACC0", faint: "#4A5E7A", lime: "#C8F135",
};

const AUTH_PATHS = ["/login", "/setup", "/forgot-password", "/reset-password"];

export default function AffiliateLayout({ children }: { children: React.ReactNode }) {
  const { slug } = useParams() as { slug: string };
  const pathname = usePathname();
  const router = useRouter();
  const [name, setName] = useState("");

  const isAuthPage = AUTH_PATHS.some(p => pathname.endsWith(p));

  useEffect(() => {
    if (isAuthPage) return;
    fetch("/api/affiliate/me")
      .then(r => {
        if (!r.ok) { router.push(`/${slug}/login`); return null; }
        return r.json();
      })
      .then(data => { if (data?.name) setName(data.name); });
  }, [slug, isAuthPage, router]);

  if (isAuthPage) return <>{children}</>;

  const NAV = [
    { href: `/${slug}/leads`, label: "Leads" },
    { href: `/${slug}/activity`, label: "Activity" },
    { href: `/${slug}/calls`, label: "Calls" },
  ];

  async function handleLogout() {
    await fetch("/api/affiliate/logout", { method: "POST" });
    router.push(`/${slug}/login`);
  }

  return (
    <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", background: "#0F1E3A", minHeight: "100vh" }}>
      <nav style={{
        background: S.nav, borderBottom: `1px solid ${S.border}`,
        height: 52, display: "flex", alignItems: "center",
        padding: "0 24px", position: "sticky", top: 0, zIndex: 50,
        justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
          <span style={{ color: S.lime, fontWeight: 800, fontSize: 15, letterSpacing: "-0.02em" }}>
            {name ? `${name}'s Dashboard` : "HeyLocal Dashboard"}
          </span>
          <div style={{ display: "flex", gap: 4 }}>
            {NAV.map(({ href, label }) => {
              const active = pathname === href;
              return (
                <Link key={href} href={href} style={{
                  color: active ? S.text : S.muted,
                  fontWeight: active ? 700 : 400,
                  fontSize: 14, padding: "6px 14px", borderRadius: 6,
                  textDecoration: "none", background: active ? "#1a2d4a" : "transparent",
                  borderBottom: active ? `2px solid ${S.lime}` : "2px solid transparent",
                }}>
                  {label}
                </Link>
              );
            })}
          </div>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <Link href={`/${slug}/change-password`} style={{ color: S.muted, fontSize: 13, textDecoration: "none" }}>
            Settings
          </Link>
          <button onClick={handleLogout} style={{
            background: "none", border: `1px solid ${S.border}`, color: S.muted,
            borderRadius: 6, padding: "5px 12px", fontSize: 13, cursor: "pointer",
          }}>
            Sign out
          </button>
        </div>
      </nav>
      <div>{children}</div>
    </div>
  );
}
```

- [ ] **Step 2: Create leads page**

`app/[slug]/leads/page.tsx`:

```tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";

interface Lead {
  id: string;
  email: string;
  first_name: string | null;
  business_type: string | null;
  created_at: string;
}

const S = { text: "#F7F8FC", muted: "#9BACC0", border: "#1e3354", card: "#0d1e36", lime: "#C8F135" };

export default function LeadsPage() {
  const { slug } = useParams() as { slug: string };
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), search });
    const res = await fetch(`/api/affiliate/leads?${params}`);
    if (!res.ok) { setLoading(false); return; }
    const data = await res.json();
    setLeads(data.leads);
    setTotal(data.total);
    setLoading(false);
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  const pageSize = 50;
  const totalPages = Math.ceil(total / pageSize);

  return (
    <div style={{ padding: "32px 24px", maxWidth: 1000, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ color: S.text, fontSize: 22, fontWeight: 800 }}>Your Leads</h1>
        <span style={{ color: S.muted, fontSize: 14 }}>{total} total</span>
      </div>

      <input
        placeholder="Search by email or name…"
        value={search}
        onChange={e => { setSearch(e.target.value); setPage(1); }}
        style={{
          width: "100%", boxSizing: "border-box", marginBottom: 20,
          background: "#0d1e36", border: "1px solid #1e3354", borderRadius: 10,
          color: S.text, padding: "10px 14px", fontSize: 14, outline: "none",
        }}
      />

      {loading ? (
        <p style={{ color: S.muted }}>Loading…</p>
      ) : leads.length === 0 ? (
        <p style={{ color: S.muted }}>No leads yet.</p>
      ) : (
        <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 12, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${S.border}` }}>
                {["Email", "Name", "Business Type", "Date"].map(h => (
                  <th key={h} style={{ color: S.muted, fontWeight: 600, padding: "12px 16px", textAlign: "left" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {leads.map((lead, i) => (
                <tr key={lead.id} style={{ borderBottom: i < leads.length - 1 ? `1px solid ${S.border}` : "none" }}>
                  <td style={{ color: S.text, padding: "12px 16px" }}>{lead.email}</td>
                  <td style={{ color: S.muted, padding: "12px 16px" }}>{lead.first_name ?? "—"}</td>
                  <td style={{ color: S.muted, padding: "12px 16px" }}>{lead.business_type ?? "—"}</td>
                  <td style={{ color: S.muted, padding: "12px 16px" }}>
                    {new Date(lead.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div style={{ display: "flex", gap: 8, marginTop: 20, justifyContent: "center" }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            style={{ background: "#0d1e36", border: "1px solid #1e3354", color: S.muted, borderRadius: 6, padding: "6px 14px", cursor: "pointer" }}>
            Previous
          </button>
          <span style={{ color: S.muted, fontSize: 14, lineHeight: "32px" }}>
            Page {page} of {totalPages}
          </span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            style={{ background: "#0d1e36", border: "1px solid #1e3354", color: S.muted, borderRadius: 6, padding: "6px 14px", cursor: "pointer" }}>
            Next
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create activity page**

`app/[slug]/activity/page.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";

interface ActivityData {
  totalLeads: number;
  leadsThisWeek: number;
  leadsThisMonth: number;
  recentOptIns: Array<{ email: string; first_name: string | null; business_type: string | null; created_at: string }>;
}

const S = { text: "#F7F8FC", muted: "#9BACC0", border: "#1e3354", card: "#0d1e36", lime: "#C8F135" };

export default function ActivityPage() {
  const [data, setData] = useState<ActivityData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/affiliate/activity").then(r => r.json()).then(d => { setData(d); setLoading(false); });
  }, []);

  if (loading) return <div style={{ padding: 32 }}><p style={{ color: S.muted }}>Loading…</p></div>;
  if (!data) return null;

  const stats = [
    { label: "Total Leads", value: data.totalLeads },
    { label: "This Week", value: data.leadsThisWeek },
    { label: "This Month", value: data.leadsThisMonth },
  ];

  return (
    <div style={{ padding: "32px 24px", maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ color: S.text, fontSize: 22, fontWeight: 800, marginBottom: 24 }}>Activity</h1>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 32 }}>
        {stats.map(({ label, value }) => (
          <div key={label} style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 12, padding: 24 }}>
            <p style={{ color: S.lime, fontSize: 36, fontWeight: 800, margin: 0 }}>{value}</p>
            <p style={{ color: S.muted, fontSize: 14, marginTop: 4 }}>{label}</p>
          </div>
        ))}
      </div>

      <h2 style={{ color: S.text, fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Recent Opt-ins</h2>
      {data.recentOptIns.length === 0 ? (
        <p style={{ color: S.muted }}>No opt-ins yet.</p>
      ) : (
        <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 12, overflow: "hidden" }}>
          {data.recentOptIns.map((lead, i) => (
            <div key={i} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "12px 16px", borderBottom: i < data.recentOptIns.length - 1 ? `1px solid ${S.border}` : "none",
            }}>
              <div>
                <p style={{ color: S.text, fontSize: 14, margin: 0 }}>{lead.email}</p>
                {(lead.first_name || lead.business_type) && (
                  <p style={{ color: S.muted, fontSize: 12, margin: "2px 0 0" }}>
                    {[lead.first_name, lead.business_type].filter(Boolean).join(" · ")}
                  </p>
                )}
              </div>
              <p style={{ color: S.muted, fontSize: 12 }}>{new Date(lead.created_at).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Create calls page**

`app/[slug]/calls/page.tsx`:

```tsx
"use client";

import { useEffect, useState, useCallback } from "react";

interface Call {
  id: string;
  email: string;
  first_name: string | null;
  meeting_time: string;
  outcome: string | null;
}

interface CallsData { upcoming: Call[]; past: Call[]; }

const S = { text: "#F7F8FC", muted: "#9BACC0", border: "#1e3354", card: "#0d1e36", lime: "#C8F135" };

const OUTCOME_LABELS: Record<string, string> = {
  attended: "Attended", no_show: "No Show", rescheduled: "Rescheduled", bought: "Bought",
};
const OUTCOME_COLORS: Record<string, string> = {
  attended: "#86efac", no_show: "#fca5a5", rescheduled: "#fde68a", bought: "#C8F135",
};

export default function CallsPage() {
  const [data, setData] = useState<CallsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch("/api/affiliate/calls").then(r => r.json()).then(d => { setData(d); setLoading(false); });
  }, []);

  useEffect(() => { load(); }, [load]);

  async function setOutcome(callId: string, outcome: string) {
    setUpdating(callId);
    await fetch("/api/affiliate/calls", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ callId, outcome }),
    });
    setUpdating(null);
    load();
  }

  if (loading) return <div style={{ padding: 32 }}><p style={{ color: S.muted }}>Loading…</p></div>;
  if (!data) return null;

  function CallRow({ call, showOutcome }: { call: Call; showOutcome: boolean }) {
    return (
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "14px 16px",
      }}>
        <div>
          <p style={{ color: S.text, fontSize: 14, fontWeight: 600, margin: 0 }}>
            {call.first_name ?? call.email}
          </p>
          <p style={{ color: S.muted, fontSize: 12, margin: "2px 0 0" }}>
            {call.email} · {new Date(call.meeting_time).toLocaleString()}
          </p>
        </div>
        {showOutcome && (
          call.outcome ? (
            <span style={{
              background: "#0F1E3A", border: "1px solid #1e3354",
              color: OUTCOME_COLORS[call.outcome] ?? S.muted,
              borderRadius: 6, padding: "4px 10px", fontSize: 12, fontWeight: 600,
            }}>
              {OUTCOME_LABELS[call.outcome] ?? call.outcome}
            </span>
          ) : (
            <select
              disabled={updating === call.id}
              onChange={e => setOutcome(call.id, e.target.value)}
              defaultValue=""
              style={{
                background: "#0F1E3A", border: "1px solid #1e3354", color: S.muted,
                borderRadius: 6, padding: "5px 10px", fontSize: 12, cursor: "pointer",
              }}
            >
              <option value="" disabled>Mark outcome…</option>
              <option value="attended">Attended</option>
              <option value="no_show">No Show</option>
              <option value="rescheduled">Rescheduled</option>
              <option value="bought">Bought</option>
            </select>
          )
        )}
      </div>
    );
  }

  return (
    <div style={{ padding: "32px 24px", maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ color: S.text, fontSize: 22, fontWeight: 800, marginBottom: 24 }}>Calls</h1>

      <h2 style={{ color: S.text, fontSize: 16, fontWeight: 700, marginBottom: 12 }}>
        Upcoming ({data.upcoming.length})
      </h2>
      {data.upcoming.length === 0 ? (
        <p style={{ color: S.muted, marginBottom: 32 }}>No upcoming calls.</p>
      ) : (
        <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 12, marginBottom: 32, overflow: "hidden" }}>
          {data.upcoming.map((call, i) => (
            <div key={call.id} style={{ borderBottom: i < data.upcoming.length - 1 ? `1px solid ${S.border}` : "none" }}>
              <CallRow call={call} showOutcome={false} />
            </div>
          ))}
        </div>
      )}

      <h2 style={{ color: S.text, fontSize: 16, fontWeight: 700, marginBottom: 12 }}>
        Past Calls ({data.past.length})
      </h2>
      {data.past.length === 0 ? (
        <p style={{ color: S.muted }}>No past calls.</p>
      ) : (
        <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 12, overflow: "hidden" }}>
          {data.past.map((call, i) => (
            <div key={call.id} style={{ borderBottom: i < data.past.length - 1 ? `1px solid ${S.border}` : "none" }}>
              <CallRow call={call} showOutcome={true} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Build check**

```bash
npm run build 2>&1 | grep -E "(error TS|Error)" | head -20
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add "app/[slug]/layout.tsx" "app/[slug]/leads/page.tsx" "app/[slug]/activity/page.tsx" "app/[slug]/calls/page.tsx"
git commit -m "feat: affiliate dashboard layout, leads, activity, and calls pages"
```

---

## Task 12: Final Build Check + Deploy

- [ ] **Step 1: Full build**

```bash
cd /Users/mistibruton/Desktop/geo-landing
npm run build 2>&1
```

Fix any remaining TypeScript errors before proceeding.

- [ ] **Step 2: Add NEXT_PUBLIC_LOCAL_HOST env var to Vercel**

```bash
printf 'local.heypearl.io' | /opt/homebrew/bin/vercel env add NEXT_PUBLIC_LOCAL_HOST production
printf 'local.heypearl.io' | /opt/homebrew/bin/vercel env add NEXT_PUBLIC_LOCAL_HOST preview
printf 'local.heypearl.io' | /opt/homebrew/bin/vercel env add NEXT_PUBLIC_LOCAL_HOST development
```

Note: use `printf` not `echo` — echo appends `\n` which breaks the value.

- [ ] **Step 3: Verify local.heypearl.io domain is on Vercel project**

Go to Vercel → geo-landing project → Settings → Domains. Confirm `local.heypearl.io` is listed. If not, add it. It will need a CNAME pointing to `cname.vercel-dns.com`.

- [ ] **Step 4: Deploy**

```bash
cd /Users/mistibruton/Desktop/geo-landing
/opt/homebrew/bin/vercel --prod
```

- [ ] **Step 5: Smoke test**

1. Go to Vercel/Supabase and verify `affiliates` and `geo_local_submissions` tables exist
2. Visit `geo.heypearl.io/admin/affiliates` → Affiliates nav link should appear
3. Create a test affiliate (name: "Test", slug: "test", tag: "test")
4. Copy the invite link, open it in an incognito window
5. Complete the setup wizard
6. Log in at the affiliate login URL
7. Verify the leads page loads (empty is fine)
8. Submit a test lead: `curl -s -X POST https://geo.heypearl.io/api/local-optin -H "Content-Type: application/json" -d '{"firstName":"Test","email":"test@test.com","businessType":"Roofing","funnel":"test"}'`
9. Refresh leads page → lead should appear

---

## Self-Review Notes

**Spec coverage check:**
- ✅ `affiliates` table with all fields from spec
- ✅ `geo_local_submissions` with indexes
- ✅ `/api/local-optin` fix with tag chain validation
- ✅ Invite flow (create → link → setup wizard → login)
- ✅ Returning login (bcrypt compare → session token cookie)
- ✅ Cookie auth helper (`getAffiliateFromRequest`)
- ✅ Change password (invalidates session)
- ✅ Forgot/reset password (Resend email, 1-hour expiry)
- ✅ Headshot upload (Storage) + URL option
- ✅ Leads page (filtered by tag, search, pagination)
- ✅ Activity page (total, week, month, recent 10)
- ✅ Calls page (upcoming + past + outcome marking)
- ✅ God admin create affiliate + invite link display
- ✅ God admin list with lead counts, status, pixel edit, active toggle
- ✅ Regenerate invite link action
- ✅ Admin nav "Affiliates" link
- ✅ Auth pages: login, setup (3-step), forgot-password, reset-password
- ✅ Layout nav: Leads, Activity, Calls, Settings, Sign out

**Type consistency check:**
- `AffiliateSession` defined in `lib/affiliate.ts` — used consistently across all API routes
- `headshotUrl` (camelCase) in API bodies → `headshot_url` (snake_case) in DB — consistent
- `inviteToken` in setup POST body → `invite_token` in DB — consistent
- `sessionToken` stored as `slug:sessionToken` in cookie — parsed consistently in helper
