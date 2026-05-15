import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";
import { EMAIL_TEMPLATES } from "./emails/templates";
import { snapToBusinessHours } from "./schedule";
import { SEQUENCE_DELAYS, SequenceKey } from "./sequences";
import { INSTANT_EMAILS, ALWAYS_RESEND } from "./email-config";

// Resend throws if the key is missing; provide a placeholder so `next build` can prerender without env.
export const resend = new Resend(process.env.RESEND_API_KEY ?? "re_build_noop");
export const GEO_AUDIENCE_ID = "10621e8a-9834-4c07-b8a8-686d071c8693";
export const REPLY_TO = process.env.EMAIL_REPLY_TO ?? "geo@heypearl.io";

// Hash-based domain rotation — same recipient always gets same sending domain.
// Set EMAIL_FROM_POOL as comma-separated list: "Name <a@domain1.com>, Name <b@domain2.com>"
// Falls back to EMAIL_FROM, then hardcoded default.
function djb2(str: string): number {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = (((h << 5) + h) ^ str.charCodeAt(i)) >>> 0;
  }
  return h;
}
export function pickFrom(recipientEmail: string): string {
  const pool = process.env.EMAIL_FROM_POOL;
  if (pool) {
    const addresses = pool.split(",").map(s => s.trim()).filter(Boolean);
    if (addresses.length > 0) return addresses[djb2(recipientEmail) % addresses.length];
  }
  return process.env.EMAIL_FROM ?? "Misti Bruton <misti@geo.heypearl.io>";
}

// Build-time fallbacks so modules that import this can load during `next build` without .env.
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://build-placeholder.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? "build_placeholder_service_role"
);

// Delay arrays imported from lib/sequences.ts — the single source of truth.
// Add new sequences there; they automatically appear everywhere.

// Log an email event to geo_email_events for tracking + optimization
export async function logEmailEvent(
  email: string,
  sequence: string,
  step: number,
  eventType: string,
  resendEmailId?: string | null,
  metadata: Record<string, unknown> = {}
) {
  try {
    await supabase.from("geo_email_events").insert({
      resend_email_id: resendEmailId ?? null,
      email,
      sequence,
      step,
      event_type: eventType,
      metadata,
    });
  } catch (err) {
    // Non-fatal — tracking should never block sends, but log so we know if events go missing
    console.error(`[logEmailEvent] failed to log ${eventType} for ${email} (seq=${sequence} step=${step}):`, err);
  }
}

export async function isSuppressed(email: string): Promise<boolean> {
  const { data } = await supabase
    .from("geo_suppressed")
    .select("id")
    .eq("email", email)
    .limit(1);
  return (data?.length ?? 0) > 0;
}

// These emails are never suppressed — owner test addresses
const NEVER_SUPPRESS = new Set([
  "misti@mistibruton.com",
  "brutonmisti@gmail.com",
  "misti@heypearl.io",
  (process.env.EMAIL_FROM?.match(/<(.+)>$/)?.[1] ?? "misti@geo.heypearl.io"),
]);

export async function suppressEmail(email: string, reason: "client" | "unsubscribed" | "bounced" | "spam") {
  if (NEVER_SUPPRESS.has(email.toLowerCase())) return;
  await supabase
    .from("geo_suppressed")
    .upsert({ email, reason }, { onConflict: "email" });
  // Only cancel queued emails for unsubscribe/bounce/spam — NOT for "client"
  // because client suppress happens right after enqueuing purchased_welcome
  // and hot_proof, and we need those to send.
  if (reason !== "client") {
    await cancelQueuedEmails(email);
  }
}

