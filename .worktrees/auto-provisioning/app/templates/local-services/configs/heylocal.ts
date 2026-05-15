import type { LocalServicesFunnelConfig } from "../config.types";

const config: LocalServicesFunnelConfig = {

  // ── Brand ────────────────────────────────────────────────────────────────
  brandName: "HeyLocal",
  brandTagline: "AI-Powered Local Business Growth",
  logoUrl: "/offers/local/HeyLocal_logo.png",

  colorPrimary: "#C8F135",
  colorNavy: "#0F1E3A",
  colorLight: "#EDF0FA",
  colorBg: "#F7F8FC",
  colorOnPrimary: "#0F1E3A", // lime green is light — use dark navy text on buttons

  funnelTag: "heylocal",

  // ── Routing ──────────────────────────────────────────────────────────────
  scheduleRoute: "/localschedule",
  pricingRoute: "/localpricing",
  apiOptinRoute: "/api/local-optin",
  calendlyUrl: "https://calendly.com/hey-pearl/meet",

  // ── Hero ─────────────────────────────────────────────────────────────────
  heroHeadline: "Always on. Say hello to",
  heroHeadlineAccent: "more business.",
  heroSubheadline: "More calls. More reviews. More customers. All on autopilot.",
  heroPrimaryCtaLabel: "Book a Free Growth Call",
  heroStats: [
    { stat: "Done For You", label: "We run it. You grow." },
    { stat: "24/7", label: "AI always working for you" },
    { stat: "48 hrs", label: "Full setup turnaround" },
    { stat: "No Contracts", label: "Cancel anytime" },
  ],

  // ── Results Strip ─────────────────────────────────────────────────────────
  resultStats: [
    { stat: "300%", label: "More Google Business Profile views" },
    { stat: "47", label: "Avg. new reviews in 30 days" },
    { stat: "3×", label: "More website visits from local search" },
    { stat: "60%", label: "Of missed calls now captured by AI" },
  ],

  // ── Pain Cards ────────────────────────────────────────────────────────────
  painSectionLabel: "Sound Familiar?",
  painHeadline: "We fix what's broken so you can grow your local business",
  painSubheadline: "Most local businesses lose to competitors who aren't even better. They're just more visible.",
  painCards: [
    {
      problem: "The phone goes quiet",
      headline: "Your competitors are getting calls that should be yours",
      body: "55% of all service searches start on Google. If you&rsquo;re not showing up at the top of Maps when someone nearby searches for what you do, that job goes to the business below you. Every single time.",
      fix: "We put you at the top: SEO, Google Business Profile, local rankings. Done for you.",
    },
    {
      problem: "Feast or famine",
      headline: "Great month. Slow month. You never know which is coming.",
      body: "Referrals and word of mouth are unpredictable. They dry up with no warning, no pattern, and no way to plan around them. A full calendar doesn&rsquo;t happen by accident. It happens when a system is running for you every day.",
      fix: "Consistent visibility means consistent leads, not just the months you get lucky.",
    },
    {
      problem: "No time, no staff, no idea where to start",
      headline: "You're the owner, the crew, and the marketer. That's too much.",
      body: "You didn&rsquo;t start a roofing company to post on Instagram. But if you don&rsquo;t, you&rsquo;re invisible. Most owners know marketing matters. They just don&rsquo;t have the time, the team, or the energy left over to do it.",
      fix: "We handle everything. You run your business. We keep your phone ringing.",
    },
  ],

  // ── Testimonials ──────────────────────────────────────────────────────────
  testimonials: [
    {
      initials: "MG",
      name: "Maria G.",
      business: "Med Spa, Austin TX",
      quote: "Within 60 days we went from barely showing up on Google to being the first result when people search for med spas in our area. The phone doesn't stop ringing.",
      photoUrl: "https://randomuser.me/api/portraits/women/44.jpg",
    },
    {
      initials: "JT",
      name: "James T.",
      business: "HVAC Company, Denver CO",
      quote: "I was skeptical at first. But our Google reviews went from 14 to 61 in the first month and I can track exactly where every new lead is coming from. Best investment we've made.",
      photoUrl: "https://randomuser.me/api/portraits/men/32.jpg",
    },
    {
      initials: "LW",
      name: "Lisa W.",
      business: "Salon, Nashville TN",
      quote: "The AI receptionist alone was worth it. I used to miss calls constantly when I was with clients. Now every call gets answered and they book right then. Game changer.",
      photoUrl: "https://randomuser.me/api/portraits/women/68.jpg",
    },
  ],

  // ── What We Do ────────────────────────────────────────────────────────────
  services: [
    { title: "Social Media Posting", body: "Done-for-you content across Facebook, Instagram & more. Consistent, on-brand, and engaging." },
    { title: "SEO Optimization", body: "Get found on Google when customers nearby search for what you offer. Local SEO that actually works." },
    { title: "24/7 AI Receptionist", body: "Never miss a call or message again. Our AI answers questions, books appointments, and captures leads around the clock." },
    { title: "Review Automation", body: "Automatically request reviews from happy customers at the perfect moment. More 5-star reviews, less effort." },
    { title: "Google Business Profile", body: "We keep your listing optimized, accurate, and posting regularly so you rank higher in local search." },
    { title: "Website Chat Widget", body: "Convert website visitors into customers with an AI chat widget that answers questions and books instantly." },
    { title: "CRM & Lead Tracking", body: "Keep all your leads, customers, and conversations in one place. Follow up at the right time, every time." },
    { title: "And more...", body: "Email campaigns, reputation monitoring, analytics dashboards, competitor tracking, and more." },
  ],

  // ── Steps ─────────────────────────────────────────────────────────────────
  steps: [
    {
      num: "01",
      title: "Book a free call",
      body: "Tell us about your business. We'll listen, learn what you need, and recommend the right plan.",
    },
    {
      num: "02",
      title: "We set everything up",
      body: "Our team handles the onboarding, tech setup, and account connections. Done in 48 hours.",
    },
    {
      num: "03",
      title: "Watch your business grow",
      body: "Sit back while HeyLocal keeps your business active online and brings in more customers.",
    },
  ],

  // ── FAQ ───────────────────────────────────────────────────────────────────
  faqs: [
    {
      q: "Is there a contract or commitment?",
      a: "No contracts. No lock-in. Cancel anytime with 30 days notice. We keep clients by getting results, not by trapping them.",
    },
    {
      q: "How fast will I see results?",
      a: "Most clients see measurable movement in Google visibility within the first 30 days. Phone calls and leads typically increase within 60 to 90 days as your presence builds consistently.",
    },
    {
      q: "What do I need to get started?",
      a: "Almost nothing. We handle the setup. You give us access to your Google Business Profile and any existing accounts. We take it from there.",
    },
    {
      q: "Do I have to post on social media myself?",
      a: "No. We create and publish your social content for you. You get a quick approval request once a week. That is your only job.",
    },
    {
      q: "Can I upgrade my plan later?",
      a: "Yes. Start where it makes sense for your business and upgrade when you are ready. Most clients start on Starter or Growth and move up within 90 days.",
    },
  ],

  // ── Opt-in Form ───────────────────────────────────────────────────────────
  formHeadline: "Ready to say hello to more business?",
  formSubheadline: "Tell us a little about yourself and we'll get you booked for a free growth call.",
  formCtaLabel: "Book My Free Growth Call",

  // ── Pricing ───────────────────────────────────────────────────────────────
  pricingTiers: [
    {
      name: "Starter",
      price: "$1,500",
      features: [
        "Google Business Profile management",
        "Social media posting (15 posts/mo)",
        "Meta retargeting ads",
        "Monthly performance report",
      ],
      ctaHref: "https://buy.stripe.com/00w5kEb0wchwgwGeSR5Ne0r",
    },
    {
      name: "Growth",
      price: "$2,000",
      highlight: true,
      features: [
        "Everything in Starter",
        "Local SEO optimization",
        "Full review automation",
        "Website chat widget",
        "Social media posting (28 posts/mo)",
        "Monthly performance report",
      ],
      ctaHref: "https://buy.stripe.com/14A6oIecI5T8gwG3a95Ne0s",
    },
    {
      name: "Pro",
      price: "$2,500",
      features: [
        "24/7 AI Receptionist",
        "Everything in Growth",
        "CRM automation",
        "Email campaigns",
        "Competitor monitoring",
        "Email and SMS sequences",
        "Reputation repair program",
      ],
      ctaHref: "https://buy.stripe.com/3cI6oIb0w3L04NY9yx5Ne0t",
    },
  ],

  pricingComparisonRows: [
    { feature: "Google Business Profile management", starter: true, growth: true, pro: true },
    { feature: "Meta retargeting ads", starter: true, growth: true, pro: true },
    { feature: "Monthly performance report", starter: true, growth: true, pro: true },
    { feature: "Social media posting", starter: "15/mo", growth: "28/mo", pro: "28/mo" },
    { feature: "Local SEO optimization", starter: false, growth: true, pro: true },
    { feature: "Full review automation", starter: false, growth: true, pro: true },
    { feature: "Website chat widget", starter: false, growth: true, pro: true },
    { feature: "24/7 AI Receptionist", starter: false, growth: false, pro: true },
    { feature: "CRM automation", starter: false, growth: false, pro: true },
    { feature: "Email campaigns", starter: false, growth: false, pro: true },
    { feature: "Email and SMS sequences", starter: false, growth: false, pro: true },
    { feature: "Competitor monitoring", starter: false, growth: false, pro: true },
    { feature: "Reputation repair program", starter: false, growth: false, pro: true },
  ],

  // ── Schedule Page ──────────────────────────────────────────────────────────
  scheduleHeadline: "Book Your Free Growth Call",
  scheduleSubheadline: "In 30 minutes, we'll walk through exactly what's holding your business back online and show you a clear plan to fix it. No pitch until you've seen everything.",
  scheduleTestimonialQuote: "I had no idea how much business I was losing because I wasn't showing up online. The call was eye-opening. We were live in 48 hours.",
  scheduleTestimonialAuthor: "Carlos M., HVAC Business Owner, Tampa FL",
  scheduleCallItems: [
    {
      title: "Your Full Online Presence Audit",
      desc: "We review your Google Business Profile, local search rankings, reviews, social media, and website visibility. You'll see exactly where you stand and what's costing you customers right now.",
    },
    {
      title: "A Clear Plan to Get More Calls and Customers",
      desc: "You leave with a step-by-step roadmap built around your business, your competition, and your market. Not a generic checklist. A real plan you can act on immediately.",
    },
    {
      title: "How AI Automation Can Work For Your Business",
      desc: "See how local businesses are using AI to answer calls, capture leads, automate reviews, and stay top of mind 24/7. We show you exactly what this looks like for your type of business.",
    },
  ],
  scheduleWhatHappens: [
    { icon: "🔍", text: "We audit your current online presence live and show you what customers see when they search for you" },
    { icon: "📍", text: "We show you exactly which competitors are showing up above you on Google and why" },
    { icon: "📞", text: "We walk through how an AI receptionist would work for your specific business" },
    { icon: "🗺️", text: "We show you what HeyLocal looks like set up for your business — not a generic demo" },
    { icon: "🎯", text: "No pitch until you've seen everything. Transparent. No pressure." },
  ],
  founder: {
    initials: "MB",
    name: "Misti Bruton",
    title: "Founder, HeyLocal",
    stats: [
      { stat: "500+", label: "Businesses helped" },
      { stat: "48 hrs", label: "Avg. setup time" },
      { stat: "24/7", label: "AI always on" },
    ],
  },

  // ── Proof Photos ──────────────────────────────────────────────────────────
  heroPhoto: "/offers/local/497b417a-882d-4af2-962a-6066da0758d3.jpg",
  largeProofPhoto: "/offers/local/whitespark-local-seo-software-services2-1536x672.webp",
  proofPhotos: [
    { src: "/offers/local/Grill-Tanks-Plus-Google-Business-Profile.webp", caption: "Review automation results" },
    { src: "/offers/local/aba719a8-0595-4263-8a40-22de1d0aa7d2.jpg", caption: "Client SEO growth dashboard" },
  ],

  // ── FOMO Popup ────────────────────────────────────────────────────────────
  fomoPopupLabel: "just booked a free growth call",
  fomoEntries: [
    { name: "Marcus T.", business: "Roofing Company", city: "Austin, TX" },
    { name: "Denise H.", business: "HVAC Contractor", city: "Denver, CO" },
    { name: "Carlos M.", business: "Pool Inspector", city: "Tampa, FL" },
    { name: "Jasmine R.", business: "Food Truck", city: "Nashville, TN" },
    { name: "Brett L.", business: "Local Florist", city: "Charlotte, NC" },
    { name: "Tony V.", business: "Handyman Service", city: "Phoenix, AZ" },
    { name: "Sandra K.", business: "Med Spa", city: "San Diego, CA" },
    { name: "Derek W.", business: "Pest Control", city: "Houston, TX" },
    { name: "Priya S.", business: "Dog Groomer", city: "Portland, OR" },
    { name: "James F.", business: "Auto Detailer", city: "Atlanta, GA" },
    { name: "Lena B.", business: "Nail Salon", city: "Miami, FL" },
    { name: "Kevin O.", business: "Electrician", city: "Columbus, OH" },
    { name: "Rachel P.", business: "Cleaning Service", city: "Seattle, WA" },
    { name: "Mike D.", business: "Landscaper", city: "Las Vegas, NV" },
    { name: "Tanya C.", business: "Massage Therapist", city: "Raleigh, NC" },
    { name: "Andre N.", business: "Plumber", city: "Sacramento, CA" },
    { name: "Holly M.", business: "Tutoring Center", city: "Boston, MA" },
    { name: "Jason R.", business: "Window Cleaner", city: "Minneapolis, MN" },
    { name: "Sofia E.", business: "Bakery", city: "Austin, TX" },
    { name: "Chris B.", business: "Personal Trainer", city: "Dallas, TX" },
    { name: "Megan T.", business: "Yoga Studio", city: "Denver, CO" },
    { name: "Luis A.", business: "Fence Installer", city: "San Antonio, TX" },
    { name: "Amber J.", business: "Esthetician", city: "Scottsdale, AZ" },
    { name: "Nathan W.", business: "Pressure Washer", city: "Jacksonville, FL" },
    { name: "Diana F.", business: "Catering Company", city: "Chicago, IL" },
    { name: "Tyler S.", business: "Tree Service", city: "Louisville, KY" },
    { name: "Vanessa L.", business: "Photography Studio", city: "Portland, OR" },
    { name: "Omar K.", business: "Auto Mechanic", city: "Detroit, MI" },
    { name: "Brianna H.", business: "Lash Studio", city: "Tampa, FL" },
    { name: "Scott M.", business: "Garage Door Repair", city: "Omaha, NE" },
    { name: "Keisha D.", business: "Hair Braiding Salon", city: "Atlanta, GA" },
    { name: "Paul G.", business: "Chimney Sweep", city: "Pittsburgh, PA" },
    { name: "Alexis R.", business: "Daycare Center", city: "Kansas City, MO" },
    { name: "Marco V.", business: "Tile & Flooring", city: "Orlando, FL" },
    { name: "Tiffany N.", business: "Event Planner", city: "Nashville, TN" },
    { name: "Brandon C.", business: "Irrigation Specialist", city: "Phoenix, AZ" },
    { name: "Grace L.", business: "Alterations Shop", city: "Richmond, VA" },
    { name: "Joey M.", business: "Mobile Mechanic", city: "Tucson, AZ" },
    { name: "Nina P.", business: "Acupuncturist", city: "San Francisco, CA" },
    { name: "Ray T.", business: "Carpet Cleaner", city: "Memphis, TN" },
  ],

  vapiPublicKey: "0288af3c-84ff-465c-9195-8387806941f5",
  vapiAssistantId: "b73d9e5f-ba8d-4a7b-892b-8056c493a00a",
};

export default config;
