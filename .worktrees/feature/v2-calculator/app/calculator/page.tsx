import type { Metadata } from "next";
import CalculatorLandingPage from "./CalculatorLandingPage";
import { HEYPEARL_SOCIALS } from "../../lib/social-config";

export const metadata: Metadata = {
  title: "Seller Net Proceeds Calculator — V2 by HeyPearl",
  description:
    "As a seller, you have options. Run every scenario — cash offer, traditional sale, as-is — and see your real net proceeds before you commit to anything.",
  openGraph: {
    title: "Seller Net Proceeds Calculator",
    description: "See what you'd walk away with across every selling scenario.",
    url: "https://v2.heypearl.io/calculator",
    siteName: "V2 by HeyPearl",
    type: "website",
  },
};

export default function CalculatorPage() {
  return <CalculatorLandingPage socialUrls={HEYPEARL_SOCIALS} />;
}
