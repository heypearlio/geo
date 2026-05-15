# Affiliate Social Channels Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add social channel support for affiliates — DB storage, setup wizard, leads dashboard settings, landing pages, Instantly cold email injection, and Resend email footer icons.

**Architecture:** Two separate social systems: HeyPearl's own socials (constants in `lib/social-config.ts`) on god pages and all Resend emails; affiliate's personal socials (DB columns) on affiliate landing pages, their Instantly cold emails, and (future) affiliate-specific sequences. A shared `SocialIconRow` component handles landing page rendering. Email footer uses inline-styled HTML.

**Tech Stack:** Next.js App Router, TypeScript, Supabase, Resend (email), Instantly (cold outreach)

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `lib/social-config.ts` | CREATE | `SocialUrls` type + `HEYPEARL_SOCIALS` constants |
| Supabase migration | CREATE | 5 nullable columns on `affiliates` table |
| `lib/emails/base.ts` | MODIFY | Add HeyPearl social text links to `emailWrapper()` footer |
| `lib/affiliate.ts` | MODIFY | Add 5 social fields to `AffiliateSession` + DB select |
| `app/api/affiliate/setup/route.ts` | MODIFY | Accept + save social URLs at onboarding |
| `app/api/affiliate/profile/route.ts` | MODIFY | Accept + save social URL updates |
| `app/api/affiliate/leads/upload/route.ts` | MODIFY | Inject `sender_instagram` from affiliate's `instagram_url` |
| `app/api/admin/instantly/upload/route.ts` | MODIFY | Inject `sender_instagram` from HeyPearl config |
| `app/[slug]/setup/page.tsx` | MODIFY | Add step 4: Social Channels |
| `app/[slug]/leads/page.tsx` | MODIFY | Add Social Channels settings section |
| `app/components/SocialIconRow.tsx` | CREATE | Reusable social icon row for landing pages |
| `app/components/LandingPage.tsx` | MODIFY | Accept `socialUrls` prop, render `SocialIconRow` in footer |
| `app/components/V2Form.tsx` | MODIFY | Accept `socialUrls` prop, render `SocialIconRow` at bottom |
| `app/v2/V2LandingPage.tsx` | MODIFY | Pass `HEYPEARL_SOCIALS` to `V2FormComponent` |
| `app/templates/local-services/config.types.ts` | MODIFY | Add optional `socialUrls` to `LocalServicesFunnelConfig` |
| `app/templates/local-services/LocalLandingPage.tsx` | MODIFY | Render `SocialIconRow` from `config.socialUrls` |
| `app/templates/local-services/configs/heylocal.ts` | MODIFY | Add `HEYPEARL_SOCIALS` to god config |
| `app/[slug]/page.tsx` | MODIFY | Fetch affiliate socials, pass to all three landing components |
| `app/page.tsx` | MODIFY | Pass `HEYPEARL_SOCIALS` to `LandingPage` |

---

## Task 1: Social Config + DB Migration

**Files:**
- Create: `lib/social-config.ts`
- Supabase migration (via MCP)

- [ ] **Step 1: Create `lib/social-config.ts`**

```typescript
// lib/social-config.ts

export interface SocialUrls {
  instagram?: string;
  facebook?: string;
  linkedin?: string;
  tiktok?: string;
  youtube?: string;
}

/** HeyPearl's own social accounts — used on god pages and all Resend emails */
export const HEYPEARL_SOCIALS: SocialUrls = {
  instagram: "https://instagram.com/heypearlio",
  facebook:  "",
  linkedin:  "",
  tiktok:    "",
  youtube:   "",
};

/** Extract @handle from a full Instagram URL. Returns "" if url is empty. */
export function extractInstagramHandle(url: string): string {
  if (!url) return "";
  return url
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, "")
    .replace(/\/$/, "");
}
```

- [ ] **Step 2: Run DB migration — add 5 columns to affiliates**

Via Supabase MCP `apply_migration`:

```sql
ALTER TABLE affiliates
  ADD COLUMN IF NOT EXISTS instagram_url text,
  ADD COLUMN IF NOT EXISTS facebook_url  text,
  ADD COLUMN IF NOT EXISTS linkedin_url  text,
  ADD COLUMN IF NOT EXISTS tiktok_url    text,
  ADD COLUMN IF NOT EXISTS youtube_url   text;
```

