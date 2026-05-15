import { supabase } from "@/lib/resend";

/**
 * Fetch active payment links for an offer from the stripe_payment_links table.
 * Returns a map of tier → URL (e.g. { starter: "https://buy.stripe.com/..." })
 * Falls back to empty object if the query fails — callers should fall back to scheduleRoute.
 */
export async function getPaymentLinks(offer: string): Promise<Record<string, string>> {
  const { data } = await supabase
    .from("stripe_payment_links")
    .select("tier, payment_link_url")
    .eq("offer", offer)
    .eq("active", true);

  if (!data) return {};
  return Object.fromEntries(data.map((r: { tier: string; payment_link_url: string }) => [r.tier, r.payment_link_url]));
}
