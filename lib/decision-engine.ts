/**
 * AI Decision Engine — Phase 1 (Booking Triggers Only)
 *
 * Replaces hardcoded booking/cancellation logic in the Calendly webhook.
 * All other triggers still use the original enqueueSequence() pipes.
 *
 * Kill switch: set USE_AI_DECISIONS=false in Vercel env to revert instantly.
 */

import OpenAI from "openai";
import { supabase, enqueueSequence, cancelQueuedEmails } from "./resend";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY ?? "sk-build-placeholder" });

// ─── Types ────────────────────────────────────────────────────────────────────

export type TriggerEvent =
  | { type: "booking_created"; booking_time: string; first_name: string }
  | { type: "booking_cancelled"; first_name: string };

type DecisionAction = "send_now" | "schedule" | "skip";

interface AIResponse {
  chosen_action: DecisionAction;
  template_id: string | null;
  send_at_iso: string | null;
  cancel_sequences: string[];
  reasoning: string;
  next_check_hours: number;
}

interface ContactState {
  email: string;
  suppressed: boolean;
  suppression_reason: string | null;
  templates_already_sent: string[];
  pending_emails: Array<{ id: string; sequence: string; step: number; send_at: string }>;
  days_since_last_email: number | null;
  previously_no_showed: boolean;
  audit_completed: boolean;
}

// ─── Available templates for Phase 1 (booking triggers only) ─────────────────

const BOOKING_TEMPLATES = [
  { id: "post_booking_1", intent: "Booking confirmation — send immediately on booking_created" },
  { id: "post_booking_2", intent: "Pre-call audit nudge — 24h after booking" },
  { id: "post_booking_3", intent: "Pre-call warming — 48h after booking" },
  { id: "post_booking_4", intent: "Day-before reminder — 72h after booking" },
  { id: "no_show_1",      intent: "No-show recovery — send immediately on booking_cancelled" },
  { id: "no_show_2",      intent: "No-show follow-up — 48h after cancellation" },
  { id: "no_show_3",      intent: "No-show final nudge — 5 days after cancellation" },
  { id: "no_show_4",      intent: "No-show last attempt — 7 days after cancellation" },
];

const SYSTEM_PROMPT = `You are the email decision engine for GEO by HeyPearl, an AI visibility service for real estate agents. You handle booking-related email decisions only.

You will receive a trigger event and the contact's current state. Return a single structured JSON decision.

HARD RULES — NEVER VIOLATE:
1. NEVER email suppressed contacts. If suppressed=true, always choose "skip".
2. NEVER repeat a template already in templates_already_sent.
3. post_booking_1 is the ONLY template that bypasses the 24h rule — it is a booking confirmation the contact is expecting.
4. ALL other templates must respect the 24h rule. If days_since_last_email < 1, schedule them, do not send_now.
5. Only choose templates from the available_templates list.

BOOKING LOGIC:
- booking_created: Send post_booking_1 immediately. Cancel all pending nurture sequences (warm_nurture, long_term_nurture, audit_invite, audit_failed, schedule_abandoned, video_watched, video_abandoned). Schedule post_booking_2, 3, 4 on subsequent days.
- booking_cancelled: Cancel all post_booking pending emails. Send no_show_1 immediately. Schedule no_show_2, 3, 4.

SKIP post_booking_2 if audit_completed=true (they already did the audit, no need to nudge).
If previously_no_showed=true and this is another booking_cancelled, the contact is a repeat no-show — note this in reasoning but still send no_show_1.

For cancel_sequences: return the sequence NAMES to cancel (e.g. ["warm_nurture", "post_booking"]), not template IDs.`;

// ─── Core decide() function ───────────────────────────────────────────────────

export async function decide(
  event: TriggerEvent,
  email: string
): Promise<void> {
  const start = Date.now();

  // 1. Build contact state
  const { data: stateRaw, error } = await supabase.rpc("get_contact_state_booking", { p_email: email });
  if (error || !stateRaw) {
    console.error("Decision engine: failed to fetch contact state", error);
    await fallback(event, email);
    return;
  }
  const state: ContactState = { ...stateRaw, email };

  // 2. Hard rules pre-flight
  if (state.suppressed) {
    await log(email, event, "skip", null, `Contact suppressed: ${state.suppression_reason}`, "hard_rule", Date.now() - start);
    return;
  }

  // 3. Call GPT-4o-mini
  let aiResponse: AIResponse;
  try {
    aiResponse = await callAI(state, event);
  } catch (err) {
    console.error("Decision engine: AI call failed, falling back", err);
    await log(email, event, "skip", null, `AI call failed: ${err}. Falling back to sequence logic.`, "fallback", Date.now() - start);
    await fallback(event, email);
    return;
  }

  // 4. Validate response
  const validated = validate(aiResponse, state);

  // 5. Execute
  await execute(validated, email, state);

  // 6. Log
  await log(email, event, validated.chosen_action, validated.template_id, validated.reasoning, "ai", Date.now() - start);
}

