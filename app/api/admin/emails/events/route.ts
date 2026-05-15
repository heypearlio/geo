import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../../../lib/resend";

function isAuthed(req: NextRequest) {
  const cookieAuth = req.cookies.get("admin_auth")?.value === (process.env.ADMIN_TOKEN ?? "geo-admin-authenticated");
  const keyAuth    = req.headers.get("x-admin-key") === process.env.CRON_SECRET;
  return cookieAuth || keyAuth;
}

export async function GET(req: NextRequest) {
  if (!isAuthed(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const { data, error } = await supabase.rpc("get_email_events_page", {
    p_event_type: searchParams.get("event")    ?? "all",
    p_sequence:   searchParams.get("sequence") ?? "",
    p_search:     searchParams.get("search")   ?? "",
    p_offset:     parseInt(searchParams.get("page") ?? "0") * 50,
    p_limit:      50,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
