import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const dev = process.env.NODE_ENV === "development";

export async function POST(req: NextRequest) {
  const admin = getSupabaseAdmin();
  if (admin.client === null) {
    console.error("[live/rsvp] supabase config:", admin.configError);
    return NextResponse.json(
      {
        ok: false,
        error: "Registration is temporarily unavailable.",
        ...(dev ? { hint: admin.configError } : {}),
      },
      { status: 503 }
    );
  }
  const supabase = admin.client;

  let body: { first_name?: string; email?: string; phone?: string; source?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const first_name = (body.first_name ?? "").trim();
  const email = (body.email ?? "").trim().toLowerCase();
  const phone = (body.phone ?? "").trim();
  const source = (body.source ?? "live").trim() || "live";

  if (!first_name || !email || !phone) {
    return NextResponse.json({ ok: false, error: "Missing required fields" }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ ok: false, error: "Invalid email" }, { status: 400 });
  }

  const { error } = await supabase.from("geo_live_rsvps").insert({
    first_name,
    email,
    phone,
    source,
  });

  if (error) {
    console.error("[live/rsvp]", error);
    return NextResponse.json(
      {
        ok: false,
        error: "Could not save registration",
        ...(dev ? { debug: error.message } : {}),
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
