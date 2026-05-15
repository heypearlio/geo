import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { supabase, logEmailEvent, suppressEmail, checkEngagementAcceleration } from "../../../lib/resend";

// Resend sends webhook events for email.opened, email.clicked, email.bounced, etc.
// We log them to geo_email_events, joining back to sequence/step via resend_email_id.
export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  // Verify signature if secret is configured
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (secret) {
    const signature = req.headers.get("svix-signature") ?? "";
    const msgId = req.headers.get("svix-id") ?? "";
    const msgTimestamp = req.headers.get("svix-timestamp") ?? "";
    const toSign = `${msgId}.${msgTimestamp}.${rawBody}`;
    const expectedSigs = secret.replace(/^whsec_/, "");
    const key = Buffer.from(expectedSigs, "base64");
    const computed = createHmac("sha256", key).update(toSign).digest("base64");
    const passedSigs = signature.split(" ").map(s => s.replace(/^v1,/, ""));
    if (!passedSigs.includes(computed)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  const body = JSON.parse(rawBody);
  const eventType: string = body.type ?? "";
  const data = body.data ?? {};
  const resendEmailId: string = data.email_id ?? "";
  const toAddress: string = (data.to ?? [])[0] ?? "";

  if (!eventType || !resendEmailId || !toAddress) {
    return NextResponse.json({ ok: true });
  }

  // Spam complaints — suppress permanently
  if (eventType === "email.complained") {
    await suppressEmail(toAddress, "spam");
    await logEmailEvent(toAddress, "unknown", 0, "complained", resendEmailId);
    return NextResponse.json({ ok: true });
  }

  // Hard bounces — address doesn't exist, suppress permanently
  if (eventType === "email.bounced") {
    const bounceType: string = data.bounce?.type ?? data.bounceType ?? "";
    // Resend reports: "hard" = permanent failure (bad address), "soft" = temporary
    if (bounceType.toLowerCase() === "hard" || bounceType.toLowerCase() === "permanent") {
      await suppressEmail(toAddress, "bounced");
    }
    const { data: sent } = await supabase
      .from("geo_email_events")
      .select("sequence, step")
      .eq("resend_email_id", resendEmailId)
      .eq("event_type", "sent")
      .limit(1)
      .single();
    await logEmailEvent(
      toAddress,
      sent?.sequence ?? "unknown",
      sent?.step ?? 0,
      "bounced",
      resendEmailId,
      { bounceType, suppressed: bounceType.toLowerCase() === "hard" || bounceType.toLowerCase() === "permanent" }
    );
    return NextResponse.json({ ok: true });
  }

  // Unsubscribes — suppress permanently
  if (eventType === "email.unsubscribed") {
    await suppressEmail(toAddress, "unsubscribed");
    await logEmailEvent(toAddress, "unknown", 0, "unsubscribed", resendEmailId);
    return NextResponse.json({ ok: true });
  }

  // Map remaining Resend event types
  const typeMap: Record<string, string> = {
    "email.opened":           "opened",
    "email.clicked":          "clicked",
    "email.delivery_delayed": "delayed",
  };
  const mapped = typeMap[eventType];
  if (!mapped) return NextResponse.json({ ok: true });

  // Look up which sequence/step this email belongs to
  const { data: sent } = await supabase
    .from("geo_email_events")
    .select("sequence, step")
    .eq("resend_email_id", resendEmailId)
    .eq("event_type", "sent")
    .limit(1)
    .single();

  const metadata: Record<string, unknown> = {};
  if (mapped === "clicked" && data.click?.link) {
    metadata.link = data.click.link;
  }

  await logEmailEvent(
    toAddress,
    sent?.sequence ?? "unknown",
    sent?.step ?? 0,
    mapped,
    resendEmailId,
    metadata
  );

  // Engagement acceleration — if this click pushes them past 50% open rate, trigger proof early
  if (mapped === "clicked") {
    await checkEngagementAcceleration(toAddress);
  }

  // Track opens against the audit email template for A/B performance scoring
  if (mapped === "opened" && sent?.sequence === "warm_nurture" && sent?.step === 1) {
    supabase.rpc("record_template_open", {
      p_email: toAddress,
      p_resend_id: resendEmailId,
    }).then(() => {});
  }

  return NextResponse.json({ ok: true });
}
