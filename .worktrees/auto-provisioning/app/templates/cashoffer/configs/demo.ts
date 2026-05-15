import type { CashOfferFunnelConfig } from "../config.types";

const config: CashOfferFunnelConfig = {
  brandName: "Cash Offers USA",
  heroPhoto: "/offers/cashoffer/hero-home.jpg",  // drop photo at public/offers/cashoffer/hero-home.jpg

  colorPrimary: "#16A34A",     // deep green
  colorNavy: "#0F1E3A",
  colorLight: "#EDF0FA",       // neutral lavender, no green tint
  colorBg: "#F7F8FC",

  funnelTag: "cashoffer",
  scheduleRoute: "/cashoffer/schedule",
  apiOptinRoute: "/api/cashoffer-optin",
  calendlyUrl: "https://calendly.com/hey-pearl/meet",

  heroHeadline: "Get a Cash Offer on Your Home",
  heroHeadlineAccent: "in 24 Hours.",
  heroSubheadline: "No repairs. No agent fees. No open houses. Close in as few as 7 days.",

  trustStats: [
    { stat: "2,400+", label: "Homes purchased" },
    { stat: "9 days", label: "Avg. days to close" },
    { stat: "48 states", label: "We buy nationwide" },
    { stat: "No obligation", label: "Ever. Seriously." },
  ],

  steps: [
    { num: "01", title: "Enter your address", body: "Takes 30 seconds. No account needed. No junk mail." },
    { num: "02", title: "Receive your offer", body: "We review your property and send a fair cash offer within 24 hours." },
    { num: "03", title: "Close on your timeline", body: "You pick the date. We can close in as few as 7 days or wait until you're ready." },
  ],

  painCards: [
    { headline: "5–6% in agent commissions", body: "On a $400,000 home, that's up to $24,000 gone before you even move. We charge zero commissions and pay all closing costs." },
    { headline: "Months sitting on market", body: "The average home takes 60–90 days to sell traditionally. We make an offer in 24 hours and close when you're ready." },
    { headline: "Buyers demanding repairs", body: "Inspections lead to repair requests. Most sellers end up spending thousands fixing issues before closing. We buy as-is. No repairs. Ever." },
    { headline: "Deals falling through", body: "30% of traditional sales fall apart at the last minute due to financing issues. Cash buyers don't need bank approval. Your deal is done." },
    { headline: "Endless showings", body: "Strangers walking through your home at all hours. Keeping it spotless for weeks. We skip all of that. One quick walkthrough, if that." },
    { headline: "Carrying costs keep piling up", body: "Every month you wait is another mortgage payment, insurance bill, tax installment, and utility bill on a home you're trying to leave. We close fast so you stop paying for two places." },
  ],

  testimonials: [
    {
      name: "Sandra K.",
      location: "Denver, CO",
      situation: "Relocation",
      quote: "My company transferred me across the country with 3 weeks notice. I had no time to list traditionally. Cash Offers USA gave me a fair number in 24 hours and we closed before I left. Absolutely saved me.",
    },
    {
      name: "Robert M.",
      location: "Tampa, FL",
      situation: "Inherited Home",
      quote: "After my mother passed, we inherited her home two states away. It needed work and we weren't up for managing a renovation from a distance. We got an offer, signed the papers, and it was done. Huge weight off.",
    },
    {
      name: "Carla & James T.",
      location: "Phoenix, AZ",
      situation: "Divorce",
      quote: "We needed a clean break, fast. The last thing either of us wanted was months of showings and negotiations with agents. This was straightforward, fair, and over in 11 days.",
    },
    {
      name: "Bill H.",
      location: "Charlotte, NC",
      situation: "Too Many Repairs",
      quote: "The roof needed replacing, the HVAC was shot, and the kitchen was from 1987. An agent quoted me $40,000 in updates before listing. These guys bought it exactly as it was.",
    },
    {
      name: "Yolanda F.",
      location: "Houston, TX",
      situation: "Downsizing",
      quote: "My kids are grown and I just wanted something smaller. I didn't want the hassle of staging and open houses at my age. Called on a Tuesday, had an offer Thursday, closed in 10 days.",
    },
    {
      name: "Marcus & Diana L.",
      location: "Atlanta, GA",
      situation: "Fast Close Needed",
      quote: "We found our dream home but needed to sell first. Our agent said it would take months. We called here, closed in 8 days, and made our offer with cash in hand. It worked out perfectly.",
    },
  ],

  valueItems: [
    "No repairs or cleaning required. We buy as-is.",
    "Zero agent commissions or hidden fees",
    "No open houses or strangers walking through your home",
    "You pick the closing date. Fast or relaxed.",
    "Cash wired directly to you at close",
    "No financing contingencies. The deal doesn't fall through.",
  ],

  faqs: [
    {
      q: "Is the offer a fair price?",
      a: "We make competitive offers based on current market data and the condition of your home. Our offer reflects a fair price for a fast, certain, hassle-free sale. That certainty has real value compared to months of uncertainty with a traditional listing.",
    },
    {
      q: "What types of homes do you buy?",
      a: "Single-family homes, condos, townhomes, multi-family properties, and inherited or distressed homes. We buy in any condition. No repairs needed.",
    },
    {
      q: "What if I still owe money on my mortgage?",
      a: "That's no problem. We pay off your mortgage at closing out of the sale proceeds, and you receive the difference.",
    },
    {
      q: "How fast can you actually close?",
      a: "As fast as 7 days if needed. Most clients close in 10 to 14 days. But if you need more time, we can wait. You set the date.",
    },
    {
      q: "Is there any obligation after I submit my address?",
      a: "None at all. Getting an offer is completely free. You're under zero obligation to accept, and there's no pressure from our side.",
    },
  ],

  scheduleHeadline: "We have buyers active in your area right now.",
  scheduleSubheadline: "Book a free 15-minute call. We'll confirm your property details and walk you through your cash offer.",
  scheduleCallItems: [
    { icon: "🏡", text: "We confirm your property details and answer any questions about the process" },
    { icon: "💵", text: "We walk through your cash offer range based on your home and location" },
    { icon: "📅", text: "If you want to move forward, we set a closing date that works for your timeline" },
  ],

  fomoPopupLabel: "just requested a cash offer",
  fomoEntries: [
    { name: "Sandra K.", city: "Denver, CO" },
    { name: "Marcus T.", city: "Austin, TX" },
    { name: "Denise H.", city: "Tampa, FL" },
    { name: "Carlos M.", city: "Phoenix, AZ" },
    { name: "Jasmine R.", city: "Nashville, TN" },
    { name: "Brett L.", city: "Charlotte, NC" },
    { name: "Tony V.", city: "Houston, TX" },
    { name: "Derek W.", city: "Atlanta, GA" },
    { name: "Priya S.", city: "Portland, OR" },
    { name: "James F.", city: "Chicago, IL" },
    { name: "Lena B.", city: "Miami, FL" },
    { name: "Kevin O.", city: "Columbus, OH" },
    { name: "Rachel P.", city: "Seattle, WA" },
    { name: "Mike D.", city: "Las Vegas, NV" },
    { name: "Tanya C.", city: "Raleigh, NC" },
  ],
};

export default config;
