import { NextRequest, NextResponse } from "next/server";
import { getAffiliateFromRequest } from "../../../../lib/affiliate";
import { supabase } from "../../../../lib/resend";

export async function GET(req: NextRequest) {
  const affiliate = await getAffiliateFromRequest(req);
  if (!affiliate) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data } = await supabase
    .from("affiliates")
    .select("offers, calendly_url, linkjolt_url, instagram_url, facebook_url, linkedin_url, tiktok_url, youtube_url, email, phone, meta_pixel_id")
    .eq("id", affiliate.id)
    .maybeSingle();

  return NextResponse.json({
    slug: affiliate.slug,
    name: affiliate.name,
    tag: affiliate.tag,
    offers: data?.offers ?? [],
    calendlyUrl: data?.calendly_url ?? null,
    linkjoltUrl: data?.linkjolt_url ?? null,
    instagramUrl: data?.instagram_url ?? null,
    facebookUrl: data?.facebook_url ?? null,
    linkedinUrl: data?.linkedin_url ?? null,
    tiktokUrl: data?.tiktok_url ?? null,
    youtubeUrl: data?.youtube_url ?? null,
    email:        data?.email          ?? null,
    phone:        data?.phone          ?? null,
    metaPixelId:  data?.meta_pixel_id  ?? null,
  });
}
