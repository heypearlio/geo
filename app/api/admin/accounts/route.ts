import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../../lib/resend";
import { createAccount } from "../../../../lib/account";

function adminAuth(req: NextRequest): boolean {
  const cookieAuth = req.cookies.get("admin_auth")?.value === (process.env.ADMIN_TOKEN ?? "geo-admin-authenticated");
  const keyAuth = req.headers.get("x-admin-key") === process.env.ADMIN_TOKEN;
  return cookieAuth || keyAuth;
}

export async function GET(req: NextRequest) {
  if (!adminAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("accounts")
    .select("id, email, first_name, last_name, phone, created_at, account_offers(offer, slug)")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  if (!adminAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as {
    email?: string;
    password?: string;
    first_name?: string;
    last_name?: string;
    phone?: string;
    headshot_url?: string;
  };

  if (!body.email || !body.password) {
    return NextResponse.json({ error: "email and password required" }, { status: 400 });
  }

  const result = await createAccount({
    email: body.email,
    password: body.password,
    first_name: body.first_name,
    last_name: body.last_name,
    phone: body.phone,
    headshot_url: body.headshot_url,
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(result, { status: 201 });
}
