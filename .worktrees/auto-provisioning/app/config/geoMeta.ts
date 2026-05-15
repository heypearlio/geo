import type { Metadata } from "next";
import { brand } from "./brand";

// GEO offer — god metadata source of truth.
// All GEO pages import from here. Change once → every GEO page updates.
export const geoMeta: Metadata = {
  title: brand.meta.title,
  description: brand.meta.description,
  openGraph: {
    title: brand.meta.title,
    description: brand.meta.description,
    url: "https://geo.heypearl.io",
    siteName: "GEO by HeyPearl",
    type: "website",
    images: [{ url: "https://geo.heypearl.io/opengraph-image", width: 1200, height: 630, alt: brand.meta.title }],
  },
  twitter: {
    card: "summary_large_image",
    title: brand.meta.title,
    description: brand.meta.description,
    images: ["https://geo.heypearl.io/opengraph-image"],
  },
};
