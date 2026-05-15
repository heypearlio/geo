import { NextRequest, NextResponse } from "next/server";
import { getAccountFromRequest } from "../../../../lib/account";
import { supabase } from "../../../../lib/resend";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const account = await getAccountFromRequest(req);
  if (!account) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const MAX_SIZE = 5 * 1024 * 1024; // 5MB
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 400 });
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const ALLOWED_EXTS = new Set(["jpg", "jpeg", "png", "gif", "webp"]);
  if (!ALLOWED_EXTS.has(ext)) {
    return NextResponse.json({ error: "Invalid file type. Allowed: jpg, jpeg, png, gif, webp" }, { status: 400 });
  }

  const path = `accounts/${account.id}/${Date.now()}.${ext}`;
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const { error } = await supabase.storage
    .from("affiliate-headshots")
    .upload(path, buffer, { contentType: file.type, upsert: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: urlData } = supabase.storage
    .from("affiliate-headshots")
    .getPublicUrl(path);

  return NextResponse.json({ url: urlData.publicUrl });
}
