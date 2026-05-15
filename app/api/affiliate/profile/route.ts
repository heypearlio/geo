import { NextRequest, NextResponse } from "next/server";
import { getAffiliateFromRequest } from "../../../../lib/affiliate";
import { supabase } from "../../../../lib/resend";

export async function PATCH(req: NextRequest) {
  const affiliate = await getAffiliateFromRequest(req);
  if (!affiliate) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as {
    calendlyUrl?: string;
    headshotUrl?: string;
    instagramUrl?: string;
    facebookUrl?: string;
    linkedinUrl?: string;
    tiktokUrl?: string;
    youtubeUrl?: string;
    name?: string;
    email?: string;
    phone?: string;
    metaPixelId?: string;
  };
  const updates: Record<string, string> = {};
  if (body.calendlyUrl !== undefined) updates.calendly_url = body.calendlyUrl;
  if (body.headshotUrl !== undefined) updates.headshot_url = body.headshotUrl;
  if (body.instagramUrl !== undefined) updates.instagram_url = body.instagramUrl;
  if (body.facebookUrl  !== undefined) updates.facebook_url  = body.facebookUrl;
  if (body.linkedinUrl  !== undefined) updates.linkedin_url  = body.linkedinUrl;
  if (body.tiktokUrl    !== undefined) updates.tiktok_url    = body.tiktokUrl;
  if (body.youtubeUrl   !== undefined) updates.youtube_url   = body.youtubeUrl;
  if (body.name        !== undefined) updates.name           = body.name;
  if (body.email       !== undefined) updates.email          = body.email;
  if (body.phone       !== undefined) updates.phone          = body.phone;
  if (body.metaPixelId !== undefined) updates.meta_pixel_id  = body.metaPixelId;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const { error } = await supabase
    .from("affiliates")
    .update(updates)
    .eq("id", affiliate.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
