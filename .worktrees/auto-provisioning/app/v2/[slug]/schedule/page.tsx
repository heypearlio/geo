import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { supabase } from "@/lib/resend";
import GeoSchedulePage from "@/app/components/GeoSchedulePage";
import { v2Meta } from "@/app/v2/meta";

export const metadata: Metadata = v2Meta;

const DEFAULT_GEO_CALENDLY = "https://calendly.com/hey-pearl/meet";

export default async function V2AffiliateSchedulePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const { data: affiliate } = await supabase
    .from("affiliates")
    .select("id, slug, calendly_url, offers, active")
    .eq("slug", slug)
    .single();

  if (!affiliate || !affiliate.active) notFound();
  if (!Array.isArray(affiliate.offers) || !affiliate.offers.includes("v2")) notFound();

  return (
    <GeoSchedulePage
      calendlyUrl={affiliate.calendly_url ?? DEFAULT_GEO_CALENDLY}
    />
  );
}
