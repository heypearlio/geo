# Email System Rules

**Single source of truth files:**
- Sequences + delays: `lib/sequences.ts`
- Instant/always-resend config: `lib/email-config.ts`
- Templates: `lib/emails/templates.ts`
- Base components: `lib/emails/base.ts`

## Critical rules

- `purchased_welcome` and `hot_proof` must NOT be cancelled by `suppressEmail` — client suppression only prevents future enrollments
- The "client" reason in `suppressEmail` intentionally skips `cancelQueuedEmails` — do not change this
- Always pass `stripe_link` and `package_price` in metadata when enrolling `purchased_welcome` or `hot_proof`
- `hot_proof` is exempt from the suppression check in the cron queue processor (`app/api/cron/route.ts`) — keep this exemption
- Adding a new sequence requires 4 changes: `sequences.ts`, `templates.ts` (functions + map + TemplateKey type), `base.ts` (footer text), and the DB constraint via migration
- `INSTANT_EMAILS` and `INSTANT_KEYS` in `lib/email-config.ts` must match exactly — mismatch causes the AI gate to push instant emails 24h forward
- Use `printf` not `echo` when adding API keys to Vercel — echo appends \n and silently breaks API calls
- Images in emails are served from `https://geo.heypearl.io/[filename]` (public folder)
- Test email sends to `misti@heypearl.io` before deploying changes to templates

## Sequence Architecture — Current State

Each offer has its own cold/entry sequence. After a lead books, all offers merge into the same universal sequences. This is intentional and temporary — each offer will eventually get fully custom sequences end-to-end, but that work is future. Do not pre-build custom sequences that haven't been asked for.

**Per-offer entry sequences:**
- GEO (v1): `audit_invite` (3 steps) or `audit_failed` (3 steps)
- V2: `v2_cold` (3 steps) → `v2_post_booking` (2 steps)
- Affiliate: `affiliate_schedule_abandoned` (1 step) → `affiliate_post_booking` (2 steps)
- Podcast: `pre_interview` (2 steps) → `post_interview` (1 step)
- Local: currently uses universal sequences (no local-specific entry sequence yet)

**Universal flow — all offers merge here after booking:**
`post_booking` (2 steps) → `post_call` (12 steps) → `proof` (12 steps) or `hot_proof` (5 steps) → `long_term_nurture` (6 steps)

**`warm_nurture` (10 steps)** is for leads who haven't booked yet — keeps them warm. It replaced the old `lead_nurture` and `claim_nurture` sequences which no longer exist. Do not reference those old names.

**`post_booking` is always 2 steps across all offers.** Templates `post_booking_3` through `post_booking_5` exist in `templates.ts` but are NOT enrolled — do not activate them.

**`affiliate_application`** is a sentinel row (send_at: 2099, never sent) written when an affiliate applies. The Calendly webhook reads this row to detect affiliate applicants. Do not delete or modify these rows.

## Webhook idempotency (Calendly)

**Calendly fires duplicate `invitee.created` webhooks** for the same booking. This caused real leads to receive the same email twice (confirmed Apr 2026).

The guard lives at the TOP of `app/api/calendly-webhook/route.ts` — before any DB writes, sequence enrollments, or email triggers:

```
Check geo_scheduled_calls for email + meeting_time
  exists → return 200, do nothing (duplicate)
  missing → proceed
```

**Rules that must stay true:**
- Every booking path (GEO, V2, pre-interview, affiliate) MUST write a row to `geo_scheduled_calls` with the `meeting_time` so the guard can catch duplicates
- The affiliate path writes `event_type: "affiliate"` — do not remove this insert
- Never move dedup logic into `lib/resend.ts` or `enqueueSequence` — the fix belongs at the webhook entry point, not inside the email layer
- `ALWAYS_RESEND` in `lib/email-config.ts` intentionally bypasses dedup in `enqueueSequence` — it is NOT a defense against duplicate webhooks. Do not rely on it for that.

## Calendly assignment rules — never mix these

- **God pages (all offers):** always use the master Calendly (`NEXT_PUBLIC_GEO_CALENDLY_URL`). This is Misti's by default but can be updated via Vercel env var when the master salesperson changes.
- **Affiliate landing pages:** always use the affiliate's unique Calendly URL stored in their account (`affiliates.calendly_url`). Each affiliate manages their own link.
- These never overlap. A god page never uses an affiliate's Calendly. An affiliate page never uses the master Calendly. The only changes are: (1) master link is updated in Vercel, or (2) an affiliate updates their own link in their account.
