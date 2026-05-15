// ============================================================
// WHITE LABEL CONFIG
// This is the single file to update when deploying a new brand.
// Change the values below. Everything else reads from here.
// ============================================================

export const brand = {

  // ── COMPANY ──────────────────────────────────────────────
  companyName: "GEO by HeyPearl",
  tagline: "The World's First AI Marketing Engine for Real Estate",
  domain: "geo.heypearl.io",

  // Industry fills in blanks like "the #1 [industry] in your city"
  industry: "real estate agent",          // lowercase singular
  industryPlural: "real estate agents",   // lowercase plural
  industryTitle: "Real Estate",           // title case, used in headlines

  // ── HOST / PERSON ─────────────────────────────────────────
  host: {
    name: "Misti Bruton",
    initials: "MB",
    title: "Founder, GEO by HeyPearl",
    credentials: [
      { stat: "500+", label: "Agents coached" },
      { stat: "$1B+", label: "In real estate sold" },
      { stat: "Top 1%", label: "Teams nationwide" },
    ],
  },

  // ── COLORS ────────────────────────────────────────────────
  // To change colors, do a global find & replace on these hex values.
  // Search the whole project for each old value and replace with the new one.
  colors: {
    primary: "#E8185C",         // Pink/red — CTAs, accents, badges
    primaryHover: "#c4134d",    // Pink hover state
    dark: "#0F1E3A",            // Deep navy — text, footer bg
    darkCard: "#162B4C",        // Navy card bg (schedule, results hero)
    bgLight: "#F7F8FC",         // Off-white page background
    bgAlt: "#EDF0FA",           // Periwinkle alternate sections
    textBody: "#4A5E7A",        // Body text
    textMuted: "#6B7FA0",       // Muted/subtext
    textLight: "#9BACC0",       // Footer/faint text
  },

  // ── INTEGRATIONS ──────────────────────────────────────────
  // These are set in .env.local and Vercel environment variables.
  // The config below is for reference only — values come from env vars.
  envVars: {
    RESEND_API_KEY: "Your Resend API key",
    RESEND_AUDIENCE_ID: "Your Resend audience ID",
    NEXT_PUBLIC_FB_PIXEL_ID: "Your Meta Pixel ID",
    AUDITSKY_API_KEY: "Your AuditSky API key",
    CRON_SECRET: "Secret used to authorize cron + admin API routes",
    CALENDLY_PAT: "Calendly personal access token",
  },

  // Calendly booking URL — used on the /schedule page
  calendlyUrl: "https://calendly.com/hey-pearl/meet",

  // AuditSky keyword — what the audit searches for
  auditKeyword: "real estate agent",

  // ── META / SEO ────────────────────────────────────────────
  meta: {
    title: "GEO by HeyPearl: The World's First AI Marketing Engine for Real Estate Agents",
    description:
      "Become the #1 agent in your city. GEO installs and runs the AI visibility system that makes you easier to find, easier to trust, and easier to choose. Done entirely for you.",
  },

  // ── OG IMAGE (link preview) ───────────────────────────────
  ogImage: {
    headline: "The World's First AI Marketing Engine for Real Estate",
    badge: "Only 1 Agent Per Market",
  },

  // ── LANDING PAGE ─────────────────────────────────────────
  landing: {
    heroHeadline: "The World's First AI Marketing Engine Built Exclusively for Real Estate Agents",
    heroSubline: "GEO by HeyPearl makes you the #1 agent in your city. Easier to find, easier to trust, easier to choose.",
    heroNote: "Done entirely for you. No posting. No dancing. No chasing leads.",

    stats: [
      { stat: "4 in 5", label: "Buyers now use AI to find their agent", accent: false },
      { stat: "30 days", label: "To your first AI-referred lead", accent: false },
      { stat: "1 spot", label: "Open in your market right now", accent: true },
    ],

    testimonials: [
      { quote: "Doubled my organic visibility in under 30 days.", name: "Sarah M.", location: "Austin, TX" },
      { quote: "Got my first lead directly from ChatGPT. I was blown away.", name: "James T.", location: "Miami, FL" },
      { quote: "Ranked #1 for my keyword in under a month. Never happened with any other service.", name: "Rachel K.", location: "Scottsdale, AZ" },
      { quote: "Got a buyer lead on Instagram with under 500 followers from a single story.", name: "Derek L.", location: "Newport Beach, CA" },
    ],

    faqs: [
      {
        q: "Why can only one agent per market use GEO?",
        a: "Because it works. GEO builds your AI presence as the dominant local authority. If we ran it for multiple agents in the same city, it would cancel itself out. One market, one agent, one winner. That is the model. When you claim your market, your competitors are locked out permanently.",
      },
      {
        q: "What is GEO actually doing that is so different?",
        a: "GEO makes you the agent that AI recommends. When a buyer asks ChatGPT, Perplexity, Google AI, or Apple Intelligence who the best agent in your city is, we make sure the answer is you. That is a completely different channel from social media or Google search. Most agents have zero presence there right now. GEO changes that.",
      },
      {
        q: "What does done entirely for you actually mean?",
        a: "It means you do nothing. We write and publish two blogs a week, 28 social posts a month, a weekly newsletter, and manage your entire AI and local search presence. We optimize your Google Business Profile, build your local citations, and run your retargeting campaigns. You get a 30-second approval request once a week. That is your only job.",
      },
      {
        q: "How fast do agents see results?",
        a: "Most agents see measurable movement in AI search visibility within the first 30 days. Full market ownership, where your name is the one AI tools consistently recommend, typically happens within 60 to 90 days. The agents who act first in their market see the fastest results because they have no competition to displace.",
      },
      {
        q: "Do I need a big following or a lot of content already?",
        a: "No. GEO builds everything from scratch. It does not depend on your follower count, your posting history, or your current online presence. We have launched agents with almost no digital footprint and turned them into the most visible agent in their market. Your score today tells us exactly where to start.",
      },
      {
        q: "What happens if I wait and check back later?",
        a: "Someone else claims your market. We do not hold markets open. The moment another agent in your city completes their free report and books their call, your window closes. Your market might be available right now. The only way to know for certain is to claim your free report today.",
      },
    ],
  },

  // ── RESULTS PAGE (post-booking) ────────────────────────────
  results: {
    bookingConfirmation: "You are booked. Check your email for your calendar invite.",
    freeGiftPitch:
      "Misti is bringing her proven framework used by top 1% teams to double GCI in 2026. You will walk away with a custom action plan built for your market, your numbers, and your goals. This is what her private coaching clients pay thousands for.",
    freeGiftItems: [
      {
        label: "AI-Optimized Bio",
        desc: "Written in the exact language AI search engines use to recommend agents. Drop it anywhere online and start getting found.",
      },
      {
        label: "Google Business Profile Script",
        desc: "The exact description that ranks you in local AI and map searches. Most agents have never touched this. Yours will be perfect.",
      },
      {
        label: "3 Market Authority Talking Points",
        desc: "Use these in your next listing appointment. When a seller hears \"AI recommended me,\" you win the listing.",
      },
    ],
    testimonial: {
      quote:
        "I used the listing talking points the next day. Won the appointment. The seller actually said, \"You are the only agent who showed me this.\"",
      name: "Jennifer R.",
      location: "Scottsdale AZ",
    },
  },

};
