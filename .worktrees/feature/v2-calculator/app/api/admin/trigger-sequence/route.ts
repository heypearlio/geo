import { NextRequest, NextResponse } from "next/server";
import { enqueueSequence, isSuppressed, supabase } from "../../../../lib/resend";

export async function POST(req: NextRequest) {
  const keyAuth    = req.headers.get("x-admin-key") === process.env.CRON_SECRET;
  const cookieAuth = req.cookies.get("admin_auth")?.value === (process.env.ADMIN_TOKEN ?? "geo-admin-authenticated");
  if (!keyAuth && !cookieAuth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { email, sequence } = await req.json();
  if (!email || !sequence) return NextResponse.json({ error: "Missing email or sequence" }, { status: 400 });

  if (await isSuppressed(email)) return NextResponse.json({ error: "Suppressed" }, { status: 400 });

  const { data: nameRow } = await supabase
    .from("geo_email_queue")
    .select("first_name")
    .eq("email", email)
    .not("first_name", "is", null)
    .limit(1);
  const firstName = nameRow?.[0]?.first_name ?? undefined;

  await enqueueSequence(sequence as Parameters<typeof enqueueSequence>[0], email, firstName);

  return NextResponse.json({ ok: true });
}
