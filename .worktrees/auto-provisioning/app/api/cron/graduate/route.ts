import { NextRequest, NextResponse } from "next/server";
import { supabase, enqueueSequence, isSuppressed } from "../../../../lib/resend";
import { EMAIL_TEMPLATES } from "../../../../lib/emails/templates";

function getLongTermNurtureStepCount(): number {
  let count = 0;
  while (EMAIL_TEMPLATES[`long_term_nurture_${count + 1}` as keyof typeof EMAIL_TEMPLATES]) {
    count++;
  }
  return count;
}

// Helper: enroll into long_term_nurture if not already there
async function graduateToLongTerm(email: string): Promise<boolean> {
  if (await isSuppressed(email)) return false;

  const [{ data: sent }, { data: queued }] = await Promise.all([
    supabase.from("geo_email_events").select("id").eq("email", email).eq("sequence", "long_term_nurture").limit(1),
    supabase.from("geo_email_queue").select("id").eq("email", email).eq("sequence", "long_term_nurture").is("cancelled_at", null).limit(1),
  ]);
  if ((sent?.length ?? 0) > 0 || (queued?.length ?? 0) > 0) return false;

  const { data: nameRow } = await supabase
    .from("geo_email_queue")
    .select("first_name")
    .eq("email", email)
    .not("first_name", "is", null)
    .limit(1);
  const firstName = nameRow?.[0]?.first_name ?? undefined;

  await enqueueSequence("long_term_nurture", email, firstName);
  return true;
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const totalLongTermSteps = getLongTermNurtureStepCount();
  const graduated: string[] = [];
  const extended: string[] = [];
  const safetyNet: string[] = [];
  const errors: string[] = [];

  // ── 1. SEQUENCE GRADUATION ────────────────────────────────────────────────
  // For each sequence, find contacts who finished the last step and haven't
  // entered long_term_nurture yet.

  // Chain map: when a sequence's final step is sent, enroll in the next sequence.
  // Sequences not listed here are TERMINAL (purchased_welcome, long_term_nurture, post_booking, pre_interview).
  const CHAIN_MAP: Record<string, { finalStep: number; next: string }> = {
    warm_nurture:       { finalStep: 10, next: "proof"             },
    audit_invite:       { finalStep: 3,  next: "proof"             },
    audit_failed:       { finalStep: 3,  next: "proof"             },
    no_show:            { finalStep: 4,  next: "proof"             },
    video_watched:      { finalStep: 1,  next: "proof"             },
    video_abandoned:    { finalStep: 1,  next: "proof"             },
    schedule_abandoned: { finalStep: 1,  next: "proof"             },
    v2_cold:            { finalStep: 3,  next: "proof"             },
    v2_post_booking:    { finalStep: 2,  next: "proof"             },
    proof:              { finalStep: 12, next: "long_term_nurture" },
    hot_proof:          { finalStep: 5,  next: "long_term_nurture" },
    post_call:          { finalStep: 12, next: "proof"             }, // overridden per-lead below — proof unless already seen proof → hot_proof
    // Legacy sequences — templates still exist and sends still happen for older leads
    lead_nurture:       { finalStep: 6,  next: "proof"             },
    claim_nurture:      { finalStep: 2,  next: "proof"             },
    // NOTE: pre_interview, post_interview are podcast-only — completely separate track,
    // intentionally NOT in this chain. Podcast contacts never graduate into the GEO series.
  };

  // Give a 24h window after the final step sends before auto-enrolling in the
  // next sequence — so purchased_welcome can be triggered manually for buyers.
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  for (const [sequence, { finalStep, next }] of Object.entries(CHAIN_MAP)) {
    const { data: finished } = await supabase
      .from("geo_email_events")
      .select("email")
      .eq("sequence", sequence)
      .eq("step", finalStep)
      .eq("event_type", "sent")
      .lt("created_at", oneDayAgo)
      .limit(75);

    const candidates = [...new Set((finished ?? []).map(r => r.email))];

    for (const email of candidates) {
      try {
        if (await isSuppressed(email)) continue;

        // Skip if they already have pending emails (took an action that moved them elsewhere)
        const { data: pending } = await supabase
          .from("geo_email_queue")
          .select("id")
          .eq("email", email)
          .is("sent_at", null)
          .is("cancelled_at", null)
          .limit(1);
        if ((pending?.length ?? 0) > 0) continue;

        // For post_call: go to proof unless they've already been through proof, then hot_proof
        let resolvedNext = next;
        if (sequence === "post_call") {
          const { data: proofSent } = await supabase
            .from("geo_email_events")
            .select("id")
            .eq("email", email)
            .eq("sequence", "proof")
            .eq("event_type", "sent")
            .limit(1);
          resolvedNext = (proofSent?.length ?? 0) > 0 ? "hot_proof" : "proof";
        }

        // Skip if they already have sent rows in the next sequence
        const { data: alreadyIn } = await supabase
          .from("geo_email_events")
          .select("id")
          .eq("email", email)
          .eq("sequence", resolvedNext)
          .eq("event_type", "sent")
          .limit(1);
        if ((alreadyIn?.length ?? 0) > 0) continue;

        // Also skip if already queued in next sequence
        const { data: alreadyQueued } = await supabase
          .from("geo_email_queue")
          .select("id")
          .eq("email", email)
          .eq("sequence", resolvedNext)
          .is("cancelled_at", null)
          .limit(1);
        if ((alreadyQueued?.length ?? 0) > 0) continue;

        const { data: nameRow } = await supabase
          .from("geo_email_queue")
          .select("first_name")
          .eq("email", email)
          .not("first_name", "is", null)
          .limit(1);
        const firstName = nameRow?.[0]?.first_name ?? undefined;

        if (resolvedNext === "long_term_nurture") {
          const didGraduate = await graduateToLongTerm(email);
          if (didGraduate) graduated.push(`${sequence}->${resolvedNext}:${email}`);
        } else {
          await enqueueSequence(resolvedNext as Parameters<typeof enqueueSequence>[0], email, firstName);
          graduated.push(`${sequence}->${resolvedNext}:${email}`);
        }
      } catch (err) {
        errors.push(`chain:${sequence}:${email}:${String(err)}`);
      }
    }
  }

  // ── 1B. 4-HOUR FAILSAFE: post_booking with no outcome → post_call ──────────
  // If a call happened 4+ hours ago and admin hasn't set an outcome, auto-enroll in post_call.
  const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();
  const { data: staleCalls } = await supabase
    .from("geo_scheduled_calls")
    .select("email, first_name")
    .eq("outcome", "pending")
    .lt("meeting_time", fourHoursAgo);

  for (const call of staleCalls ?? []) {
    try {
      if (await isSuppressed(call.email)) continue;

      // Only enroll if they still have post_booking pending (not already handled)
      const { data: postBooking } = await supabase
        .from("geo_email_queue")
        .select("id")
        .eq("email", call.email)
        .eq("sequence", "post_booking")
        .is("sent_at", null)
        .is("cancelled_at", null)
        .limit(1);

      // Check they're not already in another sequence
      const { data: anyPending } = await supabase
        .from("geo_email_queue")
        .select("id, sequence")
        .eq("email", call.email)
        .is("sent_at", null)
        .is("cancelled_at", null)
        .not("sequence", "eq", "post_booking")
        .limit(1);

      if ((anyPending?.length ?? 0) > 0) {
        // Already handled — just mark the call record
        await supabase.from("geo_scheduled_calls").update({ outcome: "post_call", processed_at: new Date().toISOString() }).eq("email", call.email).eq("outcome", "pending");
        continue;
      }

      await supabase.from("geo_scheduled_calls").update({ outcome: "post_call", processed_at: new Date().toISOString() }).eq("email", call.email).eq("outcome", "pending");
      if ((postBooking?.length ?? 0) > 0) {
        // Cancel post_booking and enroll in post_call
        await supabase.from("geo_email_queue").update({ cancelled_at: new Date().toISOString() }).eq("email", call.email).eq("sequence", "post_booking").is("sent_at", null);
      }
      await enqueueSequence("post_call", call.email, call.first_name ?? undefined);
      graduated.push(`failsafe->post_call:${call.email}`);
    } catch (err) {
      errors.push(`failsafe:${call.email}:${String(err)}`);
    }
  }

  // ── 2. LONG-TERM NURTURE EXTENSION ────────────────────────────────────────
  // Contacts in long_term_nurture with no more pending steps get the next
  // template queued 30 days after their last send.

  const { data: ltnSent } = await supabase
    .from("geo_email_events")
    .select("email, step")
    .eq("sequence", "long_term_nurture")
    .eq("event_type", "sent")
    .order("step", { ascending: false });

  const highestSentMap = new Map<string, number>();
  for (const row of ltnSent ?? []) {
    const current = highestSentMap.get(row.email) ?? 0;
    if (row.step > current) highestSentMap.set(row.email, row.step);
  }

  for (const [email, highestSent] of highestSentMap.entries()) {
    try {
      if (highestSent >= totalLongTermSteps) continue;
      if (await isSuppressed(email)) continue;

      const nextStep = highestSent + 1;

      const [{ data: alreadySent }, { data: alreadyQueued }] = await Promise.all([
        supabase.from("geo_email_events").select("id").eq("email", email).eq("sequence", "long_term_nurture").eq("step", nextStep).eq("event_type", "sent").limit(1),
        supabase.from("geo_email_queue").select("id").eq("email", email).eq("sequence", "long_term_nurture").eq("step", nextStep).is("sent_at", null).is("cancelled_at", null).limit(1),
      ]);
      if ((alreadySent?.length ?? 0) > 0 || (alreadyQueued?.length ?? 0) > 0) continue;

      const { data: lastSendRow } = await supabase
        .from("geo_email_events")
        .select("created_at")
        .eq("email", email)
        .eq("sequence", "long_term_nurture")
        .eq("event_type", "sent")
        .order("created_at", { ascending: false })
        .limit(1);

      const lastSent = lastSendRow?.[0]?.created_at ? new Date(lastSendRow[0].created_at) : new Date();
      const sendAt = new Date(lastSent.getTime() + 30 * 24 * 60 * 60 * 1000);
      if (sendAt < new Date()) {
        sendAt.setTime(new Date().getTime() + 24 * 60 * 60 * 1000);
      }

      const { data: nameRow } = await supabase
        .from("geo_email_queue")
        .select("first_name")
        .eq("email", email)
        .not("first_name", "is", null)
        .limit(1);
      const firstName = nameRow?.[0]?.first_name ?? undefined;

      await supabase.from("geo_email_queue").insert({
        email,
        first_name: firstName ?? null,
        sequence: "long_term_nurture",
        step: nextStep,
        send_at: sendAt.toISOString(),
        metadata: {},
      });

      extended.push(email);
    } catch (err) {
      errors.push(`extend:${email}:${String(err)}`);
    }
  }

  // ── 3. 30-DAY SAFETY NET ──────────────────────────────────────────────────
  // IRON RULE: no contact goes more than 30 days without an email unless
  // they are suppressed, unsubscribed, or a current client.
  //
  // Find every email address we have ever seen, check when their last email
  // was sent OR their next email is queued. If neither is within 30 days,
  // enroll them in long_term_nurture.

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // All known emails in the system (batch 200 at a time to avoid timeouts)
  const { data: allKnown } = await supabase
    .from("geo_email_events")
    .select("email")
    .eq("event_type", "sent")
    .limit(200);

  const allEmails = [...new Set((allKnown ?? []).map(r => r.email))];

  for (const email of allEmails) {
    try {
      if (await isSuppressed(email)) continue;

      // Check if they've received an email in the last 30 days
      const { data: recentSent } = await supabase
        .from("geo_email_events")
        .select("id")
        .eq("email", email)
        .eq("event_type", "sent")
        .gte("created_at", thirtyDaysAgo)
        .limit(1);

      if ((recentSent?.length ?? 0) > 0) continue;

      // Check if they have an email queued in the next 30 days
      const { data: upcoming } = await supabase
        .from("geo_email_queue")
        .select("id")
        .eq("email", email)
        .is("sent_at", null)
        .is("cancelled_at", null)
        .limit(1);

      if ((upcoming?.length ?? 0) > 0) continue;

      // Skip podcast-only contacts — podcast track is separate from GEO series
      const { data: nonPodcastSent } = await supabase
        .from("geo_email_events")
        .select("id")
        .eq("email", email)
        .eq("event_type", "sent")
        .not("sequence", "in", '("pre_interview","post_interview")')
        .limit(1);
      if ((nonPodcastSent?.length ?? 0) === 0) continue;

      // No recent send and nothing queued — enroll in long_term_nurture
      const didGraduate = await graduateToLongTerm(email);
      if (didGraduate) safetyNet.push(email);
    } catch (err) {
      errors.push(`safety_net:${email}:${String(err)}`);
    }
  }

  return NextResponse.json({
    graduated: graduated.length,
    extended: extended.length,
    safety_net: safetyNet.length,
    errors: errors.length,
    totalLongTermSteps,
    details: { graduated, extended, safetyNet, errors },
  });
}
