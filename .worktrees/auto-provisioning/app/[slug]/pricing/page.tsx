import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { localMeta } from "@/app/templates/local-services/meta";

export const metadata: Metadata = localMeta;
import { supabase } from "@/lib/resend";
import heylocal from "@/app/templates/local-services/configs/heylocal";
import LocalPricingPage from "@/app/templates/local-services/LocalPricingPage";
import { buildOfferConfig } from "@/app/templates/custom-offer/defaults";
import type { LocalServicesFunnelConfig } from "@/app/templates/local-services/config.types";
import type { GeoOfferRow } from "@/app/templates/custom-offer/defaults";

export default async function AffiliatePricingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const { data: affiliate } = await supabase
    .from("affiliates")
    .select("id, name, slug, tag, calendly_url, headshot_url, offers, active, meta_pixel_id")
    .eq("slug", slug)
    .single();

  if (!affiliate || !affiliate.active) notFound();
  if (!Array.isArray(affiliate.offers) || affiliate.offers.length === 0) notFound();

  const initials = affiliate.name
    .split(" ")
    .map((w: string) => w[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 2);

  // ── LOCAL offer ────────────────────────────────────────────────────────────
  if (affiliate.offers.includes("local")) {
    const affiliateConfig: LocalServicesFunnelConfig = {
      ...heylocal,
      funnelTag: affiliate.tag,
      metaPixelId: affiliate.meta_pixel_id ?? undefined,
      calendlyUrl: affiliate.calendly_url ?? heylocal.calendlyUrl,
      scheduleRoute: `/${slug}/schedule`,
      pricingRoute: `/${slug}/pricing`,
      apiOptinRoute: "/api/local-optin",
      founder: {
        ...heylocal.founder,
        name: affiliate.name,
        initials,
        ...(affiliate.headshot_url ? { photoUrl: affiliate.headshot_url } : {}),
      },
    };

    return <LocalPricingPage config={affiliateConfig} />;
  }

  // ── Custom offer (from geo_offers table) ───────────────────────────────────
  const customOfferSlug = affiliate.offers.find((o: string) => !["local", "geo", "v2"].includes(o));
  if (customOfferSlug) {
    const { data: offer } = await supabase
      .from("geo_offers")
      .select("*")
      .eq("slug", customOfferSlug)
      .eq("active", true)
      .single();

    if (offer) {
      // No pricing yet — redirect to schedule page
      if (!Array.isArray(offer.pricing_tiers) || offer.pricing_tiers.length === 0) {
        redirect(`/${slug}/schedule`);
      }

      const config = buildOfferConfig(offer as GeoOfferRow, {
        funnelTag: affiliate.tag,
        metaPixelId: affiliate.meta_pixel_id ?? undefined,
        calendlyUrl: affiliate.calendly_url ?? undefined,
        scheduleRoute: `/${slug}/schedule`,
        pricingRoute: `/${slug}/pricing`,
        founderName: affiliate.name,
        founderInitials: initials,
        founderPhotoUrl: affiliate.headshot_url ?? undefined,
      });

      return <LocalPricingPage config={config} />;
    }
  }

  notFound();
}
