import { headers } from "next/headers";
import type { Metadata } from "next";
import LocalPricingPage from "@/app/templates/local-services/LocalPricingPage";
import { buildGeoPricingConfig, buildV2PricingConfig } from "@/app/config/pricingConfigs";
import heylocal from "@/app/templates/local-services/configs/heylocal";
import { geoMeta } from "@/app/config/geoMeta";
import { localMeta } from "@/app/templates/local-services/meta";
import { v2Meta } from "@/app/v2/meta";
import { notFound } from "next/navigation";
import { getPaymentLinks } from "@/lib/stripeLinks";

export async function generateMetadata(): Promise<Metadata> {
  const host = (await headers()).get("host") ?? "";
  if (host.includes("local.")) return localMeta;
  if (host.includes("v2.")) return v2Meta;
  return geoMeta;
}

const LOCAL_TIER_KEYS = ["starter", "growth", "pro"];

export default async function GodPricingPage() {
  const host = (await headers()).get("host") ?? "";

  if (host.includes("local.")) {
    const links = await getPaymentLinks("local");
    const config = {
      ...heylocal,
      pricingTiers: heylocal.pricingTiers.map((tier, i) => ({
        ...tier,
        ctaLabel: links[LOCAL_TIER_KEYS[i]] ? "Get Started" : (tier.ctaLabel ?? "Book a Call"),
        ctaHref: links[LOCAL_TIER_KEYS[i]] ?? tier.ctaHref,
      })) as typeof heylocal.pricingTiers,
    };
    return <LocalPricingPage config={config} />;
  }

  if (host.includes("v2.")) {
    const links = await getPaymentLinks("v2");
    return <LocalPricingPage config={buildV2PricingConfig("/schedule", links)} />;
  }

  if (host.includes("geo.")) {
    const links = await getPaymentLinks("geo");
    return <LocalPricingPage config={buildGeoPricingConfig("/schedule", links)} />;
  }

  notFound();
}
