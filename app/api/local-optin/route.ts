import { NextRequest, NextResponse } from "next/server";
import { supabase, tagLead } from "../../../lib/resend";
import { buildLeadSource } from "../../../lib/source";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { firstName, email, businessType, funnel } = body as {
    firstName?: string;
    email?: string;
    businessType?: string;
    funnel?: string;
  };

  if (!email || !funnel) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const isGodPage = funnel === "heylocal";
  const { source_tag, source_url } = buildLeadSource(req, isGodPage ? null : funnel);

  // Write to geo_local_submissions for affiliate dashboard
  await supabase.from("geo_local_submissions").insert({
    email,
    first_name: firstName ?? null,
    business_type: businessType ?? null,
    source_tag_legacy: funnel,  // was source_tag — renamed in migration
    source_tag,
    source_url,
  });

  // Also register in the GEO pipeline so god sees them in /admin/leads
  // Uses a far-future send_at as a placeholder until local_nurture emails are created
  const existing = await supabase
    .from("geo_email_queue")
    .select("id")
    .eq("email", email)
    .eq("sequence", "local_nurture")
    .maybeSingle();

  if (!existing.data) {
    await supabase.from("geo_email_queue").insert({
      email,
      first_name: firstName ?? null,
      sequence: "local_nurture",
      step: 1,
      send_at: "2099-01-01T00:00:00Z",
      metadata: { source: funnel, affiliate_tag: funnel },
    });
  }

  await tagLead(email, funnel);
  return NextResponse.json({ success: true });
}
