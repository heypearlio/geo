import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import type { Metadata } from "next";
import { localMeta } from "@/app/templates/local-services/meta";
import { geoMeta } from "@/app/config/geoMeta";
import { supabase } from "@/lib/resend";
import heylocal from "@/app/templates/local-services/configs/heylocal";
import LocalLandingPage from "@/app/templates/local-services/LocalLandingPage";
import LandingPage from "@/app/components/LandingPage";
import V2FormComponent from "@/app/components/V2Form";
import SocialIconRow from "@/app/components/SocialIconRow";
import { buildOfferConfig } from "@/app/templates/custom-offer/defaults";
import type { LocalServicesFunnelConfig } from "@/app/templates/local-services/config.types";
import type { GeoOfferRow } from "@/app/templates/custom-offer/defaults";
import type { SocialUrls } from "@/lib/social-config";

export async function generateMetadata(): Promise<Metadata> {
  const host = (await headers()).get("host") ?? "";
  if (host.includes("local.")) return localMeta;
  return geoMeta;
}

export default async function AffiliateLandingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const host = (await headers()).get("host") ?? "";

  const { data: affiliate } = await supabase
    .from("affiliates")
    .select("id, name, slug, tag, calendly_url, headshot_url, offers, active, meta_pixel_id, instagram_url, facebook_url, linkedin_url, tiktok_url, youtube_url")
    .eq("slug", slug)
    .single();

  if (!affiliate || !affiliate.active) notFound();
  if (!Array.isArray(affiliate.offers) || affiliate.offers.length === 0) notFound();

  const affiliateSocials: SocialUrls = {
    instagram: affiliate.instagram_url ?? undefined,
    facebook: affiliate.facebook_url ?? undefined,
    linkedin: affiliate.linkedin_url ?? undefined,
    tiktok: affiliate.tiktok_url ?? undefined,
    youtube: affiliate.youtube_url ?? undefined,
  };

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
      socialUrls: affiliateSocials,
      founder: {
        ...heylocal.founder,
        name: affiliate.name,
        initials,
        ...(affiliate.headshot_url ? { photoUrl: affiliate.headshot_url } : {}),
      },
    };

    return <LocalLandingPage config={affiliateConfig} />;
  }

  // ── GEO offer ──────────────────────────────────────────────────────────────
  if (host.includes("geo.") && affiliate.offers.includes("geo")) {
    return (
      <Suspense>
        <LandingPage
          overrides={{
            funnelTag: affiliate.tag,
            scheduleRoute: `/${slug}/schedule`,
            socialUrls: affiliateSocials,
          }}
        />
      </Suspense>
    );
  }

  // ── V2 offer ───────────────────────────────────────────────────────────────
  if (host.includes("v2.") && affiliate.offers.includes("v2")) {
    return (
      <>
        <Suspense>
          <V2FormComponent
            scheduleRoute={`/${slug}/schedule`}
            affiliateTag={affiliate.tag}
          />
        </Suspense>
        <div className="bg-[#080F1E] pb-4">
          <SocialIconRow urls={affiliateSocials} />
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
        socialUrls: affiliateSocials,
      });

      return <LocalLandingPage config={config} />;
    }
  }

  notFound();
}
