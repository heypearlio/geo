import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { supabase } from "../../../../../lib/resend";

function adminAuth(req: NextRequest) {
  const cookieAuth = req.cookies.get("admin_auth")?.value === (process.env.ADMIN_TOKEN ?? "geo-admin-authenticated");
  const keyAuth = req.headers.get("x-admin-key") === process.env.ADMIN_TOKEN;
  return cookieAuth || keyAuth;
}

// GET /api/admin/affiliates/[id]
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!adminAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const { data: affiliate, error } = await supabase
    .from("affiliates")
    .select("id, name, slug, tag, email, phone, headshot_url, calendly_url, meta_pixel_id, invite_used, active, offers, created_at, last_login")
    .eq("id", id)
    .maybeSingle();

  if (error || !affiliate) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Lead stats — geo_lead_tags is universal source for ALL offers
  const { count: leadCount } = await supabase
    .from("geo_lead_tags")
    .select("id", { count: "exact", head: true })
    .eq("tag", affiliate.tag);

  const { data: lastLeadRow } = await supabase
    .from("geo_lead_tags")
    .select("created_at")
    .eq("tag", affiliate.tag)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return NextResponse.json({
    ...affiliate,
    leadCount: leadCount ?? 0,
    lastLeadAt: lastLeadRow?.created_at ?? null,
  });
}

// PATCH /api/admin/affiliates/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!adminAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const body = await req.json() as {
    active?: boolean;
    metaPixelId?: string;
    regenerateInvite?: boolean;
    offers?: string[];
    name?: string;
    email?: string;
    calendlyUrl?: string;
    headshotUrl?: string;
    phone?: string;
    newPassword?: string;
    linkjoltUrl?: string;
  };

  const updates: Record<string, unknown> = {};
  let newInviteLink: string | undefined;

  if (body.active !== undefined) updates.active = body.active;
  if (body.metaPixelId !== undefined) updates.meta_pixel_id = body.metaPixelId;
  if (body.name !== undefined) updates.name = body.name;
  if (body.email !== undefined) updates.email = body.email;
  if (body.calendlyUrl !== undefined) updates.calendly_url = body.calendlyUrl;
  if (body.headshotUrl !== undefined) updates.headshot_url = body.headshotUrl;
  if (body.phone !== undefined) updates.phone = body.phone;
  if (body.linkjoltUrl !== undefined) updates.linkjolt_url = body.linkjoltUrl;
  if (body.offers !== undefined) {
    const valid = body.offers.filter(o => ["local", "geo", "v2"].includes(o));
    if (valid.length > 0) updates.offers = valid;
  }

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

    const { data: affiliate } = await supabase
      .from("affiliates")
      .select("slug, offers")
      .eq("id", id)
      .maybeSingle();

    if (affiliate) {
      const offers: string[] = affiliate.offers ?? [];
      const hasGeoOrV2 = offers.includes("geo") || offers.includes("v2");
      const host = hasGeoOrV2
        ? (process.env.NEXT_PUBLIC_GEO_HOST ?? "geo.heypearl.io")
        : (process.env.NEXT_PUBLIC_LOCAL_HOST ?? "local.heypearl.io");
      newInviteLink = `https://${host}/${affiliate.slug}/setup?token=${newToken}`;
    }
  }

  if (Object.keys(updates).length === 0 && !body.regenerateInvite) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const { error } = await supabase
    .from("affiliates")
    .update(updates)
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, inviteLink: newInviteLink });
}
