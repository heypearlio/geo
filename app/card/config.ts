// ─────────────────────────────────────────────────────────────────────────────
// V-Card God Config
// Change anything here and it deploys to ALL affiliate cards automatically.
// ─────────────────────────────────────────────────────────────────────────────

const vcardConfig = {

  // ── Brand ─────────────────────────────────────────────────────────────────
  brandName: "HeyPearl",
  partnerBadgeLabel: "HeyPearl Partner",
  logoUrl: "/heypearl-logo-white.png",
  footerTagline: "Get Found. Get Chosen. Get Paid.",

  // ── Colors ────────────────────────────────────────────────────────────────
  colorNavy: "#0F1E3A",
  colorNavyDeep: "#0a1628",
  colorGold: "#F5C842",

  // ── Metadata ──────────────────────────────────────────────────────────────
  metaTitle: "HeyPearl — AI Visibility & Automation for Growing Businesses",
  metaDescription: "Get Found. Get Chosen. Get Paid.",
  metaTagline: "Get Found. Get Chosen. Get Paid.",
  metadataBase: "https://geo.heypearl.io",

  // ── Pearl Support (Vapi) ─────────────────────────────────────────────────
  vapiPublicKey: "0288af3c-84ff-465c-9195-8387806941f5",
  vapiAssistantId: "aff09f34-21b1-440d-a9de-e877ee67a232",
  pearlAvatarUrl: "/pearl-avatar.jpg",
  pearlStatusLabel: "Available Now",
  pearlActiveLabel: "On a call",
  pearlHeadline: "Have a question? Ask Pearl.",
  pearlSubheadline: "Get status updates, submit support requests, or reach your customer success team instantly.",
  pearlCtaLabel: "Speak with Pearl",
  pearlCtaActiveLabel: "End Call",
  pearlCtaLoadingLabel: "Connecting...",

  // ── Links (shared across all cards) ──────────────────────────────────────
  affiliateSignupUrl: "https://affiliate.heypearl.io",
  communityUrl: "https://www.skool.com/inspired-agent-community-2811/about",
  communityLabel: "HeyPearl HQ Community",
  becomeAffiliateLabel: "Become an Affiliate",
  leadsLabel: "My Leads Dashboard",
  referSectionLabel: "Know Someone Who Could Benefit?",

  // ── God / Master Card (Misti) ─────────────────────────────────────────────
  // Update these to change the master card. Affiliate card template is separate.
  godProfile: {
    name: "Misti Bruton",
    title: "Founder, HeyPearl",
    email: "misti@heypearl.io",
    phone: null as string | null,
    headshot_url: null as string | null, // add a URL here to show a photo
    calendly_url: "https://calendly.com/hey-pearl/meet",
    offers: ["geo", "v2", "local"] as string[],
  },

};

export default vcardConfig;
