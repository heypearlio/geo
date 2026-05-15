import { NextRequest, NextResponse } from "next/server";
import { resend, supabase, pickFrom, REPLY_TO } from "../../../../lib/resend";

function isAuthed(req: NextRequest) {
  const cookieAuth = req.cookies.get("admin_auth")?.value === (process.env.ADMIN_TOKEN ?? "geo-admin-authenticated");
  const keyAuth    = req.headers.get("x-admin-key") === process.env.CRON_SECRET;
  return cookieAuth || keyAuth;
}

export async function POST(req: NextRequest) {
  if (!isAuthed(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { email, subject, body } = await req.json();
  if (!email || !subject || !body) {
    return NextResponse.json({ error: "Missing email, subject, or body" }, { status: 400 });
  }

  // Convert plain text body to simple HTML
  const html = `<div style="font-family:Georgia,serif;font-size:16px;line-height:1.6;color:#1a1a1a;max-width:580px;margin:0 auto;padding:20px;">
${body.split("\n").map((line: string) => line.trim() ? `<p style="margin:0 0 16px;">${line}</p>` : "").join("")}
<p style="margin:32px 0 0;color:#666;font-size:14px;">— Misti</p>
</div>`;

  const result = await resend.emails.send({
    from: pickFrom(email),
    replyTo: REPLY_TO,
    to: email,
    subject,
    html,
  });

  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: 500 });
  }

  // Log to geo_email_events so it appears in timeline
  await supabase.from("geo_email_events").insert({
    email,
    sequence: "personal",
    step: 0,
    event_type: "sent",
    resend_email_id: result.data?.id ?? null,
    created_at: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true, id: result.data?.id });
}