- [ ] **Step 3: Verify columns exist**

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'affiliates'
  AND column_name IN ('instagram_url','facebook_url','linkedin_url','tiktok_url','youtube_url');
```

Expected: 5 rows returned, all `text`, `YES` nullable.

- [ ] **Step 4: Commit**

```bash
git add lib/social-config.ts
git commit -m "feat: add SocialUrls type, HEYPEARL_SOCIALS config, and affiliates social columns"
```

---

## Task 2: Resend Email Footer

**Files:**
- Modify: `lib/emails/base.ts`

All Resend sequences go through `emailWrapper()`. Add HeyPearl's social links as text links above the unsubscribe line. Only non-empty URLs render.

- [ ] **Step 1: Update `lib/emails/base.ts`**

Add the import at the top, then add a helper and update the footer in `emailWrapper()`.

At the very top of the file, after the existing constants:

```typescript
import { HEYPEARL_SOCIALS } from "../social-config";
```

Add this helper function before `emailWrapper`:

```typescript
function socialEmailRow(socials: typeof HEYPEARL_SOCIALS): string {
  const links: { label: string; url: string }[] = [
    { label: "Instagram", url: socials.instagram ?? "" },
    { label: "Facebook",  url: socials.facebook  ?? "" },
    { label: "LinkedIn",  url: socials.linkedin  ?? "" },
    { label: "TikTok",    url: socials.tiktok    ?? "" },
    { label: "YouTube",   url: socials.youtube   ?? "" },
  ].filter(l => l.url);

  if (links.length === 0) return "";

  const linkHtml = links
    .map(l => `<a href="${l.url}" style="color:#9BACC0;text-decoration:none;margin:0 8px;font-size:12px;">${l.label}</a>`)
    .join('<span style="color:#C8D8E8;margin:0 2px;">·</span>');

  return `<p style="margin:0 0 10px;">${linkHtml}</p>`;
}
```

In `emailWrapper()`, replace the footer section:

**Before:**
```typescript
  <!-- FOOTER -->
  <tr><td style="padding:24px 48px 40px;border-top:1px solid #EDF0FA;text-align:center;font-size:13px;color:#9BACC0;">
    <p style="margin:0 0 8px;">GEO by HeyPearl &bull; <a href="https://geo.heypearl.io" style="color:#9BACC0;">geo.heypearl.io</a></p>
    <p style="margin:0 0 8px;">${footerText}</p>
    <p style="margin:0;"><a href="https://geo.heypearl.io/unsubscribe?email={{email}}" style="color:#9BACC0;text-decoration:underline;">Unsubscribe</a></p>
  </td></tr>
```

**After:**
```typescript
  <!-- FOOTER -->
  <tr><td style="padding:24px 48px 40px;border-top:1px solid #EDF0FA;text-align:center;font-size:13px;color:#9BACC0;">
    <p style="margin:0 0 8px;">GEO by HeyPearl &bull; <a href="https://geo.heypearl.io" style="color:#9BACC0;">geo.heypearl.io</a></p>
    <p style="margin:0 0 8px;">${footerText}</p>
    ${socialEmailRow(HEYPEARL_SOCIALS)}
    <p style="margin:0;"><a href="https://geo.heypearl.io/unsubscribe?email={{email}}" style="color:#9BACC0;text-decoration:underline;">Unsubscribe</a></p>
  </td></tr>
```

- [ ] **Step 2: Build check**

```bash
cd /Users/mistibruton/Desktop/geo-landing && npm run build 2>&1 | tail -20
```

Expected: no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add lib/emails/base.ts
git commit -m "feat: add HeyPearl social links to Resend email footer"
```

---

## Task 3: Instantly Instagram Injection

**Files:**
- Modify: `app/api/admin/instantly/upload/route.ts`
- Modify: `app/api/affiliate/leads/upload/route.ts`

Both upload routes build `custom_variables` for Instantly leads. Add `sender_instagram` to each.

- [ ] **Step 1: Update admin upload route**

In `app/api/admin/instantly/upload/route.ts`, add import at the top:

```typescript
import { HEYPEARL_SOCIALS, extractInstagramHandle } from "../../../../../lib/social-config";
```

