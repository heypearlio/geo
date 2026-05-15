import { HEYPEARL_SOCIALS } from "../social-config";

const HEADER_URL = "https://geo.heypearl.io/email-assets/email-header.png";
const FROM = "Misti Bruton <misti@geo.heypearl.io>";
const REPLY_TO = "misti@heypearl.io";
const PINK = "#E8185C";
const NAVY = "#0F1E3A";
const BODY_BG = "#F7F8FC";
const TEXT = "#4A5E7A";

export { FROM, REPLY_TO, PINK, NAVY, BODY_BG, TEXT, HEADER_URL };

const FOOTER_TEXT: Record<string, string> = {
  warm_nurture:       "You're receiving this because you showed interest in GEO by HeyPearl.",
  // Legacy sequences — kept for existing queue rows
  lead_nurture:       "You're receiving this because you ran your free AI Visibility Score.",
  claim_nurture:      "You're receiving this because you checked your market availability on GEO.",
  post_booking:       "You're receiving this because you booked a strategy call with Misti.",
  no_show:            "You're receiving this because you booked a strategy call with Misti.",
  post_call:          "You're receiving this because you spoke with Misti about GEO.",
  audit_invite:       "You're receiving this because Misti thought you'd want to see this.",
  schedule_abandoned:            "You're receiving this because you started booking a call but didn't finish.",
  affiliate_schedule_abandoned:  "You're receiving this because you applied to the HeyPearl affiliate program.",
  affiliate_post_booking:        "You're receiving this because you booked your HeyPearl affiliate onboarding call.",
  audit_failed:       "You're receiving this because you started an AI Visibility audit.",
  v2_cold:            "You're receiving this because you expressed interest in GEO V2 by HeyPearl.",
  long_term_nurture:  "You're receiving this because you showed interest in GEO by HeyPearl.",
  video_watched:      "You're receiving this because you watched a GEO demo.",
  video_abandoned:    "You're receiving this because you started watching a GEO demo.",
  hot_proof:          "You're receiving this because you're getting started with GEO by HeyPearl.",
  purchased_welcome:  "You're receiving this because you're getting started with GEO by HeyPearl.",
};

function socialEmailRow(socials: typeof HEYPEARL_SOCIALS): string {
  const links: { label: string; url: string }[] = [
    { label: "Instagram", url: socials.instagram ?? "" },
    { label: "Facebook",  url: socials.facebook  ?? "" },
    { label: "LinkedIn",  url: socials.linkedin  ?? "" },
    { label: "TikTok",    url: socials.tiktok    ?? "" },
    { label: "YouTube",   url: socials.youtube   ?? "" },
  ].filter(l => l.url);

  if (links.length === 0) return "";

  const linkHtml = links
    .map(l => `<a href="${l.url}" style="color:#9BACC0;text-decoration:none;margin:0 8px;font-size:12px;">${l.label}</a>`)
    .join('<span style="color:#C8D8E8;margin:0 2px;">·</span>');

  return `<p style="margin:0 0 10px;">${linkHtml}</p>`;
}

export function emailWrapper(content: string, sequenceType: string): string {
  const footerText = FOOTER_TEXT[sequenceType] ?? "You're receiving this because you interacted with GEO by HeyPearl.";
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>GEO by HeyPearl</title>
</head>
<body style="margin:0;padding:0;background:${BODY_BG};font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:${BODY_BG};padding:32px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.06);">

  <!-- HEADER -->
  <tr><td>
    <a href="https://geo.heypearl.io" style="display:block;"><img src="${HEADER_URL}" alt="GEO by HeyPearl" width="600" style="width:100%;display:block;border:0;" /></a>
  </td></tr>

  <!-- BODY -->
  <tr><td style="padding:40px 48px;color:${TEXT};font-size:16px;line-height:1.7;">
    ${content}
  </td></tr>

  <!-- FOOTER -->
  <tr><td style="padding:24px 48px 40px;border-top:1px solid #EDF0FA;text-align:center;font-size:13px;color:#9BACC0;">
    <p style="margin:0 0 8px;">GEO by HeyPearl &bull; <a href="https://geo.heypearl.io" style="color:#9BACC0;">geo.heypearl.io</a></p>
    <p style="margin:0 0 8px;">${footerText}</p>
    ${socialEmailRow(HEYPEARL_SOCIALS)}
    <p style="margin:0;"><a href="https://geo.heypearl.io/unsubscribe?email={{email}}" style="color:#9BACC0;text-decoration:underline;">Unsubscribe</a></p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

export function btn(text: string, href: string): string {
  return `<p style="text-align:center;margin:32px 0;">
    <a href="${href}" style="display:inline-block;background:${PINK};color:#ffffff;font-weight:700;font-size:16px;padding:16px 40px;border-radius:8px;text-decoration:none;">${text}</a>
  </p>`;
}

export function h1(text: string): string {
  return `<h1 style="margin:0 0 24px;font-size:26px;font-weight:800;color:${NAVY};line-height:1.3;">${text}</h1>`;
}

export function p(text: string): string {
  return `<p style="margin:0 0 20px;color:${TEXT};">${text}</p>`;
}

// Response buttons for interactive emails — each option is a tracked link
export function responseBtns(email: string, seq: string, step: number, options: { label: string; answer: string }[]): string {
  const base = "https://geo.heypearl.io/r";
  const btns = options.map(o => {
    const url = `${base}?e=${email}&seq=${seq}&step=${step}&a=${encodeURIComponent(o.answer)}`;
    return `<a href="${url}" style="display:inline-block;margin:6px 8px;padding:14px 28px;border-radius:8px;font-weight:700;font-size:15px;text-decoration:none;background:${NAVY};color:#ffffff;">${o.label}</a>`;
  }).join("");
  return `<p style="text-align:center;margin:32px 0;">${btns}</p>`;
}

export function proofImg(src: string, alt: string): string {
  return `<p style="margin:24px 0;"><img src="https://geo.heypearl.io/${src}" alt="${alt}" width="500" style="width:100%;max-width:500px;display:block;margin:0 auto;border-radius:10px;border:1px solid #EDF0FA;" /></p>`;
}

export function sig(): string {
  return `<p style="margin:32px 0 0;color:${TEXT};">Talk soon,</p>
<img src="https://geo.heypearl.io/email-assets/email-signature.png" alt="Misti Bruton xo" width="220" style="display:block;max-width:220px;margin:8px 0 4px;" />
<p style="margin:0;font-size:14px;color:#9BACC0;">Founder, GEO by HeyPearl</p>`;
}
