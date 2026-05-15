import { NextRequest, NextResponse } from "next/server";
import { getAffiliateFromRequest } from "../../../../lib/affiliate";
import { supabase } from "../../../../lib/resend";

export async function GET(req: NextRequest) {
  const affiliate = await getAffiliateFromRequest(req);
  if (!affiliate) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Get all emails tagged to this affiliate across ALL offers (geo, v2, local, etc.)
  const { data: leads } = await supabase
    .from("geo_lead_tags")
    .select("email")
    .eq("tag", affiliate.tag);

  const emails = (leads ?? []).map((l) => l.email);

  if (emails.length === 0) {
    return NextResponse.json({ upcoming: [], past: [] });
  }

  const now = new Date().toISOString();

  const [upcomingResult, pastResult] = await Promise.all([
    supabase
      .from("geo_scheduled_calls")
      .select("id, email, first_name, meeting_time, outcome")
      .in("email", emails)
      .gte("meeting_time", now)
      .order("meeting_time", { ascending: true })
      .limit(100),
    supabase
      .from("geo_scheduled_calls")
      .select("id, email, first_name, meeting_time, outcome")
      .in("email", emails)
      .lt("meeting_time", now)
      .order("meeting_time", { ascending: false })
      .limit(100),
  ]);

  // Deduplicate upcoming: one row per email, keeping the latest meeting_time
  const upcomingAll = upcomingResult.data ?? [];
  const latestByEmail = new Map<string, typeof upcomingAll[number]>();
  for (const call of upcomingAll) {
    const existing = latestByEmail.get(call.email);
    if (!existing || call.meeting_time > existing.meeting_time) {
      latestByEmail.set(call.email, call);
    }
  }
  const upcoming = Array.from(latestByEmail.values()).sort(
    (a, b) => new Date(a.meeting_time).getTime() - new Date(b.meeting_time).getTime()
  );

  // Emails that have a future call scheduled (rescheduled leads)
  const emailsWithFuture = new Set(upcoming.map(c => c.email));

  // For past calls with no outcome: if the email has a future call, auto-mark as rescheduled
  const pastAll = pastResult.data ?? [];
  const toMarkRescheduled = pastAll.filter(c => !c.outcome && emailsWithFuture.has(c.email));
  if (toMarkRescheduled.length > 0) {
    await supabase
      .from("geo_scheduled_calls")
      .update({ outcome: "rescheduled" })
      .in("id", toMarkRescheduled.map(c => c.id));
    for (const c of toMarkRescheduled) c.outcome = "rescheduled";
  }

  return NextResponse.json({
    upcoming,
    past: pastAll.slice(0, 50),
  });
}

export async function PATCH(req: NextRequest) {
  const affiliate = await getAffiliateFromRequest(req);
  if (!affiliate) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { callId, outcome } = await req.json() as {
    callId?: string;
    outcome?: "attended" | "no_show" | "rescheduled" | "bought";
  };

  if (!callId || !outcome) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  // Verify this call's email belongs to this affiliate's leads
  const { data: call } = await supabase
    .from("geo_scheduled_calls")
    .select("email")
    .eq("id", callId)
    .maybeSingle();

  if (!call) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: lead } = await supabase
    .from("geo_lead_tags")
    .select("id")
    .eq("tag", affiliate.tag)
    .eq("email", call.email)
    .maybeSingle();

  if (!lead) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  await supabase
    .from("geo_scheduled_calls")
    .update({ outcome })
    .eq("id", callId);

  return NextResponse.json({ success: true });
}
