import { NextRequest, NextResponse } from "next/server";
import { supabase, isSuppressed } from "../../../lib/resend";
import { dn } from "../../../lib/emails/dn";
import { buildLeadSource } from "../../../lib/source";

export async function POST(req: NextRequest) {
  const { email, firstName: rawFirstName, city, website, auditId, overall, seo, ai, affiliateSlug } = await req.json();
  const firstName = dn(rawFirstName) ?? undefined;
  const { source_tag, source_url } = buildLeadSource(req, affiliateSlug || null);

  if (!email || overall == null || seo == null || ai == null) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Don't email suppressed contacts
  if (await isSuppressed(email)) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  // Dedup check: has this email already received or been queued a warm_nurture step 1?
  const { data: existing } = await supabase
    .from("geo_email_queue")
    .select("id, sent_at, created_at")
    .eq("email", email)
    .eq("sequence", "warm_nurture")
    .eq("step", 1)
    .is("cancelled_at", null)
    .limit(1);

  if (existing && existing.length > 0) {
    if (existing[0].sent_at) {
      // Already sent — do not send another score email
      return NextResponse.json({ ok: true, skipped: true, reason: "score_email_already_sent" });
    }
    // Created within the last 10 minutes — spam/double-submit protection
    const createdAt = new Date(existing[0].created_at).getTime();
    if (Date.now() - createdAt < 10 * 60 * 1000) {
      return NextResponse.json({ ok: true, skipped: true, reason: "duplicate_within_10min" });
    }
    // Pending but not yet sent — cancel it so the new score replaces it
    await supabase
      .from("geo_email_queue")
      .update({ cancelled_at: new Date().toISOString() })
      .eq("id", existing[0].id);
  }

  // Look up audit history to get audit number + previous score + previous website
  // Exclude the pending row for this audit_id (overall=null) — it's the placeholder we're about to fill
  const { data: history } = await supabase
    .from("geo_audit_history")
    .select("id, overall, audit_number, email_queued, website, audit_id, first_name")
    .eq("email", email)
    .order("created_at", { ascending: false })
    .limit(10);

  // Check if a placeholder row already exists for this audit_id (created at form submission)
  const existingRow = history?.find(r => r.audit_id === auditId && r.overall === null);
  // Prior completed audits (exclude the placeholder)
  const completedHistory = history?.filter(r => r.overall !== null) ?? [];

  const auditNumber = completedHistory.length + 1;
  const previousOverall = completedHistory?.[0]?.overall ?? undefined;
  const previousWebsite = completedHistory?.[0]?.website ?? undefined;

  // Update existing placeholder row or insert new one
  let newRecord: { id: string } | null = null;
  if (existingRow) {
    await supabase.from("geo_audit_history").update({
      first_name: firstName || existingRow.first_name || null,
      city: city || null,
      website: website || null,
      overall,
      seo,
      ai,
      audit_number: auditNumber,
      email_queued: false,
      source_tag,
      source_url,
    }).eq("id", existingRow.id);
    newRecord = { id: existingRow.id };
  } else {
    const { data: inserted } = await supabase
      .from("geo_audit_history")
      .insert({
        email,
        first_name: firstName || null,
        city: city || null,
        website: website || null,
        audit_id: auditId || null,
        overall,
        seo,
        ai,
        audit_number: auditNumber,
        email_queued: false,
        source_tag,
        source_url,
      })
      .select("id")
      .single();
    newRecord = inserted;
  }

  // Determine template lookup keys
  const scoreTier = overall >= 70 ? "high" : overall >= 40 ? "mid" : "low";
  const scoreDirection = auditNumber === 1 ? "first"
    : previousOverall == null ? "first"
    : overall > previousOverall ? "improvement"
    : overall < previousOverall ? "drop"
    : "same";
  const lookupNumber = Math.min(auditNumber, 3);
  const pointChange = previousOverall != null ? Math.abs(overall - previousOverall) : 0;

  // Look up template — try exact match, then fallbacks
  let template: { subject_template: string; body_template: string } | null = null;

  const attempts = [
    { audit_number: lookupNumber, score_tier: scoreTier, score_direction: scoreDirection },
    { audit_number: lookupNumber, score_tier: scoreTier, score_direction: undefined },
    { audit_number: 1, score_tier: scoreTier, score_direction: "first" },
    { audit_number: 1, score_tier: "mid", score_direction: "first" },
  ];

  for (const attempt of attempts) {
    let q = supabase
      .from("geo_audit_email_templates")
      .select("subject_template, body_template")
      .eq("audit_number", attempt.audit_number)
      .eq("score_tier", attempt.score_tier);
    if (attempt.score_direction) q = q.eq("score_direction", attempt.score_direction);
    const { data } = await q.limit(1).single();
    if (data) { template = data; break; }
  }

  if (!template) {
    console.error("No audit email template found", { lookupNumber, scoreTier, scoreDirection });
    return NextResponse.json({ error: "No template found" }, { status: 500 });
  }

  // Fill merge fields
  const fill = (s: string) => s
    .replace(/\{\{firstName\}\}/g, firstName || "Hey")
    .replace(/\{\{overall\}\}/g, String(overall))
    .replace(/\{\{seo\}\}/g, String(seo))
    .replace(/\{\{ai\}\}/g, String(ai))
    .replace(/\{\{city\}\}/g, city || "your market")
    .replace(/\{\{pointChange\}\}/g, String(pointChange))
    .replace(/\{\{auditNumber\}\}/g, String(auditNumber));

  const subject = fill(template.subject_template);
  const html = fill(template.body_template);

  // Insert into queue — dedup check above ensures at most 1 active score email per lead
  await supabase.from("geo_email_queue").insert({
    email,
    first_name: firstName || null,
    sequence: "warm_nurture",
    step: 1,
    send_at: new Date().toISOString(),
    metadata: { custom_html: html, custom_subject: subject, audit_number: auditNumber, score_tier: scoreTier, score_direction: scoreDirection },
  });

  // Mark as queued in history
  if (newRecord?.id) {
    await supabase.from("geo_audit_history").update({ email_queued: true }).eq("id", newRecord.id);
  }

  return NextResponse.json({ ok: true, auditNumber });
}
