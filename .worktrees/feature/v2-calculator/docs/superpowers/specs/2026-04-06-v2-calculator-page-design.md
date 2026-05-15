# V2 Calculator Page — Design Spec

**Date:** 2026-04-06
**URL:** `v2.heypearl.io/calculator`
**Project:** geo-landing (`/Users/mistibruton/Desktop/geo-landing`)

---

## What We're Building

A second V2 landing page targeting motivated sellers (any seller — no specific label). The page speaks to the universal seller desire for options, control, and knowing their real net proceeds. The primary CTA is the SellerHQ property wizard embedded inline. After completing the wizard's Contact step, the user routes to `/schedule`.

This is a **super admin page only** (not affiliate-specific). No pricing. Lead gen only.

---

## Flow

```
v2.heypearl.io/calculator  →  (wizard Contact step complete)  →  v2.heypearl.io/schedule
```

No pricing page in this flow. Pricing is affiliate/super admin only.

---

## Approved Copy

### Hero
**Headline:** "As a Seller, You Have Options. Here's What Each One Nets You."
**Sub-line:** "Run every selling scenario in 90 seconds. See your real net. Then decide. On your terms, not an agent's."
**Badge (pill):** "Free · 90 Seconds · No Agent Required"
**CTA button:** "See What I'd Walk Away With →"
**Below button:** "Free. No commitment. Takes 90 seconds."

### Stat bar (3 items)
- "3 Scenarios" / "Side by side"
- "Real Numbers" / "After fees and costs"
- "Your Choice" / "No commitment"

### Problem Section
**Label:** "Why Most Sellers Leave Money Behind"
**Headline:** "Most Agents Hand You a Number and Disappear."
**Body:** "You never see the math. You don't know what you're leaving on the table. Or what a different path might have netted you. This calculator changes that."

**4 pain points (red X):**
- "One price. One option. No context."
- "Fees buried until closing day."
- "Cash offer potential never mentioned."
- "Repair costs come out of YOUR pocket without warning."

### How It Works
**Label:** "How It Works"
**Headline:** "Three Steps. Your Real Number."
- 01: "Tell us about your home" / "Address, condition, your goal, and any repairs needed."
- 02: "See all three scenarios" / "Cash offer, traditional sale, and as-is — net proceeds side by side."
- 03: "Get your results" / "Enter your contact info and unlock your personalized breakdown."

### Calculator Section (wizard embed)
**Heading:** "Run Your Numbers"
**Sub:** "See what you'd walk away with across every selling scenario."
**Badge:** "Free. No credit card. No commitment."
**Lead capture trigger:** Step 7 (Contact) button label = "Get Your Results"

### Proof Section
**Label:** "Real Sellers. Real Results."
**Headline:** "They Ran the Numbers. Then Made the Move."
Two testimonials (seller-focused, not agent-focused).

---

## Page Structure

5 sections, alternating navy/light — matches existing V2 landing page pattern.

| # | Section | Background | Notes |
|---|---------|-----------|-------|
| 1 | Hero | `#0F1E3A` navy | Headline, stat bar, scroll-to-wizard CTA |
| 2 | Problem | `#F7F8FC` light | Pain points grid, no agent labels |
| 3 | How It Works | `#0F1E3A` navy | 3-step explainer |
| 4 | Calculator (main CTA) | `#F7F8FC` light | SellerHQ wizard iframe, id="calculator" |
| 5 | Proof | `#0F1E3A` navy | 2 seller testimonials |
| — | Footer | `#080F1E` | Social icons, privacy link |

---

## Color System

V2 colors only. Never cross-contaminate with GEO (pink) or Local (configurable).

| Token | Value |
|-------|-------|
| Primary | `#16A34A` green |
| Dark bg | `#0F1E3A` navy |
| Light bg | `#F7F8FC` |
| Footer | `#080F1E` |
| Body text | `#4A5E7A` |
| Muted text | `#9BACC0` |

---

## SellerHQ Embed

The SellerHQ wizard (`localhost:3001/demo/app`) is embedded as an `<iframe>` in Section 4.

### Prerequisite: SellerHQ must be deployed first
SellerHQ is not yet on Vercel. Before this page can go live, SellerHQ needs a production URL. Suggested: `app.heypearl.io` or its own Vercel project. **Step 1 of implementation is deploying SellerHQ.**

### Lead routing
When the user completes step 7 (Contact) in the wizard:
1. SellerHQ captures the lead in its own DB
2. SellerHQ sends a `postMessage` to the parent page with contact data (name, email, phone)
3. The geo-landing calculator page listens for this message and calls the V2 opt-in API to capture the lead in geo-landing's DB
4. Parent page navigates to `/schedule`

### Iframe implementation notes
- `src` = SellerHQ production URL (set via env var `NEXT_PUBLIC_SELLERHQ_URL`)
- No fixed height — iframe should auto-size or use a generous min-height (e.g. `700px`)
- `allow="geolocation"` needed for address autocomplete
- Responsive: full width on mobile

---

## URL Architecture

`/calculator` is a new URL not yet in `url-architecture.md`. Add it:

```
v2.heypearl.io/calculator  →  V2 seller calculator landing page
```

Middleware: v2.* currently rewrites root to `/v2`. The `/calculator` path passes through naturally to `app/calculator/page.tsx` — no middleware change needed.

---

## Also In Scope: Remove Pricing from Cashoffer Client Pages

The `/cashoffer` and `/cashoffer/[slug]` client-facing pages currently reference pricing. Pricing is affiliate/super admin only. Audit and remove any pricing CTAs, links, or mentions from:
- `app/cashoffer/page.tsx` (super admin demo)
- `app/cashoffer/[slug]/` client pages

---

## Files to Create

| File | Purpose |
|------|---------|
| `app/calculator/page.tsx` | New page served at `v2.heypearl.io/calculator` |
| `app/calculator/CalculatorLandingPage.tsx` | Client component — full page with iframe embed |

## Files to Update

| File | Change |
|------|--------|
| `.claude/rules/url-architecture.md` | Add `v2.heypearl.io/calculator` to valid URL table |
| `app/cashoffer/page.tsx` | Remove pricing references |
| `app/cashoffer/[slug]/leads/page.tsx` | Remove pricing references if any |

---

## Hard Copy Rules (applies to all copy on this page)

- No em dashes (—). Ever. Use a period or line break instead.
- No exclamation points.
- No "expired," "foreclosure," or any seller-labeling language.
- Write to one person. Always "you / your."
- One CTA at a time.

---

## Out of Scope

- Affiliate version of the calculator page (future)
- Pricing page in this flow
- Custom SellerHQ wizard tweaks (user will improve the wizard separately over time)
- FOMO popup (not added — different audience psychology than the agent V2 page)
