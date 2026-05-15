import { NextRequest, NextResponse } from "next/server";
import { supabase, resend, logEmailEvent, pickFrom, REPLY_TO } from "../../../../lib/resend";
import { EMAIL_TEMPLATES } from "../../../../lib/emails/templates";
import { snapToBusinessHours } from "../../../../lib/schedule";
import type { LeadInput, EnrollResult } from "../../../../lib/types";


export type { LeadInput, EnrollResult };

const SEQUENCE_DELAYS: Record<string, number[]> = {
  warm_nurture:       [0, 4, 48, 96, 168, 336, 504, 672, 840, 1008],
  long_term_nurture:  [720, 1440, 2160, 2880, 3600, 4320],
  post_booking:       [0, 4, 22, 46, 49],
  no_show:            [0, 48, 120, 168],
  schedule_abandoned: [0.25],
  video_watched:      [0],
  video_abandoned:    [0],
  audit_invite:       [0, 72, 168],
  audit_failed:       [0, 72, 168],
  post_call:          [24, 96, 192, 288, 384, 480, 600, 720, 840, 960, 1080, 1200],
};

export async function POST(req: NextRequest) {
  const keyAuth    = req.headers.get("x-admin-key") === process.env.CRON_SECRET;
  const cookieAuth = req.cookies.get("admin_auth")?.value === (process.env.ADMIN_TOKEN ?? "geo-admin-authenticated");
  if (!keyAuth && !cookieAuth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body   = await req.json();
  const leads: LeadInput[] = body.leads ?? [];
  if (!Array.isArray(leads) || leads.length === 0) {
    return NextResponse.json({ error: "No leads provided" }, { status: 400 });
  }

  const emails = [...new Set(leads.map(l => l.email?.trim().toLowerCase()).filter(Boolean))] as string[];

  // ── 1. Single query: get all suppressed emails in this batch ───────────────
  const { data: suppressedRows } = await supabase
    .from("geo_suppressed")
    .select("email, reason")
    .in("email", emails);
  const suppressedMap = new Map((suppressedRows ?? []).map(r => [r.email, r.reason]));

  // ── 2. Handle suppress-flagged leads (clients, etc.) ──────────────────────
  const toSuppress = leads
    .filter(l => l.suppress && !suppressedMap.has(l.email?.trim().toLowerCase() ?? ""))
    .map(l => ({ email: l.email.trim().toLowerCase(), reason: "client" }));

  if (toSuppress.length > 0) {
    await supabase.from("geo_suppressed").insert(toSuppress);
    for (const r of toSuppress) suppressedMap.set(r.email, r.reason);
  }

  // ── 3. Active leads only ───────────────────────────────────────────────────
  const activeLeads = leads
    .map(l => ({ ...l, email: l.email?.trim().toLowerCase() ?? "" }))
    .filter(l => l.email && !l.suppress && !suppressedMap.has(l.email));

  if (activeLeads.length === 0) {
    const results = leads.map(l => ({
      email: l.email,
      status: (l.suppress ? "suppressed" : suppressedMap.has(l.email) ? "suppressed" : "invalid") as EnrollResult["status"],
    }));
    return NextResponse.json({ summary: { suppressed: results.length }, results });
  }

  const activeEmails = activeLeads.map(l => l.email);

  // ── 4. Single query: all existing queue rows for these emails ──────────────
  const { data: existingQueue } = await supabase
    .from("geo_email_queue")
    .select("email, sequence, step")
    .in("email", activeEmails)
    .is("cancelled_at", null)
    .is("sent_at", null);

  const queuedSet = new Set((existingQueue ?? []).map(r => `${r.email}|${r.sequence}|${r.step}`));

  // ── 5. Single query: all existing sent events for these emails ─────────────
  const { data: existingEvents } = await supabase
    .from("geo_email_events")
    .select("email, sequence, step")
    .in("email", activeEmails)
    .eq("event_type", "sent");

  const sentSet = new Set((existingEvents ?? []).map(r => `${r.email}|${r.sequence}|${r.step}`));

  // ── 6. Build queue rows (and collect step-1 sends) ────────────────────────
  const now = new Date();
  const rowsToInsert: object[] = [];
  const step1ToSend: { lead: typeof activeLeads[0]; sequence: string; step: number }[] = [];
  const results: EnrollResult[] = [];

  // Track emails being enrolled in warm_nurture so we can cancel their long_term_nurture
  const warmNurtureEmails = new Set(
    activeLeads
      .filter(l => (l.sequences ?? ["audit_invite"]).includes("warm_nurture"))
      .map(l => l.email)
  );

  for (const lead of activeLeads) {
    const sequences = lead.sequences ?? ["audit_invite"];
    let newRows = 0;

    for (const sequence of sequences) {
      const delays = SEQUENCE_DELAYS[sequence];
      if (!delays) continue;

      for (let i = 0; i < delays.length; i++) {
        const step = i + 1;
        const key  = `${lead.email}|${sequence}|${step}`;
        if (queuedSet.has(key) || sentSet.has(key)) continue;

        const templateExists = !!(EMAIL_TEMPLATES[`${sequence}_${step}` as keyof typeof EMAIL_TEMPLATES]);
        if (!templateExists) continue;

        const isImmediate = delays[i] === 0;

        if (isImmediate) {
          // Send step-1 emails immediately — don't queue (cron only runs daily)
          step1ToSend.push({ lead, sequence, step });
          sentSet.add(key); // treat as sent for intra-batch dedup
        } else {
          const rawSendAt = new Date(now.getTime() + delays[i] * 60 * 60 * 1000);
          const sendAt = snapToBusinessHours(rawSendAt, false);
          rowsToInsert.push({
            email:      lead.email,
            first_name: lead.firstName ?? null,
            sequence,
            step,
            send_at:    sendAt.toISOString(),
            metadata:   { source: "import" },
          });
          queuedSet.add(key);
        }

        newRows++;
      }
    }

    if (newRows > 0) {
      results.push({ email: lead.email, status: "enrolled" });
    } else {
      results.push({ email: lead.email, status: "skipped", reason: "already_enrolled" });
    }
  }

  // Add results for suppressed/flagged leads
  for (const lead of leads) {
    const email = lead.email?.trim().toLowerCase() ?? "";
    if (lead.suppress) {
      results.push({ email, status: "suppressed", reason: "flagged_in_import" });
    } else if (suppressedMap.has(email) && !activeLeads.find(l => l.email === email)) {
      results.push({ email, status: "suppressed" });
    }
  }

  // ── 7. Bulk insert in chunks of 500 ───────────────────────────────────────
  const CHUNK = 500;
  for (let i = 0; i < rowsToInsert.length; i += CHUNK) {
    await supabase.from("geo_email_queue").insert(rowsToInsert.slice(i, i + CHUNK));
  }

  // ── 8. Cancel long_term_nurture for anyone being enrolled in warm_nurture ──
  // warm_nurture graduates into long_term — they must never run in parallel.
  if (warmNurtureEmails.size > 0) {
    const wEmails = [...warmNurtureEmails];
    for (let i = 0; i < wEmails.length; i += 500) {
      await supabase
        .from("geo_email_queue")
        .update({ cancelled_at: now.toISOString() })
        .in("email", wEmails.slice(i, i + 500))
        .eq("sequence", "long_term_nurture")
        .is("sent_at", null)
        .is("cancelled_at", null);
    }
  }

  // ── 9. Send step-1 emails immediately (in parallel batches of 25) ─────────
  const SEND_BATCH = 25;
  for (let i = 0; i < step1ToSend.length; i += SEND_BATCH) {
    await Promise.all(
      step1ToSend.slice(i, i + SEND_BATCH).map(async ({ lead, sequence, step }) => {
        const key = `${sequence}_${step}` as keyof typeof EMAIL_TEMPLATES;
        const templateFn = EMAIL_TEMPLATES[key];
        if (!templateFn) return;
        try {
          const { subject, html } = templateFn({ firstName: lead.firstName, email: lead.email });
          const finalHtml = html.replace(/\{\{email\}\}/g, encodeURIComponent(lead.email));
          const result = await resend.emails.send({ from: pickFrom(lead.email), replyTo: REPLY_TO, to: lead.email, subject, html: finalHtml });
          await logEmailEvent(lead.email, sequence, step, "sent", result.data?.id ?? null);
          await supabase.from("geo_email_queue").insert({
            email: lead.email,
            first_name: lead.firstName ?? null,
            sequence,
            step,
            send_at: now.toISOString(),
            sent_at: now.toISOString(),
            metadata: { source: "import" },
          });
        } catch (err) {
          // Non-fatal — log but don't fail the whole batch
          console.error("bulk enroll send failed for", lead.email, err);
        }
      })
    );
  }

  const summary = results.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return NextResponse.json({ summary, results });
}
