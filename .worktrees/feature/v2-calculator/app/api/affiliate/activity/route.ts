import { NextRequest, NextResponse } from "next/server";
import { getAffiliateFromRequest } from "../../../../lib/affiliate";
import { supabase } from "../../../../lib/resend";

export async function GET(req: NextRequest) {
  const affiliate = await getAffiliateFromRequest(req);
  if (!affiliate) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // geo_lead_tags is the universal source for ALL offers (geo, v2, local, etc.)
  const { data: allLeads } = await supabase
    .from("geo_lead_tags")
    .select("email, created_at")
    .eq("tag", affiliate.tag);

  const emails = (allLeads ?? []).map(l => l.email);
  const totalLeads = emails.length;

  const [weekResult, monthResult, recentTagged, clickResult] = await Promise.all([
    supabase
      .from("geo_lead_tags")
      .select("id", { count: "exact", head: true })
      .eq("tag", affiliate.tag)
      .gte("created_at", startOfWeek.toISOString()),
    supabase
      .from("geo_lead_tags")
      .select("id", { count: "exact", head: true })
      .eq("tag", affiliate.tag)
      .gte("created_at", startOfMonth.toISOString()),
    supabase
      .from("geo_lead_tags")
      .select("email, created_at")
      .eq("tag", affiliate.tag)
      .order("created_at", { ascending: false })
      .limit(10),
    emails.length > 0
      ? supabase
          .from("geo_email_events")
          .select("email")
          .in("email", emails)
          .eq("event_type", "clicked")
          .gte("created_at", sevenDaysAgo)
      : Promise.resolve({ data: [] as { email: string }[] }),
  ]);

  // Enrich recent opt-ins with first_name and business_type
  const recentEmails = (recentTagged.data ?? []).map(r => r.email);
  const [nameRows, localRows] = await Promise.all([
    recentEmails.length > 0
      ? supabase
          .from("geo_email_queue")
          .select("email, first_name")
          .in("email", recentEmails)
          .not("first_name", "is", null)
      : Promise.resolve({ data: [] as { email: string; first_name: string }[] }),
    recentEmails.length > 0
      ? supabase
          .from("geo_local_submissions")
          .select("email, business_type")
          .in("email", recentEmails)
      : Promise.resolve({ data: [] as { email: string; business_type: string | null }[] }),
  ]);

  const nameMap = new Map<string, string>();
  for (const r of nameRows.data ?? []) {
    if (!nameMap.has(r.email) && r.first_name) nameMap.set(r.email, r.first_name);
  }
  const localMap = new Map((localRows.data ?? []).map(r => [r.email, r.business_type]));

  const recentOptIns = (recentTagged.data ?? []).map(r => ({
    email: r.email,
    first_name: nameMap.get(r.email) ?? null,
    business_type: localMap.get(r.email) ?? null,
    created_at: r.created_at,
  }));

  // Hot leads — most clicks in last 7 days
  const clicksByEmail = new Map<string, number>();
  for (const e of clickResult.data ?? []) {
    clicksByEmail.set(e.email, (clicksByEmail.get(e.email) ?? 0) + 1);
  }
  const hotLeads = [...clicksByEmail.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([email, click_count]) => ({
      email,
      first_name: nameMap.get(email) ?? null,
      click_count,
    }));

  return NextResponse.json({
    totalLeads,
    leadsThisWeek: weekResult.count ?? 0,
    leadsThisMonth: monthResult.count ?? 0,
    recentOptIns,
    hotLeads,
  });
}
