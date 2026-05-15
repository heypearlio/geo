/**
 * AI Send Gate — runs inside the cron send loop before every email.
 * Asks GPT-4o-mini: "should this email send right now?"
 * Returns { allowed: boolean, reason: string }.
 *
 * Instant emails (warm_nurture_1, post_booking_1, pre_interview_1) always pass
 * without an AI call — they are expected by the contact.
 */

import OpenAI from "openai";
import { supabase } from "./resend";
import { INSTANT_KEYS } from "./email-config";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY ?? "sk-build-placeholder" });

interface QueueRow {
  id: string;
  email: string;
  sequence: string;
  step: number;
  send_at: string;
  first_name?: string | null;
  metadata?: Record<string, unknown> | null;
}

interface ShouldSendResult {
  allowed: boolean;
  reason: string;
}

const SYSTEM_PROMPT = `You are the email send gate for GEO by HeyPearl, an AI visibility service for real estate agents.

You will receive an email that is about to be sent, plus the contact's recent email history. Your job is to decide: should this email send RIGHT NOW, yes or no?

HARD RULES — NEVER VIOLATE:
1. Always allow instant emails: warm_nurture step 1, post_booking step 1, pre_interview step 1.
2. Never allow an email if one was sent within the last 20 hours (unless it is an instant email per rule 1).
3. Never allow a duplicate — if the same sequence + step was already sent to this contact, block it.
4. If the contact has a booking coming up (active post_booking sequence), do not send warm_nurture or nurture emails.
5. If there are no red flags, allow the send.

Return JSON: { "should_send": true/false, "reason": "one sentence" }`;

export async function shouldSend(row: QueueRow): Promise<ShouldSendResult> {
  // Kill switch — set USE_AI_DECISIONS=false in Vercel env to bypass AI gate entirely
  if (process.env.USE_AI_DECISIONS === "false") {
    return { allowed: true, reason: "AI gate disabled" };
  }

  const key = `${row.sequence}_${row.step}`;

  // Instant emails always pass — no AI call needed
  if (INSTANT_KEYS.has(key)) {
    return { allowed: true, reason: "Instant email — always allowed" };
  }

  try {
    // Pull recent email history (last 10 sends)
    const { data: recentSends } = await supabase
      .from("geo_email_events")
      .select("sequence, step, created_at")
      .eq("email", row.email)
      .eq("event_type", "sent")
      .order("created_at", { ascending: false })
      .limit(10);

    // Check for active post_booking sequence
    const { data: activeBooking } = await supabase
      .from("geo_email_queue")
      .select("id")
      .eq("email", row.email)
      .eq("sequence", "post_booking")
      .is("sent_at", null)
      .is("cancelled_at", null)
      .limit(1);

    const context = {
      email_to_send: { sequence: row.sequence, step: row.step, send_at: row.send_at },
      recent_sends: recentSends ?? [],
      has_active_booking: (activeBooking?.length ?? 0) > 0,
      current_time_utc: new Date().toISOString(),
    };

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0,
      max_tokens: 100,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: JSON.stringify(context) },
      ],
    });

    const raw = JSON.parse(response.choices[0].message.content!);
    const allowed = raw.should_send === true;
    const reason = raw.reason ?? (allowed ? "AI approved" : "AI blocked");

    return { allowed, reason };
  } catch (err) {
    // If AI call fails, allow the send (fail open — never block on AI error)
    console.error("shouldSend AI call failed, failing open:", err);
    return { allowed: true, reason: `AI gate error — failed open: ${err}` };
  }
}

export async function logShouldSendDecision(
  email: string,
  sequence: string,
  step: number,
  allowed: boolean,
  reason: string,
  executionMs: number
): Promise<void> {
  try {
    await supabase.from("geo_ai_decisions").insert({
      email,
      trigger_type: "cron_send_gate",
      trigger_payload: { sequence, step },
      decision_action: allowed ? "send_now" : "skip",
      template_id: `${sequence}_${step}`,
      reasoning: reason,
      decision_source: "ai",
      execution_time_ms: executionMs,
    });
  } catch {
    // Non-fatal
  }
}
