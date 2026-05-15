import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../../lib/resend";

function isAuthed(req: NextRequest) {
  const cookieAuth = req.cookies.get("admin_auth")?.value === (process.env.ADMIN_TOKEN ?? "geo-admin-authenticated");
  const keyAuth    = req.headers.get("x-admin-key") === process.env.ADMIN_TOKEN;
  return cookieAuth || keyAuth;
}

export async function GET(req: NextRequest) {
  if (!isAuthed(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const search       = searchParams.get("search")    ?? "";
  const page         = parseInt(searchParams.get("page") ?? "0");
  const limit        = 50;
  const tempFilter   = searchParams.get("temp")      ?? "";
  const filterNew    = searchParams.get("filter")    === "new";
  const sourceFilter = searchParams.get("source")    ?? "";
  const sequence     = searchParams.get("sequence")  ?? "";
  const sortName     = searchParams.get("sort_name") ?? "";
  const lastEvent    = searchParams.get("last_event") ?? "";
  const sort         = searchParams.get("sort") ?? "date_desc";
  const sortEnrolled = sort === "date_desc" ? "desc" : sort === "date_asc" ? "asc" : "";
  const sortLast     = sort === "activity_asc" ? "asc" : "desc";
  const email        = searchParams.get("email"); // detail view

  const enrolledSince = filterNew
    ? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    : null;

  if (email) {
    const { data, error } = await supabase.rpc("get_lead_detail", { p_email: email });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  // ?temp=clicked: resolve 2+ click emails in last 7 days
  let emailFilter: string[] | null = null;
  if (tempFilter === "clicked") {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: clickRows } = await supabase
      .from("geo_email_events")
      .select("email")
      .eq("event_type", "clicked")
      .gte("created_at", sevenDaysAgo)
      .limit(10000);

    const clickCounts = new Map<string, number>();
    for (const row of clickRows ?? []) {
      clickCounts.set(row.email, (clickCounts.get(row.email) ?? 0) + 1);
    }
    emailFilter = [...clickCounts.entries()]
      .filter(([, count]) => count >= 2)
      .map(([e]) => e);

    if (emailFilter.length === 0) {
      return NextResponse.json({ leads: [], totals: { total: 0, active: 0, clients: 0, hot: 0, warm: 0, cold: 0, bounced: 0, unsubscribed: 0 } });
    }
  }

  const { data, error } = await supabase.rpc("get_leads_page", {
    p_search:             search,
    p_offset:             page * limit,
    p_limit:              limit,
    p_temp_filter:        tempFilter === "clicked" ? "" : tempFilter,
    p_enrolled_since:     enrolledSince,
    p_source:             sourceFilter,
    p_email_filter:       emailFilter,
    p_sequence:           sequence,
    p_sort_name:          sortName,
    p_sort_last_activity: sortLast,
    p_last_email_event:   lastEvent,
    p_sort_enrolled:      sortEnrolled,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? { leads: [], totals: {} });
}
