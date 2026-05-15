import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../../lib/resend";

function adminAuth(req: NextRequest) {
  const cookieAuth = req.cookies.get("admin_auth")?.value === (process.env.ADMIN_TOKEN ?? "geo-admin-authenticated");
  const keyAuth = req.headers.get("x-admin-key") === process.env.ADMIN_TOKEN;
  return cookieAuth || keyAuth;
}

// GET /api/admin/offers — list all custom offers
export async function GET(req: NextRequest) {
  if (!adminAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("geo_offers")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ offers: data ?? [] });
}

// POST /api/admin/offers — create a new offer
export async function POST(req: NextRequest) {
  if (!adminAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const {
    slug,
    name,
    tagline,
    funnel_tag,
    funnel_type = "local",
    config = {},
    pricing_tiers = [],
    pricing_rows = [],
    email_sequence = "",
    proof_photos = [],
  } = body;

  if (!slug || !name || !funnel_tag) {
    return NextResponse.json({ error: "slug, name, and funnel_tag are required" }, { status: 400 });
  }

  // Validate slug format
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return NextResponse.json({ error: "slug must be lowercase letters, numbers, and hyphens only" }, { status: 400 });
  }

  // Validate funnel_type
  const validTypes = ["local", "geo", "v2"];
  if (!validTypes.includes(funnel_type)) {
    return NextResponse.json({ error: `funnel_type must be one of: ${validTypes.join(", ")}` }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("geo_offers")
    .insert({
      slug,
      name,
      tagline: tagline ?? "",
      funnel_tag,
      funnel_type,
      config,
      pricing_tiers,
      pricing_rows,
      email_sequence,
      proof_photos,
      active: true,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: `An offer with slug "${slug}" already exists` }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ offer: data }, { status: 201 });
}

// PATCH /api/admin/offers — toggle active status
export async function PATCH(req: NextRequest) {
  if (!adminAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { id, active } = body;
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const { error } = await supabase
    .from("geo_offers")
    .update({ active })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
