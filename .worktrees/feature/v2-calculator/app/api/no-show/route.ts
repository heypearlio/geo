import { NextRequest, NextResponse } from "next/server";
import { enqueueSequence, cancelQueuedEmails } from "../../../lib/resend";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const email: string = body.email ?? body.payload?.invitee?.email ?? "";
  const firstName: string = body.first_name ?? body.payload?.invitee?.first_name ?? "";

  if (!email) return NextResponse.json({ error: "No email" }, { status: 400 });

  try {
    await cancelQueuedEmails(email, ["post_booking", "long_term_nurture"]);
    await enqueueSequence("no_show", email, firstName || undefined);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("No-show route error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
