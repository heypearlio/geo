import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { supabase } from "../../../../lib/resend";

function adminAuth(req: NextRequest) {
  const cookieAuth = req.cookies.get("admin_auth")?.value === (process.env.ADMIN_TOKEN ?? "geo-admin-authenticated");
  const keyAuth = req.headers.get("x-admin-key") === process.env.ADMIN_TOKEN;
  return cookieAuth || keyAuth;
}

export async function GET(req: NextRequest) {
  if (!adminAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: clients, error } = await supabase
    .from("v2_clients")
    .select("id, name, slug, calendly_url, meta_pixel_id, domain, invite_used, active, created_at")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const slugs = (clients ?? []).map(c => c.slug);
  const { data: leadCounts } = await supabase
    .from("cashoffer_leads")
    .select("slug")
    .in("slug", slugs.length > 0 ? slugs : ["__none__"]);

  const countMap: Record<string, number> = {};
  for (const row of leadCounts ?? []) {
    countMap[row.slug] = (countMap[row.slug] ?? 0) + 1;
  }

  const result = (clients ?? []).map(c => ({
    ...c,
    leadCount: countMap[c.slug] ?? 0,
  }));

  return NextResponse.json({ clients: result });
}

export async function POST(req: NextRequest) {
  if (!adminAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, slug } = await req.json() as { name?: string; slug?: string };

  if (!name || !slug) {
    return NextResponse.json({ error: "name and slug are required" }, { status: 400 });
  }

  if (!/^[a-z0-9-]+$/.test(slug)) {
    return NextResponse.json({ error: "Slug must be lowercase letters, numbers, and hyphens only" }, { status: 400 });
  }

  const inviteToken = crypto.randomBytes(32).toString("hex");

  const { data, error } = await supabase
    .from("v2_clients")
    .insert({ name, slug, invite_token: inviteToken })
    .select("id, slug")
    .single();

  if (error) {
    if (error.message.includes("unique")) {
      return NextResponse.json({ error: "Slug already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const host = process.env.NEXT_PUBLIC_V2_HOST ?? "v2.heypearl.io";
  const inviteLink = `https://${host}/cashoffer/${data.slug}/setup?token=${inviteToken}`;

  return NextResponse.json({ id: data.id, slug: data.slug, inviteLink });
}
