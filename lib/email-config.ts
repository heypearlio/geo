/**
 * Email System Configuration — Single Source of Truth
 *
 * When you add a new sequence or email step, update these sets here.
 * The health check at /api/admin/email-health will automatically catch
 * any mismatches between this file, the DB constraint, and the template map.
 *
 * Rules:
 * - INSTANT_EMAILS: fires immediately on enqueue (no 24h buffer)
 * - INSTANT_KEYS:   must exactly match INSTANT_EMAILS — bypasses AI gate
 * - ALWAYS_RESEND:  bypasses dedupe — use for opt-in forms, not audit retries
 *   (must be a subset of INSTANT_EMAILS)
 */

export const INSTANT_EMAILS = new Set([
  "warm_nurture_1",
  "post_booking_1",
  "pre_interview_1",
  "v2_cold_1",
  "v2_post_booking_1",
  "affiliate_post_booking_1",
]);

export const INSTANT_KEYS = new Set([
  "warm_nurture_1",
  "post_booking_1",
  "pre_interview_1",
  "v2_cold_1",
  "v2_post_booking_1",
  "affiliate_post_booking_1",
]);

export const ALWAYS_RESEND = new Set([
  "warm_nurture_1",
  "post_booking_1",
  "pre_interview_1",
  "v2_cold_1",
  "v2_post_booking_1",
  "affiliate_post_booking_1",
]);
