import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { supabase } from "../../../../../lib/resend";

function adminAuth(req: NextRequest) {
  const cookieAuth = req.cookies.get("admin_auth")?.value === (process.env.ADMIN_TOKEN ?? "geo-admin-authenticated");
  const keyAuth = req.headers.get("x-admin-key") === process.env.ADMIN_TOKEN;
  return cookieAuth || keyAuth;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!adminAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const body = await req.json() as {
    active?: boolean;
    calendlyUrl?: string;
    metaPixelId?: string;
    domain?: string;
    newPassword?: string;
    regenerateInvite?: boolean;
  };

  const updates: Record<string, unknown> = {};
  let newInviteLink: string | undefined;

  if (body.active !== undefined) updates.active = body.active;
  if (body.calendlyUrl !== undefined) updates.calendly_url = body.calendlyUrl;
  if (body.metaPixelId !== undefined) updates.meta_pixel_id = body.metaPixelId;
  if (body.domain !== undefined) updates.domain = body.domain;

  if (body.newPassword !== undefined) {
    if (body.newPassword.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }
    updates.password_hash = await bcrypt.hash(body.newPassword, 10);
  }

  if (body.regenerateInvite) {
    const newToken = crypto.randomBytes(32).toString("hex");
    updates.invite_token = newToken;
    updates.invite_used = false;

    const { data: client } = await supabase
      .from("v2_clients")
      .select("slug")
      .eq("id", id)
      .maybeSingle();

    if (client) {
      const host = process.env.NEXT_PUBLIC_V2_HOST ?? "v2.heypearl.io";
      newInviteLink = `https://${host}/cashoffer/${client.slug}/setup?token=${newToken}`;
    }
  }

  if (Object.keys(updates).length === 0 && !body.regenerateInvite) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const { error } = await supabase
    .from("v2_clients")
    .update(updates)
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, inviteLink: newInviteLink });
}
