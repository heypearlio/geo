import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../../lib/resend";
import { TEST_EMAILS } from "../../../../lib/test-emails";

function isAuthed(req: NextRequest) {
  const cookieAuth = req.cookies.get("admin_auth")?.value === (process.env.ADMIN_TOKEN ?? "geo-admin-authenticated");
  const keyAuth    = req.headers.get("x-admin-key") === process.env.CRON_SECRET;
  return cookieAuth || keyAuth;
}

function deriveSource(sequences: string[], metadata: Record<string, string> | null): string {
  const metaSrc = metadata?.source;
  if (metaSrc) return metaSrc;
  if (sequences.includes("post_booking")) return "calendly_geo";
  if (sequences.includes("pre_interview")) return "calendly_podcast";
  if (sequences.includes("audit_failed") || sequences.includes("audit_invite")) return "audit";
  // warm_nurture covers both audit and claim leads — source is in metadata
  return "unknown";
}

const TEST_FILTER = `(${TEST_EMAILS.join(",")})`;

export async function GET(req: NextRequest) {
  if (!isAuthed(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date();

  // All "today/week/month" boundaries are in Central Time (CDT = UTC-5, CST = UTC-6).
  // Vercel runs UTC, so setHours() would give UTC midnight — wrong for CT users.
  // Compute CT midnight: 5am UTC = midnight CDT (April-Oct); 6am UTC = midnight CST (Nov-Mar).
  const CT_OFFSET_HOURS = 6; // CST = UTC-6 (during CDT, 1hr off — acceptable for a dashboard)
  const todayStart = new Date(now);
  todayStart.setUTCHours(CT_OFFSET_HOURS, 0, 0, 0);
  if (todayStart > now) todayStart.setUTCDate(todayStart.getUTCDate() - 1);

  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Week/month boundaries also in CT
  const weekStart = new Date(todayStart);
  weekStart.setUTCDate(weekStart.getUTCDate() - weekStart.getUTCDay()); // Sunday CT
  const monthStart = new Date(todayStart);
  monthStart.setUTCDate(1); // 1st of month, midnight CT

  // Supabase caps responses at 1000 rows regardless of .limit() — paginate any query
  // that could exceed that at scale (sent events, opens, clicks, leads, etc.)
  const PAGE = 1000;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function fetchAllPages<T extends object>(buildQuery: (from: number) => any): Promise<T[]> {
    const all: T[] = [];
    let from = 0;
    while (true) {
      const { data } = await buildQuery(from);
      if (!data?.length) break;
      all.push(...data);
      if (data.length < PAGE) break;
      from += PAGE;
    }
    return all;
  }

  const [
    { data: todayQueueRows },
    { data: upcomingCallRows },
    { data: pendingCalls },
    { data: bounces24h },
    { data: complaints24h },
    { count: queueDepth },
    { data: pipelinePostCall },
    { data: pipelineProof },
    // Paginated — all could exceed 1000 rows at scale
    recentQueueRows,
    sentTodayRows,
    sent30dRows,
    opened30dRows,
    clickRows7d,
    allCalls,
    sourceRows,
    allLeadRows,
  ] = await Promise.all([
    // Small / bounded queries — safe without pagination
    supabase.from("geo_email_queue")
      .select("email, first_name, sequence, step, metadata, send_at")
      .eq("step", 1)
      .gte("send_at", todayStart.toISOString())
      .not("email", "in", TEST_FILTER)
      .order("send_at", { ascending: false })
      .limit(100),

    supabase.from("geo_scheduled_calls")
      .select("email, first_name, meeting_time")
      .gt("meeting_time", now.toISOString())
      .eq("outcome", "pending")
      .order("meeting_time", { ascending: true })
      .limit(20),

    supabase.from("geo_scheduled_calls")
      .select("id, email, first_name, meeting_time, event_type")
      .eq("outcome", "pending")
      .lt("meeting_time", now.toISOString())
      .order("meeting_time", { ascending: false }),

    supabase.from("geo_email_events")
      .select("resend_email_id")
      .eq("event_type", "bounced")
      .gte("created_at", new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()),

    supabase.from("geo_email_events")
      .select("resend_email_id")
      .eq("event_type", "complained")
      .gte("created_at", new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()),

    supabase.from("geo_email_queue")
      .select("*", { count: "exact", head: true })
      .is("sent_at", null)
      .is("cancelled_at", null),

    supabase.from("geo_email_queue")
      .select("email")
      .eq("sequence", "post_call")
      .is("sent_at", null)
      .is("cancelled_at", null)
      .limit(500),

    supabase.from("geo_email_queue")
      .select("email")
      .eq("sequence", "proof")
      .is("sent_at", null)
      .is("cancelled_at", null)
      .limit(500),

    // Paginated queries — all run in parallel, each pages sequentially internally
    fetchAllPages<{ email: string }>(from =>
      supabase.from("geo_email_queue")
        .select("email")
        .eq("step", 1)
        .gte("send_at", sevenDaysAgo.toISOString())
        .not("email", "in", TEST_FILTER)
        .not("email", "ilike", "%@example.com")
        .range(from, from + PAGE - 1)
    ),

    fetchAllPages<{ resend_email_id: string }>(from =>
      supabase.from("geo_email_events")
        .select("resend_email_id")
        .eq("event_type", "sent")
        .gte("created_at", todayStart.toISOString())
        .not("email", "in", TEST_FILTER)
        .not("email", "ilike", "%@example.com")
        .range(from, from + PAGE - 1)
    ),

    fetchAllPages<{ resend_email_id: string }>(from =>
      supabase.from("geo_email_events")
        .select("resend_email_id")
        .eq("event_type", "sent")
        .gte("created_at", thirtyDaysAgo.toISOString())
        .not("email", "in", TEST_FILTER)
        .not("email", "ilike", "%@example.com")
        .range(from, from + PAGE - 1)
    ),

    fetchAllPages<{ resend_email_id: string }>(from =>
      supabase.from("geo_email_events")
        .select("resend_email_id")
        .eq("event_type", "opened")
        .gte("created_at", thirtyDaysAgo.toISOString())
        .not("email", "in", TEST_FILTER)
        .not("email", "ilike", "%@example.com")
        .not("resend_email_id", "is", null)
        .range(from, from + PAGE - 1)
    ),

    fetchAllPages<{ email: string; sequence: string; step: number; event_type: string; created_at: string }>(from =>
      supabase.from("geo_email_events")
        .select("email, sequence, step, event_type, created_at")
        .eq("event_type", "clicked")
        .gte("created_at", new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .not("email", "in", TEST_FILTER)
        .not("email", "ilike", "%@example.com")
        .order("created_at", { ascending: false })
        .range(from, from + PAGE - 1)
    ),

    fetchAllPages<{ outcome: string; package_price: number | null; meeting_time: string }>(from =>
      supabase.from("geo_scheduled_calls")
        .select("outcome, package_price, meeting_time")
        .eq("event_type", "geo_strategy_call")
        .lt("meeting_time", now.toISOString())
        .range(from, from + PAGE - 1)
    ),

    fetchAllPages<{ email: string; metadata: Record<string, string> | null; sequence: string }>(from =>
      supabase.from("geo_email_queue")
        .select("email, metadata, sequence")
        .eq("step", 1)
        .gte("send_at", sevenDaysAgo.toISOString())
        .not("email", "in", TEST_FILTER)
        .range(from, from + PAGE - 1)
    ),

    fetchAllPages<{ email: string }>(from =>
      supabase.from("geo_email_queue")
        .select("email")
        .not("email", "in", TEST_FILTER)
        .not("email", "ilike", "%@example.com")
        .range(from, from + PAGE - 1)
    ),
  ]);

  // Build Sets from paginated results
  const allLeadEmails = new Set((allLeadRows).map(r => r.email));

  // Dedupe new leads
  const seenToday = new Set<string>();
  const newLeadsToday: typeof todayQueueRows = [];
  for (const row of todayQueueRows ?? []) {
    if (!seenToday.has(row.email)) { seenToday.add(row.email); newLeadsToday.push(row); }
  }

  const seen7d = new Set<string>();
  for (const row of recentQueueRows) { seen7d.add(row.email); }
  const newLeads7d = [...seen7d].map(email => ({ email }));

  // Unique open rate: COUNT(DISTINCT resend_email_id) for opens / sent
  const sentCount   = new Set(sent30dRows.map(r => r.resend_email_id).filter(Boolean)).size;
  const openedCount = new Set(opened30dRows.map(r => r.resend_email_id).filter(Boolean)).size;
  const openRate = sentCount > 0 ? Math.round((openedCount / sentCount) * 100 * 10) / 10 : 0;

  // Sent today: unique emails sent
  const sentTodayCount = new Set(sentTodayRows.map(r => r.resend_email_id).filter(Boolean)).size;

  // Hot leads — 2+ clicks in last 7 days, not suppressed, not booked
  const clicksByEmail = new Map<string, { count: number; lastClick: string; emails: string[] }>();
  for (const e of clickRows7d) {
    const key = e.email;
    const label = `${e.sequence} step ${e.step}`;
    if (!clicksByEmail.has(key)) {
      clicksByEmail.set(key, { count: 0, lastClick: e.created_at, emails: [] });
    }
    const entry = clicksByEmail.get(key)!;
    entry.count++;
    if (!entry.emails.includes(label)) entry.emails.push(label);
    if (e.created_at > entry.lastClick) entry.lastClick = e.created_at;
  }

  // Fetch names for hot leads
  const allHotCandidates = [...clicksByEmail.entries()]
    .filter(([, v]) => v.count >= 2)
    .sort((a, b) => b[1].count - a[1].count || b[1].lastClick.localeCompare(a[1].lastClick));

  // All 2+ click candidates — check all for suppression/booking so the total is exact
  const allCandidateEmails = allHotCandidates.map(([email]) => email);
  const hotDisplayEmails   = allCandidateEmails.slice(0, 60); // names only needed for display

  const [{ data: suppressed7d }, { data: bookedEmails }, { data: hotNameRows }] = await Promise.all([
    supabase.from("geo_suppressed")
      .select("email")
      .in("email", allCandidateEmails.length > 0 ? allCandidateEmails : ["__none__"]),
    supabase.from("geo_email_events")
      .select("email")
      .eq("sequence", "post_booking")
      .in("email", allCandidateEmails.length > 0 ? allCandidateEmails : ["__none__"]),
    supabase.from("geo_email_queue")
      .select("email, first_name")
      .in("email", hotDisplayEmails.length > 0 ? hotDisplayEmails : ["__none__"])
      .not("first_name", "is", null)
      .limit(100),
  ]);

  const suppressedSet = new Set((suppressed7d ?? []).map(r => r.email));
  const bookedSet     = new Set((bookedEmails   ?? []).map(r => r.email));
  const nameMap       = new Map((hotNameRows    ?? []).map(r => [r.email, r.first_name]));

  // Accurate total: all 2+ click candidates minus suppressed/booked
  const filteredCandidates = allCandidateEmails.filter(e => !suppressedSet.has(e) && !bookedSet.has(e));
  const hotLeadsTotal      = filteredCandidates.length;

  const hotLeadList = filteredCandidates
    .slice(0, 8)
    .map(email => {
      const stats = clicksByEmail.get(email)!;
      return { email, name: nameMap.get(email) ?? null, click_count: stats.count, last_click: stats.lastClick, clicked_emails: stats.emails.slice(0, 3) };
    });

  // Upcoming appointments — dedupe by email+meeting_time (handles duplicate rows)
  const seenAppt = new Set<string>();
  const upcomingAppointments: { email: string; first_name: string | null; meeting_time: string }[] = [];
  for (const row of upcomingCallRows ?? []) {
    const key = `${row.email}|${row.meeting_time}`;
    if (!seenAppt.has(key)) {
      seenAppt.add(key);
      upcomingAppointments.push(row);
    }
  }

  // Dedupe pending calls by email — keep most recent meeting_time per email.
  // When a lead reschedules, Calendly creates a new row without marking the old one,
  // so the same person appears multiple times in "Needs Outcome". Query is DESC by
  // meeting_time, so the first occurrence of each email is the most recent.
  const pendingByEmail = new Map<string, NonNullable<typeof pendingCalls>[number]>();
  for (const call of pendingCalls ?? []) {
    if (!pendingByEmail.has(call.email)) {
      pendingByEmail.set(call.email, call);
    }
  }
  const pendingCallList = [...pendingByEmail.values()];

  // Filter pendingCalls: remove anyone already actioned via a different path
  // (e.g. enrolled in no_show/post_call/purchased_welcome via Leads page — outcome field not updated)
  const pendingEmails = pendingCallList.map(c => c.email);
  let actionedPendingCalls = pendingCallList;
  if (pendingEmails.length > 0) {
    const { data: alreadyActioned } = await supabase
      .from("geo_email_queue")
      .select("email")
      .in("email", pendingEmails)
      .in("sequence", ["no_show", "post_call", "purchased_welcome", "hot_proof"]);
    if (alreadyActioned && alreadyActioned.length > 0) {
      const actionedSet = new Set(alreadyActioned.map(r => r.email));
      actionedPendingCalls = pendingCallList.filter(c => !actionedSet.has(c.email));
    }
  }

  // Source attribution — new leads enrolled in last 7 days by source (sourceRows paginated above)
  const sourceMap30d = new Map<string, { leads: Set<string>; booked: Set<string> }>();
  for (const row of sourceRows) {
    const src = deriveSource([row.sequence], row.metadata as Record<string, string> | null);
    if (!sourceMap30d.has(src)) sourceMap30d.set(src, { leads: new Set(), booked: new Set() });
    sourceMap30d.get(src)!.leads.add(row.email);
  }

  // Mark booked leads per source
  const allSourceEmails = [...new Set(sourceRows.map(r => r.email))];
  if (allSourceEmails.length > 0) {
    const { data: bookedSourceRows } = await supabase
      .from("geo_email_events")
      .select("email")
      .eq("sequence", "post_booking")
      .in("email", allSourceEmails);
    const bookedSourceSet = new Set((bookedSourceRows ?? []).map(r => r.email));

    for (const [src, data] of sourceMap30d.entries()) {
      for (const email of data.leads) {
        if (bookedSourceSet.has(email)) data.booked.add(email);
      }
    }
  }

  const sourceAttribution = [...sourceMap30d.entries()]
    .map(([source, data]) => ({
      source,
      leads: data.leads.size,
      booked: data.booked.size,
      conversion_rate: data.leads.size > 0 ? Math.round((data.booked.size / data.leads.size) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.leads - a.leads);

  // Sales stats — compute for all, this week, this month
  function salesStats(calls: typeof allCalls, from?: Date) {
    const filtered = calls.filter(c => !from || new Date(c.meeting_time) >= from);
    const total = filtered.length;
    const purchased = filtered.filter(c => c.outcome === "purchased");
    const mrr = purchased.reduce((sum, c) => sum + (c.package_price ?? 0), 0);
    const closeRate = total > 0 ? Math.round((purchased.length / total) * 1000) / 10 : 0;
    const revPerCall = total > 0 ? Math.round(mrr / total) : 0;
    return { total_calls: total, purchased: purchased.length, close_rate: closeRate, mrr, rev_per_call: revPerCall };
  }

  const salesAll   = salesStats(allCalls);
  const salesMonth = salesStats(allCalls, monthStart);
  const salesWeek  = salesStats(allCalls, weekStart);

  // Total leads ever
  const totalLeads = allLeadEmails.size;

  // Pipeline counts (unique emails)
  const pipelinePostCallCount = new Set((pipelinePostCall ?? []).map(r => r.email)).size;
  const pipelineProofCount    = new Set((pipelineProof    ?? []).map(r => r.email)).size;
  const pipelineAwaitingCount = actionedPendingCalls.length;


  return NextResponse.json({
    total_leads: totalLeads,
    new_leads_today: newLeadsToday.length,
    emails_sent_today: sentTodayCount,
    open_rate_30d: openRate,
    needs_action: actionedPendingCalls.length,
    pending_calls: actionedPendingCalls.slice(0, 10),
    new_leads_7d: newLeads7d,
    email_health: {
      healthy: (bounces24h?.length ?? 0) === 0 && (complaints24h?.length ?? 0) === 0,
      bounces_24h: bounces24h?.length ?? 0,
      complaints_24h: complaints24h?.length ?? 0,
      queue_depth: queueDepth ?? 0,
    },
    hot_leads: hotLeadList,
    hot_leads_total: hotLeadsTotal,
    upcoming_appointments: upcomingAppointments,
    source_attribution: sourceAttribution,
    sales: { all: salesAll, month: salesMonth, week: salesWeek },
    pipeline: {
      awaiting_outcome: pipelineAwaitingCount,
      post_call_nurture: pipelinePostCallCount,
      proof_sent: pipelineProofCount,
      total: pipelineAwaitingCount + pipelinePostCallCount + pipelineProofCount,
    },
  });
}
