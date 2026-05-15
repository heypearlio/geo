import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import type { Metadata } from "next";
import { localMeta } from "@/app/templates/local-services/meta";

export const metadata: Metadata = localMeta;
import { supabase } from "@/lib/resend";
import heylocal from "@/app/templates/local-services/configs/heylocal";
import LocalPricingPage from "@/app/templates/local-services/LocalPricingPage";
import { buildOfferConfig } from "@/app/templates/custom-offer/defaults";
import { buildGeoPricingConfig, buildV2PricingConfig } from "@/app/config/pricingConfigs";
import { getPaymentLinks } from "@/lib/stripeLinks";
import type { LocalServicesFunnelConfig } from "@/app/templates/local-services/config.types";
import type { GeoOfferRow } from "@/app/templates/custom-offer/defaults";

const LOCAL_TIER_KEYS = ["starter", "growth", "pro"];

export default async function AffiliatePricingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const host = (await headers()).get("host") ?? "";

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
  if (host.includes("local.") && affiliate.offers.includes("local")) {
    const links = await getPaymentLinks("local");
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
      pricingTiers: heylocal.pricingTiers.map((tier, i) => ({
        ...tier,
        ctaLabel: links[LOCAL_TIER_KEYS[i]] ? "Get Started" : (tier.ctaLabel ?? "Book a Call"),
        ctaHref: links[LOCAL_TIER_KEYS[i]] ?? tier.ctaHref,
      })) as typeof heylocal.pricingTiers,
    };

    return <LocalPricingPage config={affiliateConfig} />;
  }

  // ── GEO offer ──────────────────────────────────────────────────────────────
  if (host.includes("geo.") && affiliate.offers.includes("geo")) {
    const links = await getPaymentLinks("geo");
    const config = buildGeoPricingConfig(`/${slug}/schedule`, links);
    return <LocalPricingPage config={config} />;
  }

  // ── V2 offer ───────────────────────────────────────────────────────────────
  if (host.includes("v2.") && affiliate.offers.includes("v2")) {
    const links = await getPaymentLinks("v2");
    const config = buildV2PricingConfig(`/${slug}/schedule`, links);
    return <LocalPricingPage config={config} />;
  }

  // ── Custom offer (from geo_offers table) ───────────────────────────────────
  const customOfferSlug = affiliate.offers.find((o: string) => !["local", "geo", "v2"].includes(o));
  if (customOfferSlug && (host.includes("geo.") || host.includes("v2."))) {
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
