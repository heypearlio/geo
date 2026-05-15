# Funnel Slug Naming Rules — Non-Negotiable

Every landing page gets its own slug tag. This applies to every opt-in route, every leads API, every webhook insert — for every offer, every funnel, every client. No exceptions.

## Format

| Context | Format | Example |
|---|---|---|
| Super admin / demo landing page | `{offer}-{funnel}` | `v2-cashoffer`, `v2-calculator`, `geo-audit` |
| Per-client landing page | `{offer}-{funnel}-{client}` | `v2-cashoffer-todd`, `v2-calculator-todd`, `geo-audit-jane.doe` |

## Rules

1. **Never use a bare client slug as a funnel tag.** `slug: client.slug` (e.g. `"todd"`) is wrong. Always prefix with offer and funnel: `v2-cashoffer-todd`.

2. **Every funnel within an offer gets its own tag.** V2 has cashoffer AND calculator — both follow the same format. When a new landing page is added to an existing offer, it gets `{offer}-{newpage}-{client}`.

3. **Super admin demo pages use the short form.** No client suffix: `v2-cashoffer`, `v2-calculator`.

4. **The Instantly webhook must follow this format.** When inserting leads from Instantly replies: `isSuperAdmin ? "{offer}-{funnel}" : \`{offer}-{funnel}-${clientSlug}\``.

5. **Client leads API must filter by the full slug.** GET and POST both use `{offer}-{funnel}-${client.slug}`, never raw `client.slug`.

6. **`funnelTag` in demo config = `{offer}-{funnel}`.** Per-client pages override it in the config merge: `funnelTag: \`{offer}-{funnel}-${slug}\``.

## Current V2 Slugs (live — do not change)

| Page | Slug |
|---|---|
| Super admin cashoffer | `v2-cashoffer` |
| Super admin calculator | `v2-calculator` |
| Per-client cashoffer | `v2-cashoffer-{slug}` |
| Per-client calculator | `v2-calculator-{slug}` |

## When Adding Any New Landing Page or Offer

Before writing any opt-in route, leads API, or webhook branch — assign the slug using this format and verify it is consistent across all touch points: opt-in insert, manual add, upload webhook, leads GET filter.
