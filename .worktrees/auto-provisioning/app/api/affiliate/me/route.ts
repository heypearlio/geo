import { NextRequest, NextResponse } from "next/server";
import { getAffiliateFromRequest } from "../../../../lib/affiliate";
import { supabase } from "../../../../lib/resend";

export async function GET(req: NextRequest) {
  const affiliate = await getAffiliateFromRequest(req);
  if (!affiliate) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data } = await supabase
    .from("affiliates")
    .select("offers, calendly_url, linkjolt_url")
    .eq("id", affiliate.id)
    .maybeSingle();

  return NextResponse.json({
    slug: affiliate.slug,
    name: affiliate.name,
    tag: affiliate.tag,
    offers: data?.offers ?? [],
    calendlyUrl: data?.calendly_url ?? null,
    linkjoltUrl: data?.linkjolt_url ?? null,
  });
}
