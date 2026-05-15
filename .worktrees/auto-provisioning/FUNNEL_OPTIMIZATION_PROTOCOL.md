# GEO Funnel Optimization Protocol

This file tells Claude exactly what to do each week when Misti brings funnel data.
Read this file at the start of every optimization session.

---

## My Job

Every week (or whenever Misti asks), I:
1. Pull current stats from the admin dashboard at `geo.heypearl.io/admin/funnel`
2. Identify which emails are underperforming (see benchmarks below)
3. Rewrite underperforming subject lines and/or body copy
4. Check for sequence conflicts and suppression gaps
5. Suggest new emails if the funnel needs them
6. Deploy the changes

Misti brings the data. I do the analysis and make the changes. She approves before anything goes live unless she explicitly says to auto-deploy.

---

## The Full Funnel

### Sequences (all in `/lib/emails/templates.ts`)

| Sequence | Steps | Trigger | Delays |
|---|---|---|---|
| `lead_nurture` | 6 | Form submit (`audit_completed`) | instant, +24h, +48h, +96h, +14d, +21d |
| `schedule_abandoned` | 1 | Visited `/schedule` without booking | +2h |
| `video_watched` | 1 | Watched 50%+ of video on `/schedule` | instant |
| `video_abandoned` | 1 | Clicked play but left before 50% | instant |
| `post_booking` | 3 | Calendly webhook → `/api/booked` | instant, +22h, +46h |
| `no_show` | 4 | Manual or webhook → `/api/no-show` | instant, +48h, +120h, +168h |

**Total: 16 emails across 6 sequences.**

### Suppression (built — never remove this)
- Booking fires → cancel `lead_nurture` + `schedule_abandoned` + `video_watched` + `video_abandoned`
- No-show fires → cancel remaining `post_booking`
- Form re-submit → cancel existing `lead_nurture` before re-enrolling
- `video_watched` fires → cancel any queued `video_abandoned`
- Cron skips any queue row with `cancelled_at` set
- Video emails send immediately (not queued) — Vercel Hobby only allows daily crons

### Tracking
- Every send logs to `geo_email_events` (resend_email_id, email, sequence, step, event_type)
- Resend webhook at `/api/resend-webhook` logs opens + clicks automatically
- View stats: `geo.heypearl.io/admin/funnel`

---

## Performance Benchmarks

These are the targets. Below these = needs improvement.

| Metric | Target | Needs work |
|---|---|---|
| Open rate | 40%+ | Below 25% |
| Click rate | 15%+ | Below 8% |
| Lead-to-booking | 20%+ | Below 10% |
| No-show rate | Under 30% | Above 40% |

---

## What to Look For Each Week

### Red flags (fix immediately)
- Any email with open rate below 25% — subject line needs a rewrite
- Any email with click rate below 5% — CTA or body copy needs a rewrite
- Lead-to-booking under 10% after 4 weeks of data — entire lead nurture sequence needs audit
- No-show rate above 40% — post-booking sequence needs more urgency

### Green flags (note but don't touch)
- Open rates above 50% — subject line is working, don't change it
- Click rates above 20% — CTA and copy are converting, leave them alone

### When to add new emails
- If lead_nurture_6 has a send count above 30 (people finishing without booking) — add email 7 at +28d
- If no_show_2 has low rebooking rate — add a third no-show email at +96h
- If schedule_abandoned_1 has low conversion — consider a second email at +24h

---

## Weekly Session Checklist

1. Open `geo.heypearl.io/admin/funnel` — screenshot or paste the data here
2. I identify the 1-3 lowest performers
3. I propose new subject lines and/or copy rewrites
4. Misti approves
5. I edit `lib/emails/templates.ts` and deploy
6. I note what changed and why in this file (update "Change Log" below)

---

## Change Log

| Date | What Changed | Why |
|---|---|---|
| 2026-03-22 | Initial build. 6 lead_nurture emails, 1 schedule_abandoned, 3 post_booking, 2 no_show. Suppression system. Event tracking via geo_email_events + Resend webhook. | Initial launch |

---

## Files That Matter

- `/lib/emails/templates.ts` — all email copy lives here
- `/lib/emails/base.ts` — wrapper, button, heading, sig styles
- `/lib/resend.ts` — send logic, suppression, event logging
- `/app/api/resend-webhook/route.ts` — receives open/click from Resend
- `/app/api/cron/route.ts` — drains the queue daily at 9am UTC
- `/app/api/booked/route.ts` — Calendly webhook, starts post_booking
- `/app/api/no-show/route.ts` — starts no_show
- `/app/api/tag/route.ts` — fires Customer.io events + enqueues schedule_abandoned
- `/app/admin/funnel/page.tsx` — stats dashboard

---

## One-Time Setup Needed (Misti must do this in Resend dashboard)

Go to resend.com → Webhooks → Add endpoint:
- URL: `https://geo.heypearl.io/api/resend-webhook`
- Events: `email.opened`, `email.clicked`, `email.bounced`

Without this, opens and clicks won't appear in the dashboard.
