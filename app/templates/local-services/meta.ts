import type { Metadata } from "next";

// HeyLocal offer — god metadata source of truth.
// colorPrimary is the single source of truth for the HeyLocal brand color.
// Change it here → OG image updates on next deploy for god + every affiliate replica.
export const localColorPrimary = "#C8F135";
export const localColorOnPrimary = "#0F1E3A"; // lime is light — text on buttons must be dark navy


// All HeyLocal pages (god + every affiliate replica) import from here.
// Change once → every HeyLocal page updates automatically.

const TITLE = "HeyLocal — AI-Powered Marketing for Local Businesses";
const DESCRIPTION =
  "More calls. More reviews. More customers. HeyLocal handles your online presence so you can focus on running your business.";
const OG_IMAGE = "https://local.heypearl.io/local/opengraph-image";

export const localMeta: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "https://local.heypearl.io",
    siteName: "HeyLocal",
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
