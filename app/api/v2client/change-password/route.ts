import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getV2ClientFromRequest } from "../../../../lib/v2client";
import { supabase } from "../../../../lib/resend";

export async function POST(req: NextRequest) {
  const client = await getV2ClientFromRequest(req);
  if (!client) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { currentPassword, newPassword } = await req.json() as {
    currentPassword?: string;
    newPassword?: string;
  };

  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  if (newPassword.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const { data: row } = await supabase
    .from("v2_clients")
    .select("password_hash")
    .eq("id", client.id)
    .maybeSingle();

  if (!row?.password_hash) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const valid = await bcrypt.compare(currentPassword, row.password_hash);
  if (!valid) return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });

  const newHash = await bcrypt.hash(newPassword, 12);
  await supabase
    .from("v2_clients")
    .update({ password_hash: newHash, session_token: null })
    .eq("id", client.id);

  const res = NextResponse.json({ success: true });
  res.cookies.set("v2client_auth", "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}
