import type { Metadata } from "next";

// V2 offer — god metadata source of truth.
// colorPrimary is the single source of truth for the V2 brand color.
// Change it here → OG image updates on next deploy for god + every affiliate replica.
export const v2ColorPrimary = "#16A34A";


// V2 is for real estate agents who want done-for-you listing appointments (seller leads).
// All V2 pages (god + every affiliate replica) import from here.
// Change once → every V2 page updates automatically.

const TITLE = "V2 by HeyPearl — Done-For-You Listing Appointment System";
const DESCRIPTION =
  "Fill your calendar with ready-to-list sellers. V2 delivers done-for-you listing appointments so you can focus on closing deals.";
const OG_IMAGE = "https://v2.heypearl.io/v2/opengraph-image";

export const v2Meta: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "https://v2.heypearl.io",
    siteName: "V2 by HeyPearl",
    type: "website",
    images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: TITLE }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [OG_IMAGE],
  },
};
