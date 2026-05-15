import { NextRequest, NextResponse } from "next/server";
import { suppressEmail, cancelQueuedEmails } from "../../../lib/resend";

// Call this when someone signs up as a client.
// Cancels ALL queued emails and permanently prevents future enrollment.
export async function POST(req: NextRequest) {
  const body = await req.json();
  const email: string = body.email ?? body.payload?.invitee?.email ?? "";

  if (!email) return NextResponse.json({ error: "No email" }, { status: 400 });

  try {
    await cancelQueuedEmails(email, ["warm_nurture", "long_term_nurture", "schedule_abandoned", "video_watched", "video_abandoned", "post_booking", "no_show", "audit_invite", "audit_failed"]);
    await suppressEmail(email, "client");
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Client route error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
