import { notFound } from "next/navigation";
import type { Metadata } from "next";
import CashOfferLandingPage from "@/app/templates/cashoffer/CashOfferLandingPage";
import { cashOfferConfigs } from "@/app/templates/cashoffer/configs/index";
import { supabase } from "@/lib/resend";
import { cashofferMeta } from "../meta";

export const metadata: Metadata = cashofferMeta;

export default async function CashOfferPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const staticConfig = cashOfferConfigs[slug] ?? cashOfferConfigs["demo"];
  if (!staticConfig) notFound();

  const { data: client } = await supabase
    .from("v2_clients")
    .select("calendly_url, meta_pixel_id")
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle();

  const config = {
    ...staticConfig,
    funnelTag: `v2-cashoffer-${slug}`,
    ...(client && {
      calendlyUrl: client.calendly_url ?? staticConfig.calendlyUrl,
      metaPixelId: client.meta_pixel_id ?? staticConfig.metaPixelId,
    }),
  };

  return <CashOfferLandingPage config={config} />;
}
