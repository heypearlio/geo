import { notFound } from "next/navigation";
import CashOfferSchedulePage from "@/app/templates/cashoffer/CashOfferSchedulePage";
import { cashOfferConfigs } from "@/app/templates/cashoffer/configs/index";
import { supabase } from "@/lib/resend";

export default async function CashOfferScheduleRoute({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const staticConfig = cashOfferConfigs[slug];
  if (!staticConfig) notFound();

  const { data: client } = await supabase
    .from("v2_clients")
    .select("calendly_url, meta_pixel_id")
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle();

  const config = client
    ? {
        ...staticConfig,
        calendlyUrl: client.calendly_url ?? staticConfig.calendlyUrl,
        metaPixelId: client.meta_pixel_id ?? staticConfig.metaPixelId,
      }
    : staticConfig;

  return <CashOfferSchedulePage config={config} />;
}
