import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../../lib/resend";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tier = searchParams.get("tier"); // hot | warm | all
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 200);

  let query = supabase
    .from("geo_lead_scores")
    .select("*")
    .order("score", { ascending: false })
    .limit(limit);

  if (tier === "outreach") query = query.in("tier", ["hot", "warm"]).eq("booked", false).eq("had_call", false).gt("total_clicks", 0);
  else if (tier === "hot") query = query.eq("tier", "hot");
  else if (tier === "warm") query = query.in("tier", ["hot", "warm"]);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Filter suppressed contacts
  const emails = (data ?? []).map(r => r.email);
  const { data: suppressed } = await supabase
    .from("geo_suppressed")
    .select("email")
    .in("email", emails);
  const suppressedSet = new Set((suppressed ?? []).map(r => r.email));

  const leads = (data ?? []).filter(r => !suppressedSet.has(r.email));
  return NextResponse.json({ leads });
}
