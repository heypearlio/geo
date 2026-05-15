import { NextRequest, NextResponse } from "next/server";
import { getAffiliateFromRequest } from "../../../../lib/affiliate";
import { supabase } from "../../../../lib/resend";

// Affiliates get exactly ONE campaign per offer — the aff- prefixed campaign.
// They never see v2-, geo-, or local- campaigns — those are for paying clients only.
const OFFER_CAMPAIGN: Record<string, string> = {
  v2:    "aff-v2",
  geo:   "aff-geo",
  local: "aff-local",
};

// Returns Instantly campaigns matching the affiliate's offer(s)
export async function GET(req: NextRequest) {
  const affiliate = await getAffiliateFromRequest(req);
  if (!affiliate) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const apiKey = process.env.INSTANTLY_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Instantly not configured" }, { status: 500 });

  // Fetch affiliate's offers array from DB
  const { data: aff } = await supabase
    .from("affiliates")
    .select("offers")
    .eq("id", affiliate.id)
    .maybeSingle();

  const offers: string[] = aff?.offers ?? ["geo"];
  const allowedNames = new Set(
    offers.map(o => OFFER_CAMPAIGN[o]).filter(Boolean).map(n => n.toLowerCase())
  );

  const res = await fetch("https://api.instantly.ai/api/v2/campaigns?limit=100", {
    headers: { "Authorization": `Bearer ${apiKey}` },
  });

  if (!res.ok) return NextResponse.json({ error: "Failed to fetch campaigns" }, { status: 500 });

  const data = await res.json();
  const campaigns = (data.items ?? data.campaigns ?? [])
    .map((c: Record<string, unknown>) => ({ id: c.id, name: c.name, status: c.status ?? "active" }))
    .filter((c: { name: string }) => allowedNames.has(c.name.toLowerCase()));

  return NextResponse.json({ campaigns });
}
