import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { supabase } from "../../../../lib/resend";

export async function POST(req: NextRequest) {
  const { slug, password } = await req.json() as { slug?: string; password?: string };

  if (!slug || !password) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const { data: affiliate } = await supabase
    .from("affiliates")
    .select("id, slug, password_hash, active")
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle();

  if (!affiliate || !affiliate.password_hash) {
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }

  const valid = await bcrypt.compare(password, affiliate.password_hash);
  if (!valid) {
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }

  const sessionToken = crypto.randomBytes(32).toString("hex");
  await supabase
    .from("affiliates")
    .update({ session_token: sessionToken, last_login: new Date().toISOString() })
    .eq("id", affiliate.id);

  const res = NextResponse.json({ success: true });
  res.cookies.set("affiliate_auth", `${slug}:${sessionToken}`, {
    httpOnly: true,
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    sameSite: "lax",
  });
  return res;
}
