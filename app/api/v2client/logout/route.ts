import { NextRequest, NextResponse } from "next/server";
import { getV2AccessFromRequest } from "../../../../lib/v2client";
import { supabase } from "../../../../lib/resend";

export async function POST(req: NextRequest) {
  const client = await getV2AccessFromRequest(req);

  if (client && !client.is_affiliate) {
    // Pure V2 client — clear their session token and expire cookie
    await supabase
      .from("v2_clients")
      .update({ session_token: null })
      .eq("id", client.id);

    const res = NextResponse.json({ success: true });
    res.cookies.set("v2client_auth", "", { httpOnly: true, path: "/", maxAge: 0 });
    return res;
  }

  if (!client) {
    // Unauthenticated — expire any stale v2client_auth cookie
    const res = NextResponse.json({ success: true });
    res.cookies.set("v2client_auth", "", { httpOnly: true, path: "/", maxAge: 0 });
    return res;
  }

  // Affiliate accessing cashoffer portal — do NOT clear affiliate_auth.
  // They remain logged into their affiliate portal.
  return NextResponse.json({ success: true });
}
