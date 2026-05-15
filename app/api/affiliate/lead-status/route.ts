import { NextRequest, NextResponse } from "next/server";
import { getAffiliateFromRequest } from "../../../../lib/affiliate";
import { supabase } from "../../../../lib/resend";

// cold/warm/hot/unsubscribed are derived from email activity
// met/no_show/client are manually set by the affiliate
const MANUAL_STATUSES = new Set(["met", "no_show", "client"]);

async function deriveAutoStatus(email: string): Promise<string> {
  const [{ data: suppressed }, { data: events }] = await Promise.all([
    supabase.from("geo_suppressed").select("reason").eq("email", email).maybeSingle(),
    supabase.from("geo_email_events").select("event_type").eq("email", email),
  ]);

  if (suppressed?.reason === "unsubscribed") return "unsubscribed";
  const evTypes = new Set((events ?? []).map(e => e.event_type));
  if (evTypes.has("clicked")) return "hot";
  if (evTypes.has("opened")) return "warm";
  if (evTypes.has("sent")) return "cold";
  return "cold";
}

export async function GET(req: NextRequest) {
  const affiliate = await getAffiliateFromRequest(req);
  if (!affiliate) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const email = req.nextUrl.searchParams.get("email");
  if (!email) return NextResponse.json({ error: "Missing email" }, { status: 400 });

  const { data: manual } = await supabase
    .from("local_lead_status")
    .select("*")
    .eq("affiliate_id", affiliate.id)
    .eq("email", email)
    .maybeSingle();

  // If affiliate has set a manual status (met/no_show/client), use it
  // Otherwise derive from email activity
  let status: string;
  if (manual?.status && MANUAL_STATUSES.has(manual.status)) {
    status = manual.status;
  } else {
    status = await deriveAutoStatus(email);
  }

  return NextResponse.json({
    status: {
      ...(manual ?? {}),
      email,
      status,
    },
  });
}

export async function POST(req: NextRequest) {
  const affiliate = await getAffiliateFromRequest(req);
  if (!affiliate) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as {
    email: string;
    status?: string;
    first_name?: string;
    phone?: string;
  };

  // Affiliates can only manually set met/no_show/client
  if (body.status && !MANUAL_STATUSES.has(body.status)) {
    return NextResponse.json({ error: "Status must be met, no_show, or client" }, { status: 400 });
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.status !== undefined) updates.status = body.status;
  if (body.first_name !== undefined) updates.first_name = body.first_name;
  if (body.phone !== undefined) updates.phone = body.phone;

  const { data, error } = await supabase
    .from("local_lead_status")
    .upsert({
      affiliate_id: affiliate.id,
      email: body.email,
      ...updates,
    }, { onConflict: "affiliate_id,email" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Return with derived status merged in
  const resolvedStatus = body.status ?? await deriveAutoStatus(body.email);
  return NextResponse.json({ status: { ...data, status: resolvedStatus } });
}
