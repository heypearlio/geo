import heylocal from "@/app/templates/local-services/configs/heylocal";
import type { LocalServicesFunnelConfig } from "@/app/templates/local-services/config.types";

// Shape returned by Supabase for a geo_offers row
export interface GeoOfferRow {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  funnel_tag: string;
  funnel_type: string;
  config: Partial<LocalServicesFunnelConfig>;
  pricing_tiers: LocalServicesFunnelConfig["pricingTiers"] | null;
  pricing_rows: LocalServicesFunnelConfig["pricingComparisonRows"] | null;
  email_sequence: string;
  proof_photos: string[];
  active: boolean;
  created_at: string;
}

// Optional affiliate-level overrides
export interface OfferAffiliateOverrides {
  funnelTag?: string;
  metaPixelId?: string;
  calendlyUrl?: string;
  scheduleRoute?: string;
  pricingRoute?: string;
  founderName?: string;
  founderInitials?: string;
  founderPhotoUrl?: string;
}

/**
 * Merges a geo_offers DB row with optional affiliate overrides on top of
 * the heylocal defaults to produce a full LocalServicesFunnelConfig.
 */
export function buildOfferConfig(
  offer: GeoOfferRow,
  affiliateOverrides: OfferAffiliateOverrides = {}
): LocalServicesFunnelConfig {
  const slug = offer.slug;

  // Start with heylocal defaults, spread DB config overrides on top
  const base: LocalServicesFunnelConfig = {
    ...heylocal,
    brandName: offer.name,
    brandTagline: offer.tagline || heylocal.brandTagline,
    funnelTag: offer.funnel_tag,
    scheduleRoute: `/${slug}/schedule`,
    pricingRoute: `/${slug}/pricing`,
    apiOptinRoute: "/api/local-optin",
    // Spread any partial config overrides from DB (colors, hero text, etc.)
    ...offer.config,
    // Apply pricing if stored
    ...(offer.pricing_tiers && offer.pricing_tiers.length === 3
      ? { pricingTiers: offer.pricing_tiers }
      : {}),
    ...(offer.pricing_rows && offer.pricing_rows.length > 0
      ? { pricingComparisonRows: offer.pricing_rows }
      : {}),
  };

  // Apply affiliate-level overrides on top
  const result: LocalServicesFunnelConfig = {
    ...base,
    ...(affiliateOverrides.funnelTag ? { funnelTag: affiliateOverrides.funnelTag } : {}),
    ...(affiliateOverrides.metaPixelId ? { metaPixelId: affiliateOverrides.metaPixelId } : {}),
    ...(affiliateOverrides.calendlyUrl ? { calendlyUrl: affiliateOverrides.calendlyUrl } : {}),
    ...(affiliateOverrides.scheduleRoute ? { scheduleRoute: affiliateOverrides.scheduleRoute } : {}),
    ...(affiliateOverrides.pricingRoute ? { pricingRoute: affiliateOverrides.pricingRoute } : {}),
  };

  // Update founder info if affiliate has a name
  if (affiliateOverrides.founderName) {
    result.founder = {
      ...result.founder,
      name: affiliateOverrides.founderName,
      initials: affiliateOverrides.founderInitials ?? result.founder.initials,
      ...(affiliateOverrides.founderPhotoUrl ? { photoUrl: affiliateOverrides.founderPhotoUrl } : {}),
    };
  }

  return result;
}
