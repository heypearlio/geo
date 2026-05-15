# Cash Offer Seller Funnel — Design Spec
**Date:** 2026-04-01  
**Status:** Approved

---

## Overview

A god-template seller lead capture funnel for V2 clients. Sellers enter their home address, land on a Calendly booking page, and schedule a 15-minute offer call. No agent branding. Nationwide cash offer angle. Each V2 client gets their own custom domain — heypearl.io URLs never appear to sellers.

**God demo:** `geo.heypearl.io/cashoffer/demo`  
**Client URLs:** `[clientdomain.com]` → CNAME → Vercel → `/cashoffer/[slug]`

---

## Architecture

### Routes
```
/cashoffer/[slug]             — landing page (address form)
/cashoffer/[slug]/schedule    — Calendly booking page (prefilled with address)
```

### Template Files
```
app/templates/cashoffer/
  config.types.ts              — TypeScript types for all config fields
  CashOfferLandingPage.tsx     — full multi-section landing page
  CashOfferSchedulePage.tsx    — Calendly booking page
  configs/
    demo.ts                    — HeyPearl god demo config
  README.md                    — steps to spin up a new V2 client
```

Route pages (`app/cashoffer/[slug]/page.tsx` and `.../schedule/page.tsx`) are thin 4-line wrappers that import template + config by slug.

### Database
New table: `cashoffer_leads`
```sql
id          uuid primary key
address     text
email       text
phone       text
name        text
slug        text           -- maps to client config funnelTag
created_at  timestamptz default now()
```

Address captured on landing form submit. Name/email/phone captured post-Calendly (future webhook — not V1 scope).

### Email Sequences
None on V1 launch. Address-only submit has no email to sequence to. Post-Calendly confirmation sequence can be added in a follow-on session.

---

## Landing Page Sections

### 1. Nav
Logo (from `logoUrl`) or brand name text. No links — nowhere to go but down.

### 2. Hero
- **Headline:** "Get a Cash Offer on Your Home — in 24 Hours."
- **Subheadline:** "No repairs. No agent fees. No open houses. Close in as few as 7 days."
- **Form:** Single address field + "Get My Cash Offer" CTA button
- **Micro-copy:** "No obligation. Free. Takes 30 seconds."

### 3. Trust Strip
4 stat badges:
- Homes purchased (config-driven)
- Avg days to close
- States active
- "No obligation, ever"

### 4. How It Works
3 steps:
1. Enter your address (30 seconds)
2. Receive your cash offer (within 24 hours)
3. Close on your timeline (as fast as 7 days)

### 5. Why Cash (Pain Section)
Headline: "Why more homeowners are skipping the traditional process"

Pain cards (agent listing vs. cash offer):
- Agent commissions (5–6%)
- Months on market
- Repair demands from buyers
- Deals falling through on financing
- Endless showings and open houses

### 6. Testimonials — Round 1 (3 cards)
Situations: relocation, inherited home, divorce. Name, city, situation tag, quote.

### 7. What You Get
Checklist section:
- No repairs or cleaning required
- No agent fees or commissions
- No showings or open houses
- You choose the closing date
- Cash wired at close

### 8. Testimonials — Round 2 (3 more cards)
Situations: downsizing, repairs too costly, needed fast close. Different visual treatment (dark section) for variety.

### 9. FAQ
- Is the offer a fair price?
- What types of homes do you buy?
- What if I owe more than the home is worth?
- How fast can you actually close?
- Is there any obligation after I submit?

### 10. Bottom CTA
Repeat address form. Headline: "Still thinking? Get your number. There's no obligation."

### 11. Footer
Copyright. No nav links.

### FOMO Popup
Same pattern as HeyLocal — rotating entries showing "[Name] from [City] just requested a cash offer."

---

## Schedule Page

After address submit → redirect to `/cashoffer/[slug]/schedule?address=[encoded]`

- **Header:** "Great news — we have buyers active in your area."
- **Sub:** "Book a free 15-minute call. We'll walk through your offer details and answer any questions."
- Calendly inline embed (same navy card + header bar treatment as HeyLocal schedule page)
- Address displayed back to seller ("Your property: [address]") for confirmation
- What happens on the call: 3 bullet points (review property details, walk through offer, set a closing date if you accept)
- No obligation reminder throughout

---

## Config Fields

```ts
interface CashOfferFunnelConfig {
  // Brand
  brandName: string
  logoUrl?: string

  // Colors
  colorPrimary: string        // CTA buttons, checkmarks, accent icons
  colorNavy: string           // dark section backgrounds, nav
  colorLight: string          // alternating light sections
  colorBg: string             // page/input background
  colorButton?: string        // CTA on light sections (defaults to colorPrimary)

  // Routing
  slug: string
  calendlyUrl: string
  funnelTag: string           // stored in cashoffer_leads.slug
  apiOptinRoute: string       // e.g. "/api/cashoffer-optin"

  // Trust stats (overridable)
  trustStats: { stat: string; label: string }[]

  // Testimonials (2 rounds of 3)
  testimonials: {
    name: string
    location: string
    situation: string         // tag: "Relocation" | "Inherited Home" | "Divorce" etc.
    quote: string
  }[]

  // FAQ
  faqs: { q: string; a: string }[]

  // FOMO
  fomoEntries: { name: string; city: string }[]
  fomoPopupLabel: string      // e.g. "just requested a cash offer"

  // Schedule page
  scheduleHeadline: string
  scheduleSubheadline: string
  scheduleCallItems: { title: string; desc: string }[]

  // Meta
  metaPixelId?: string
}
```

---

## Demo Config (`configs/demo.ts`)

Colors: navy `#0F1E3A`, primary `#10B981` (emerald green — neutral, not lime/brand-specific), light `#F0FDF4`, bg `#F8FAFC`.  
Calendly: `https://calendly.com/hey-pearl/meet`  
Brand: "Cash Offers USA" (generic nationwide name for the god demo)

---

## API Route

`/api/cashoffer-optin` — writes address + slug to `cashoffer_leads`. No email sent (no email collected at this step). Returns `{ ok: true }` on success.

---

## Custom Domain Deployment (Per V2 Client)

1. Copy `configs/demo.ts` → `configs/[clientslug].ts`, update all fields
2. Create route wrappers: `app/cashoffer/[slug]/page.tsx` (already dynamic — no new folder needed per client)
3. Client adds CNAME `[theirdomain.com]` → `cname.vercel-dns.com`
4. Add domain in Vercel dashboard → assign to `geo-landing` project
5. `vercel --prod`

**Hard rule: No V2 client goes live without a verified custom domain. heypearl.io must never be exposed to sellers.**

---

## Out of Scope (V1)

- Post-Calendly email sequences (add in follow-on)
- Admin dashboard view for cashoffer_leads (add when leads volume warrants)
- Offer calculation or CRM integration
- SMS follow-up
