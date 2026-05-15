import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../../lib/resend";
import { SEQUENCES } from "../../../../lib/sequences";
import { EMAIL_TEMPLATES } from "../../../../lib/emails/templates";
import { INSTANT_EMAILS, INSTANT_KEYS, ALWAYS_RESEND } from "../../../../lib/email-config";

function isAuthed(req: NextRequest) {
  const cookieAuth = req.cookies.get("admin_auth")?.value === (process.env.ADMIN_TOKEN ?? "geo-admin-authenticated");
  const keyAuth = req.headers.get("x-admin-key") === process.env.CRON_SECRET;
  return cookieAuth || keyAuth;
}

export async function GET(req: NextRequest) {
  if (!isAuthed(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const issues: string[] = [];
  const warnings: string[] = [];

  // ════════════════════════════════════════════════════════════
  // SECTION 1: CONFIG CHECKS (structural — silent failures)
  // ════════════════════════════════════════════════════════════

  // 1a. INSTANT_EMAILS vs INSTANT_KEYS must match exactly
  for (const key of INSTANT_EMAILS) {
    if (!INSTANT_KEYS.has(key)) {
      issues.push(`Config: "${key}" is in INSTANT_EMAILS but NOT in INSTANT_KEYS — AI gate will delay it 24h`);
    }
  }
  for (const key of INSTANT_KEYS) {
    if (!INSTANT_EMAILS.has(key)) {
      issues.push(`Config: "${key}" is in INSTANT_KEYS but NOT in INSTANT_EMAILS — mismatch in email-config.ts`);
    }
  }

  // 1b. ALWAYS_RESEND must be a subset of INSTANT_EMAILS
  for (const key of ALWAYS_RESEND) {
    if (!INSTANT_EMAILS.has(key)) {
      warnings.push(`Config: "${key}" is in ALWAYS_RESEND but NOT in INSTANT_EMAILS`);
    }
  }

  // 1c. DB constraint must include all sequence keys
  const sequenceKeys = SEQUENCES.map((s) => s.key);
  const { data: constraintRows } = await supabase.rpc("get_email_queue_constraint");
  const constraintDef: string | null = (constraintRows?.[0]?.constraint_def) ?? null;

  if (constraintDef) {
    for (const key of sequenceKeys) {
      if (!constraintDef.includes(`'${key}'`)) {
        issues.push(`Config: Sequence "${key}" missing from DB constraint — queue inserts silently fail`);
      }
    }
  } else {
    warnings.push("Config: Could not read DB constraint — get_email_queue_constraint function may be missing");
  }

  // 1d. All sequences must have a step 1 template
  for (const seq of SEQUENCES) {
    const key = `${seq.key}_1` as keyof typeof EMAIL_TEMPLATES;
    if (!EMAIL_TEMPLATES[key]) {
      issues.push(`Config: No template for "${seq.key}" step 1 — emails will silently skip`);
    }
  }

  // ════════════════════════════════════════════════════════════
  // SECTION 2: OPERATIONAL CHECKS (real-time delivery health)
  // ════════════════════════════════════════════════════════════

  const now = new Date();

  // 2a. Stuck emails — past their send_at by 30+ minutes and never sent
  const thirtyMinAgo = new Date(now.getTime() - 30 * 60 * 1000).toISOString();
  const { data: stuckEmails, error: stuckError } = await supabase
    .from("geo_email_queue")
    .select("id, email, sequence, step, send_at")
    .lt("send_at", thirtyMinAgo)
    .is("sent_at", null)
    .is("cancelled_at", null)
    .limit(10);

  const stuckCount = stuckEmails?.length ?? 0;
  if (!stuckError && stuckCount > 0) {
    const oldest = stuckEmails![0];
    const minutesLate = Math.round((now.getTime() - new Date(oldest.send_at).getTime()) / 60000);
    issues.push(`Delivery: ${stuckCount} email${stuckCount > 1 ? "s" : ""} stuck in queue — oldest is ${minutesLate} min overdue (${oldest.sequence} step ${oldest.step} for ${oldest.email}). Cron may be down.`);
  }

  // 2b. Cron health — when did the cron last successfully send an email?
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();
  const { data: recentSend } = await supabase
    .from("geo_email_queue")
    .select("sent_at")
    .not("sent_at", "is", null)
    .order("sent_at", { ascending: false })
    .limit(1);

  const lastSentAt = recentSend?.[0]?.sent_at ?? null;

  // Only flag cron as down if there are stuck emails AND nothing sent recently
  // (no stuck emails + no recent send = just quiet, not broken)
  if (stuckCount > 0 && lastSentAt && lastSentAt < twoHoursAgo) {
    const hoursAgo = Math.round((now.getTime() - new Date(lastSentAt).getTime()) / 3600000);
    issues.push(`Cron: Last successful send was ${hoursAgo} hour${hoursAgo !== 1 ? "s" : ""} ago with ${stuckCount} emails waiting — cron job may be down`);
  } else if (stuckCount > 0 && !lastSentAt) {
    issues.push(`Cron: No emails have ever been sent via queue but ${stuckCount} are waiting — cron job may never have run`);
  }

  // 2c. Spam complaints in the last 24 hours (even 1 is serious)
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const { data: complaints } = await supabase
    .from("geo_email_events")
    .select("email, sequence, step, created_at")
    .eq("event_type", "complained")
    .gt("created_at", oneDayAgo);

  const complaintCount = complaints?.length ?? 0;
  if (complaintCount > 0) {
    issues.push(`Deliverability: ${complaintCount} spam complaint${complaintCount > 1 ? "s" : ""} in the last 24h — this damages your sender reputation. Check Resend dashboard.`);
  }

  // 2d. Bounce rate in the last 24 hours
  const { data: recentSends24h } = await supabase
    .from("geo_email_events")
    .select("id")
    .eq("event_type", "sent")
    .gt("created_at", oneDayAgo);

  const { data: recentBounces } = await supabase
    .from("geo_email_events")
    .select("email, sequence, step")
    .eq("event_type", "bounced")
    .gt("created_at", oneDayAgo);

  const sentCount24h = recentSends24h?.length ?? 0;
  const bounceCount24h = recentBounces?.length ?? 0;
  const bounceRate = sentCount24h > 0 ? (bounceCount24h / sentCount24h) * 100 : 0;

  if (bounceCount24h >= 3 && bounceRate >= 5) {
    issues.push(`Deliverability: ${bounceRate.toFixed(1)}% bounce rate in last 24h (${bounceCount24h} bounces / ${sentCount24h} sent) — above safe threshold. Check for bad email addresses.`);
  } else if (bounceCount24h >= 2) {
    warnings.push(`Deliverability: ${bounceCount24h} bounces in last 24h — monitor closely`);
  }

  // 2e. Queue depth — total emails waiting to go out
  const { count: queueDepth } = await supabase
    .from("geo_email_queue")
    .select("*", { count: "exact", head: true })
    .is("sent_at", null)
    .is("cancelled_at", null);

  // High queue depth alone isn't an issue — just informational
  // But flag if it's extremely large (possible loop or runaway enqueue)
  if ((queueDepth ?? 0) > 500) {
    warnings.push(`Queue: ${queueDepth} emails pending — unusually high. Check for runaway enqueue.`);
  }

  // ════════════════════════════════════════════════════════════
  // SUMMARY
  // ════════════════════════════════════════════════════════════

  return NextResponse.json({
    healthy: issues.length === 0,
    issues,
    warnings,
    operational: {
      stuck_emails: stuckCount,
      queue_depth: queueDepth ?? 0,
      last_sent_at: lastSentAt,
      bounces_24h: bounceCount24h,
      sent_24h: sentCount24h,
      complaints_24h: complaintCount,
      bounce_rate_24h: bounceRate,
    },
    checks: {
      instant_emails: [...INSTANT_EMAILS],
      instant_keys: [...INSTANT_KEYS],
      always_resend: [...ALWAYS_RESEND],
      db_constraint_readable: !!constraintDef,
      sequences: sequenceKeys,
      templates: Object.keys(EMAIL_TEMPLATES),
    },
  });
}