// Returns the earliest time we can send the next email (24h after last send/queued)
async function getNextAllowedSendTime(email: string): Promise<Date> {
  const BUFFER_HOURS = 24;
  const now = new Date();

  // Check last sent event
  const { data: lastEvent } = await supabase
    .from("geo_email_events")
    .select("created_at")
    .eq("email", email)
    .eq("event_type", "sent")
    .order("created_at", { ascending: false })
    .limit(1);

  // Check latest queued send_at — exclude 2099 sentinel/paused-marker rows
  const { data: lastQueued } = await supabase
    .from("geo_email_queue")
    .select("send_at")
    .eq("email", email)
    .is("cancelled_at", null)
    .lt("send_at", "2099-01-01")
    .order("send_at", { ascending: false })
    .limit(1);

  const candidates: Date[] = [];
  if (lastEvent?.[0]?.created_at) {
    candidates.push(new Date(new Date(lastEvent[0].created_at).getTime() + BUFFER_HOURS * 60 * 60 * 1000));
  }
  if (lastQueued?.[0]?.send_at) {
    candidates.push(new Date(new Date(lastQueued[0].send_at).getTime() + BUFFER_HOURS * 60 * 60 * 1000));
  }

  const earliest = candidates.length > 0 ? new Date(Math.max(...candidates.map(d => d.getTime()))) : now;
  return earliest > now ? earliest : now;
}

export async function enqueueSequence(
  sequence: SequenceKey,
  email: string,
  firstName?: string,
  metadata: Record<string, string> = {},
  skipSteps: number[] = []
) {
  // Never enqueue for suppressed contacts (clients or unsubscribes)
  if (await isSuppressed(email)) return;

  // Name lookup fallback — if firstName is missing, search existing records before enqueuing.
  // A generic email that lands is better than one that never sends, but we always try to find
  // the name first. Lookup chain: queue → claim submissions → scheduled calls → audit history.
  let resolvedName = firstName?.trim() || null;
  if (!resolvedName) {
    const [queueRow, claimRow, callRow, auditRow] = await Promise.all([
      supabase.from("geo_email_queue").select("first_name").eq("email", email)
        .not("first_name", "is", null).neq("first_name", "").limit(1).maybeSingle(),
      supabase.from("geo_claim_submissions").select("first_name").eq("email", email)
        .not("first_name", "is", null).neq("first_name", "").limit(1).maybeSingle(),
      supabase.from("geo_scheduled_calls").select("first_name").eq("email", email)
        .not("first_name", "is", null).neq("first_name", "").limit(1).maybeSingle(),
      supabase.from("geo_audit_history").select("first_name").eq("email", email)
        .not("first_name", "is", null).neq("first_name", "").order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ]);
    resolvedName =
      queueRow.data?.first_name ||
      claimRow.data?.first_name ||
      callRow.data?.first_name ||
      auditRow.data?.first_name ||
      null;
  }
  // dn() is applied in templates — store raw name here, keep it clean
  const nameToStore = resolvedName || null;

  const delays = SEQUENCE_DELAYS[sequence];
  const now = new Date();

  // INSTANT_EMAILS and ALWAYS_RESEND are defined in lib/email-config.ts
  // (single source of truth — health check validates them automatically)

  // Fetch the 24h buffer base time once for the whole sequence (non-instant only)
  let bufferedBase: Date | null = null;

  for (let i = 0; i < delays.length; i++) {
    const step = i + 1;
    const hours = delays[i];
    const key = `${sequence}_${step}` as keyof typeof EMAIL_TEMPLATES;
    const templateFn = EMAIL_TEMPLATES[key];
    if (!templateFn) continue;
    if (skipSteps.includes(step)) continue;

    const isInstant = INSTANT_EMAILS.has(`${sequence}_${step}`);
    if (!bufferedBase && !isInstant) {
      bufferedBase = await getNextAllowedSendTime(email);
    }
    const base = isInstant ? now : bufferedBase!;
    const rawSendTime = new Date(base.getTime() + hours * 60 * 60 * 1000);
    const isImmediate = hours === 0;
    const sendTime = isImmediate ? rawSendTime : snapToBusinessHours(rawSendTime, false);
    const sendNow = sendTime <= now;

    if (sendNow) {
      // Dedup strategy depends on whether the email is in ALWAYS_RESEND:
      //
      // Non-ALWAYS_RESEND: INSERT the "sent" event first as an atomic lock.
      // Only one concurrent caller wins the insert (unique index on
      // email+sequence+step WHERE event_type='sent'). Loser gets 23505 and
      // skips — no race window possible.
      //
      // ALWAYS_RESEND (booking confirmations, audit score emails): intentionally
      // re-sendable across different trigger events (re-bookings, new audit runs).
      // Dedup is handled at the trigger level — Calendly bookings are protected
      // by the unique constraint on geo_scheduled_calls(email, meeting_time).
      // These emails bypass the lock so re-sends are never blocked.
      const isAlwaysResend = ALWAYS_RESEND.has(`${sequence}_${step}`);

      if (!isAlwaysResend) {
        const { error: lockErr } = await supabase.from("geo_email_events").insert({
          email,
          sequence,
          step,
          event_type: "sent",
          resend_email_id: null, // updated below once Resend confirms
          metadata,
        });
        if (lockErr) {
          if (lockErr.code === "23505") continue; // another caller already sent this step
          throw lockErr;
        }
      }

      // Lock acquired (or ALWAYS_RESEND — trigger-level dedup applies) — now send
      const { subject, html } = templateFn({
        firstName: nameToStore ?? undefined,
        email,
        city: metadata.city,
        auditId: metadata.audit_id,
        overall: metadata.overall ? parseInt(metadata.overall) : undefined,
        seo: metadata.seo ? parseInt(metadata.seo) : undefined,
        ai: metadata.ai ? parseInt(metadata.ai) : undefined,
      });
      const finalHtml = html.replace(/\{\{email\}\}/g, encodeURIComponent(email));
      const result = await resend.emails.send({ from: pickFrom(email), replyTo: REPLY_TO, to: email, subject, html: finalHtml });

      // Log the send event (or update the pre-inserted lock record with the Resend ID)
      if (!isAlwaysResend && result.data?.id) {
        // Lock record already inserted above — just fill in the Resend email ID
        await supabase.from("geo_email_events")
          .update({ resend_email_id: result.data.id })
          .eq("email", email).eq("sequence", sequence).eq("step", step).eq("event_type", "sent");
      } else {
        // ALWAYS_RESEND — no pre-insert lock, log normally
        await logEmailEvent(email, sequence, step, "sent", result.data?.id ?? null);
      }

      // Also write a queue record (sent_at pre-filled) so step 1 is visible in queue history
      await supabase.from("geo_email_queue").insert({
        email,
        first_name: nameToStore,
        sequence,
        step,
        send_at: now.toISOString(),
        sent_at: now.toISOString(),
        metadata,
      });
    } else {
      // Queue for later — unique partial index (geo_email_queue_dedup_idx) on
      // (email, sequence, step) WHERE sent_at IS NULL AND cancelled_at IS NULL
      // enforces dedup at the DB level; ignore conflict silently.
      const { error } = await supabase.from("geo_email_queue").insert({
        email,
        first_name: nameToStore,
        sequence,
        step,
        send_at: sendTime.toISOString(),
        metadata,
      });
      if (error && !error.message.includes("geo_email_queue_dedup_idx")) {
        // Re-throw unexpected errors; swallow the expected unique-violation
        throw error;
      }
    }
  }
}

