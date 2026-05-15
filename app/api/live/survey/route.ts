import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const dev = process.env.NODE_ENV === "development";

export async function POST(req: NextRequest) {
  const admin = getSupabaseAdmin();
  if (admin.client === null) {
    console.error("[live/survey] supabase config:", admin.configError);
    return NextResponse.json(
      {
        ok: false,
        error: "Survey save is temporarily unavailable.",
        ...(dev ? { hint: admin.configError } : {}),
      },
      { status: 503 }
    );
  }
  const supabase = admin.client;

  let body: { email?: string; name?: string; q1?: string; q2?: string; q3?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const email = (body.email ?? "").trim().toLowerCase() || null;
  const first_name = (body.name ?? "").trim() || null;
  const q1 = (body.q1 ?? "").trim() || null;
  const q2 = (body.q2 ?? "").trim() || null;
  const q3 = (body.q3 ?? "").trim() || null;

  if (!q1 || !q2 || !q3) {
    return NextResponse.json({ ok: false, error: "Please answer all questions" }, { status: 400 });
  }

  const { error } = await supabase.from("geo_live_survey_responses").insert({
    email,
    first_name,
    q1,
    q2,
    q3,
  });

  if (error) {
    console.error("[live/survey]", error);
    return NextResponse.json(
      {
        ok: false,
        error: "Could not save responses",
        ...(dev ? { debug: error.message } : {}),
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
