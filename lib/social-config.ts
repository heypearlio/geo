// lib/social-config.ts

export interface SocialUrls {
  instagram?: string;
  facebook?: string;
  linkedin?: string;
  tiktok?: string;
  youtube?: string;
}

/** HeyPearl's own social accounts — used on god pages and all Resend emails */
export const HEYPEARL_SOCIALS: SocialUrls = {
  instagram: "https://instagram.com/heypearlio",
  facebook:  "",
  linkedin:  "",
  tiktok:    "",
  youtube:   "",
};

/** Extract @handle from a full Instagram URL. Returns "" if url is empty. */
export function extractInstagramHandle(url: string): string {
  if (!url) return "";
  return url
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, "")
    .replace(/\/$/, "");
}
