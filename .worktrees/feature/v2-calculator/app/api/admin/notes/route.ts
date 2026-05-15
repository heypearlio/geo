import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../../lib/resend";

function isAuthed(req: NextRequest) {
  const cookieAuth = req.cookies.get("admin_auth")?.value === (process.env.ADMIN_TOKEN ?? "geo-admin-authenticated");
  const keyAuth    = req.headers.get("x-admin-key") === process.env.CRON_SECRET;
  return cookieAuth || keyAuth;
}

export async function GET(req: NextRequest) {
  if (!isAuthed(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const email = req.nextUrl.searchParams.get("email");
  if (!email) return NextResponse.json({ error: "Missing email" }, { status: 400 });

  const { data, error } = await supabase
    .from("geo_lead_notes")
    .select("id, note, created_at")
    .eq("email", email)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ notes: data ?? [] });
}

export async function POST(req: NextRequest) {
  if (!isAuthed(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { email, note } = await req.json();
  if (!email || !note?.trim()) return NextResponse.json({ error: "Missing email or note" }, { status: 400 });

  const { data, error } = await supabase
    .from("geo_lead_notes")
    .insert({ email: email.toLowerCase().trim(), note: note.trim() })
    .select("id, note, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ note: data });
}

export async function DELETE(req: NextRequest) {
  if (!isAuthed(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const { error } = await supabase
    .from("geo_lead_notes")
    .delete()
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
