// lib/source.ts
// Universal source attribution utility.
// Every opt-in route calls buildLeadSource() or buildImportTag().
// NEVER hardcode source_tag values — always derive them from context.

import { NextRequest } from "next/server";

// Maps subdomain to offer name
const SUBDOMAIN_TO_OFFER: Record<string, string> = {
  geo:       "geo",
  v2:        "v2",
  local:     "local",
  affiliate: "affiliate",
};

/**
 * Derives { source_tag, source_url } from the incoming request.
 *
 * @param req    The Next.js request object
 * @param slug   The affiliate/client slug if known (e.g. "todd.smith").
 *               Pass undefined for god/admin pages.
 *
 * Examples:
 *   geo.heypearl.io + slug "todd.smith" → { source_tag: "geo_todd.smith", source_url: "geo.heypearl.io/todd.smith" }
 *   geo.heypearl.io + no slug           → { source_tag: "geo_admin",      source_url: "geo.heypearl.io" }
 *   v2.heypearl.io  + slug "sarah.j"    → { source_tag: "v2_sarah.j",     source_url: "v2.heypearl.io/sarah.j" }
 */
export function buildLeadSource(
  req: NextRequest,
  slug?: string | null
): { source_tag: string; source_url: string } {
  const host = req.headers.get("host") ?? "";
  // host is e.g. "geo.heypearl.io" or "localhost:3000"
  const subdomain = (host.split(".")[0].split(":")[0]) || "unknown"; // "geo", "v2", "local", "localhost", or "unknown"
  const offer = SUBDOMAIN_TO_OFFER[subdomain] ?? subdomain;

  const source_url = slug ? `${host}/${slug}` : host;
  const source_tag = slug ? `${offer}_${slug}` : `${offer}_admin`;

  return { source_tag, source_url };
}

/**
 * Derives a source tag for CSV imports based on the Instantly campaign name.
 *
 * @param campaignName  Raw campaign name from Instantly (e.g. "v2-expired-listings")
 *
 * Examples:
 *   "v2-expired-listings"  → "import_v2_expired_listings"
 *   "geo-buyers"           → "import_geo_buyers"
 *   "aff-v2"               → "import_aff_v2"
 */
export function buildImportTag(campaignName: string): string {
  const normalized = campaignName.toLowerCase().replace(/-/g, "_");
  return `import_${normalized}`;
}