In the `custom_variables` object inside the batch map (around line 91), add after `sender_calendly`:

```typescript
sender_instagram: extractInstagramHandle(HEYPEARL_SOCIALS.instagram ?? ""),
```

Full updated `custom_variables` block:

```typescript
custom_variables: {
  client_slug: "god",
  offer,
  sender_name:      "Misti",
  sender_email:     process.env.ADMIN_SENDER_EMAIL    ?? "misti@heypearl.io",
  sender_phone:     process.env.ADMIN_SENDER_PHONE    ?? "",
  sender_calendly:  process.env.NEXT_PUBLIC_GEO_CALENDLY_URL ?? "",
  sender_instagram: extractInstagramHandle(HEYPEARL_SOCIALS.instagram ?? ""),
  ...(city     ? { city }     : {}),
  ...(address  ? { address }  : {}),
  ...(linkedin ? { linkedIn: linkedin } : {}),
},
```

- [ ] **Step 2: Update affiliate upload route**

In `app/api/affiliate/leads/upload/route.ts`, add import at the top:

```typescript
import { extractInstagramHandle } from "../../../../../lib/social-config";
```

In the `custom_variables` object, add after `sender_calendly`:

```typescript
sender_instagram: extractInstagramHandle(affiliate.instagram_url ?? ""),
```

Full updated `custom_variables` block:

```typescript
custom_variables: {
  client_slug:      affiliate.tag,
  offer:            "affiliate",
  sender_name:      affiliate.name,
  sender_email:     affiliate.email       ?? "",
  sender_phone:     affiliate.phone       ?? "",
  sender_calendly:  affiliate.calendly_url ?? "",
  sender_instagram: extractInstagramHandle(affiliate.instagram_url ?? ""),
  ...(city     ? { city }     : {}),
  ...(address  ? { address }  : {}),
  ...(linkedin ? { linkedIn: linkedin } : {}),
},
```

- [ ] **Step 3: Build check**

```bash
npm run build 2>&1 | tail -20
```

- [ ] **Step 4: Commit**

```bash
git add app/api/admin/instantly/upload/route.ts app/api/affiliate/leads/upload/route.ts
git commit -m "feat: inject sender_instagram into Instantly cold email custom_variables"
```

---

## Task 4: AffiliateSession + Profile API

**Files:**
- Modify: `lib/affiliate.ts`
- Modify: `app/api/affiliate/setup/route.ts`
- Modify: `app/api/affiliate/profile/route.ts`

- [ ] **Step 1: Update `lib/affiliate.ts`**

Add social fields to `AffiliateSession` and expand the DB select:

```typescript
import { NextRequest } from "next/server";
import { supabase } from "./resend";

export interface AffiliateSession {
  id: string;
  slug: string;
  tag: string;
  name: string;
  email: string | null;
  phone: string | null;
  calendly_url: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  linkedin_url: string | null;
  tiktok_url: string | null;
  youtube_url: string | null;
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
    .select("id, slug, tag, name, email, phone, calendly_url, instagram_url, facebook_url, linkedin_url, tiktok_url, youtube_url")
    .eq("slug", slug)
    .eq("session_token", sessionToken)
    .eq("active", true)
    .maybeSingle();

  if (error || !data) return null;
  return data as AffiliateSession;
}
```

- [ ] **Step 2: Update `app/api/affiliate/setup/route.ts`**

Extend the POST body type and the update object to accept social URLs:

```typescript
const body = await req.json() as {
  slug?: string;
  inviteToken?: string;
  password?: string;
  name?: string;
  email?: string;
  phone?: string;
  headshotUrl?: string;
  calendlyUrl?: string;
  instagramUrl?: string;
  facebookUrl?: string;
  linkedinUrl?: string;
  tiktokUrl?: string;
  youtubeUrl?: string;
};

const {
  slug, inviteToken, password, name, email, phone,
  headshotUrl, calendlyUrl,
  instagramUrl, facebookUrl, linkedinUrl, tiktokUrl, youtubeUrl,
} = body;
```

In the `update()` call, add social fields after `calendly_url`:

```typescript
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
    instagram_url: instagramUrl ?? undefined,
    facebook_url:  facebookUrl  ?? undefined,
    linkedin_url:  linkedinUrl  ?? undefined,
    tiktok_url:    tiktokUrl    ?? undefined,
    youtube_url:   youtubeUrl   ?? undefined,
  })
  .eq("id", affiliate.id);
```

