# Affiliate Verification Agent

## When to invoke

Invoke this agent immediately after a new affiliate is created in admin. Pass the affiliate's slug as the only input.

```
Launch affiliate verification agent for slug: [slug]
```

The agent is responsible for verifying every automated item, fixing anything broken on the spot, and presenting Misti with a final checklist of manual-only steps that cannot be automated.

---

## What the Agent Checks and Fixes

### 1. Database Record
- [ ] Affiliate exists in `affiliates` table with correct slug
- [ ] `tag` field is set (used for lead filtering — must not be null)
- [ ] `offers` array is populated (e.g. `["v2", "geo"]`)
- [ ] `calendly_url` is set
- [ ] `first_name` + `last_name` are set
- [ ] `headshot_url` is set (needed for v-card photo)
- [ ] `slug` follows `first.last` format

**If any field is missing:** Agent alerts Misti — these require admin action to fix (not auto-fixable).

### 2. V-Card (Business Card) — `[slug].heypearl.io`
- [ ] Domain resolves — navigate to `https://[slug].heypearl.io` and confirm it loads (not 404, not Vercel error page)
- [ ] Affiliate's name appears on the page
- [ ] Affiliate's photo loads (not broken image)
- [ ] All three offer buttons present: GEO AI Visibility Engine, V2 Seller Attraction Engine, Local Business Growth Engine
- [ ] Offer button URLs correct: `geo.heypearl.io/[slug]`, `v2.heypearl.io/[slug]`, `local.heypearl.io/[slug]`
- [ ] "My Leads Dashboard" link points to `geo.heypearl.io/[slug]/leads`
- [ ] Pearl support widget loads (Vapi)
- [ ] Meta Pixel fires (if pixel ID is set)

**If domain doesn't resolve:** DNS may still be propagating (can take up to 15 min). Agent waits and retries. If still failing after retry, prints exact GoDaddy + Vercel steps for Misti to check.

**If page loads but content is wrong:** Agent checks `app/card/config.ts` and the affiliate DB record to diagnose.

### 3. Affiliate Landing Pages
- [ ] GEO landing page loads: `https://geo.heypearl.io/[slug]`
- [ ] V2 landing page loads: `https://v2.heypearl.io/[slug]`
- [ ] Local landing page loads: `https://local.heypearl.io/[slug]` (only if `local` in offers)
- [ ] Affiliate's Calendly URL is embedded correctly on each page (not the master Calendly)

**If landing page returns 404:** Agent checks that the affiliate's slug is in the DB and that the config is correct. May require a redeploy.

### 4. Leads Dashboard
- [ ] Login page loads: `https://geo.heypearl.io/[slug]/login`
- [ ] Dashboard route exists: `https://geo.heypearl.io/[slug]/leads`
- [ ] Upload modal loads and shows ONLY `aff-*` campaigns for the affiliate's offers
  - `aff-v2` → "V2 Seller Leads" (if v2 in offers)
  - `aff-geo` → "GEO AI Visibility Leads" (if geo in offers)
  - `aff-local` → "Local Business Leads" (if local in offers)
  - No `v2-*`, `geo-*`, or `local-*` client campaigns visible

**If upload modal shows wrong campaigns:** Agent checks `affiliates.offers` array in DB and `app/api/affiliate/campaigns/route.ts`.

### 5. Source Attribution
- [ ] Confirm `lib/source.ts` `SUBDOMAIN_TO_OFFER` map includes any new subdomain if applicable
- [ ] Confirm affiliate's tag is set in DB (used as the slug in `buildLeadSource`)

### 6. Opt-in Flow (Smoke Test)
- [ ] Navigate to `geo.heypearl.io/[slug]` and confirm the audit form is present and submittable
- [ ] Navigate to `v2.heypearl.io/[slug]` and confirm the lead capture form is present

---

## Auto-Fix Protocol

The agent fixes these automatically without asking:

| Issue | Auto-fix |
|---|---|
| V-card loads but Vercel project not linked to domain | Print exact Vercel domain setup steps |
| Landing page 404 because slug not in config | Check if a config file needs to be created and create it |
| Wrong campaigns in upload modal | Diagnose `affiliates.offers` vs API route |
| Build needed after config change | Run `npm run build && vercel --prod` |

The agent does NOT auto-fix:
- Missing DB fields (requires admin action)
- DNS not propagating (requires waiting or GoDaddy check by Misti)
- Missing headshot URL (requires Misti to find/upload the image)

---

## Final Output — Manual Steps for Misti

After all automated checks pass, the agent prints this checklist for Misti to complete. These steps cannot be automated.

```
✅ AUTOMATED CHECKS PASSED for [slug]

Manual steps remaining:

[ ] LinkJolt — add [slug].heypearl.io as an offer, send affiliate the invite link
[ ] HeyPearl HQ (Skool) — send affiliate the community invite link  
[ ] Send affiliate their login credentials:
      Login: https://geo.heypearl.io/[slug]/login
      (They set their own password — no default password exists)
[ ] Confirm affiliate's Calendly is set up and the URL in admin is correct
[ ] Send affiliate onboarding materials / welcome email
[ ] Verify affiliate's Meta Pixel ID is correct (if they have one)
```

---

## How to Invoke

In any session where a new affiliate has been created:

```
Launch the affiliate verification agent for slug: todd.smith
```

The agent uses Playwright MCP for browser checks and Supabase MCP for DB checks. It reports results inline and fixes what it can before handing Misti the manual checklist.
