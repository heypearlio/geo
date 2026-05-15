import type { Metadata } from "next";
import cfg from "./config";

// V-Card — god metadata source of truth.
// All v-card pages import from here. Change once → every card updates.
// Per-card OG image URL is constructed dynamically in generateMetadata using the slug.

export const cardMeta: Metadata = {
  title: cfg.metaTitle,
  description: cfg.metaDescription,
  openGraph: {
    title: cfg.metaTitle,
    description: cfg.metaDescription,
    siteName: cfg.brandName,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: cfg.metaTitle,
    description: cfg.metaDescription,
  },
};

// Returns full metadata for a specific card slug with correct OG image URL.
// Use this in generateMetadata() for all card pages.
export function cardMetaForSlug(slug: string): Metadata {
  const ogImage = `https://geo.heypearl.io/card/${slug}/opengraph-image`;
  return {
    ...cardMeta,
    openGraph: {
      ...cardMeta.openGraph,
      url: `https://geo.heypearl.io/card/${slug}`,
      images: [{ url: ogImage, width: 1200, height: 630, alt: cfg.metaTitle }],
    },
    twitter: {
      ...cardMeta.twitter,
      images: [ogImage],
    },
  };
}
