import { NextRequest, NextResponse } from "next/server";
import { supabase, cancelQueuedEmails, enqueueSequence, suppressEmail } from "../../../../lib/resend";
import { SEQUENCES } from "../../../../lib/sequences";
import type { SequenceKey } from "../../../../lib/sequences";

const STRIPE_LINKS: Record<number, string> = {
  1: "https://buy.stripe.com/00w8wQ7OkftIfsCdON5Ne0c",
  2: "https://buy.stripe.com/fZu7sMecIgxM1BMaCB5Ne0i",
  3: "https://buy.stripe.com/5kQ28s1pW0yO1BM6ml5Ne0q",
};
const PRICE_INT: Record<number, number> = { 1: 1500, 2: 2500, 3: 3500 };

function isAuthed(req: NextRequest) {
  const cookieAuth = req.cookies.get("admin_auth")?.value === (process.env.ADMIN_TOKEN ?? "geo-admin-authenticated");
  const keyAuth    = req.headers.get("x-admin-key") === process.env.CRON_SECRET;
  return cookieAuth || keyAuth;
}

const SEQ_STEPS: Record<string, number> = {
  ...Object.fromEntries(SEQUENCES.map(s => [s.key, s.steps])),
  lead_nurture:  6,
  claim_nurture: 6,
  local_nurture: 1,
};