- [ ] **Step 3: Update `app/api/affiliate/profile/route.ts`**

Extend the PATCH body type and the `updates` object:

```typescript
const body = await req.json() as {
  calendlyUrl?: string;
  headshotUrl?: string;
  instagramUrl?: string;
  facebookUrl?: string;
  linkedinUrl?: string;
  tiktokUrl?: string;
  youtubeUrl?: string;
};

const updates: Record<string, string> = {};
if (body.calendlyUrl  !== undefined) updates.calendly_url  = body.calendlyUrl;
if (body.headshotUrl  !== undefined) updates.headshot_url  = body.headshotUrl;
if (body.instagramUrl !== undefined) updates.instagram_url = body.instagramUrl;
if (body.facebookUrl  !== undefined) updates.facebook_url  = body.facebookUrl;
if (body.linkedinUrl  !== undefined) updates.linkedin_url  = body.linkedinUrl;
if (body.tiktokUrl    !== undefined) updates.tiktok_url    = body.tiktokUrl;
if (body.youtubeUrl   !== undefined) updates.youtube_url   = body.youtubeUrl;
```

- [ ] **Step 4: Build check**

```bash
npm run build 2>&1 | tail -20
```

- [ ] **Step 5: Commit**

```bash
git add lib/affiliate.ts app/api/affiliate/setup/route.ts app/api/affiliate/profile/route.ts
git commit -m "feat: add social URL fields to AffiliateSession, setup, and profile API"
```

---

## Task 5: Setup Wizard — Social Channels Step

**Files:**
- Modify: `app/[slug]/setup/page.tsx`

Add step 4 (Social Channels) to the existing 3-step wizard. Step 4 is optional — affiliates can skip.

- [ ] **Step 1: Update `app/[slug]/setup/page.tsx`**

Change step count from 3 to 4. Add state for social URLs. Add step 4 UI. Include social fields in the `handleFinish` POST body.

Replace the entire file content:

