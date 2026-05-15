import { NextRequest, NextResponse } from "next/server";
import { getAffiliateFromRequest } from "../../../../lib/affiliate";
import { supabase } from "../../../../lib/resend";

export async function POST(req: NextRequest) {
  const affiliate = await getAffiliateFromRequest(req);
  if (affiliate) {
    await supabase
      .from("affiliates")
      .update({ session_token: null })
      .eq("id", affiliate.id);
  }

  const res = NextResponse.json({ success: true });
  res.cookies.set("affiliate_auth", "", {
    httpOnly: true,
    path: "/",
    maxAge: 0,
  });
  return res;
}
