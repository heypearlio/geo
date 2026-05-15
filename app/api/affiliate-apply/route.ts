import { NextRequest, NextResponse } from "next/server";
import { supabase, tagLead, enqueueSequence } from "../../../lib/resend";
import { buildLeadSource } from "../../../lib/source";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { firstName, lastName, email, offers } = body as {
    firstName?: string;
    lastName?: string;
    email?: string;
    offers?: string[];
  };

  if (!email || !firstName) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const fullName = [firstName, lastName].filter(Boolean).join(" ");

  // Derive source attribution — no slug for admin/god page
  const { source_tag, source_url } = buildLeadSource(req);

  const existing = await supabase
    .from("geo_email_queue")
    .select("id")
    .eq("email", email)
    .eq("sequence", "affiliate_application")
    .maybeSingle();

  if (!existing.data) {
    await supabase.from("geo_email_queue").insert({
      email,
      first_name: firstName,
      sequence: "affiliate_application",
      step: 1,
      send_at: "2099-01-01T00:00:00Z",
      metadata: {
        source: "affiliate_application",
        source_tag,
        source_url,
        full_name: fullName,
        offers_interested: offers ?? [],
      },
    });
    // Enqueue abandoned sequence — cancelled by Calendly webhook if they book
    await enqueueSequence("affiliate_schedule_abandoned", email, firstName, { source: "affiliate_application" });
  }

  await tagLead(email, "affiliate_application");
  return NextResponse.json({ success: true });
}