export async function GET(req: NextRequest) {
  if (!isAuthed(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const email = req.nextUrl.searchParams.get("email");
  if (!email) return NextResponse.json({ error: "Missing email" }, { status: 400 });

  // Parallel fetch all data sources
  const [
    { data: queueRows },
    { data: eventRows },
    { data: auditRows },
    { data: claimRows },
    { data: callRows },
    { data: scoreRows },
    { data: suppressedRow },
    { data: localSubmissions },
    { data: tagRows },
  ] = await Promise.all([
    supabase.from("geo_email_queue")
      .select("sequence, step, send_at, sent_at, cancelled_at, metadata, first_name")
      .eq("email", email)
      .order("send_at", { ascending: true }),
    supabase.from("geo_email_events")
      .select("sequence, step, event_type, created_at, resend_email_id")
      .eq("email", email)
      .order("created_at", { ascending: false }),
    supabase.from("geo_audit_history")
      .select("overall, seo, ai, website, created_at")
      .eq("email", email)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase.from("geo_claim_submissions")
      .select("first_name, last_name, city, website, created_at")
      .eq("email", email)
      .order("created_at", { ascending: false })
      .limit(1),
    supabase.from("geo_scheduled_calls")
      .select("meeting_time, outcome, event_type, created_at, package_price")
      .eq("email", email)
      .order("created_at", { ascending: false }),
    supabase.from("geo_lead_scores")
      .select("score, created_at")
      .eq("email", email)
      .order("created_at", { ascending: false })
      .limit(1),
    supabase.from("geo_suppressed")
      .select("reason")
      .eq("email", email)
      .limit(1),
    supabase.from("geo_local_submissions")
      .select("source_tag, created_at")
      .eq("email", email)
      .order("created_at", { ascending: true }),
    supabase.from("geo_lead_tags")
      .select("tag, created_at")
      .eq("email", email)
      .order("created_at", { ascending: true }),

  ]);

  // Derive first name and city from any source
  const firstName = (queueRows ?? []).find(r => r.first_name)?.first_name
    ?? claimRows?.[0]?.first_name
    ?? null;
  const city = claimRows?.[0]?.city ?? null;

  // Derive source from queue metadata (first-touch attribution)
  const allQueueMeta = (queueRows ?? []).map(r => r.metadata as Record<string, string> | null);
  const firstSource = allQueueMeta.find(m => m?.source)?.source ?? "unknown";

  // Collect all affiliate tags (from geo_local_submissions + queue metadata)
  const affiliateTagSet = new Set<string>();
  for (const row of localSubmissions ?? []) {
    if (row.source_tag) affiliateTagSet.add(row.source_tag);
  }
  for (const m of allQueueMeta) {
    if (m?.affiliate_tag) affiliateTagSet.add(m.affiliate_tag);
  }
  const affiliateTags = [...affiliateTagSet];

  // Derive lead status
  const suppressedReason = suppressedRow?.[0]?.reason ?? null;
  const sentSequences = new Set((eventRows ?? []).filter(e => e.event_type === "sent").map(e => e.sequence));
  const isBooked  = sentSequences.has("post_booking") || sentSequences.has("post_call") || sentSequences.has("v2_post_booking");
  const isNoShow  = sentSequences.has("no_show");
  const hasOpened  = (eventRows ?? []).some(e => e.event_type === "opened");
  const hasClicked = (eventRows ?? []).some(e => e.event_type === "clicked");

  let status = "Cold";
  if (suppressedReason === "client")                                       status = "Client";
  else if (suppressedReason === "admin_suppressed"
        || suppressedReason === "bounced"
        || suppressedReason === "unsubscribed"
        || suppressedReason === "spam")                                    status = "Suppressed";
  else if (isBooked && !isNoShow)                                          status = "Hot";
  else if (isNoShow)                           status = "No Show";
  else if (hasClicked)                         status = "Hot";
  else if (hasOpened)                          status = "Warm";

  // Build current sequence card (pending + sent per sequence)
  const activeQueueRows = (queueRows ?? []).filter(r => !r.cancelled_at);
  const pendingBySeq = new Map<string, typeof activeQueueRows>();
  for (const row of activeQueueRows.filter(r => !r.sent_at)) {
    const arr = pendingBySeq.get(row.sequence) ?? [];
    arr.push(row);
    pendingBySeq.set(row.sequence, arr);
  }

  // Current sequences (ones with pending emails)
  const currentSequences = [...pendingBySeq.keys()];

  // Build sequence progress for each current sequence
  const sequenceCards = currentSequences.map(seq => {
    const totalSteps = SEQ_STEPS[seq] ?? 0;
    const sentInSeq = (eventRows ?? []).filter(e => e.sequence === seq && e.event_type === "sent");
    const sentSteps = new Set(sentInSeq.map(e => e.step));
    const openedByEmailId = new Set(
      (eventRows ?? []).filter(e => e.event_type === "opened").map(e => e.resend_email_id)
    );
    const clickedByEmailId = new Set(
      (eventRows ?? []).filter(e => e.event_type === "clicked").map(e => e.resend_email_id)
    );

    const steps = Array.from({ length: totalSteps }, (_, i) => {
      const step = i + 1;
      const sentRow = sentInSeq.find(e => e.step === step);
      const queueRow = (queueRows ?? []).find(r => r.sequence === seq && r.step === step);
      const cancelledRow = (queueRows ?? []).find(r => r.sequence === seq && r.step === step && r.cancelled_at);

      let state: "sent" | "pending" | "cancelled" = "pending";
      if (sentRow) state = "sent";
      else if (cancelledRow) state = "cancelled";

      const opened  = sentRow ? openedByEmailId.has(sentRow.resend_email_id) : false;
      const clicked = sentRow ? clickedByEmailId.has(sentRow.resend_email_id) : false;

      return {
        step,
        state,
        date: sentRow?.created_at ?? queueRow?.send_at ?? null,
        opened,
        clicked,
      };
    });

    return {
      sequence: seq,
      totalSteps,
      sentCount: sentSteps.size,
      steps,
    };
  });

  // Build timeline — merge all events into one reverse-chrono list
  const timelineItems: { date: string; type: string; sequence: string | null; step: number | null; detail: string | null }[] = [];

  // Email events
  for (const e of eventRows ?? []) {
    let detail = null;
    if (e.event_type === "clicked") detail = "link clicked";
    timelineItems.push({
      date: e.created_at,
      type: e.event_type,
      sequence: e.sequence,
      step: e.step,
      detail,
    });
  }

  // Audit scores
  for (const a of auditRows ?? []) {
    timelineItems.push({
      date: a.created_at,
      type: "audit",
      sequence: null,
      step: null,
      detail: a.website ? `Score: ${a.overall ?? "?"} — ${a.website}` : `Score: ${a.overall ?? "?"}`,
    });
  }

  // Bookings
  for (const c of callRows ?? []) {
    const label = c.event_type === "pre_interview" ? "Podcast booked" : "Strategy call booked";
    timelineItems.push({
      date: c.created_at ?? c.meeting_time,
      type: "booking",
      sequence: null,
      step: null,
      detail: `${label} — outcome: ${c.outcome}`,
    });
  }

  // Claim submissions
  for (const s of claimRows ?? []) {
    timelineItems.push({
      date: s.created_at,
      type: "claim",
      sequence: null,
      step: null,
      detail: s.website ? `Claimed: ${s.website}` : "Submitted claim form",
    });
  }

  // Sort reverse chronological
  timelineItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // First seen = earliest queue or event date
  const allDates = [
    ...(queueRows ?? []).map(r => r.send_at),
    ...(eventRows ?? []).map(e => e.created_at),
  ].filter(Boolean).sort();
  const firstSeen = allDates[0] ?? null;

  // Summary stats: unique counts (by resend_email_id), not raw event counts
  const uniqueEmailsSent   = new Set((eventRows ?? []).filter(e => e.event_type === "sent")    .map(e => e.resend_email_id).filter(Boolean)).size;
  const uniqueOpens        = new Set((eventRows ?? []).filter(e => e.event_type === "opened")  .map(e => e.resend_email_id).filter(Boolean)).size;
  const uniqueClicks       = new Set((eventRows ?? []).filter(e => e.event_type === "clicked") .map(e => e.resend_email_id).filter(Boolean)).size;

  // Quoted package: highest package_price across all call records
  const quotedPackage = (callRows ?? [])
    .map(r => (r as typeof r & { package_price?: number }).package_price)
    .filter((p): p is number => p != null)
    .sort((a, b) => b - a)[0] ?? null;

  const tags = (tagRows ?? []).map((r: { tag: string; created_at: string }) => ({
    tag: r.tag,
    date: r.created_at,
  }));

  return NextResponse.json({
    email,
    firstName,
    city,
    source: firstSource,
    tags,
    affiliateTags,
    status,
    suppressedReason,
    firstSeen,
    auditScores: auditRows ?? [],
    leadScore: scoreRows?.[0]?.score ?? null,
    currentSequences,
    sequenceCards,
    timeline: timelineItems.slice(0, 100), // raw events kept for debugging
    pendingCount: (queueRows ?? []).filter(r => !r.sent_at && !r.cancelled_at).length,
    allSequences: SEQUENCES.map(s => ({ key: s.key, label: s.steps > 0 ? `${s.label} (${s.steps} emails)` : s.label })),
    summary: {
      emails_sent: uniqueEmailsSent,
      opens:       uniqueOpens,
      clicks:      uniqueClicks,
    },
    quotedPackage,
  });
}

// POST — admin actions: move to sequence, suppress, mark as client
export async function POST(req: NextRequest) {
  if (!isAuthed(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { email, action, sequence, packageNumber } = body;

  if (!email || !action) return NextResponse.json({ error: "Missing params" }, { status: 400 });

  // Get first name
  const { data: nameRow } = await supabase
    .from("geo_email_queue")
    .select("first_name")
    .eq("email", email)
    .not("first_name", "is", null)
    .limit(1);
  const firstName = nameRow?.[0]?.first_name ?? undefined;

  if (action === "move_to_sequence") {
    if (!sequence) return NextResponse.json({ error: "Missing sequence" }, { status: 400 });
    await cancelQueuedEmails(email);
    await enqueueSequence(sequence as SequenceKey, email, firstName, { source: "admin_move" });
    // Keep call record in sync for outcome-type sequences
    const CALL_OUTCOMES: Record<string, string> = { no_show: "no_show", post_call: "post_call", proof: "proof" };
    if (CALL_OUTCOMES[sequence]) {
      await supabase.from("geo_scheduled_calls")
        .update({ outcome: CALL_OUTCOMES[sequence], processed_at: new Date().toISOString() })
        .eq("email", email)
        .eq("outcome", "pending");
    }
    return NextResponse.json({ ok: true, action, sequence });
  }

  if (action === "mark_purchased") {
    const pkg: 1 | 2 | 3 = packageNumber ?? 1;
    const enrollMeta = {
      stripe_link: STRIPE_LINKS[pkg],
      package: String(pkg),
      package_price: String(PRICE_INT[pkg]),
    };
    await cancelQueuedEmails(email);
    await enqueueSequence("purchased_welcome", email, firstName, enrollMeta);
    await enqueueSequence("hot_proof", email, firstName, enrollMeta);
    await suppressEmail(email, "client");
    // Save package_price on any existing call record
    await supabase.from("geo_scheduled_calls")
      .update({ package_price: PRICE_INT[pkg], outcome: "purchased", processed_at: new Date().toISOString() })
      .eq("email", email)
      .neq("outcome", "purchased");
    return NextResponse.json({ ok: true, action, package: pkg });
  }

  if (action === "suppress") {
    await cancelQueuedEmails(email);
    const { error } = await supabase.from("geo_suppressed").upsert({ email, reason: "admin_suppressed" });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, action });
  }

  if (action === "unsuppress") {
    const { error } = await supabase.from("geo_suppressed").delete().eq("email", email).eq("reason", "admin_suppressed");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, action });
  }

  if (action === "mark_client") {
    await cancelQueuedEmails(email);
    await supabase.from("geo_suppressed").upsert({ email, reason: "client" }, { onConflict: "email" });
    return NextResponse.json({ ok: true, action });
  }

  if (action === "add_sequence") {
    if (!sequence) return NextResponse.json({ error: "Missing sequence" }, { status: 400 });
    // Enroll in a new sequence without cancelling any existing sequences
    await enqueueSequence(sequence as SequenceKey, email, firstName, { source: "admin_move" });
    return NextResponse.json({ ok: true, action, sequence });
  }

  if (action === "remove_sequence") {
    if (!sequence) return NextResponse.json({ error: "Missing sequence" }, { status: 400 });
    // Cancel only pending emails for this specific sequence
    await cancelQueuedEmails(email, [sequence]);
    return NextResponse.json({ ok: true, action, sequence });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
