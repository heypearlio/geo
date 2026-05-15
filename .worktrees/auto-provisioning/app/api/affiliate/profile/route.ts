import { NextRequest, NextResponse } from "next/server";
import { getAffiliateFromRequest } from "../../../../lib/affiliate";
import { supabase } from "../../../../lib/resend";

export async function PATCH(req: NextRequest) {
  const affiliate = await getAffiliateFromRequest(req);
  if (!affiliate) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as { calendlyUrl?: string; headshotUrl?: string };
  const updates: Record<string, string> = {};
  if (body.calendlyUrl !== undefined) updates.calendly_url = body.calendlyUrl;
  if (body.headshotUrl !== undefined) updates.headshot_url = body.headshotUrl;

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
