import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { buildLeadSource } from "../../../lib/source";

export async function POST(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const body = await req.json();
  const email = (body.email ?? "").trim().toLowerCase();
  const name = (body.name ?? "").trim();
  const phone = (body.phone ?? "").trim();

  if (!email && !name && !phone) {
    return NextResponse.json({ ok: false, error: "No contact data" }, { status: 400 });
  }

  const { source_tag, source_url } = buildLeadSource(req, null);

  try {
    await supabase.from("cashoffer_leads").insert({
      email: email || null,
      name: name || null,
      phone: phone || null,
      slug: "v2-calculator",
      source_tag,
      source_url,
    });
  } catch {
    // Non-blocking — user flow continues regardless
  }

  return NextResponse.json({ ok: true });
}
