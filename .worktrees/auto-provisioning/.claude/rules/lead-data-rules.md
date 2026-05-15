# Lead Data Rules

## Always Send. Never Skip.

No email should ever be skipped because of missing data. A lead with no
first_name still gets every email in their sequence. The template already
falls back to "Hey" — that's fine. A generic email that lands is better
than a personalized email that never sends.

## But Always Try to Find the Name First

### In enqueueSequence():
If first_name is null/empty, attempt a lookup before inserting:
1. Check geo_email_queue for any existing row with this email that has a first_name
2. Check geo_claim_submissions
3. Check geo_scheduled_calls
4. Check geo_audit_history
If found, use it. If not, enqueue with null — the email still sends.

### For bulk enrolls:
Same lookup chain. Try to find the name. If you can't, enqueue anyway.
Log emails with missing names so they can be backfilled later, but
NEVER block or skip the enrollment.

### The rule: Data quality is a backfill problem, not a gating problem.

## New Offer Launch Checklist — Lead Tagging

Every new offer MUST do this on lead optin or it breaks the entire affiliate dashboard:

1. Call `tagLead(email, affiliateTag)` in the optin route — this writes to `geo_lead_tags` which is the universal source of truth for all affiliate lead filtering
2. God /leads sees all leads unfiltered
3. Affiliate /leads and /calls filter by their unique tag from `geo_lead_tags`

**If `tagLead()` is missing from a new offer's optin route, leads come in but never appear on any affiliate's dashboard.** This is the only wiring required — the rest of the system picks it up automatically.

**Note:** `cashoffer-optin` only captures an address (no email) — `tagLead()` cannot be called there by design. Cashoffer leads are not affiliate-tagged at optin.

## Universal Table Rule — Applies Everywhere

`geo_lead_tags` is the source of truth for ALL offers in EVERY context — affiliate-facing AND admin. This applies to:
- `/api/affiliate/leads` — affiliate lead list
- `/api/affiliate/calls` — affiliate call list and outcome auth
- `/api/affiliate/activity` — affiliate stats
- `/api/admin/affiliates` — admin affiliate list lead counts
- `/api/admin/affiliates/[id]` — admin affiliate detail lead count
- `/api/admin/affiliates/[id]/leads` — admin view of affiliate's leads

**Never use `geo_local_submissions.source_tag` to count or filter affiliate leads.** That table only contains HeyLocal offer submissions and will show 0 for GEO/V2 affiliates.

`geo_local_submissions` is still valid for enrichment only (pulling `business_type` for local leads, or in `admin/local-leads` which IS the local-specific admin view).
