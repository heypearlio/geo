import { headers } from "next/headers";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { localMeta } from "@/app/templates/local-services/meta";
import { geoMeta } from "@/app/config/geoMeta";
import { supabase } from "@/lib/resend";
import heylocal from "@/app/templates/local-services/configs/heylocal";
import LocalSchedulePage from "@/app/templates/local-services/LocalSchedulePage";
import GeoSchedulePage from "@/app/components/GeoSchedulePage";
import { buildOfferConfig } from "@/app/templates/custom-offer/defaults";
import type { LocalServicesFunnelConfig } from "@/app/templates/local-services/config.types";
import type { GeoOfferRow } from "@/app/templates/custom-offer/defaults";

export async function generateMetadata(): Promise<Metadata> {
  const host = (await headers()).get("host") ?? "";
  if (host.includes("local.")) return localMeta;
  return geoMeta;
}

// GEO Calendly is configured via NEXT_PUBLIC_GEO_CALENDLY_URL env var.
// Update that var in Vercel when switching salespeople — no code change needed.
const GEO_CALENDLY_URL = process.env.NEXT_PUBLIC_GEO_CALENDLY_URL ?? "https://calendly.com/hey-pearl/meet";

export default async function AffiliateSchedulePage({
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

  // ── LOCAL offer ────────────────────────────────────────────────────────────
  if (host.includes("local.") && affiliate.offers.includes("local")) {
    const initials = affiliate.name
      .split(" ")
      .map((w: string) => w[0]?.toUpperCase() ?? "")
      .join("")
      .slice(0, 2);

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

    return (
      <>
        <LocalSchedulePage config={affiliateConfig} />
        <div style={{ background: "#0F1E3A", textAlign: "center", padding: "16px 24px" }}>
          <a
            href={`/${slug}/pricing`}
            style={{ color: "#4A5E7A", fontSize: 12, textDecoration: "none" }}
          >
            View pricing
          </a>
        </div>
      </>
    );
  }

  // ── GEO or V2 offer ────────────────────────────────────────────────────────
  const hasGeoOrV2 =
    (host.includes("geo.") && affiliate.offers.includes("geo")) ||
    (host.includes("v2.") && affiliate.offers.includes("v2"));

  if (hasGeoOrV2) {
    return (
      <>
        <GeoSchedulePage calendlyUrl={affiliate.calendly_url ?? GEO_CALENDLY_URL} />
        <div style={{ background: "#0F1E3A", textAlign: "center", padding: "16px 24px" }}>
          <a href={`/${slug}/pricing`} style={{ color: "#4A5E7A", fontSize: 12, textDecoration: "none" }}>
            View pricing
          </a>
        </div>
      </>
    );
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
      const initials = affiliate.name
        .split(" ")
        .map((w: string) => w[0]?.toUpperCase() ?? "")
        .join("")
        .slice(0, 2);

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

      const hasPricing = Array.isArray(offer.pricing_tiers) && offer.pricing_tiers.length > 0;

      return (
        <>
          <LocalSchedulePage config={config} />
          {hasPricing && (
            <div style={{ background: "#0F1E3A", textAlign: "center", padding: "16px 24px" }}>
              <a
                href={`/${slug}/pricing`}
                style={{ color: "#4A5E7A", fontSize: 12, textDecoration: "none" }}
              >
                View pricing
              </a>
            </div>
          )}
        </>
      );
    }
  }

  notFound();
}
