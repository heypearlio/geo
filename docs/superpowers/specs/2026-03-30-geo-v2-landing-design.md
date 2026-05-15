# GEO V2 Landing Page — Design Spec
**Date:** 2026-03-30
**Route:** `geo.heypearl.io/v2`
**Status:** Approved

---

## Overview

GEO V2 is a standalone product — done-for-you seller appointment setting. It is not a buyer lead gen offer and not an extension of GEO V1 (AI visibility). Every word on this page is about listing appointments and ready-to-list sellers.

The page is a new entry point into the existing funnel. It mirrors the structure and design system of the main landing page (`/`) but carries entirely different copy, proof, and positioning.

**Funnel:**
`/v2` → `/schedule?source=v2&firstName=...&lastName=...&email=...&city=...`

No `/claim` step. V2 goes directly to `/schedule`.

---

## Audience

- Existing GEO V1 clients (offered at a discount — handled on the strategy call, not on this page)
- Cold/warm social traffic arriving from comment funnels (Instagram, TikTok)
- Agents, team leaders, brokers who want listing appointments without cold calling

This is warm-ish social traffic. They've already seen the content. The page confirms the promise and captures the opt-in.

---

## Design System

Identical to the main landing page:
- Colors: `#0F1E3A` (navy), `#EDF0FA` (light purple), `#E8185C` (pink/red CTA), white
- Fonts, spacing, border radius, shadow patterns — unchanged
- Reuse: `CTA_BTN`, `STICKY_BTN`, `inputClass` constants
- Reuse: FOMO popup mechanic (market inquiry popups)
- Reuse: `/schedule` destination and URL param pattern

---

## Page Sections

### 1. Hero — Navy

**Badge:** `Only 1 Listing Market Per City · Ever` (pulsing pink dot)

**Headline:**
> "The Appointment-Setting Machine That Fills Your Calendar With Ready-To-List Sellers."

**Subhead:**
> While you're showing homes and closing deals, we're building your pipeline. You do what you do best. We handle the rest.

**Stats (4 cards, white on navy):**
- `Done For You` / We run it. You close.
- `Zero Cold Calls` / Not one. Ever.
- `Seller Side Only` / Listing appointments. Not buyers.
- `1 Spot` / Per market · ever

**CTA button:** `Find Out If My Market Is Available →`
**Micro-copy below button:** `Free. No credit card. 30 seconds.`

**Proof image below stats:** A screenshot or text message showing a seller booking / listing appointment confirmation (equivalent of V1's "day 34" ChatGPT screenshot — swap for a seller appointment proof image when available).

---

### 2. The Problem — Light Purple

**Label:** `The Old Way`

**Headline:**
> Your Competitors Are Working Harder. You're About to Work Smarter.

**Two-column contrast:**

| Old Way (✕) | New Way (✓) |
|---|---|
| Cold call expired listings and get hung up on | Wake up to a listing appointment already on your calendar |
| Pay for Zillow leads who interview 6 other agents | Talk to sellers who came to you specifically |
| Door knock neighborhoods on your day off | Spend your weekends closing, not prospecting |
| Chase leads who ghost you after one text | Have sellers who are already warmed up and ready to list |
| Burn out trying to fill your own pipeline | Let the system run while you focus on what you do best |

---

### 3. How It Works — Navy

**Label:** `How It Works`

**Headline:**
> Three Steps. Full Calendar.

**Steps:**
1. **We Build Your System** — We set up the exact appointment-setting infrastructure we built for our own team. Done for you. Nothing to learn.
2. **Sellers Find You** — Warm, ready-to-list sellers start showing up in your pipeline. No cold outreach on your end. Ever.
3. **You Show Up and Close** — Your only job is the appointment. We handle everything before it.

---

### 4. Proof — Light Purple

**Label:** `Real Results`

**Headline:**
> Listing Appointments. Not Promises.

**Testimonials (seller/listing focused — no AI visibility language):**
- Results about: listing agreements signed, seller calls received, calendar filled, listings won
- Same quote card design as V1 testimonials
- Source: collect from existing GEO clients who have listing wins, or use placeholder copy for launch

**Social proof popup (FOMO mechanic):**
Same bottom-left popup as V1, copy updated to:
> "[Name] from [City] just claimed their listing market"

---

### 5. One Agent Per Market — Navy

**Headline:**
> We Only Work With One Agent Per Market. Ever.

**Body:**
> We do not split markets. We do not run this for two agents in the same city. The agent who moves first owns their market — and the agents who wait find out their city is already taken.

**CTA:** `Find Out If My Market Is Available →`

---

### 6. Opt-In Form — Navy

**Form title:** `Claim Your Listing Market`

**Form fields** (same as `/claim`):
- First Name *
- Last Name *
- Email *
- Your Market * (city/state)
- Website

**Button:** `Find Out If My Market Is Available →`
**Loading state:** `Checking your market...`

**Trust signals below button:**
- ✓ Free. No credit card.
- ✓ 30-min strategy call.
- ✓ Market confirmed live.

**On submit:**
- Save lead to database (same `submitClaimForm` action or a new `submitV2Form` action)
- Tag `source=v2`
- Enroll in `v2_cold` email sequence
- Redirect to `/schedule?source=v2&firstName=...&lastName=...&email=...&city=...`

---

## Email Sequences

### v2_cold (new — to be written)
- Triggered on `/v2` form submission
- Topic: seller appointment setting, the V2 offer, urgency around market availability
- Tone: Misti's direct voice, same as existing nurture sequences
- Length: TBD during implementation

### Warm / Hot sequences
- Shared between V1 and V2 leads
- Once warm, the combined story (visibility + lead gen) is the full pitch
- No changes needed to existing warm/hot sequences

---

## Source Tagging

`source=v2` is passed through the entire funnel:
- Stored on form submission (database)
- Passed as URL param to `/schedule`
- Used to enroll correct email sequence
- Used for analytics attribution

---

## What Is NOT on This Page

- No AI visibility language
- No ChatGPT / Perplexity / Google AI mentions
- No buyer lead gen copy
- No GEO V1 features or positioning
- No pricing (handled on strategy call)

---

## Implementation Notes

- New page file: `app/v2/page.tsx` — use `LandingPage.tsx` as structural reference
- Form action: can reuse `submitClaimForm` with added `source` field, or create `submitV2Form` if sequence logic diverges
- `v2_cold` sequence must be added to: `sequences.ts`, `templates.ts`, `base.ts`, and the `geo_email_queue_sequence_check` DB constraint
- No new subdomain or domain required — lives at `geo.heypearl.io/v2`
- Proof images: use existing `/email-assets/` pattern, add V2-specific seller proof images to `public/`
