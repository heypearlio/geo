import type { Metadata } from "next";
import LocalPricingPage from "@/app/templates/local-services/LocalPricingPage";
import config from "@/app/templates/local-services/configs/christina";
import { localMeta } from "@/app/templates/local-services/meta";

export const metadata: Metadata = localMeta;

export default function ChristinaPricingPage() {
  return <LocalPricingPage config={config} />;
}
