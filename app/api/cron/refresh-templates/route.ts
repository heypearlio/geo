/**
 * Weekly cron — refreshes audit email templates with low open rates.
 *
 * Runs every Monday at 11am. Checks each template in geo_audit_email_templates
 * that has enough sends to be statistically meaningful (20+). If the winning
 * subject line open rate is below 20%, deletes the template row so it
 * regenerates fresh on the next send (triggering a new Claude generation
 * with performance context in the prompt).
 */

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../../lib/resend";

const MIN_SENDS = 20;          // need at least this many sends before judging
const OPEN_RATE_THRESHOLD = 0.20; // below 20% open rate = refresh

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: templates } = await supabase
    .from("geo_audit_email_templates")
    .select("id, audit_number, score_tier, score_direction, send_count_a, send_count_b, open_count_a, open_count_b, usage_count");

  const results = { reviewed: 0, refreshed: 0, kept: 0 };

  for (const t of templates ?? []) {
    const totalSends = (t.send_count_a ?? 0) + (t.send_count_b ?? 0);
    if (totalSends < MIN_SENDS) continue; // not enough data yet

    results.reviewed++;

    // Best open rate across both variants
    const openRateA = t.send_count_a > 0 ? t.open_count_a / t.send_count_a : 0;
    const openRateB = t.send_count_b > 0 ? t.open_count_b / t.send_count_b : 0;
    const bestOpenRate = Math.max(openRateA, openRateB);

    if (bestOpenRate < OPEN_RATE_THRESHOLD) {
      // Delete so it regenerates fresh on next send
      await supabase.from("geo_audit_email_templates").delete().eq("id", t.id);
      console.log(
        `Refreshing template [audit_${t.audit_number} ${t.score_tier} ${t.score_direction}] — best open rate: ${(bestOpenRate * 100).toFixed(1)}% (${totalSends} sends)`
      );
      results.refreshed++;
    } else {
      results.kept++;
    }
  }

  return NextResponse.json(results);
}