// ─── AI call ─────────────────────────────────────────────────────────────────

async function callAI(state: ContactState, event: TriggerEvent): Promise<AIResponse> {
  const availableTemplates = BOOKING_TEMPLATES.filter(
    t => !state.templates_already_sent.includes(t.id)
  );

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.2,
    max_tokens: 400,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: JSON.stringify({
          trigger: event,
          contact: state,
          available_templates: availableTemplates,
          current_time_utc: new Date().toISOString(),
        }),
      },
    ],
  });

  const raw = JSON.parse(response.choices[0].message.content!);

  return {
    chosen_action: raw.chosen_action ?? "skip",
    template_id: raw.template_id ?? null,
    send_at_iso: raw.send_at_iso ?? null,
    cancel_sequences: Array.isArray(raw.cancel_sequences) ? raw.cancel_sequences : [],
    reasoning: raw.reasoning ?? "No reasoning provided",
    next_check_hours: raw.next_check_hours ?? 24,
  };
}

// ─── Validation ──────────────────────────────────────────────────────────────

function validate(ai: AIResponse, state: ContactState): AIResponse {
  // Reject invalid template IDs
  if (ai.template_id && !BOOKING_TEMPLATES.find(t => t.id === ai.template_id)) {
    console.warn(`Decision engine: invalid template_id "${ai.template_id}", overriding to skip`);
    return { ...ai, chosen_action: "skip", template_id: null, reasoning: `${ai.reasoning} [OVERRIDDEN: invalid template_id]` };
  }

  // Reject already-sent templates
  if (ai.template_id && state.templates_already_sent.includes(ai.template_id)) {
    console.warn(`Decision engine: template "${ai.template_id}" already sent, overriding to skip`);
    return { ...ai, chosen_action: "skip", template_id: null, reasoning: `${ai.reasoning} [OVERRIDDEN: already sent]` };
  }

  // Enforce 24h rule (except post_booking_1)
  if (
    ai.chosen_action === "send_now" &&
    ai.template_id !== "post_booking_1" &&
    state.days_since_last_email !== null &&
    state.days_since_last_email < 1
  ) {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    tomorrow.setUTCHours(14, 0, 0, 0); // 9am CT
    return {
      ...ai,
      chosen_action: "schedule",
      send_at_iso: tomorrow.toISOString(),
      reasoning: `${ai.reasoning} [OVERRIDDEN: 24h rule — rescheduled]`,
    };
  }

  return ai;
}

// ─── Execution ───────────────────────────────────────────────────────────────

async function execute(ai: AIResponse, email: string, state: ContactState): Promise<void> {
  const firstName = state.pending_emails[0]
    ? undefined
    : undefined; // firstName comes from trigger context; enqueueSequence handles it

  // Cancel sequences the AI flagged
  if (ai.cancel_sequences.length > 0) {
    await cancelQueuedEmails(email, ai.cancel_sequences);
  }

  if (ai.chosen_action === "skip" || !ai.template_id) return;

  // Parse template_id into sequence + step
  const match = ai.template_id.match(/^(.+)_(\d+)$/);
  if (!match) return;
  const [, sequence, stepStr] = match;
  const step = parseInt(stepStr);

  if (ai.chosen_action === "send_now") {
    // Queue immediately (send_at = now) — cron picks it up in next run
    await supabase.from("geo_email_queue").insert({
      email,
      sequence,
      step,
      send_at: new Date().toISOString(),
    });
  } else if (ai.chosen_action === "schedule" && ai.send_at_iso) {
    await supabase.from("geo_email_queue").insert({
      email,
      sequence,
      step,
      send_at: ai.send_at_iso,
    });
  }
}

// ─── Fallback (if AI fails) ───────────────────────────────────────────────────

async function fallback(event: TriggerEvent, email: string): Promise<void> {
  const firstName = event.first_name;

  if (event.type === "booking_created") {
    await cancelQueuedEmails(email, [
      "warm_nurture", "long_term_nurture", "schedule_abandoned",
      "video_watched", "video_abandoned", "no_show",
      "audit_invite", "audit_failed", "post_call",
    ]);
    await enqueueSequence("post_booking", email, firstName);
  }

  if (event.type === "booking_cancelled") {
    await cancelQueuedEmails(email, ["post_booking"]);
    await cancelQueuedEmails(email, ["no_show", "long_term_nurture"]);
    await enqueueSequence("no_show", email, firstName);
  }
}

// ─── Decision logging ─────────────────────────────────────────────────────────

async function log(
  email: string,
  event: TriggerEvent,
  action: string,
  templateId: string | null,
  reasoning: string,
  source: "ai" | "hard_rule" | "fallback",
  executionMs: number
): Promise<void> {
  try {
    await supabase.from("geo_ai_decisions").insert({
      email,
      trigger_type: event.type,
      trigger_payload: event,
      decision_action: action,
      template_id: templateId,
      reasoning,
      decision_source: source,
      execution_time_ms: executionMs,
    });
  } catch {
    // Non-fatal — never let logging break the send pipeline
  }
}
