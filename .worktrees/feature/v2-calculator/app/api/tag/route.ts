import { NextRequest, NextResponse } from "next/server";
import { enqueueSequence, cancelQueuedEmails, supabase } from "../../../lib/resend";

export async function POST(req: NextRequest) {
  const { email, segment, firstName } = await req.json();

  if (!email || !segment) {
    return NextResponse.json({ error: "Missing email or segment" }, { status: 400 });
  }

  try {
    if (segment === "schedule") {
      await cancelQueuedEmails(email); // cancel ALL pending sequences before enrolling
      await enqueueSequence("schedule_abandoned", email, firstName ?? undefined);
    }

    if (segment === "video_watched") {
      await cancelQueuedEmails(email, ["video_abandoned"]);
      await enqueueSequence("video_watched", email, firstName ?? undefined);
    }

    if (segment === "video_abandoned") {
      await enqueueSequence("video_abandoned", email, firstName ?? undefined);
    }

    if (segment === "audit_failed") {
      // Skip audit_failed if they already have an active post_booking sequence
      const { data: activeBooking } = await supabase
        .from("geo_email_queue")
        .select("id")
        .eq("email", email)
        .eq("sequence", "post_booking")
        .is("sent_at", null)
        .is("cancelled_at", null)
        .limit(1);
      if (!activeBooking || activeBooking.length === 0) {
        await cancelQueuedEmails(email, ["warm_nurture"]);
        await enqueueSequence("audit_failed", email, firstName ?? undefined);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Tag error:", segment, err);
    return NextResponse.json({ error: "Tag error" }, { status: 500 });
  }
}
