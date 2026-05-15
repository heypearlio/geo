import { notFound } from "next/navigation";
import type { Metadata } from "next";
import CalculatorLandingPage from "@/app/calculator/CalculatorLandingPage";
import { supabase } from "@/lib/resend";
import { HEYPEARL_SOCIALS } from "@/lib/social-config";

export const metadata: Metadata = {
  title: "Seller Net Proceeds Calculator — V2 by HeyPearl",
  description:
    "As a seller, you have options. Run every scenario — cash offer, traditional sale, as-is — and see your real net proceeds before you commit to anything.",
};

export default async function ClientCalculatorPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const { data: client } = await supabase
    .from("v2_clients")
    .select("slug")
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle();

  if (!client) notFound();

  return <CalculatorLandingPage socialUrls={HEYPEARL_SOCIALS} clientSlug={slug} />;
}
