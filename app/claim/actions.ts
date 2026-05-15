"use server";

import {
  enqueueSequence,
  addToResendAudience,
  cancelQueuedEmails,
  isSuppressed,
  supabase,
  tagLead,
} from "../../lib/resend";

export async function submitClaimForm(formData: FormData) {
  const firstName = (formData.get("firstName") as string)?.trim();
  const lastName = (formData.get("lastName") as string)?.trim() ?? "";
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const city = (formData.get("city") as string)?.trim() ?? "";
  const rawWebsite = (formData.get("website") as string)?.trim() ?? "";
  const affiliateTag = (formData.get("affiliateTag") as string)?.trim() || null;

  if (!firstName || !email) {
    return { success: false, error: "Please fill in your name and email." };
  }

  // Save submission immediately — before any email logic — so no lead is ever lost
  try {
    await supabase.from("geo_claim_submissions").insert({
      email,
      first_name: firstName,
      last_name: lastName || null,
      city: city || null,
      website: rawWebsite || null,
    });
  } catch {} // non-fatal — never block the form

  // Never re-enroll a suppressed contact (clients, unsubscribes)
  if (await isSuppressed(email)) return { success: true };

  try {
    // Check if already past nurture (booked or no-showed)
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
      return { success: true };
    }

    // If website provided, trigger AuditSky audit (AI email will follow)
    let auditId: string | null = null;
    if (rawWebsite) {
      let website = rawWebsite.trim().toLowerCase();
      // Strip any protocol duplication (https://https://, http://https://, etc.)
      website = website.replace(/^(https?:\/\/)+/i, "");
      // Strip leading www. to normalize, then rebuild clean URL
      const bare = website.replace(/^www\./i, "");
      website = "https://" + bare;

      const auditskyKey = process.env.AUDITSKY_API_KEY;
      if (auditskyKey) {
        try {
          const auditRes = await fetch("https://app.auditsky.ai/api/embed", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Origin: "https://geo.heypearl.io",
            },
            body: JSON.stringify({ apiKey: auditskyKey, url: website, keyword: "real estate agent" }),
          });
          if (auditRes.ok) {
            const data = await auditRes.json();
            auditId = data.auditId ?? null;
          }
        } catch {}
      }
    }

    await cancelQueuedEmails(email); // cancel ALL pending sequences before enrolling

    await addToResendAudience(email, firstName);

    // Claim form → warm_nurture (merged sequence). Step 1 sends immediately (ALWAYS_RESEND).
    await enqueueSequence("warm_nurture", email, firstName, { city, source: affiliateTag ?? "claim" });
    await tagLead(email, affiliateTag ?? "claim");

    return { success: true };
  } catch (err) {
    console.error("submitClaimForm error:", err);
    return { success: false, error: "Something went wrong. Please try again." };
  }
}
