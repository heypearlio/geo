import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../lib/resend";

export async function POST(req: NextRequest) {
  try {
    const { email, auditId, answers } = await req.json();
    if (!email || !answers) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }
    await supabase.from("geo_quiz_answers").insert({
      email: email.toLowerCase().trim(),
      audit_id: auditId ?? null,
      answers,
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
