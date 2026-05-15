// ─── Local Services Funnel — Config Types ────────────────────────────────────
// Every value here can be swapped to create a new white-label instance.

export interface PricingFeature {
  feature: string;
  starter: boolean | string;
  growth: boolean | string;
  pro: boolean | string;
}

export interface PricingTier {
  name: string;
  price: string; // e.g. "$1,500"
  period?: string; // default "/mo"
  highlight?: boolean; // "Most Popular" badge
  features: string[];
  ctaLabel?: string; // default "Get Started"
  ctaHref?: string; // default "#" — replace with Stripe link
}

export interface Testimonial {
  initials: string;
  name: string;
  business: string;
  quote: string;
  photoUrl?: string; // realistic headshot — if set, shown instead of initials circle
}

export interface PainCard {
  problem: string;
  headline: string;
  body: string; // HTML OK — rendered with dangerouslySetInnerHTML
  fix: string;
}

export interface ServiceItem {
  title: string;
  body: string;
}

export interface Step {
  num: string;
  title: string;
  body: string;
}

export interface FAQ {
  q: string;
  a: string;
}

export interface ResultStat {
  stat: string;
  label: string;
}

export interface HeroStat {
  stat: string;
  label: string;
}

export interface FomoEntry {
  name: string;
  business: string;
  city: string;
}

export interface FounderInfo {
  initials: string;
  name: string;
  title: string;
  photoUrl?: string;
  stats: Array<{ stat: string; label: string }>;
}

export interface LocalServicesFunnelConfig {
  // ── Brand ──────────────────────────────────────────────────────────────────
  brandName: string;
  brandTagline: string; // Short tagline shown in hero badge
  logoUrl?: string;     // If set, shown in nav instead of brandName text

  // ── Colors ─────────────────────────────────────────────────────────────────
  colorPrimary: string;    // accent — icons, labels, checkmarks. e.g. "#E8185C"
  colorNavy: string;      // dark section bg, dark text. e.g. "#0F1E3A"
  colorLight: string;     // light alternating section bg. e.g. "#EDF0FA"
  colorBg: string;        // page/input bg. e.g. "#F7F8FC"
  colorButton?: string;   // CTA button bg — defaults to colorPrimary if not set
  colorOnPrimary?: string; // text color on top of primary-colored buttons — dark if primary is light (e.g. lime), white if dark

  // ── Tracking ────────────────────────────────────────────────────────────────
  funnelTag: string;     // saved to heylocal_leads.funnel — e.g. "heylocal", "christina"
  metaPixelId?: string;  // affiliate's Meta Pixel ID — injected on all funnel pages

  // ── Routing ─────────────────────────────────────────────────────────────────
  scheduleRoute: string; // e.g. "/localschedule"
  pricingRoute: string;  // e.g. "/localpricing" (optional — set "" to hide)
  apiOptinRoute: string; // e.g. "/api/local-optin"
  calendlyUrl: string;   // Full Calendly URL (no query params — added dynamically)

  // ── Hero ────────────────────────────────────────────────────────────────────
  heroHeadline: string;
  heroHeadlineAccent: string; // highlighted portion rendered in primary color
  heroSubheadline: string;
  heroPrimaryCtaLabel: string;
  heroStats: HeroStat[];

  // ── Results Strip ───────────────────────────────────────────────────────────
  resultStats: ResultStat[];

  // ── Pain Cards ──────────────────────────────────────────────────────────────
  painSectionLabel: string; // e.g. "Sound Familiar?"
  painHeadline: string;
  painSubheadline: string;
  painCards: PainCard[];

  // ── Testimonials ────────────────────────────────────────────────────────────
  testimonials: Testimonial[];

  // ── What We Do ──────────────────────────────────────────────────────────────
  services: ServiceItem[];

  // ── Getting Started Steps ───────────────────────────────────────────────────
  steps: Step[];

  // ── FAQ ─────────────────────────────────────────────────────────────────────
  faqs: FAQ[];

  // ── Opt-in Form ─────────────────────────────────────────────────────────────
  formHeadline: string;
  formSubheadline: string;
  formCtaLabel: string;

  // ── Pricing ─────────────────────────────────────────────────────────────────
  pricingTiers: [PricingTier, PricingTier, PricingTier]; // always 3 tiers
  pricingComparisonRows: PricingFeature[];

  // ── Schedule Page ───────────────────────────────────────────────────────────
  scheduleHeadline: string;
  scheduleSubheadline: string;
  scheduleTestimonialQuote: string;
  scheduleTestimonialAuthor: string;
  scheduleCallItems: Array<{ title: string; desc: string }>;
  scheduleWhatHappens: Array<{ icon: string; text: string }>;
  founder: FounderInfo;

  // ── FOMO Popup ──────────────────────────────────────────────────────────────
  fomoEntries: FomoEntry[];
  fomoPopupLabel: string; // e.g. "just booked a free growth call"

  // ── Vapi AI ──────────────────────────────────────────────────────────────────
  vapiPublicKey?: string;
  vapiAssistantId?: string;

  // ── Proof Photos ─────────────────────────────────────────────────────────────
  // All paths served from /public — e.g. "/offers/local/filename.jpg"
  // If not set, a placeholder is shown instead.
  heroPhoto?: string;                                          // wide 2:1 hero proof image
  testimonialProofPhotos?: Array<{ src: string; caption: string }>; // 3 photos below testimonials
  largeProofPhoto?: string;                                    // 16:9 main proof section image
  proofPhotos?: Array<{ src: string; caption: string }>;       // bottom 2-col proof grid
}
