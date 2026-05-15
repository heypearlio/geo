import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { supabase } from "../../../../lib/resend";

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    slug?: string;
    inviteToken?: string;
    password?: string;
    name?: string;
    email?: string;
    phone?: string;
    headshotUrl?: string;
    calendlyUrl?: string;
    instagramUrl?: string;
    facebookUrl?: string;
    linkedinUrl?: string;
    tiktokUrl?: string;
    youtubeUrl?: string;
  };

  const {
    slug, inviteToken, password, name, email, phone,
    headshotUrl, calendlyUrl,
    instagramUrl, facebookUrl, linkedinUrl, tiktokUrl, youtubeUrl,
  } = body;

  if (!slug || !inviteToken || !password) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const { data: affiliate } = await supabase
    .from("affiliates")
    .select("id, invite_token, invite_used")
    .eq("slug", slug)
    .maybeSingle();

  if (!affiliate || affiliate.invite_used || affiliate.invite_token !== inviteToken) {
    return NextResponse.json({ error: "Invalid or expired invite link" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const sessionToken = crypto.randomBytes(32).toString("hex");

  await supabase
    .from("affiliates")
    .update({
      password_hash: passwordHash,
      session_token: sessionToken,
      invite_token: null,
      invite_used: true,
      name: name ?? undefined,
      email: email ?? undefined,
      phone: phone ?? undefined,
      headshot_url: headshotUrl ?? undefined,
      calendly_url: calendlyUrl ?? undefined,
      instagram_url: instagramUrl ?? undefined,
      facebook_url:  facebookUrl  ?? undefined,
      linkedin_url:  linkedinUrl  ?? undefined,
      tiktok_url:    tiktokUrl    ?? undefined,
      youtube_url:   youtubeUrl   ?? undefined,
    })
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

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug");
  const token = req.nextUrl.searchParams.get("token");
  if (!slug || !token) return NextResponse.json({ error: "Missing params" }, { status: 400 });

  const { data } = await supabase
    .from("affiliates")
    .select("invite_token, invite_used")
    .eq("slug", slug)
    .maybeSingle();

  if (!data || data.invite_used || data.invite_token !== token) {
    return NextResponse.json({ error: "Invalid" }, { status: 400 });
  }

  return NextResponse.json({ valid: true });
}
