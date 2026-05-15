export const OFFERS = [
  { slug: "local", name: "HeyLocal — Local Business Marketing" },
  { slug: "geo",   name: "GEO by HeyPearl — Real Estate" },
  { slug: "v2",    name: "GEO v2 — Listing Machine" },
] as const;

export type OfferSlug = typeof OFFERS[number]["slug"];
