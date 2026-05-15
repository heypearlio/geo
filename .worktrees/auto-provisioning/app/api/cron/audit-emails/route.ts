/**
 * Fallback cron — catches audit submissions where the score page closed
 * before AuditSky completed, so /api/generate-audit-email was never called.
 *
 * Runs every 30 minutes. Checks geo_audit_history for rows with no scores
 * (overall IS NULL) that are more than 5 minutes old, polls AuditSky for
 * the result, and generates the email if complete.
 */

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../../lib/resend";
import { generateAuditEmail } from "../../../../lib/audit-email";
import { isSuppressed } from "../../../../lib/resend";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Find audits submitted in last 24h with no scores yet and no email queued
  const cutoff = new Date(Date.now() - 5 * 60 * 1000).toISOString(); // 5 min ago
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: pending } = await supabase
    .from("geo_audit_history")
    .select("*")
    .is("overall", null)
    .eq("email_queued", false)
    .lt("created_at", cutoff)
    .gte("created_at", dayAgo)
    .not("audit_id", "is", null);

  const results = { processed: 0, completed: 0, still_pending: 0, errors: 0 };

  for (const row of pending ?? []) {
    try {
      results.processed++;

      // Poll AuditSky for score
      const apiKey = process.env.AUDITSKY_API_KEY;
      if (!apiKey) continue;

      const res = await fetch(`https://app.auditsky.ai/api/embed/status/${row.audit_id}`, {
        headers: { "x-api-key": apiKey, "Origin": "https://geo.heypearl.io" },
        cache: "no-store",
      });

      if (!res.ok) { results.errors++; continue; }
      const data = await res.json();

      if (data.status === "FAILED") {
        // Audit failed — mark as processed so we don't keep re-polling it.
        await supabase.from("geo_audit_history").update({ email_queued: true }).eq("id", row.id);

        if (await isSuppressed(row.email)) continue;

        // Skip if they already have an active post_booking sequence (further along funnel)
        const { data: activeBooking } = await supabase
          .from("geo_email_queue")
          .select("id")
          .eq("email", row.email)
          .eq("sequence", "post_booking")
          .is("sent_at", null)
          .is("cancelled_at", null)
          .limit(1);
        if (activeBooking && activeBooking.length > 0) continue;

        // Cancel warm_nurture and enroll in audit_failed
        await supabase.from("geo_email_queue")
          .update({ cancelled_at: new Date().toISOString() })
          .eq("email", row.email)
          .eq("sequence", "warm_nurture")
          .is("sent_at", null)
          .is("cancelled_at", null);

        const delays = [0, 72, 168];
        const now = new Date();
        await supabase.from("geo_email_queue").insert(
          delays.map((h, i) => ({
            email: row.email,
            first_name: row.first_name || null,
            sequence: "audit_failed",
            step: i + 1,
            send_at: new Date(now.getTime() + h * 60 * 60 * 1000).toISOString(),
          }))
        );
        results.completed++;
        continue;
      }

      if (data.status !== "COMPLETED") { results.still_pending++; continue; }

      const overall = Math.round(data.overallScore ?? 0);
      const seo     = Math.round(data.seoScore ?? 0);
      const ai      = Math.round(data.aiScore ?? 0);

      // Update history with scores
      await supabase.from("geo_audit_history").update({ overall, seo, ai }).eq("id", row.id);

      if (await isSuppressed(row.email)) continue;

      // Get audit number context
      const { data: history } = await supabase
        .from("geo_audit_history")
        .select("overall, audit_number, website")
        .eq("email", row.email)
        .lt("created_at", row.created_at)
        .order("created_at", { ascending: false })
        .limit(1);

      const previousOverall = history?.[0]?.overall ?? undefined;
      const previousWebsite = history?.[0]?.website ?? undefined;

      const { subject, html, abVariant } = await generateAuditEmail({
        firstName: row.first_name || "there",
        email: row.email,
        city: row.city || "your market",
        auditNumber: row.audit_number,
        overall, seo, ai,
        previousOverall,
        auditId: row.audit_id,
        website: row.website || undefined,
        previousWebsite,
      });

      await supabase.from("geo_email_queue").insert({
        email: row.email,
        first_name: row.first_name || null,
        sequence: "warm_nurture",
        step: 1,
        send_at: new Date().toISOString(),
        metadata: { custom_html: html, custom_subject: subject, audit_number: row.audit_number, ab_variant: abVariant },
      });

      await supabase.from("geo_audit_history").update({ email_queued: true }).eq("id", row.id);
      results.completed++;
    } catch (err) {
      console.error("audit-emails cron error:", row.email, err);
      results.errors++;
    }
  }

  return NextResponse.json(results);
}
