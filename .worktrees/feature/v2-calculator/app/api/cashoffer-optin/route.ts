// app/api/cashoffer-optin/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const body = await req.json();
  const address = (body.address ?? "").trim();
  const slug = (body.slug ?? "").trim();

  if (!address || !slug) {
    return NextResponse.json({ ok: false, error: "Missing fields" }, { status: 400 });
  }

  try {
    await supabase.from("cashoffer_leads").insert({ address, slug });
  } catch {
    // Non-blocking — user flow continues regardless
  }

  return NextResponse.json({ ok: true });
}
