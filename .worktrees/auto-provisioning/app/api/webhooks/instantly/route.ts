import { NextRequest, NextResponse } from "next/server";
import { supabase, tagLead } from "../../../../lib/resend";

// Instantly fires this webhook when a lead replies to a campaign.
// Works for ALL offers (v2, geo, affiliate, etc.) — routing is determined
// by custom variables set on each lead in Instantly:
//   client_slug = the client/affiliate identifier
//   offer       = "v2" | "geo" | "affiliate" (defaults to "v2" if omitted)
//
// Webhook URLs registered in Instantly (via API, all campaigns):
//   https://geo.heypearl.io/api/webhooks/instantly?secret=wh_instantly_heypearl_2026
// Secret is verified via query param (Instantly doesn't reliably support custom headers)

const HANDLED_EVENTS = new Set([
  "reply_received",
  "lead_interested",
  "lead_meeting_booked",
]);

export async function POST(req: NextRequest) {
  // Auth check via query param — secret embedded in the registered webhook URL
  const secret = process.env.INSTANTLY_WEBHOOK_SECRET;
  if (secret) {
    const incoming = req.nextUrl.searchParams.get("secret");
    if (incoming !== secret) {
      console.warn("Instantly webhook: invalid or missing secret — ignoring");
      return NextResponse.json({ ok: true });
    }
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventType = (body.event_type as string | undefined) ?? "";

  // Only process reply/interest events — ignore sent, opened, bounced, etc.
  if (!HANDLED_EVENTS.has(eventType)) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const leadEmail = ((body.lead_email as string | undefined) ?? "").trim().toLowerCase();
  if (!leadEmail) {
    console.warn("Instantly webhook: no lead_email in payload");
    return NextResponse.json({ ok: true });
  }

  // client_slug is a custom variable set on each lead in Instantly
  // It appears as a root-level property in the webhook payload
  const clientSlug = ((body.client_slug as string | undefined) ?? "").trim().toLowerCase();
  if (!clientSlug) {
    console.warn(`Instantly webhook: no client_slug for lead ${leadEmail} — cannot route`);
    return NextResponse.json({ ok: true });
  }

  // Build name from custom variables (first_name / last_name set in Instantly)
  const firstName = ((body.first_name as string | undefined) ?? "").trim();
  const lastName  = ((body.last_name  as string | undefined) ?? "").trim();
  const name      = [firstName, lastName].filter(Boolean).join(" ") || null;

  const offer = ((body.offer as string | undefined) ?? "v2").trim().toLowerCase();

  if (offer === "v2") {
    // V2 clients + god admin v2 uploads (client_slug=god).
    // god replies appear in /admin/v2-leads which shows all cashoffer_leads regardless of slug.
    // For real clients, verify the client exists and is active first.
    if (clientSlug !== "god") {
      const { data: client } = await supabase
        .from("v2_clients")
        .select("id")
        .eq("slug", clientSlug)
        .eq("active", true)
        .maybeSingle();
      if (!client) {
        console.warn(`Instantly webhook: no active v2 client for slug "${clientSlug}"`);
        return NextResponse.json({ ok: true });
      }
    }

    const { data: existing } = await supabase
      .from("cashoffer_leads")
      .select("id")
      .eq("email", leadEmail)
      .eq("slug", clientSlug)
      .maybeSingle();

    if (existing) {
      console.log(`Instantly webhook: duplicate v2 lead ${leadEmail} for ${clientSlug} — skipped`);
      return NextResponse.json({ ok: true, duplicate: true });
    }

    const { error } = await supabase
      .from("cashoffer_leads")
      .insert({ email: leadEmail, name, slug: clientSlug, address: `(Instantly reply — ${eventType})` });

    if (error) {
      console.error("Instantly webhook insert error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  } else {
    // All other offers (geo, affiliate, local, etc.): tag the lead so they appear
    // in the affiliate's /leads dashboard. geo_lead_tags dedupes via upsert.
    await tagLead(leadEmail, clientSlug);
  }

  console.log(`Instantly webhook: added lead ${leadEmail} → ${offer}/${clientSlug} (${eventType})`);
  return NextResponse.json({ ok: true });
}

// Instantly may send a GET ping to verify the URL is reachable
export async function GET() {
  return NextResponse.json({ ok: true });
}
