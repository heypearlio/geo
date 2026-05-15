# Affiliate Business Card — Design Spec
Date: 2026-04-02

## Overview

Each affiliate gets a mobile-optimized digital business card at `[slug].heypearl.io` (e.g., `todd.heypearl.io`). It functions like a Blinq/Linktree card — a single page they share with clients showing their contact info, offer links, and calendar. No sales pitch, no detail. All content pulled live from the `affiliates` table.

---

## Design

**Style:** Dark/navy card (Layout C). Full navy background, white text, yellow (#F5C842) for the primary CTA only.

**Color palette:**
- Background: `#0F1E3A` (navy)
- Text: white / `#6B8BAD` (muted)
- CTA button: `#F5C842` (yellow) with `#0F1E3A` text
- Offer buttons: `rgba(255,255,255,0.07)` ghost with `rgba(255,255,255,0.10)` border

**Layout (top to bottom):**
1. HeyPearl white logo — small, centered, subtle pill container at top
2. Affiliate photo — 100px circle, yellow border, centered
3. Affiliate name — large, white, bold
4. Phone + email — muted, inline row, tappable (`tel:` / `mailto:`)
5. "Book a Call" — yellow CTA button, full width
6. Offer sections — grouped by audience:
   - "For Real Estate Agents" header (only if affiliate has geo or v2) → AI Visibility Score and/or Cash Offer System ghost buttons
   - "For Local Businesses" header (only if affiliate has local) → Local Business Growth ghost button
   - Each button: label left, chevron right, links to affiliate landing page
8. Footer — thin divider, white logo, italic tagline: "AI-powered growth for local businesses."

**Conditional rendering (all fields hidden if blank):**
- Photo: hidden if `headshot_url` is null
- Phone row: hidden if `phone` is null
- Email: hidden if `email` is null
- Book a Call button: hidden if `calendly_url` is null
- Offers section: renders only offers present in `affiliates.offers` array

---

## Data Source

All content from the `affiliates` table by slug:

| Field | Card element |
|---|---|
| `name` | Display name |
| `headshot_url` | Circle photo |
| `phone` | `tel:` link |
| `email` | `mailto:` link |
| `calendly_url` | "Book a Call" button href |
| `offers` | Which offer buttons to show |
| `meta_pixel_id` | Meta pixel script (invisible) |
| `active` | If false → 404 |

**Offer button mapping:**
| Offer key | Button label | Section header | URL |
|---|---|---|---|
| `geo` | AI Visibility Score | For Real Estate Agents | `https://geo.heypearl.io/[slug]` |
| `v2` | Cash Offer System | For Real Estate Agents | `https://v2.heypearl.io/v2/[slug]` |
| `local` | Local Business Growth | For Local Businesses | `https://local.heypearl.io/[slug]` |

**Section grouping logic:**
- Offers are grouped under audience headers: "For Real Estate Agents" (geo, v2) and "For Local Businesses" (local)
- A section header only appears if the affiliate has at least one offer in that group
- If an affiliate only has real estate offers, the local section never renders (and vice versa)
- Order: real estate section first, local section second

---

## Routing

**DNS (GoDaddy — one-time setup):**
- CNAME: `*` → `cname.vercel-dns.com`
- TXT: `_vercel` → Vercel-provided verification value (generated when `*.heypearl.io` is added to the Vercel project)

**Vercel:** Add `*.heypearl.io` as a domain on the geo-landing project.

**Middleware (`middleware.ts`):**
- Add a wildcard catch block after all existing subdomain checks
- Known subdomains to skip: `geo`, `v2`, `local`, `affiliate`, `www`
- Any other `*.heypearl.io` hostname → extract slug from subdomain → rewrite to `/card/[slug]`
- API, `_next`, and static assets pass through unchanged

---

## Files

### New
- `app/card/[slug]/page.tsx` — server component, DB lookup by slug, renders card, 404 if not found or inactive
- `public/heypearl-logo-white.png` — copied from `/Users/mistibruton/Desktop/Desktop/heypearl.io_logo.png`

### Modified
- `middleware.ts` — add wildcard catch block (existing routing blocks untouched)
- `app/admin/affiliates/page.tsx` — update `funnelUrls()` to include `[slug].heypearl.io`, show card URL in invite result panel, fix V2 URL (`v2.heypearl.io/v2/[slug]` not `geo.heypearl.io/v2/[slug]`)

### Not touched
- CLAUDE.md and all `.claude/rules/` files
- All existing offer pages, auth systems, email system, admin pages beyond affiliates
- Existing middleware routing blocks

---

## Admin Integration

The offer toggle buttons (`geo`, `v2`, `local`) already exist in the admin affiliates table. Toggling them updates `affiliates.offers` in the DB. The card reads this at render time — no additional wiring needed.

When a new affiliate is created, the invite result panel will display:
- Existing: invite link, funnel URLs
- New: card URL (`[slug].heypearl.io`) with copy button

---

## Logo

`/Users/mistibruton/Desktop/Desktop/heypearl.io_logo.png` copied to `public/heypearl-logo-white.png`. Used as a standard `<img>` tag in the card (not Next.js `<Image>` — no external fetch risk in edge-adjacent rendering). Appears twice: top of card and footer.

---

## Meta Pixel

If `affiliates.meta_pixel_id` is set, inject the standard Meta pixel `<script>` block in the page `<head>` using Next.js metadata or a client component script. Invisible to the user.

---

## What Is Not Changing

- CLAUDE.md and all rule files
- Existing subdomain routing (`geo.*`, `v2.*`, `local.*`, `affiliate.*`)
- Affiliate dashboard, auth, leads, sequences
- GEO, V2, Local, Cashoffer offer pages
- Email system, cron, sequences
- Admin pages other than the affiliates list panel
