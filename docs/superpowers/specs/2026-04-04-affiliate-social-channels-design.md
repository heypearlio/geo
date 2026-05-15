# Affiliate Social Channels — Design Spec

**Date:** 2026-04-04  
**Scope:** Affiliate offer only (GEO, V2, Local affiliates). No impact on V2 clients, GEO clients, or Local clients at this time.

---

## Overview

Two completely separate social systems exist in this codebase. They must never be mixed:

| System | Where it appears | Source |
|---|---|---|
| HeyPearl socials | God landing pages (`geo.heypearl.io`, `v2.heypearl.io`, `local.heypearl.io`) | Constants in `lib/social-config.ts` |
| Affiliate socials | Affiliate catalog pages (`/[slug]/` on each offer domain) | `affiliates` DB table |

---

## 1. Data Storage

### Affiliate socials — DB migration

Add 5 nullable `text` columns to the `affiliates` table:

```sql
ALTER TABLE affiliates
  ADD COLUMN instagram_url text,
  ADD COLUMN facebook_url  text,
  ADD COLUMN linkedin_url  text,
  ADD COLUMN tiktok_url    text,
  ADD COLUMN youtube_url   text;
```

All nullable. An affiliate with no socials is valid — nothing renders on their pages.

### HeyPearl socials — config constant

New file `lib/social-config.ts`:

```ts
export const HEYPEARL_SOCIALS = {
  instagram: "https://instagram.com/heypearlio",
  facebook:  "",   // fill in or leave empty to suppress
  linkedin:  "",
  tiktok:    "",
  youtube:   "",
};
```

Only non-empty entries render. This is god's social presence — not pulled from DB.

---

## 2. Affiliate Catalog Pages (`app/[slug]/`)

Each offer's catalog page (`geo.heypearl.io/[slug]`, etc.) already reads the affiliate row from the DB. Social links are added to the affiliate row fetch and rendered as icon links in the page footer (or below the CTA section if footer doesn't exist).

**Rules:**
- Only render icons for populated URLs
- If no socials are set, section is invisible (no empty placeholder row)
- Icons: Instagram, Facebook, LinkedIn, TikTok, YouTube — standard SVG icons

---

## 3. God Landing Pages

God landing pages for each offer (`geo.heypearl.io`, `v2.heypearl.io`, `local.heypearl.io`) import `HEYPEARL_SOCIALS` from `lib/social-config.ts` and render the same icon row in the same footer position.

God pages do NOT read from the affiliates table for socials.

---

## 4. Instantly Cold Emails

The `@instagram` handle is the only social added to Instantly cold emails — placed as a single text line at the bottom of each cold email template.

**Master template (god):** God's Instantly cold emails include HeyPearl's Instagram handle. Affiliates replicate the master, with their handle replacing HeyPearl's.

**Implementation:**
- At upload time (in `/api/admin/instantly/upload` and `/api/affiliate/leads/upload`), extract the Instagram handle from `instagram_url`: strip `https://instagram.com/` or `https://www.instagram.com/` prefix, leaving just the handle.
- For god uploads: inject `sender_instagram` from `HEYPEARL_SOCIALS.instagram`.
- For affiliate uploads: inject `sender_instagram` from the affiliate's `instagram_url`.
- Email templates add: `Follow me on Instagram: @{{sender_instagram}}` — rendered for both god and affiliate sends.

The line is always present in the template. The handle changes based on who is sending.

---

## 5. Resend Email Series

Social icon buttons added to the footer of ALL Resend email templates — god sequences and affiliate sequences.

**Master template (god):** God's email sequences include HeyPearl's social links in the footer. Affiliates replicate the master, with their own links replacing HeyPearl's.

**Which emails:** All sequences — god sequences (warm_nurture, proof, post_call, long_term_nurture, etc.) AND affiliate sequences (affiliate_schedule_abandoned, affiliate_post_booking).

**Design:**
- Row of icon buttons below the main email body, above the unsubscribe line
- Only renders icons for populated URLs
- Each icon links to the sender's URL (god = HeyPearl, affiliate = their own)
- Styled to match the existing email design system (inline styles, email-safe HTML)
- Icons: small inline SVG or image URLs for Instagram, Facebook, LinkedIn, TikTok, YouTube

**Implementation:**
- Add `social_instagram`, `social_facebook`, `social_linkedin`, `social_tiktok`, `social_youtube` to `EmailData`
- When enqueueing for god sends: populate from `HEYPEARL_SOCIALS`
- When enqueueing for affiliate sends: populate from affiliate's DB columns
- Template footer renders the icon row — same template for both, data is different

---

## 6. Affiliate Onboarding

A "Social Channels" step is added to the affiliate onboarding flow.

**Fields:** Instagram URL, Facebook URL, LinkedIn URL, TikTok URL, YouTube URL — all optional.

**Behavior:**
- Step can be skipped entirely
- URLs saved to the new columns on the `affiliates` row
- Validation: must be a valid URL format if provided (no bare handles — full URLs)

---

## 7. Leads Dashboard — Edit Socials

Affiliates can update their social URLs from their leads dashboard (`/[slug]/leads`).

**Implementation:**
- New "Social Channels" section in the account/settings area of the leads page
- Same 5 fields, same optional/skip behavior
- PATCH request to `/api/affiliate/profile` (extend existing profile update endpoint or add new one)
- Saves directly to `affiliates` table

---

## 8. What Is NOT in Scope

- V2 clients, GEO clients, Local clients — no social channels feature at this time
- God admin leads Enroll flow — not affected
- God admin upload page — not affected
- Any email outside the affiliate sequences

---

## Files to Touch

| File | Change |
|---|---|
| `lib/social-config.ts` | New file — HeyPearl social constants |
| Supabase migration | Add 5 columns to `affiliates` table |
| `app/[slug]/page.tsx` (GEO affiliate landing) | Add social icons to footer |
| `app/v2affiliate/[slug]/page.tsx` (V2 affiliate landing) | Add social icons to footer |
| `app/local/[slug]/page.tsx` (Local affiliate landing) | Add social icons to footer |
| God landing pages for each offer | Import `HEYPEARL_SOCIALS`, render icon row |
| Affiliate onboarding flow | Add social channels step |
| `app/[slug]/leads/page.tsx` | Add social channels settings section |
| `app/api/affiliate/profile/route.ts` | Extend to handle social URL updates |
| Affiliate email templates (Resend) | Add social footer to all affiliate sequences |
| `app/api/admin/instantly/upload` + `app/api/affiliate/leads/upload` | Inject `sender_instagram` custom variable |
| `types/email.ts` (or wherever `EmailData` is defined) | Add 5 social URL fields |
