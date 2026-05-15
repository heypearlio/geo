"use server";

import { enqueueSequence, addToResendAudience, cancelQueuedEmails, isSuppressed, supabase, tagLead } from "../lib/resend";

export async function submitAuditForm(formData: FormData) {
  const firstName = (formData.get("firstName") as string)?.trim();
  const lastName = (formData.get("lastName") as string)?.trim() ?? "";
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const rawWebsite = (formData.get("website") as string)?.trim();
  const city = (formData.get("city") as string)?.trim() ?? "";

  if (!firstName || !email) {
    return { success: false, error: "Please fill in all required fields." };
  }

  // Normalize URL if provided: strip double protocols, add https:// if missing
  let website = "";
  if (rawWebsite) {
    website = rawWebsite.replace(/^https?:\/\/https?:\/\//i, "https://");
    if (!/^https?:\/\//i.test(website)) website = "https://" + website;
  }

  // Never re-enroll a suppressed contact (clients, unsubscribes)
  if (await isSuppressed(email)) return { success: true, auditId: null, email };

  try {
    // Trigger AuditSky report
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
          body: JSON.stringify({
            apiKey: auditskyKey,
            url: website,
            keyword: "real estate agent",
          }),
        });
        if (auditRes.ok) {
          const auditData = await auditRes.json();
          auditId = auditData.auditId ?? null;
        } else {
          console.error("AuditSky POST failed:", auditRes.status, await auditRes.text().catch(() => ""));
        }
      } catch (err) {
        console.error("AuditSky error:", err);
      }
    }

    // Check if this person has already progressed past warm_nurture (booked or no-showed).
    const { data: advancedQueue } = await supabase
      .from("geo_email_queue")
      .select("id")
      .eq("email", email)
      .in("sequence", ["post_booking", "no_show"])
      .is("sent_at", null)
      .is("cancelled_at", null)
      .limit(1);

    const alreadyProgressed = (advancedQueue?.length ?? 0) > 0;

    const { data: advancedSent } = await supabase
      .from("geo_email_events")
      .select("id")
      .eq("email", email)
      .in("sequence", ["post_booking", "no_show"])
      .eq("event_type", "sent")
      .limit(1);

    const hasSentAdvanced = (advancedSent?.length ?? 0) > 0;

    if (alreadyProgressed || hasSentAdvanced) {
      return { success: true, auditId, email };
    }

    await cancelQueuedEmails(email); // cancel ALL pending sequences before enrolling
    await addToResendAudience(email, firstName);

    // Save initial audit history row so the fallback cron can track this audit
    // even if the user closes the tab before AuditSky completes or fails.
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

    // Step 1 is now a custom AI-generated email triggered from the score page once scores are confirmed.
    // Enqueue steps 2-6 on normal schedule — step 1 inserts directly via /api/generate-audit-email.
    await enqueueSequence("warm_nurture", email, firstName, {
      ...(auditId ? { audit_id: auditId } : {}),
      website,
      city,
      source: "audit",
    }, [1]); // skip step 1 — handled by AI email generator
    await tagLead(email, "audit");
    return { success: true, auditId, email };
  } catch (err) {
    console.error("Unexpected error in submitAuditForm:", err);
    return { success: false, error: "Something went wrong. Please try again." };
  }
}
