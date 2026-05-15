import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../lib/resend";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { event_type, email, referrer, utm_source, utm_medium, utm_campaign, utm_content } = body;
    if (!event_type) return NextResponse.json({ ok: true });

    await supabase.from("geo_audit_funnel_events").insert({
      event_type,
      email: email || null,
      referrer: referrer || null,
      utm_source: utm_source || null,
      utm_medium: utm_medium || null,
      utm_campaign: utm_campaign || null,
      utm_content: utm_content || null,
    });
  } catch {
    // Non-fatal — tracking should never break the page
  }
  return NextResponse.json({ ok: true });
}
