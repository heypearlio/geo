import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { supabase, resend, pickFrom, REPLY_TO } from "../../../../lib/resend";

export async function POST(req: NextRequest) {
  const { slug, email } = await req.json() as { slug?: string; email?: string };

  // Always return same message to prevent enumeration
  const ok = NextResponse.json({ success: true });

  if (!slug || !email) return ok;

  const { data: affiliate } = await supabase
    .from("affiliates")
    .select("id, name, email, user_type")
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle();

  if (!affiliate || affiliate.email?.toLowerCase() !== email.toLowerCase()) return ok;

  const resetToken = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await supabase
    .from("affiliates")
    .update({ reset_token: resetToken, reset_expires_at: expiresAt.toISOString() })
    .eq("id", affiliate.id);

  const isLocal = affiliate.user_type === "local_client";
  const portalHost = isLocal
    ? (process.env.NEXT_PUBLIC_LOCAL_HOST ?? "local.heypearl.io")
    : "geo.heypearl.io";
  const portalLabel = isLocal ? "HeyLocal" : "HeyPearl";
  const resetLink = `https://${portalHost}/${slug}/reset-password?token=${resetToken}`;

  await resend.emails.send({
    from: pickFrom(email),
    replyTo: REPLY_TO,
    to: email,
    subject: `Reset your ${portalLabel} password`,
    html: `
      <p>Hi ${affiliate.name},</p>
      <p>Click the link below to reset your ${portalLabel} password. This link expires in 1 hour.</p>
      <p><a href="${resetLink}">${resetLink}</a></p>
      <p>If you didn't request this, you can ignore this email.</p>
    `,
  });

  return ok;
}
