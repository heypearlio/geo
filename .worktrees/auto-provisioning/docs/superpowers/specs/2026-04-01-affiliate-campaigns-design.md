# Affiliate Campaigns Design
**Date:** 2026-04-01

## Overview

Two email sequences for affiliate applicants on the /affiliate page — one for when they book their onboarding Calendly call, one for when they apply but never book.

---

## Sequences

### 1. `affiliate_schedule_abandoned`
- **Stage:** cold | **Offer:** affiliate
- **Steps:** 1 | **Delays:** [1] (1 hour after application)
- **Trigger:** Enqueued at apply time (`/api/affiliate-apply`) alongside `affiliate_application`
- **Cancelled by:** Calendly webhook when affiliate books their call

### 2. `affiliate_post_booking`
- **Stage:** warm | **Offer:** affiliate
- **Steps:** 2 | **Delays:** [0, 24]
- **Step 1:** Instant (added to INSTANT_EMAILS)
- **Step 2:** Rescheduled by Calendly webhook to 1 day before meeting (same logic as `post_booking`)
- **Trigger:** Calendly webhook on `invitee.created` when email matches an affiliate applicant

---

## Calendly Detection

In `/api/calendly-webhook/route.ts`, after the existing event type check, add an affiliate lookup:

```
const isAffiliate = await supabase
  .from("geo_email_queue")
  .select("id")
  .eq("email", inviteeEmail)
  .eq("sequence", "affiliate_application")
  .maybeSingle()
```

If `isAffiliate` is truthy:
- Cancel `affiliate_schedule_abandoned` for that email
- Enqueue `affiliate_post_booking` (step 1 instant, step 2 rescheduled to 1 day before meeting)
- Do NOT enqueue `post_booking` or `v2_post_booking`

If `invitee.canceled` fires for an affiliate email: cancel `affiliate_post_booking` only (no re-enqueue of abandoned — they already cleared that window).

---

## Email Templates

### `affiliateScheduleAbandoned1({ firstName })`

**Section:** `// ─── AFFILIATE SCHEDULE ABANDONED ───`

```ts
export function affiliateScheduleAbandoned1({ firstName }: EmailData) {
  const display = dn(firstName);
  const name = display ?? "Hey";
  return {
    subject: display ? `${display}, forgot to finish?` : "Forgot to finish?",
    html: emailWrapper(`
      ${h1(`You Were This Close`)}
      ${p(`${name}, looks like you filled out your affiliate application but never grabbed a time for your onboarding call.`)}
      ${p("That call is where we set you up — your dashboard, your referral link, your first commission opportunity. Takes 30 minutes.")}
      ${btn("Book My Onboarding Call", "https://calendly.com/hey-pearl/meet")}
      ${p("Your spot is still open. Grab it whenever you're ready.")}
      ${sig()}
    `, "affiliate_schedule_abandoned"),
  };
}
```

---

### `affiliatePostBooking1({ firstName })`

**Section:** `// ─── AFFILIATE POST-BOOKING ───`

```ts
export function affiliatePostBooking1({ firstName }: EmailData) {
  const display = dn(firstName);
  const name = display ?? "Hey";
  return {
    subject: display ? `${display}, you're all set` : "You're all set",
    html: emailWrapper(`
      ${h1(`You're In. Here's What Happens on Your Onboarding Call.`)}
      ${p(`${name}, your onboarding call is confirmed. Check your calendar for the invite with all the details.`)}
      ${p("Here's what we'll cover together:")}
      <table cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 24px;">
        ${[
          ["Your affiliate dashboard", "We'll walk through your dashboard so you can see your leads, track your commissions, and monitor your referrals in real time."],
          ["Your referral link", "You'll leave with your personal link ready to share — on social, in conversations, wherever you connect with local business owners."],
          ["Your first referral", "We'll talk through who in your network is the best fit and how to bring them up naturally, so your first commission isn't far away."],
        ].map(([label, desc]) => `
        <tr>
          <td style="padding:14px 0;border-bottom:1px solid #EDF0FA;vertical-align:top;">
            <p style="margin:0 0 4px;font-weight:700;color:${NAVY};">${label}</p>
            <p style="margin:0;font-size:14px;color:#4A5E7A;">${desc}</p>
          </td>
        </tr>`).join("")}
      </table>
      ${p("One thing to think about before the call: who in your network runs a local business and could genuinely use more customers? Even one name is a great place to start.")}
      ${sig()}
    `, "affiliate_post_booking"),
  };
}
```

---

### `affiliatePostBooking2({ firstName })`

```ts
export function affiliatePostBooking2({ firstName }: EmailData) {
  const display = dn(firstName);
  const name = display ?? "Hey";
  return {
    subject: display ? `See you tomorrow, ${display}` : "See you tomorrow",
    html: emailWrapper(`
      ${h1(`We're On for Tomorrow`)}
      ${p(`${name}, just a quick note before your onboarding call tomorrow.`)}
      ${p("One thing to have ready:")}
      <table cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 24px;">
        ${[
          ["Think of one person to refer", "Who in your world owns a local business and wants more customers? A restaurant, a salon, a contractor, a gym. You don't need a list — just one name. We'll talk through how to bring it up naturally on the call."],
        ].map(([label, desc]) => `
        <tr>
          <td style="padding:14px 0;border-bottom:1px solid #EDF0FA;vertical-align:top;">
            <p style="margin:0 0 6px;font-weight:700;color:${NAVY};">${label}</p>
            <p style="margin:0;font-size:14px;color:#4A5E7A;">${desc}</p>
          </td>
        </tr>`).join("")}
      </table>
      ${p("That's it. I'll have your dashboard and link ready on my end.")}
      ${p("See you tomorrow.")}
      ${sig()}
    `, "affiliate_post_booking"),
  };
}
```

---

## File Changes Summary

| File | Change |
|---|---|
| `lib/sequences.ts` | Add `affiliate_schedule_abandoned` and `affiliate_post_booking` definitions |
| `lib/emails/templates.ts` | Add 3 template functions + register in EMAIL_TEMPLATES + add to TemplateKey union |
| `lib/email-config.ts` | Add `affiliate_post_booking_1` to INSTANT_EMAILS set and INSTANT_KEYS array |
| `app/api/affiliate-apply/route.ts` | Enqueue `affiliate_schedule_abandoned` with 1hr delay alongside existing `affiliate_application` |
| `app/api/calendly-webhook/route.ts` | Add affiliate detection by email lookup, cancel abandoned, enqueue post_booking |
| DB migration | Add both new sequences to `geo_email_queue_sequence_check` constraint |

---

## DB Constraint

The `geo_email_queue_sequence_check` constraint must be updated to include:
- `affiliate_schedule_abandoned`
- `affiliate_post_booking`

This requires a migration file.
