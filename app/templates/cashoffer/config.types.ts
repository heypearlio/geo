// app/templates/cashoffer/config.types.ts

export interface CashOfferTestimonial {
  name: string;
  location: string;       // e.g. "Austin, TX"
  situation: string;      // tag shown on card: "Relocation" | "Inherited Home" | "Divorce" etc.
  quote: string;
}

export interface CashOfferFomoEntry {
  name: string;
  city: string;
}

export interface CashOfferFunnelConfig {
  // ── Brand ──────────────────────────────────────────────────────────────────
  brandName: string;
  logoUrl?: string;         // shown in nav; falls back to brandName text

  // ── Colors ─────────────────────────────────────────────────────────────────
  colorPrimary: string;     // checkmarks, accent icons, CTA on dark sections
  colorNavy: string;        // dark section backgrounds, heading text
  colorLight: string;       // alternating light section backgrounds
  colorBg: string;          // page / input background
  colorButton?: string;     // CTA button on light/white sections — defaults to colorPrimary

  // ── Tracking ────────────────────────────────────────────────────────────────
  funnelTag: string;        // stored in cashoffer_leads.slug
  metaPixelId?: string;

  // ── Routing ─────────────────────────────────────────────────────────────────
  scheduleRoute: string;    // e.g. "/cashoffer/demo/schedule"
  apiOptinRoute: string;    // e.g. "/api/cashoffer-optin"
  calendlyUrl: string;

  // ── Hero ────────────────────────────────────────────────────────────────────
  heroHeadline: string;
  heroHeadlineAccent?: string;  // if set, rendered after heroHeadline in colorPrimary
  heroSubheadline: string;
  heroPhoto?: string;           // optional house photo shown as subtle bg overlay

  // ── Trust Strip ─────────────────────────────────────────────────────────────
  trustStats: Array<{ stat: string; label: string }>;

  // ── How It Works ────────────────────────────────────────────────────────────
  steps: Array<{ num: string; title: string; body: string }>;

  // ── Pain Cards ──────────────────────────────────────────────────────────────
  painCards: Array<{ headline: string; body: string }>;

  // ── Testimonials (shown in 2 rounds of 3) ───────────────────────────────────
  testimonials: CashOfferTestimonial[];

  // ── What You Get ────────────────────────────────────────────────────────────
  valueItems: string[];     // checklist items

  // ── FAQ ─────────────────────────────────────────────────────────────────────
  faqs: Array<{ q: string; a: string }>;

  // ── Schedule Page ───────────────────────────────────────────────────────────
  scheduleHeadline: string;
  scheduleSubheadline: string;
  scheduleCallItems: Array<{ icon: string; text: string }>;

  // ── FOMO Popup ──────────────────────────────────────────────────────────────
  fomoEntries: CashOfferFomoEntry[];
  fomoPopupLabel: string;   // e.g. "just requested a cash offer"
}
