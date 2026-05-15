import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../../lib/resend";
import { TEST_EMAILS } from "../../../../lib/test-emails";

function isAuthed(req: NextRequest) {
  const cookieAuth = req.cookies.get("admin_auth")?.value === (process.env.ADMIN_TOKEN ?? "geo-admin-authenticated");
  const keyAuth    = req.headers.get("x-admin-key") === process.env.CRON_SECRET;
  return cookieAuth || keyAuth;
}

const TEST_FILTER = `(${TEST_EMAILS.join(",")})`;

export async function GET(req: NextRequest) {
  if (!isAuthed(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const stepDetail = searchParams.get("sequence");
  const stepNum    = parseInt(searchParams.get("step") ?? "0");

  // ── Step detail: who opened/didn't open a specific step ──────────────────
  if (stepDetail && stepNum > 0) {
    const { data: sentRows } = await supabase
      .from("geo_email_events")
      .select("email, resend_email_id, created_at")
      .eq("sequence", stepDetail)
      .eq("step", stepNum)
      .eq("event_type", "sent")
      .not("email", "in", TEST_FILTER)
      .not("email", "ilike", "%@example.com");

    if (!sentRows || sentRows.length === 0) {
      return NextResponse.json({ total_sent: 0, opened_count: 0, clicked_count: 0, opened: [], not_opened: [] });
    }

    const emailIds = sentRows.map(r => r.resend_email_id).filter(Boolean);

    const [{ data: openEvents }, { data: clickEvents }] = await Promise.all([
      supabase.from("geo_email_events").select("resend_email_id").eq("event_type", "opened").in("resend_email_id", emailIds),
      supabase.from("geo_email_events").select("resend_email_id").eq("event_type", "clicked").in("resend_email_id", emailIds),
    ]);

    // Unique by resend_email_id — one person opening 3 times = 1 open
    const openedIds  = new Set((openEvents  ?? []).map(e => e.resend_email_id));
    const clickedIds = new Set((clickEvents ?? []).map(e => e.resend_email_id));

    const result = sentRows.map(r => ({
      email:   r.email,
      opened:  openedIds.has(r.resend_email_id),
      clicked: clickedIds.has(r.resend_email_id),
      sent_at: r.created_at,
    }));

    const opened    = result.filter(r => r.opened);
    const notOpened = result.filter(r => !r.opened);

    return NextResponse.json({
      total_sent:    result.length,
      opened_count:  opened.length,
      clicked_count: result.filter(r => r.clicked).length,
      opened,
      not_opened: notOpened,
    });
  }

  // ── Main: unique-open stats per sequence+step + active lead counts ────────
  //
  // Supabase caps responses at 1000 rows regardless of .limit() — we paginate
  // to ensure we get everything, then aggregate in JS.

  type StepKey = `${string}:${number}`;
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

  const [sentRows, openedRows, clickedRows, { data: activeLeadRows }] = await Promise.all([
    // Sent: dedupe by email — each unique recipient = 1 send
    fetchAllPages<{ sequence: string; step: number; email: string }>(from =>
      supabase.from("geo_email_events")
        .select("sequence, step, email")
        .eq("event_type", "sent")
        .not("email", "in", TEST_FILTER)
        .not("email", "ilike", "%@example.com")
        .range(from, from + PAGE - 1)
    ),
    // Opened: dedupe by email (one unique opener per person per step)
    fetchAllPages<{ sequence: string; step: number; email: string }>(from =>
      supabase.from("geo_email_events")
        .select("sequence, step, email")
        .eq("event_type", "opened")
        .not("email", "in", TEST_FILTER)
        .not("email", "ilike", "%@example.com")
        .range(from, from + PAGE - 1)
    ),
    // Clicked: dedupe by email
    fetchAllPages<{ sequence: string; step: number; email: string }>(from =>
      supabase.from("geo_email_events")
        .select("sequence, step, email")
        .eq("event_type", "clicked")
        .not("email", "in", TEST_FILTER)
        .not("email", "ilike", "%@example.com")
        .range(from, from + PAGE - 1)
    ),
    supabase.from("geo_email_queue")
      .select("sequence")
      .is("sent_at", null)
      .is("cancelled_at", null),
  ]);

  // Aggregate into maps
  const sentMap  = new Map<StepKey, Set<string>>();
  const openMap  = new Map<StepKey, Set<string>>();
  const clickMap = new Map<StepKey, Set<string>>();

  for (const r of sentRows) {
    const k: StepKey = `${r.sequence}:${r.step}`;
    if (!sentMap.has(k)) sentMap.set(k, new Set());
    sentMap.get(k)!.add(r.email);
  }
  for (const r of openedRows) {
    const k: StepKey = `${r.sequence}:${r.step}`;
    if (!openMap.has(k)) openMap.set(k, new Set());
    openMap.get(k)!.add(r.email);
  }
  for (const r of clickedRows) {
    const k: StepKey = `${r.sequence}:${r.step}`;
    if (!clickMap.has(k)) clickMap.set(k, new Set());
    clickMap.get(k)!.add(r.email);
  }

  const seqStepKeys = new Set([...sentMap.keys(), ...openMap.keys(), ...clickMap.keys()]);
  const rows = [...seqStepKeys].map(k => {
    const [sequence, stepStr] = k.split(":") as [string, string];
    const step = parseInt(stepStr);
    return {
      sequence,
      step,
      sent:    sentMap.get(k)?.size  ?? 0,
      opened:  openMap.get(k)?.size  ?? 0,
      clicked: clickMap.get(k)?.size ?? 0,
    };
  }).sort((a, b) => a.sequence.localeCompare(b.sequence) || a.step - b.step);

  const activeMap: Record<string, number> = {};
  for (const row of activeLeadRows ?? []) {
    activeMap[row.sequence] = (activeMap[row.sequence] ?? 0) + 1;
  }

  return NextResponse.json({
    rows,
    active_leads: activeMap,
  }, {
    headers: { "Cache-Control": "s-maxage=60, stale-while-revalidate=30" },
  });
}
