import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../../../lib/resend";

function isAuthed(req: NextRequest) {
  const cookieAuth = req.cookies.get("admin_auth")?.value === (process.env.ADMIN_TOKEN ?? "geo-admin-authenticated");
  const keyAuth    = req.headers.get("x-admin-key") === process.env.CRON_SECRET;
  return cookieAuth || keyAuth;
}

export async function GET(req: NextRequest) {
  if (!isAuthed(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase.rpc("get_dashboard_stats");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    queue_depth:      data.queue.pending + data.queue.overdue,
    overdue:          data.queue.overdue,
    sent_today:       data.kpis.emails_sent_30d, // approximation until we add a daily count
    deliverability:   null, // would need delivered event tracking
    bounce_rate:      null,
  }, {
    headers: { "Cache-Control": "s-maxage=30, stale-while-revalidate=10" },
  });
}
