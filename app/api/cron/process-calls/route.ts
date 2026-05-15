import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { enqueueSequence, cancelQueuedEmails, supabase } from "../../../../lib/resend";

const FIREFLIES_API = "https://api.fireflies.ai/graphql";
const FIREFLIES_KEY = process.env.FIREFLIES_API_KEY ?? "";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY ?? "sk-build-placeholder" });

function isAuthed(req: NextRequest) {
  return req.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`;
}

async function fetchFirefliesTranscripts(fromMs: number, toMs: number) {
  const res = await fetch(FIREFLIES_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${FIREFLIES_KEY}`,
    },
    body: JSON.stringify({
      query: `{
        transcripts(limit: 20) {
          id title date duration organizer_email participants
          summary { overview action_items shorthand_bullet }
        }
      }`,
    }),
  });
  const data = await res.json();
  const all: any[] = data?.data?.transcripts ?? [];
  // Filter to meetings within the time window
  return all.filter(t => t.date >= fromMs && t.date <= toMs);
}

async function isTrueShow(transcript: any): Promise<boolean> {
  // Filter out Fireflies bot
  const realParticipants = (transcript.participants as string[]).filter(
    p => !p.includes("fireflies.ai")
  );
  // Need at least 2 real participants and at least 3 minutes
  return realParticipants.length >= 2 && transcript.duration >= 3;
}

async function generatePersonalizedEmail(
  firstName: string,
  summary: { overview?: string; action_items?: string; shorthand_bullet?: string }
): Promise<string> {
  const context = [
    summary.overview ? `Meeting overview:\n${summary.overview}` : "",
    summary.action_items ? `Action items discussed:\n${summary.action_items}` : "",
  ].filter(Boolean).join("\n\n");

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 800,
    messages: [{
      role: "user",
      content: `You are Misti Bruton, founder of HeyPearl, writing a follow-up email to a real estate agent after a strategy call about AI visibility and GEO (Generative Engine Optimization).

Write a SHORT, warm, personal follow-up email to ${firstName || "them"}. Reference specific things from our call so they know you were listening. 3-4 short paragraphs max. No subject line — just the body. No em dashes. End with a clear next step.

Misti's voice: direct, genuine, no fluff, like a text from a friend who happens to be an expert.

Call notes:
${context}`,
    }],
  });

  const text = completion.choices[0]?.message?.content ?? "";

  // Wrap in basic email HTML
  const paragraphs = text.trim().split(/\n\n+/).map(p =>
    `<p style="margin:0 0 16px;color:#1a1a2e;font-size:15px;line-height:1.6;">${p.replace(/\n/g, "<br>")}</p>`
  ).join("");

  return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;">${paragraphs}</div>`;
}

export async function GET(req: NextRequest) {
  if (!isAuthed(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = Date.now();
  // Look for meetings that ended between 20 min and 90 min ago
  const windowEnd   = now - 20 * 60 * 1000;
  const windowStart = now - 90 * 60 * 1000;

  // Find pending scheduled calls in that window — GEO strategy calls only
  const { data: calls, error } = await supabase
    .from("geo_scheduled_calls")
    .select("*")
    .eq("outcome", "pending")
    .eq("event_type", "geo_strategy_call")
    .gte("meeting_time", new Date(windowStart).toISOString())
    .lte("meeting_time", new Date(windowEnd).toISOString());

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!calls || calls.length === 0) return NextResponse.json({ ok: true, processed: 0 });

  // Fetch Fireflies transcripts for this window (add 2h for meeting duration)
  const transcripts = await fetchFirefliesTranscripts(windowStart, now);

  const results: any[] = [];

  for (const call of calls) {
    const callMs = new Date(call.meeting_time).getTime();

    // Find a Fireflies transcript within ±30 min of the scheduled meeting time
    const match = transcripts.find(t => Math.abs(t.date - callMs) <= 30 * 60 * 1000);

    let outcome: "show" | "no_show";
    let fireflyId: string | null = null;
    let transcriptSummary: string | null = null;
    let customEmailHtml: string | null = null;

    if (match && await isTrueShow(match)) {
      outcome = "show";
      fireflyId = match.id;
      transcriptSummary = match.summary?.overview ?? null;

      // Generate personalized post_call step 1 email
      try {
        customEmailHtml = await generatePersonalizedEmail(call.first_name ?? "", match.summary ?? {});
      } catch (e) {
        console.error("Claude email gen failed:", e);
      }

      // Cancel remaining post_booking — post_call must be triggered manually by admin
      await cancelQueuedEmails(call.email, ["post_booking"]);
    } else {
      // No matching transcript or no-show detected
      outcome = "no_show";
      if (match) fireflyId = match.id; // Fireflies recorded it but they didn't show

      await cancelQueuedEmails(call.email, ["post_booking"]);
      await enqueueSequence("no_show", call.email, call.first_name ?? undefined);
    }

    // Save custom email to DB for cron to inject into step 1 when sending
    await supabase.from("geo_scheduled_calls").update({
      outcome,
      fireflies_id: fireflyId,
      transcript_summary: transcriptSummary,
      custom_email_html: customEmailHtml,
      processed_at: new Date().toISOString(),
    }).eq("id", call.id);

    results.push({ email: call.email, outcome, fireflies_match: !!match });
    console.log(`process-calls: ${call.email} → ${outcome}`);
  }

  // ── PODCAST POST-INTERVIEW EMAILS ───────────────────────────────────────────
  // Send 1 follow-up email 1 hour after a pre-interview meeting passes.
  // No Fireflies needed — just time-based.
  const oneHourAgo = new Date(now - 60 * 60 * 1000).toISOString();
  const { data: podcastCalls } = await supabase
    .from("geo_scheduled_calls")
    .select("*")
    .eq("outcome", "pending")
    .eq("event_type", "pre_interview")
    .lte("meeting_time", oneHourAgo);

  for (const call of podcastCalls ?? []) {
    await enqueueSequence("post_interview", call.email, call.first_name ?? undefined);
    await supabase.from("geo_scheduled_calls").update({
      outcome: "post_interview_sent",
      processed_at: new Date().toISOString(),
    }).eq("id", call.id);
    results.push({ email: call.email, outcome: "post_interview", fireflies_match: false });
  }

  return NextResponse.json({ ok: true, processed: results.length, results });
}
