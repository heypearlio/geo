import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { supabase } from "../../../../lib/resend";

export async function POST(req: NextRequest) {
  const { slug, token, newPassword } = await req.json() as {
    slug?: string;
    token?: string;
    newPassword?: string;
  };

  if (!slug || !token || !newPassword) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  if (newPassword.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const { data: affiliate } = await supabase
    .from("affiliates")
    .select("id, reset_token, reset_expires_at")
    .eq("slug", slug)
    .maybeSingle();

  if (
    !affiliate ||
    affiliate.reset_token !== token ||
    !affiliate.reset_expires_at ||
    new Date(affiliate.reset_expires_at) < new Date()
  ) {
    return NextResponse.json({ error: "This reset link has expired or is invalid" }, { status: 400 });
  }

  const newHash = await bcrypt.hash(newPassword, 12);
  await supabase
    .from("affiliates")
    .update({
      password_hash: newHash,
      reset_token: null,
      reset_expires_at: null,
      session_token: null,
    })
    .eq("id", affiliate.id);

  return NextResponse.json({ success: true });
}
