import * as Sentry from "@sentry/nextjs";
import { NextRequest, NextResponse } from "next/server";
import { resend, supabase, logEmailEvent, isSuppressed, pickFrom, REPLY_TO } from "../../../lib/resend";
import { EMAIL_TEMPLATES } from "../../../lib/emails/templates";
import { shouldSend, logShouldSendDecision } from "../../../lib/should-send";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const checkInId = Sentry.captureCheckIn({
    monitorSlug: "email-queue-cron",
    status: "in_progress",
  });

  // Drift correction — if the system was down for an extended period, overdue emails
  // would all fire at once. Instead, shift every pending email in the affected
  // (email, sequence) group forward by the same amount the earliest overdue row
  // drifted, so the relative spacing between emails is preserved.
  const DRIFT_THRESHOLD_MS = 2 * 60 * 60 * 1000; // 2 hours — more than one missed cron cycle
  const driftCutoff = new Date(Date.now() - DRIFT_THRESHOLD_MS).toISOString();
  const { data: overdueRows } = await supabase
    .from("geo_email_queue")
    .select("email, sequence, step, send_at")
    .is("sent_at", null)
    .is("cancelled_at", null)
    .lt("send_at", driftCutoff)
    .order("send_at", { ascending: true });

  if (overdueRows && overdueRows.length > 0) {
    // One drift value per (email, sequence) — use the earliest overdue row's drift
    const driftMap = new Map<string, number>();
    for (const row of overdueRows) {
      const key = `${row.email}|${row.sequence}`;
      if (!driftMap.has(key)) {
        driftMap.set(key, Date.now() - new Date(row.send_at).getTime());
      }
    }
    // Apply shift: moves the overdue row to ~now, and all later rows forward by the same gap
    for (const [key, driftMs] of driftMap) {
      const [email, sequence] = key.split("|");
      await supabase.rpc("shift_pending_emails", { p_email: email, p_sequence: sequence, p_drift_ms: driftMs });
    }
  }

  // Atomically claim a batch — marks sent_at immediately so concurrent runs
  // cannot pick up the same row. Uses FOR UPDATE SKIP LOCKED in the DB.
  const { data: pending, error } = await supabase.rpc("claim_email_queue_batch", { batch_size: 50 });

  if (error) {
    console.error("Queue claim error:", error);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }

  if (!pending || pending.length === 0) {
    return NextResponse.json({ sent: 0 });
  }

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const row of pending) {
    const key = `${row.sequence}_${row.step}` as keyof typeof EMAIL_TEMPLATES;
    const templateFn = EMAIL_TEMPLATES[key];

    if (!templateFn) {
      // Cancel the row — no template exists for it
      await supabase.from("geo_email_queue").update({ cancelled_at: new Date().toISOString(), sent_at: null }).eq("id", row.id);
      continue;
    }

    // Block test/fake addresses — never send to @example.com or known test domains
    const blockedDomains = ["example.com", "test.com", "testlead.com"];
    const emailDomain = row.email.split("@")[1]?.toLowerCase();
    if (!emailDomain || blockedDomains.includes(emailDomain)) {
      await supabase.from("geo_email_queue").update({ cancelled_at: new Date().toISOString(), sent_at: null }).eq("id", row.id);
      continue;
    }

    // Skip suppressed contacts — cancel the row so it won't resurface.
    // Exception: proof_nurture sends to "client"-suppressed contacts (paid but not yet complete).
    if (row.sequence !== "hot_proof" && await isSuppressed(row.email)) {
      await supabase.from("geo_email_queue").update({ cancelled_at: new Date().toISOString(), sent_at: null }).eq("id", row.id);
      continue;
    }

    const templateData = {
      firstName:    row.first_name ?? undefined,
      city:         row.metadata?.city as string | undefined,
      auditId:      row.metadata?.audit_id as string | undefined,
      email:        row.email,
      stripeLink:   row.metadata?.stripe_link as string | undefined,
      packagePrice: row.metadata?.package_price as string | undefined,
      overall:      row.metadata?.overall as number | undefined,
      seo:          row.metadata?.seo as number | undefined,
      ai:           row.metadata?.ai as number | undefined,
    };
    const { html: templateHtml } = templateFn(templateData);

    // Use AI-generated custom HTML/subject if available (post_call step 1 or lead_nurture step 1)
    const hasCustom = !!row.metadata?.custom_html;
    const html = hasCustom ? row.metadata.custom_html as string : templateHtml;
    const subject = (hasCustom && row.metadata?.custom_subject)
      ? row.metadata.custom_subject as string
      : templateFn(templateData).subject;

    // AI send gate — should this email go out right now?
    const gateStart = Date.now();
    const gate = await shouldSend(row);
    await logShouldSendDecision(row.email, row.sequence, row.step, gate.allowed, gate.reason, Date.now() - gateStart);

    if (!gate.allowed) {
      const gateBlocks = ((row.metadata?.gate_blocks as number) ?? 0) + 1;

      if (gateBlocks >= 3) {
        // Stall protection — AI has blocked 3 times. Skip this email and move on.
        await supabase.from("geo_email_queue").update({ cancelled_at: new Date().toISOString(), sent_at: null }).eq("id", row.id);
        await logShouldSendDecision(row.email, row.sequence, row.step, false, `Cancelled after ${gateBlocks} AI blocks — skipped, not force-sent`, 0);
        console.log(`AI gate stall protection: cancelled ${row.sequence}_${row.step} for ${row.email} after ${gateBlocks} blocks`);
        skipped++;
        continue;
      } else {
        // Push send_at forward 24h and release the claim so it retries next cycle
        const newSendAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        const updatedMetadata = { ...(row.metadata ?? {}), gate_blocks: gateBlocks };
        await supabase.from("geo_email_queue").update({ sent_at: null, send_at: newSendAt, metadata: updatedMetadata }).eq("id", row.id);
        console.log(`AI gate blocked ${row.sequence}_${row.step} for ${row.email} (block ${gateBlocks}/3): ${gate.reason}`);
        skipped++;
        continue;
      }
    }

    try {
      const finalHtml = html.replace(/\{\{email\}\}/g, encodeURIComponent(row.email));
      const result = await resend.emails.send({
        from:    pickFrom(row.email),
        replyTo: REPLY_TO,
        to: row.email,
        subject: subject,
        html: finalHtml,
      });

      await logEmailEvent(row.email, row.sequence, row.step, "sent", result.data?.id ?? null);
      sent++;
    } catch (err) {
      // Send failed — clear sent_at so it will be retried next run
      console.error(`Failed to send ${key} to ${row.email}:`, err);
      await supabase.from("geo_email_queue").update({ sent_at: null }).eq("id", row.id);
      failed++;
    }
  }

  // Backfill step 1 for leads enrolled without completing the score page.
  // Finds leads with warm_nurture step 2+ queued but no step 1 row at all.
  const { data: missingLeads } = await supabase.rpc("get_leads_missing_step1");
  if (missingLeads && missingLeads.length > 0) {
    for (const lead of missingLeads as { email: string; first_name: string | null }[]) {
      // Look up audit scores if available
      const { data: auditRow } = await supabase
        .from("geo_audit_history")
        .select("audit_id, overall, seo, ai, city")
        .eq("email", lead.email)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const meta: Record<string, unknown> = { backfilled: true };
      if (auditRow) {
        if (auditRow.audit_id) meta.audit_id = auditRow.audit_id;
        if (auditRow.city)     meta.city     = auditRow.city;
        if (auditRow.overall != null) meta.overall = auditRow.overall;
        if (auditRow.seo     != null) meta.seo     = auditRow.seo;
        if (auditRow.ai      != null) meta.ai      = auditRow.ai;
      }

      // Dedup index silently ignores if step 1 already exists
      await supabase.from("geo_email_queue").insert({
        email:      lead.email,
        first_name: lead.first_name,
        sequence:   "warm_nurture",
        step:       1,
        send_at:    new Date().toISOString(),
        metadata:   meta,
      });
    }
  }

  Sentry.captureCheckIn({ monitorSlug: "email-queue-cron", status: "ok", checkInId });
  return NextResponse.json({ sent, failed, skipped });
}