// Cancel all pending (unsent, uncancelled) queue rows for a given email,
// optionally filtered to specific sequences.
export async function cancelQueuedEmails(
  email: string,
  sequences?: string[]
) {
  let query = supabase
    .from("geo_email_queue")
    .update({ cancelled_at: new Date().toISOString() })
    .eq("email", email)
    .is("sent_at", null)
    .is("cancelled_at", null);

  if (sequences && sequences.length > 0) {
    query = query.in("sequence", sequences);
  }

  await query;
}

// Sequences that mean the lead is past the point where proof acceleration applies.
// These indicate they've booked, had a call, or purchased — don't interrupt that flow.
const PROOF_BLOCKING_SEQUENCES = ["post_booking", "post_call", "purchased_welcome", "hot_proof", "pre_interview", "post_interview"];

// Cold/warm sequences whose remaining pending emails should be cancelled when proof is triggered early.
const PROOF_SUPERSEDES = ["warm_nurture", "audit_invite", "audit_failed", "v2_cold", "schedule_abandoned", "video_watched", "video_abandoned", "no_show"];

// Called after every click event. If the lead has clicked ≥50% of their sent emails
// (min 2 sent) and hasn't yet reached the proof series, enqueue proof now and
// cancel the remaining cold/warm emails. After proof completes, CHAIN_MAP graduates
// them to long_term_nurture as normal.
export async function checkEngagementAcceleration(email: string): Promise<void> {
  try {
    if (await isSuppressed(email)) return;

    // Skip if already in a post-action sequence (booked, purchased, post-call)
    const { data: blocking } = await supabase
      .from("geo_email_queue")
      .select("sequence")
      .eq("email", email)
      .in("sequence", PROOF_BLOCKING_SEQUENCES)
      .is("cancelled_at", null)
      .limit(1);
    if (blocking && blocking.length > 0) return;

    // Skip if proof already ran
    const { data: proofSent } = await supabase
      .from("geo_email_events")
      .select("id")
      .eq("email", email)
      .eq("sequence", "proof")
      .eq("event_type", "sent")
      .limit(1);
    if (proofSent && proofSent.length > 0) return;

    // Skip if proof already queued
    const { data: proofQueued } = await supabase
      .from("geo_email_queue")
      .select("id")
      .eq("email", email)
      .eq("sequence", "proof")
      .is("sent_at", null)
      .is("cancelled_at", null)
      .limit(1);
    if (proofQueued && proofQueued.length > 0) return;

    // Compute engagement ratio: distinct clicked / distinct sent (by resend_email_id)
    const [{ data: sentRows }, { data: clickedRows }] = await Promise.all([
      supabase.from("geo_email_events")
        .select("resend_email_id")
        .eq("email", email)
        .eq("event_type", "sent")
        .not("resend_email_id", "is", null),
      supabase.from("geo_email_events")
        .select("resend_email_id")
        .eq("email", email)
        .eq("event_type", "clicked")
        .not("resend_email_id", "is", null),
    ]);

    const sentIds    = new Set((sentRows    ?? []).map(r => r.resend_email_id));
    const clickedIds = new Set((clickedRows ?? []).map(r => r.resend_email_id));

    if (sentIds.size < 2) return;                   // Need at least 2 sends for a meaningful signal
    if (clickedIds.size / sentIds.size < 0.5) return; // Below 50% threshold

    // Threshold met — look up first name
    const { data: nameRow } = await supabase
      .from("geo_email_queue")
      .select("first_name")
      .eq("email", email)
      .not("first_name", "is", null)
      .limit(1)
      .maybeSingle();

    // Cancel remaining cold/warm emails, then enqueue proof
    await cancelQueuedEmails(email, PROOF_SUPERSEDES);
    await enqueueSequence("proof", email, nameRow?.first_name ?? undefined);

    // Log for tracking/debugging
    await logEmailEvent(email, "proof", 0, "engagement_accelerated", null, {
      sent_count:    sentIds.size,
      clicked_count: clickedIds.size,
      ratio_pct:     Math.round((clickedIds.size / sentIds.size) * 100),
    });
  } catch (err) {
    // Non-fatal — never let this block the webhook response
    console.error("[checkEngagementAcceleration] failed for", email, err);
  }
}

export async function addToResendAudience(email: string, firstName?: string) {
  try {
    await resend.contacts.create({
      audienceId: GEO_AUDIENCE_ID,
      email,
      firstName: firstName ?? undefined,
    });
  } catch {
    // Non-fatal — contact may already exist
  }
}

// ── Lead Tagging ──────────────────────────────────────────────────────────────
// Upserts a tag for a lead into geo_lead_tags. Safe to call on every form
// submission — the unique(email, tag) constraint makes it idempotent.
// Never throws — tag failures must never block form submissions.
export async function tagLead(email: string, tag: string): Promise<void> {
  if (!email || !tag) return;
  try {
    await supabase.from("geo_lead_tags").upsert(
      { email: email.toLowerCase().trim(), tag },
      { onConflict: "email,tag", ignoreDuplicates: true }
    );
  } catch (err) {
    console.error("[tagLead] failed for", email, tag, err);
  }
}
