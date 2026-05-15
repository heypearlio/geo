import { NextRequest, NextResponse } from "next/server";
import { getV2ClientFromRequest } from "../../../../lib/v2client";
import { supabase } from "../../../../lib/resend";

export async function POST(req: NextRequest) {
  const client = await getV2ClientFromRequest(req);
  if (client) {
    await supabase
      .from("v2_clients")
      .update({ session_token: null })
      .eq("id", client.id);
  }

  const res = NextResponse.json({ success: true });
  res.cookies.set("v2client_auth", "", {
    httpOnly: true,
    path: "/",
    maxAge: 0,
  });
  return res;
}