```typescript
"use client";

import { useState, useEffect, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";

const SOCIAL_PLATFORMS = [
  { key: "instagramUrl", label: "Instagram", placeholder: "https://instagram.com/yourhandle" },
  { key: "facebookUrl",  label: "Facebook",  placeholder: "https://facebook.com/yourpage" },
  { key: "linkedinUrl",  label: "LinkedIn",  placeholder: "https://linkedin.com/in/yourprofile" },
  { key: "tiktokUrl",    label: "TikTok",    placeholder: "https://tiktok.com/@yourhandle" },
  { key: "youtubeUrl",   label: "YouTube",   placeholder: "https://youtube.com/@yourchannel" },
] as const;

type SocialKey = typeof SOCIAL_PLATFORMS[number]["key"];

function SetupWizard() {
  const { slug } = useParams() as { slug: string };
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") ?? "";

  const [step, setStep] = useState(1);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [headshotUrl, setHeadshotUrl] = useState("");
  const [headshotTab, setHeadshotTab] = useState<"upload" | "url">("upload");
  const [calendlyUrl, setCalendlyUrl] = useState("");
  const [socials, setSocials] = useState<Record<SocialKey, string>>({
    instagramUrl: "", facebookUrl: "", linkedinUrl: "", tiktokUrl: "", youtubeUrl: "",
  });

  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const STEP_LABELS = ["Set your password", "Your profile", "Your booking link", "Social channels"];

  useEffect(() => {
    if (!token) { setTokenValid(false); return; }
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
        instagramUrl: socials.instagramUrl || undefined,
        facebookUrl:  socials.facebookUrl  || undefined,
        linkedinUrl:  socials.linkedinUrl  || undefined,
        tiktokUrl:    socials.tiktokUrl    || undefined,
        youtubeUrl:   socials.youtubeUrl   || undefined,
      }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) { setError(data.error ?? "Setup failed"); return; }
    router.push(`/${slug}/leads`);
  }

  if (tokenValid === null) {
    return <div style={centeredStyle}><p style={{ color: "#9BACC0" }}>Validating invite link&hellip;</p></div>;
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
          <span style={{ color: "#C8F135", fontWeight: 800, fontSize: 18 }}>HeyPearl</span>
          <p style={{ color: "#9BACC0", fontSize: 13, marginTop: 4 }}>
            Step {step} of 4 &mdash; {STEP_LABELS[step - 1]}
          </p>
          <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 12 }}>
            {[1, 2, 3, 4].map(s => (
              <div key={s} style={{
                height: 4, width: 48, borderRadius: 2,
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
                  {uploading && <p style={{ color: "#9BACC0", fontSize: 12, marginTop: 4 }}>Uploading&hellip;</p>}
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
                https://geo.heypearl.io/{slug}
              </p>
            </div>
            {error && <p style={{ color: "#f87171", fontSize: 13, marginTop: 6 }}>{error}</p>}
            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button onClick={() => setStep(2)} style={{ ...btnStyle, background: "#1e3354", color: "#9BACC0", flex: "0 0 auto", width: 80 }}>Back</button>
              <button onClick={() => { setError(""); setStep(4); }} style={btnStyle}>Next</button>
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <p style={{ color: "#9BACC0", fontSize: 13, marginBottom: 16 }}>
              Add your social channels so they appear on your landing pages and emails. All optional — you can add or update these later from your dashboard.
            </p>
            {SOCIAL_PLATFORMS.map(({ key, label, placeholder }) => (
              <input
                key={key}
                placeholder={`${label} — ${placeholder}`}
                value={socials[key]}
                onChange={e => setSocials(prev => ({ ...prev, [key]: e.target.value }))}
                style={{ ...inputStyle, marginTop: 10 }}
              />
            ))}
            {error && <p style={{ color: "#f87171", fontSize: 13, marginTop: 6 }}>{error}</p>}
            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button onClick={() => setStep(3)} style={{ ...btnStyle, background: "#1e3354", color: "#9BACC0", flex: "0 0 auto", width: 80 }}>Back</button>
              <button onClick={handleFinish} disabled={submitting} style={{ ...btnStyle, opacity: submitting ? 0.7 : 1 }}>
                {submitting ? "Setting up\u2026" : "Complete Setup"}
              </button>
            </div>
            <button onClick={handleFinish} disabled={submitting} style={{
              width: "100%", marginTop: 8, background: "transparent", border: "none",
              color: "#9BACC0", fontSize: 13, cursor: "pointer", textDecoration: "underline",
            }}>
              Skip for now
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function SetupPage() {
  return (
    <Suspense fallback={<div style={centeredStyle}><p style={{ color: "#9BACC0" }}>Loading&hellip;</p></div>}>
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

- [ ] **Step 2: Build check**

```bash
npm run build 2>&1 | tail -20
```

- [ ] **Step 3: Commit**

```bash
git add app/[slug]/setup/page.tsx
git commit -m "feat: add social channels step to affiliate setup wizard"
```

---

## Task 6: Leads Dashboard — Social Channels Settings

**Files:**
- Modify: `app/[slug]/leads/page.tsx`

Add a collapsible "Social Channels" section near the top of the leads page (or in an account/settings area). The section shows the 5 fields, pre-populated from the current session, saved via PATCH to `/api/affiliate/profile`.

- [ ] **Step 1: Add social state + save function to `app/[slug]/leads/page.tsx`**

At the top of the component, add these state variables after the existing state declarations:

```typescript
// Social channels
const [showSocials, setShowSocials] = useState(false);
const [socials, setSocials] = useState({
  instagramUrl: "", facebookUrl: "", linkedinUrl: "", tiktokUrl: "", youtubeUrl: "",
});
const [socialsLoading, setSocialsLoading] = useState(false);
const [socialsSaved, setSocialsSaved] = useState(false);
```

The leads page does NOT currently call `/api/affiliate/me`. Add a new `useEffect` to load the affiliate's current social URLs on mount:

```typescript
useEffect(() => {
  fetch("/api/affiliate/me")
    .then(r => r.ok ? r.json() : null)
    .then(data => {
      if (!data) return;
      setSocials({
        instagramUrl: data.instagramUrl ?? "",
        facebookUrl:  data.facebookUrl  ?? "",
        linkedinUrl:  data.linkedinUrl  ?? "",
        tiktokUrl:    data.tiktokUrl    ?? "",
        youtubeUrl:   data.youtubeUrl   ?? "",
      });
    });
}, []);
```

Add this save function:

```typescript
async function saveSocials() {
  setSocialsLoading(true);
  setSocialsSaved(false);
  await fetch("/api/affiliate/profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(socials),
  });
  setSocialsLoading(false);
  setSocialsSaved(true);
  setTimeout(() => setSocialsSaved(false), 3000);
}
```

- [ ] **Step 2: Add Social Channels UI section**

Add this section to the JSX, just below the existing page header (or wherever the account settings area is). Place it as a collapsible card:

```tsx
{/* Social Channels */}
<div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 12, marginBottom: 16 }}>
  <button
    onClick={() => setShowSocials(v => !v)}
    style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", background: "none", border: "none", cursor: "pointer" }}
  >
    <span style={{ color: S.text, fontWeight: 700, fontSize: 14 }}>Social Channels</span>
    <span style={{ color: S.muted, fontSize: 12 }}>{showSocials ? "▲" : "▼"}</span>
  </button>
  {showSocials && (
    <div style={{ padding: "0 20px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
      {([
        { key: "instagramUrl", label: "Instagram URL" },
        { key: "facebookUrl",  label: "Facebook URL"  },
        { key: "linkedinUrl",  label: "LinkedIn URL"  },
        { key: "tiktokUrl",    label: "TikTok URL"    },
        { key: "youtubeUrl",   label: "YouTube URL"   },
      ] as const).map(({ key, label }) => (
        <input
          key={key}
          placeholder={label}
          value={socials[key]}
          onChange={e => setSocials(prev => ({ ...prev, [key]: e.target.value }))}
          style={{ ...inputStyle, fontSize: 13 }}
        />
      ))}
      <button
        onClick={saveSocials}
        disabled={socialsLoading}
        style={{ background: S.pink, color: "#fff", border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer", marginTop: 4, opacity: socialsLoading ? 0.6 : 1 }}
      >
        {socialsLoading ? "Saving…" : socialsSaved ? "Saved" : "Save Social Channels"}
      </button>
    </div>
  )}
</div>
```

- [ ] **Step 3: Update `/api/affiliate/me` to return social fields**

Replace the entire contents of `app/api/affiliate/me/route.ts`. The current route selects `offers, calendly_url, linkjolt_url` and builds a response object. Add the 5 social columns to the select AND add them to the response object. The response uses camelCase keys — the leads page reads `data.instagramUrl`, not `data.instagram_url`.

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getAffiliateFromRequest } from "../../../../lib/affiliate";
import { supabase } from "../../../../lib/resend";

export async function GET(req: NextRequest) {
  const affiliate = await getAffiliateFromRequest(req);
  if (!affiliate) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data } = await supabase
    .from("affiliates")
    .select("offers, calendly_url, linkjolt_url, instagram_url, facebook_url, linkedin_url, tiktok_url, youtube_url")
    .eq("id", affiliate.id)
    .maybeSingle();

  return NextResponse.json({
    slug:         affiliate.slug,
    name:         affiliate.name,
    tag:          affiliate.tag,
    offers:       data?.offers        ?? [],
    calendlyUrl:  data?.calendly_url  ?? null,
    linkjoltUrl:  data?.linkjolt_url  ?? null,
    instagramUrl: data?.instagram_url ?? null,
    facebookUrl:  data?.facebook_url  ?? null,
    linkedinUrl:  data?.linkedin_url  ?? null,
    tiktokUrl:    data?.tiktok_url    ?? null,
    youtubeUrl:   data?.youtube_url   ?? null,
  });
}
```

- [ ] **Step 4: Build check**

```bash
npm run build 2>&1 | tail -20
```

- [ ] **Step 5: Commit**

```bash
git add app/[slug]/leads/page.tsx app/api/affiliate/me/route.ts
git commit -m "feat: add social channels settings section to affiliate leads dashboard"
```

---

## Task 7: Landing Page Social Icons

**Files:**
- Create: `app/components/SocialIconRow.tsx`
- Modify: `app/components/LandingPage.tsx`
- Modify: `app/components/V2Form.tsx`
- Modify: `app/v2/V2LandingPage.tsx`
- Modify: `app/templates/local-services/config.types.ts`
- Modify: `app/templates/local-services/LocalLandingPage.tsx`
- Modify: `app/templates/local-services/configs/heylocal.ts`
- Modify: `app/[slug]/page.tsx`
- Modify: `app/page.tsx`

- [ ] **Step 1: Create `app/components/SocialIconRow.tsx`**

```typescript
import type { SocialUrls } from "@/lib/social-config";

const PLATFORMS = [
  {
    key: "instagram" as const,
    label: "Instagram",
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>`,
  },
  {
    key: "facebook" as const,
    label: "Facebook",
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>`,
  },
  {
    key: "linkedin" as const,
    label: "LinkedIn",
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>`,
  },
  {
    key: "tiktok" as const,
    label: "TikTok",
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>`,
  },
  {
    key: "youtube" as const,
    label: "YouTube",
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>`,
  },
];

export default function SocialIconRow({ urls, className }: { urls: SocialUrls; className?: string }) {
  const active = PLATFORMS.filter(p => urls[p.key]);
  if (active.length === 0) return null;

  return (
    <div className={`flex items-center gap-4 ${className ?? ""}`}>
      {active.map(p => (
        <a
          key={p.key}
          href={urls[p.key]}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={p.label}
          className="text-[#9BACC0] hover:text-[#6B7FA0] transition-colors"
          dangerouslySetInnerHTML={{ __html: p.icon }}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Add `socialUrls` to `LandingPage`**

In `app/components/LandingPage.tsx`, find the `AffiliateOverrides` interface (around line 264) and add:

```typescript
interface AffiliateOverrides {
  funnelTag?: string;
  scheduleRoute?: string;
  socialUrls?: SocialUrls;
}
```

Add the import at the top of the file:

```typescript
import type { SocialUrls } from "@/lib/social-config";
import SocialIconRow from "./SocialIconRow";
```

In the `LandingPage` function signature, destructure `socialUrls` from `overrides`:

```typescript
export default function LandingPage({ overrides }: { overrides?: AffiliateOverrides }) {
  // existing code...
  const socialUrls = overrides?.socialUrls;
```

In the footer section (after the Privacy Policy / Free AI Score links row), add the social icons:

```tsx
{/* FOOTER — social icons */}
{socialUrls && (
  <div className="mt-4 flex justify-center">
    <SocialIconRow urls={socialUrls} />
  </div>
)}
```

Place this just before the `<FomoPopup />` line.

- [ ] **Step 3: Add `socialUrls` to `V2Form`**

In `app/components/V2Form.tsx`, add the import at the top:

```typescript
import type { SocialUrls } from "@/lib/social-config";
import SocialIconRow from "./SocialIconRow";
```

Add `socialUrls` to the props:

```typescript
export default function V2Form({
  scheduleRoute,
  affiliateTag,
  socialUrls,
}: {
  scheduleRoute?: string;
  affiliateTag?: string;
  socialUrls?: SocialUrls;
}) {
```

Find the bottom of the V2Form return JSX. Add the social icons just before the closing `</main>` or outermost closing tag:

```tsx
{socialUrls && (
  <div className="flex justify-center py-6 border-t border-gray-100">
    <SocialIconRow urls={socialUrls} />
  </div>
)}
```

- [ ] **Step 4: Update `V2LandingPage` to pass `HEYPEARL_SOCIALS`**

In `app/v2/V2LandingPage.tsx`, add the import:

```typescript
import { HEYPEARL_SOCIALS } from "@/lib/social-config";
```

Find where `V2FormComponent` is rendered and add the `socialUrls` prop:

```tsx
<V2FormComponent
  scheduleRoute="/schedule"
  socialUrls={HEYPEARL_SOCIALS}
/>
```

- [ ] **Step 5: Add `socialUrls` to `LocalServicesFunnelConfig`**

In `app/templates/local-services/config.types.ts`, add after the `vapiAssistantId` field:

```typescript
// ── Social Channels ────────────────────────────────────────────────────────────
socialUrls?: SocialUrls;
```

Add the import at the top:

```typescript
import type { SocialUrls } from "@/lib/social-config";
```

- [ ] **Step 6: Add HeyPearl socials to `heylocal.ts`**

In `app/templates/local-services/configs/heylocal.ts`, add the import:

```typescript
import { HEYPEARL_SOCIALS } from "@/lib/social-config";
```

Add `socialUrls: HEYPEARL_SOCIALS` to the config object.

- [ ] **Step 7: Render social icons in `LocalLandingPage`**

In `app/templates/local-services/LocalLandingPage.tsx`, add the import:

```typescript
import SocialIconRow from "@/app/components/SocialIconRow";
```

Find the footer section of the template. Add the social icons row:

```tsx
{config.socialUrls && (
  <div className="flex justify-center mt-4">
    <SocialIconRow urls={config.socialUrls} />
  </div>
)}
```

Place this in or just below the footer section.

- [ ] **Step 8: Update `app/[slug]/page.tsx` to fetch and pass affiliate socials**

Expand the DB select to include social columns:

```typescript
const { data: affiliate } = await supabase
  .from("affiliates")
  .select("id, name, slug, tag, calendly_url, headshot_url, offers, active, meta_pixel_id, instagram_url, facebook_url, linkedin_url, tiktok_url, youtube_url")
  .eq("slug", slug)
  .single();
```

After the existing affiliate checks, build the social URLs object:

```typescript
const affiliateSocials = {
  instagram: affiliate.instagram_url ?? undefined,
  facebook:  affiliate.facebook_url  ?? undefined,
  linkedin:  affiliate.linkedin_url  ?? undefined,
  tiktok:    affiliate.tiktok_url    ?? undefined,
  youtube:   affiliate.youtube_url   ?? undefined,
};
```

For the **Local** branch, add `socialUrls` to the config override:

```typescript
const affiliateConfig: LocalServicesFunnelConfig = {
  ...heylocal,
  funnelTag: affiliate.tag,
  // ... existing overrides ...
  socialUrls: affiliateSocials,
};
```

For the **GEO** branch:

```tsx
return (
  <Suspense>
    <LandingPage
      overrides={{
        funnelTag: affiliate.tag,
        scheduleRoute: `/${slug}/schedule`,
        socialUrls: affiliateSocials,
      }}
    />
  </Suspense>
);
```

For the **V2** branch:

```tsx
return (
  <Suspense>
    <V2FormComponent
      scheduleRoute={`/${slug}/schedule`}
      affiliateTag={affiliate.tag}
      socialUrls={affiliateSocials}
    />
  </Suspense>
);
```

- [ ] **Step 9: Update `app/page.tsx` (god GEO page) to pass HeyPearl socials**

In `app/page.tsx`, add the import:

```typescript
import { HEYPEARL_SOCIALS } from "@/lib/social-config";
```

Update the `LandingPage` render:

```tsx
<LandingPage overrides={{ socialUrls: HEYPEARL_SOCIALS }} />
```

- [ ] **Step 10: Build check**

```bash
npm run build 2>&1 | tail -30
```

Fix any TypeScript errors before continuing.

- [ ] **Step 11: Commit**

```bash
git add app/components/SocialIconRow.tsx app/components/LandingPage.tsx app/components/V2Form.tsx app/v2/V2LandingPage.tsx app/templates/local-services/config.types.ts app/templates/local-services/LocalLandingPage.tsx app/templates/local-services/configs/heylocal.ts app/[slug]/page.tsx app/page.tsx
git commit -m "feat: add social icon rows to affiliate and god landing pages"
```

---

## Task 8: Deploy

- [ ] **Step 1: Final build check**

```bash
npm run build 2>&1 | tail -20
```

Must be clean before deploying.

- [ ] **Step 2: Deploy to production**

```bash
/opt/homebrew/bin/vercel --prod
```

- [ ] **Step 3: Smoke check**

- Visit `geo.heypearl.io` — social icons appear in footer (Instagram link, since others are empty)
- Visit `geo.heypearl.io/[any-affiliate-slug]` — affiliate social icons appear only if that affiliate has URLs set
- Check an outgoing Resend email HTML — social row appears above unsubscribe link
- Visit `geo.heypearl.io/[slug]/setup?token=...` — wizard shows 4 steps, step 4 is social channels
- Visit `geo.heypearl.io/[slug]/leads` — Social Channels section is collapsible, saves correctly

- [ ] **Step 4: Commit any final fixes**

```bash
git add -A && git commit -m "fix: post-deploy corrections for affiliate social channels"
```
