import type { Metadata } from "next";

// CashOffer offer — god metadata source of truth.
// colorPrimary is the single source of truth for the CashOffer brand color.
// Change it here → OG image updates on next deploy for god + every client replica.
export const cashofferColorPrimary = "#16A34A";


// CashOffer is homeowner-facing: sell your home for more money or less hassle, done for you.
// All CashOffer pages (god + every client replica) import from here.
// Change once → every CashOffer page updates automatically.

const TITLE = "CashOffer by HeyPearl — Sell Your Home For More. Hassle Free.";
const DESCRIPTION =
  "Find out what your home is worth and choose how you want to sell. More money, less hassle, or somewhere in between. Done entirely for you.";
const OG_IMAGE = "https://v2.heypearl.io/cashoffer/opengraph-image";

export const cashofferMeta: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "https://v2.heypearl.io/cashoffer",
    siteName: "CashOffer by HeyPearl",
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
