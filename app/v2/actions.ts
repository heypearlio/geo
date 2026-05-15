"use server";

import {
  enqueueSequence,
  addToResendAudience,
  isSuppressed,
  supabase,
  tagLead,
} from "../../lib/resend";

export async function submitV2Form(formData: FormData) {
  const firstName = (formData.get("firstName") as string)?.trim();
  const lastName = (formData.get("lastName") as string)?.trim() ?? "";
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const city = (formData.get("city") as string)?.trim() ?? "";
  const affiliateTag = (formData.get("affiliateTag") as string)?.trim() || null;

  if (!firstName || !email || !email.includes("@")) {
    return { success: false, error: "Please fill in your name and email." };
  }

  // Save submission immediately — before any email logic — so no lead is ever lost
  try {
    await supabase.from("geo_claim_submissions").insert({
      email,
      first_name: firstName,
      last_name: lastName || null,
      city: city || null,
    });
  } catch {} // non-fatal — never block the form

  if (await isSuppressed(email)) return { success: true };

  try {
    await addToResendAudience(email, firstName);
    await enqueueSequence("v2_cold", email, firstName, { city, source: affiliateTag ?? "v2" });
    await tagLead(email, affiliateTag ?? "v2");
    return { success: true };
  } catch (err) {
    console.error("submitV2Form error:", err);
    return { success: false, error: "Something went wrong. Please try again." };
  }
}
