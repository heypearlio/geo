import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../../lib/resend";

function isAuthed(req: NextRequest) {
  const cookieAuth = req.cookies.get("admin_auth")?.value === (process.env.ADMIN_TOKEN ?? "geo-admin-authenticated");
  const keyAuth    = req.headers.get("x-admin-key") === process.env.CRON_SECRET;
  return cookieAuth || keyAuth;
}

export async function GET(req: NextRequest) {
  if (!isAuthed(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Get dashboard stats (KPIs, queue, daily sends, activity)
  const { data: stats, error: statsError } = await supabase.rpc("get_dashboard_stats");
  if (statsError) return NextResponse.json({ error: statsError.message }, { status: 500 });

  // Get lead totals from existing RPC
  const { data: leadsData, error: leadsError } = await supabase.rpc("get_leads_page", {
    p_search: "", p_offset: 0, p_limit: 1, p_show_bounced: false, p_show_unsub: false, p_temp_filter: "",
  });
  if (leadsError) return NextResponse.json({ error: leadsError.message }, { status: 500 });

  const { data: claimSubmissions } = await supabase
    .from("geo_claim_submissions")
    .select("first_name, last_name, email, city, website, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  return NextResponse.json({
    ...stats,
    totals: leadsData?.totals ?? null,
    claim_submissions: claimSubmissions ?? [],
  }, {
    headers: { "Cache-Control": "s-maxage=60, stale-while-revalidate=30" },
  });
}
