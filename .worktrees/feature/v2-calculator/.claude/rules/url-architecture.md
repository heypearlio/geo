# URL Architecture Rules — Non-Negotiable

These are the ONLY valid URL patterns in this codebase. No exceptions.
Do not create, suggest, or accept any URL pattern not listed here.
Do not change these rules unless Misti explicitly instructs a change.

---

## Valid URL Patterns

| Pattern | What It Is |
|---|---|
| `offer.heypearl.io` | God/admin landing page for that offer |
| `offer.heypearl.io/pricing` | God/admin pricing page for that offer |
| `offer.heypearl.io/schedule` | God/admin schedule page for that offer |
| `v2.heypearl.io/calculator` | Seller net proceeds calculator landing page |
| `offer.heypearl.io/cashoffer` | God/admin cashoffer page (V2 offer) |
| `offer.heypearl.io/[slug]` | Affiliate entry point — landing page |
| `offer.heypearl.io/[slug]/pricing` | Affiliate pricing page |
| `offer.heypearl.io/[slug]/leads` | Affiliate or client leads dashboard |
| `offer.heypearl.io/[slug]/cashoffer` | Affiliate cashoffer page |
| `slug.heypearl.io` | V-card (affiliate business card) — no sub-pages |

**Offers:** `geo`, `v2`, `local` (and any future offer added)

---

## Rules

1. **One catalog only.** All affiliate pages live in `app/[slug]/`. No offer-specific duplicate catalogs (no `app/v2/[slug]/`, no `app/local/[slug]/`). Use host detection (`host.includes("v2.")`, `host.includes("geo.")`, etc.) to serve the right offer.

2. **No route aliases.** Do not create `/v2schedule`, `/localschedule`, `/localpricing`, `/christinapricing`, `/christinaschedule`, or any other alias routes. The canonical paths above are the only paths.

3. **No middleware path duplication.** Middleware must not rewrite affiliate slug paths to offer-prefixed paths (e.g., do NOT rewrite `v2.heypearl.io/todd` → `/v2/todd`). Single-segment affiliate slugs on any offer subdomain should pass through to `app/[slug]/`.

4. **God pages are at offer root.** `geo.heypearl.io/pricing` serves the GEO pricing page. `v2.heypearl.io/pricing` serves the V2 pricing page. These are not affiliate pages.

5. **V-cards have no sub-pages.** `slug.heypearl.io` shows the vcard only. Any path beyond root on a vcard domain is not a valid pattern.

6. **Admin (`geo.heypearl.io/admin`) is a separate system** and does not follow the offer subdomain pattern. It is not an offer page.

---

## What Must Never Be Built

- Any route not in the table above
- Offer-specific `[slug]` catalog directories (`app/v2/[slug]/`, `app/local/[slug]/`, etc.)
- Middleware rewrites that create virtual paths outside this pattern
- Pricing, schedule, or any funnel page accessible only via a rewrite alias

---

## Enforcement

Before creating any new page, route, or middleware rule — check this file.
If the URL it would create is not in the table above, do not build it. Ask first.
