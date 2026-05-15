import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { supabase } from "@/lib/resend";
import V2LandingPage from "../V2LandingPage";
import { v2Meta } from "../meta";

export const metadata: Metadata = v2Meta;

export default async function V2AffiliateLandingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const { data: affiliate } = await supabase
    .from("affiliates")
    .select("id, name, slug, tag, calendly_url, offers, active, meta_pixel_id")
    .eq("slug", slug)
    .single();

  if (!affiliate || !affiliate.active) notFound();
  if (!Array.isArray(affiliate.offers) || !affiliate.offers.includes("v2")) notFound();

  return (
    <V2LandingPage
      affiliateTag={affiliate.tag}
      scheduleRoute={`/v2/${slug}/schedule`}
    />
  );
}
