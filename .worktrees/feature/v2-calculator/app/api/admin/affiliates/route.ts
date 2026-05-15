import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { supabase } from "../../../../lib/resend";
import { OFFERS } from "@/lib/offer-registry";

function adminAuth(req: NextRequest) {
  const cookieAuth = req.cookies.get("admin_auth")?.value === (process.env.ADMIN_TOKEN ?? "geo-admin-authenticated");
  const keyAuth = req.headers.get("x-admin-key") === process.env.ADMIN_TOKEN;
  return cookieAuth || keyAuth;
}

// GET /api/admin/affiliates — list all affiliates with lead counts
export async function GET(req: NextRequest) {
  if (!adminAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: affiliates, error } = await supabase
    .from("affiliates")
    .select("id, name, slug, tag, offers, email, meta_pixel_id, calendly_url, linkjolt_url, invite_used, active, created_at")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Get lead counts per tag — geo_lead_tags is universal source for ALL offers
  const tags = (affiliates ?? []).map((a) => a.tag);
  const { data: leadCounts } = await supabase
    .from("geo_lead_tags")
    .select("tag")
    .in("tag", tags.length > 0 ? tags : ["__none__"]);

  const countMap: Record<string, number> = {};
  for (const row of leadCounts ?? []) {
    countMap[row.tag] = (countMap[row.tag] ?? 0) + 1;
  }

  const result = (affiliates ?? []).map((a) => ({
    ...a,
    leadCount: countMap[a.tag] ?? 0,
  }));

  return NextResponse.json({ affiliates: result });
}

// POST /api/admin/affiliates — create new affiliate
export async function POST(req: NextRequest) {
  if (!adminAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, slug, offers } = await req.json() as {
    name?: string;
    slug?: string;
    offers?: string[];
  };

  if (!name || !slug) {
    return NextResponse.json({ error: "name and slug are required" }, { status: 400 });
  }

  // Validate slug format: first.last (e.g. todd.smith, todd.smith2)
  if (!/^[a-z0-9]+(\.[a-z0-9]+)+$/.test(slug)) {
    return NextResponse.json({ error: "Slug must be lowercase letters, numbers, and hyphens only" }, { status: 400 });
  }

  // Auto-generate tag from slug
  const tag = slug;

  // Validate offers
  const validOfferValues: string[] = OFFERS.map(o => o.slug);
  let validOffers: string[];
  if (offers === undefined || offers === null) {
    validOffers = ["local"];
  } else {
    if (!Array.isArray(offers) || offers.length === 0) {
      return NextResponse.json({ error: "offers must be a non-empty array" }, { status: 400 });
    }
    const invalid = offers.find((o) => !validOfferValues.includes(o));
    if (invalid) {
      return NextResponse.json({ error: `Invalid offer value: "${invalid}". Must be one of: ${validOfferValues.join(", ")}` }, { status: 400 });
    }
    validOffers = offers;
  }

  const inviteToken = crypto.randomBytes(32).toString("hex");

  const { data, error } = await supabase
    .from("affiliates")
    .insert({ name, slug, tag, offers: validOffers, invite_token: inviteToken })
    .select("id, slug")
    .single();

  if (error) {
    if (error.message.includes("unique")) {
      return NextResponse.json({ error: "Slug or tag already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const hasGeoOrV2 = validOffers.includes("geo") || validOffers.includes("v2");
  const host = hasGeoOrV2
    ? (process.env.NEXT_PUBLIC_GEO_HOST ?? "geo.heypearl.io")
    : (process.env.NEXT_PUBLIC_LOCAL_HOST ?? "local.heypearl.io");
  const inviteLink = `https://${host}/${data.slug}/setup?token=${inviteToken}`;

  return NextResponse.json({ id: data.id, slug: data.slug, inviteLink });
}
