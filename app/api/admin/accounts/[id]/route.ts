import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../../../lib/resend";

function adminAuth(req: NextRequest): boolean {
  const cookieAuth = req.cookies.get("admin_auth")?.value === (process.env.ADMIN_TOKEN ?? "geo-admin-authenticated");
  const keyAuth = req.headers.get("x-admin-key") === process.env.ADMIN_TOKEN;
  return cookieAuth || keyAuth;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!adminAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const { data, error } = await supabase
    .from("accounts")
    .select("id, email, first_name, last_name, phone, headshot_url, created_at, account_offers(offer, slug, meta, granted_at)")
    .eq("id", id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(data);
}
