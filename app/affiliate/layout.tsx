import type { Metadata } from "next";

export const metadata: Metadata = {
  metadataBase: new URL("https://affiliate.heypearl.io"),
  title: "HeyPearl Partner Program — Earn $500/Month Per Referral",
  description: "Refer local businesses to HeyPearl and earn 20% recurring commission every month. We build your landing page, funnels, and automations. You bring the client. We do the rest.",
  openGraph: {
    title: "HeyPearl Partner Program — Earn $500/Month Per Referral",
    description: "Refer local businesses to HeyPearl and earn 20% recurring commission every month. Free to join. No selling required.",
    url: "https://affiliate.heypearl.io",
    siteName: "HeyPearl",
    type: "website",
    images: [{ url: "https://affiliate.heypearl.io/affiliate/opengraph-image", width: 1200, height: 630, alt: "HeyPearl Partner Program" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "HeyPearl Partner Program — Earn $500/Month Per Referral",
    description: "Refer local businesses to HeyPearl and earn 20% recurring commission every month. Free to join.",
    images: ["https://affiliate.heypearl.io/affiliate/opengraph-image"],
  },
};

export default function AffiliateLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
