import { NextRequest, NextResponse } from "next/server";
import { enqueueSequence, cancelQueuedEmails, supabase } from "../../../lib/resend";
import type { SequenceKey } from "../../../lib/sequences";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const event: string = body.event ?? "";
  const payload = body.payload ?? {};

  // Extract email and name — Calendly puts these at payload level
  const email: string = (payload.email ?? "").trim().toLowerCase();
  const name: string = payload.name ?? "";
  const firstName: string = payload.first_name ?? name.split(" ")[0] ?? "";

  // Event type name is in the scheduled_event object
  const eventTypeName: string = (payload.scheduled_event?.name ?? "").toLowerCase();

  // GEO sales call keywords come from GEO_CALENDLY_KEYWORDS env var (comma-separated).
  // Update that var in Vercel when switching salespeople — no code change needed.
  const geoKeywords = (process.env.GEO_CALENDLY_KEYWORDS ?? "geo strategy call,meet with misti")
    .split(",")
    .map(k => k.trim().toLowerCase())
    .filter(Boolean);
  const isSalesCall    = geoKeywords.some(k => eventTypeName.includes(k));
  const isPreInterview = eventTypeName.includes("pre-interview") || eventTypeName.includes("pre interview");

  if (!email) return NextResponse.json({ ok: true });

  // ── BOOKING ──
  if (event === "invitee.created") {
    // Ignore all event types except the two we handle
    if (!isSalesCall && !isPreInterview) return NextResponse.json({ ok: true });

    // Idempotency guard — Calendly sometimes fires the same webhook twice within seconds.
    // Use meeting_time + email as the natural dedup key. If we've already recorded this
    // booking in geo_scheduled_calls, or already queued the first step of the matching
    // post-booking sequence, this is a duplicate — return early before creating any records.
    const meetingTimeRaw: string | undefined = payload.scheduled_event?.start_time;
    if (meetingTimeRaw) {
      const { data: existingCall } = await supabase
        .from("geo_scheduled_calls")
        .select("id")
        .eq("email", email)
        .eq("meeting_time", meetingTimeRaw)
        .limit(1);
      if (existingCall && existingCall.length > 0) {
        console.log(`Calendly duplicate webhook ignored: ${email} meeting_time=${meetingTimeRaw}`);
        return NextResponse.json({ ok: true });
      }
    }

    // ── Pre-Interview ──
    if (isPreInterview) {
      await enqueueSequence("pre_interview", email, firstName, { source: "calendly_podcast" });
      // Store meeting time so process-calls cron can send the post-interview follow-up
      const preInterviewMeetingTime = payload.scheduled_event?.start_time;
      if (preInterviewMeetingTime) {
        await supabase.from("geo_scheduled_calls").insert({
          email,
          first_name: firstName || null,
          meeting_time: preInterviewMeetingTime,
          outcome: "pending",
          event_type: "pre_interview",
        });
      }
      console.log(`Calendly pre-interview booked: ${email}`);
      return NextResponse.json({ ok: true });
    }
    // Detect affiliate applicants — email has an affiliate_application marker row
    const { data: affiliateRow } = await supabase
      .from("geo_email_queue")
      .select("id")
      .eq("email", email)
      .eq("sequence", "affiliate_application")
      .limit(1);
    const isAffiliate = (affiliateRow?.length ?? 0) > 0;

    if (isAffiliate) {
      await cancelQueuedEmails(email, ["affiliate_schedule_abandoned"]);
      await enqueueSequence("affiliate_post_booking", email, firstName, { source: "calendly_affiliate" });

      const meetingTime = payload.scheduled_event?.start_time;
      if (meetingTime) {
        const step2Time = new Date(new Date(meetingTime).getTime() - 24 * 60 * 60 * 1000);
        await supabase
          .from("geo_email_queue")
          .update({ send_at: step2Time.toISOString() })
          .eq("email", email)
          .eq("sequence", "affiliate_post_booking")
          .eq("step", 2)
          .is("sent_at", null)
          .is("cancelled_at", null);

        // Record in geo_scheduled_calls so the idempotency guard at the top of this handler
        // blocks any duplicate webhook fires for this same booking.
        await supabase.from("geo_scheduled_calls").insert({
          email,
          first_name: firstName || null,
          meeting_time: meetingTime,
          outcome: "pending",
          event_type: "affiliate",
        });
      }

      console.log(`Calendly affiliate booked: ${email} (${firstName})`);
      return NextResponse.json({ ok: true });
    }

    // Detect V2 leads by checking if they were in the v2_cold sequence
    const { data: v2ColdRow } = await supabase
      .from("geo_email_queue")
      .select("id")
      .eq("email", email)
      .eq("sequence", "v2_cold")
      .limit(1);
    const isV2Lead = (v2ColdRow?.length ?? 0) > 0;

    await cancelQueuedEmails(email, [
      "warm_nurture", "long_term_nurture", "schedule_abandoned",
      "video_watched", "video_abandoned", "no_show",
      "audit_invite", "audit_failed", "post_call",
      "v2_cold",
    ]);

    let bookingSequence: SequenceKey;
    let skipSteps: number[] = [];

    if (isV2Lead) {
      bookingSequence = "v2_post_booking";
    } else {
      bookingSequence = "post_booking";
      const { data: priorAudit } = await supabase
        .from("geo_email_events")
        .select("id")
        .eq("email", email)
        .eq("sequence", "warm_nurture")
        .eq("step", 1)
        .eq("event_type", "sent")
        .limit(1);
      skipSteps = (priorAudit?.length ?? 0) > 0 ? [2] : [];
    }

    await enqueueSequence(bookingSequence, email, firstName, { source: "calendly_geo" }, skipSteps);

    // Save the scheduled meeting time so the call-outcome cron can match it in Fireflies
    const meetingTime = payload.scheduled_event?.start_time;
    if (meetingTime) {
      await supabase.from("geo_scheduled_calls").insert({
        email,
        first_name: firstName || null,
        meeting_time: meetingTime,
        outcome: "pending",
      });

      // Fix step 2 timing: must be relative to MEETING time, not booking time.
      // Step 1 (immediate booking confirmation) is already correct.
      const meetingDate = new Date(meetingTime);
      const step2Time = new Date(meetingDate.getTime() - 24 * 60 * 60 * 1000); // 1 day before meeting
      await supabase
        .from("geo_email_queue")
        .update({ send_at: step2Time.toISOString() })
        .eq("email", email)
        .eq("sequence", bookingSequence)
        .eq("step", 2)
        .is("sent_at", null)
        .is("cancelled_at", null);
    }

    console.log(`Calendly booked: ${email} (${firstName}) — sequence: ${bookingSequence}`);
    return NextResponse.json({ ok: true });
  }

  // ── CANCELLATION ──
  if (event === "invitee.canceled") {
    // Ignore all event types except the two we handle
    if (!isSalesCall && !isPreInterview) return NextResponse.json({ ok: true });

    // Pre-interview cancelled — just cancel pending emails, no follow-up
    if (isPreInterview) {
      await cancelQueuedEmails(email, ["pre_interview"]);
      console.log(`Calendly pre-interview cancelled: ${email}`);
      return NextResponse.json({ ok: true });
    }

    // Check if this is an affiliate cancellation
    const { data: affiliateCancelRow } = await supabase
      .from("geo_email_queue")
      .select("id")
      .eq("email", email)
      .eq("sequence", "affiliate_application")
      .limit(1);
    if ((affiliateCancelRow?.length ?? 0) > 0) {
      await cancelQueuedEmails(email, ["affiliate_post_booking"]);
      console.log(`Calendly affiliate cancelled: ${email}`);
      return NextResponse.json({ ok: true });
    }

    // Sales call cancelled
    await cancelQueuedEmails(email, ["post_booking", "v2_post_booking"]);
    await cancelQueuedEmails(email, ["no_show", "long_term_nurture"]);
    await enqueueSequence("no_show", email, firstName);

    console.log(`Calendly cancelled: ${email} (${firstName})`);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true });
}
