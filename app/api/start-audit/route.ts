import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { enqueueSequence, addToResendAudience, cancelQueuedEmails, isSuppressed, supabase, tagLead } from "../../../lib/resend";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email: rawEmail, firstName, city, website: rawWebsite } = body;

    const email = (rawEmail ?? "").trim().toLowerCase();
    if (!email || !firstName) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    let website = "";
    if (rawWebsite) {
      website = rawWebsite.replace(/^https?:\/\/https?:\/\//i, "https://");
      if (!/^https?:\/\//i.test(website)) website = "https://" + website;
    } else if (email) {
      const emailDomain = email.split("@")[1]?.toLowerCase();
      const freeProviders = ["gmail.com","yahoo.com","hotmail.com","outlook.com","icloud.com","aol.com","msn.com","live.com","me.com","mac.com","protonmail.com","proton.me","ymail.com","comcast.net","sbcglobal.net","att.net","verizon.net","bellsouth.net","cox.net","earthlink.net"];
      if (emailDomain && !freeProviders.includes(emailDomain)) {
        website = `https://${emailDomain}`;
      }
    }

    if (await isSuppressed(email)) {
      return NextResponse.json({ success: true, auditId: null });
    }

    let auditId: string | null = null;
    const auditskyKey = process.env.AUDITSKY_API_KEY;
    if (auditskyKey) {
      try {
        const auditRes = await fetch("https://app.auditsky.ai/api/embed", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Origin": "https://geo.heypearl.io",
            "x-api-key": auditskyKey,
          },
          body: JSON.stringify({ apiKey: auditskyKey, url: website, keyword: "real estate agent" }),
        });
        if (auditRes.ok) {
          const auditData = await auditRes.json();
          auditId = auditData.auditId ?? null;
        } else {
          const errBody = await auditRes.text().catch(() => "");
          Sentry.captureMessage("AuditSky POST failed", {
            level: "error",
            tags: { service: "auditsky" },
            extra: { status: auditRes.status, body: errBody },
          });
        }
      } catch (err) {
        Sentry.captureException(err, { tags: { service: "auditsky" } });
      }
    }

    const { data: advancedQueue } = await supabase
      .from("geo_email_queue")
      .select("id")
      .eq("email", email)
      .in("sequence", ["post_booking", "no_show"])
      .is("sent_at", null)
      .is("cancelled_at", null)
      .limit(1);

    const { data: advancedSent } = await supabase
      .from("geo_email_events")
      .select("id")
      .eq("email", email)
      .in("sequence", ["post_booking", "no_show"])
      .eq("event_type", "sent")
      .limit(1);

    if ((advancedQueue?.length ?? 0) > 0 || (advancedSent?.length ?? 0) > 0) {
      return NextResponse.json({ success: true, auditId });
    }

    await cancelQueuedEmails(email);
    await addToResendAudience(email, firstName);

    if (auditId) {
      await supabase.from("geo_audit_history").insert({
        email,
        first_name: firstName || null,
        city: city || null,
        website: website || null,
        audit_id: auditId,
        overall: null,
        seo: null,
        ai: null,
        audit_number: 1,
        email_queued: false,
      });
    }

    await enqueueSequence("warm_nurture", email, firstName, {
      ...(auditId ? { audit_id: auditId } : {}),
      website,
      city,
      source: "audit",
    }, [1]);
    await tagLead(email, "audit");

    return NextResponse.json({ success: true, auditId });
  } catch (err) {
    console.error("start-audit error:", err);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}
