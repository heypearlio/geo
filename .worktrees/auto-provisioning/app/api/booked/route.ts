import { NextRequest, NextResponse } from "next/server";
import { enqueueSequence, addToResendAudience, cancelQueuedEmails, isSuppressed, supabase } from "../../../lib/resend";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const email: string = body.email ?? body.payload?.invitee?.email ?? "";
  const firstName: string = body.first_name ?? body.payload?.invitee?.first_name ?? "";
  const source: string = body.source ?? "";

  if (!email) return NextResponse.json({ error: "No email" }, { status: 400 });

  // Never re-enroll a suppressed contact (clients, unsubscribes)
  if (await isSuppressed(email)) return NextResponse.json({ success: true });

  try {
    await cancelQueuedEmails(email); // cancel ALL pending sequences before enrolling
    await addToResendAudience(email, firstName);

    const isV2 = source === "v2";

    if (isV2) {
      await enqueueSequence("v2_post_booking", email, firstName || undefined, { source: "v2" });
    } else {
      // Skip the audit nudge email (step 2) if they already received a score email
      const { data: priorAudit } = await supabase
        .from("geo_email_events")
        .select("id")
        .eq("email", email)
        .eq("sequence", "warm_nurture")
        .eq("step", 1)
        .eq("event_type", "sent")
        .limit(1);

      const hasAudit = (priorAudit?.length ?? 0) > 0;
      const skipSteps = hasAudit ? [2] : [];
      await enqueueSequence("post_booking", email, firstName || undefined, {}, skipSteps);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Booked route error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
