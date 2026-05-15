"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { submitClaimForm } from "../claim/actions";

// ─── Constants ────────────────────────────────────────────────────────────────

const CTA_BTN =
  "inline-block bg-[#E8185C] hover:bg-[#c4134d] text-white font-bold text-base md:text-lg px-6 md:px-8 py-3 md:py-4 rounded-xl transition-all duration-200 shadow-lg shadow-[#E8185C]/25 cursor-pointer";

const STICKY_BTN =
  "inline-flex items-center justify-center gap-2 text-white text-sm font-semibold px-6 py-2 rounded-full border border-white/30 hover:bg-white/10 transition-all duration-200 cursor-pointer";

const TICKER_ITEMS = [
  "📊 100% of home buyers now use the internet in their search · NAR 2025",
  "🤖 39% of buyers are already using AI tools in their home search · Veterans United",
  "📱 400 million people use ChatGPT every single week · OpenAI 2025",
  "🔍 AI Overviews now appear in nearly half of all Google search results",
  "🏡 88% of all home buyers purchase through an agent · NAR 2025",
  "⚡ 76% of local searchers contact a business within 24 hours of searching · Google",
  "📈 Perplexity grew 370% year-over-year · AI is not coming, it's here",
  "🎯 46% of all Google searches are for local businesses · Google Local Data",
  "💬 62% of buyers say their agent was their most valuable source of information · NAR",
  "🏆 97% of buyers start their home search online before contacting anyone",
];

const FAQS = [
  {
    q: "What exactly is GEO?",
    a: "GEO is a done-for-you system that builds your authority as the top local real estate expert. When buyers search for agents in your market, GEO makes sure you show up everywhere they look. We handle everything: content, optimization, citations, your Google Business Profile, and your entire online presence. You show up first without lifting a finger.",
  },
  {
    q: "What is GEO actually doing that's so different?",
    a: "GEO builds your hyper-local authority across every platform buyers use to find agents. Not just your city — your zip code, your neighborhoods, your streets. We build your presence in Google search, Google Maps, local directories, and AI search tools so that no matter how a buyer looks for an agent in your market, your name is what they find. Most agents have zero presence in most of these channels right now.",
  },
  {
    q: "Why can only one agent per market use GEO?",
    a: "GEO builds your AI presence as the dominant local authority. If we ran it for multiple agents in the same city, it wouldn't make sense. So we don't. One market, one agent.",
  },
  {
    q: "What does done entirely for you actually mean?",
    a: "It means you do nothing. We write and publish two blogs a week, 28 social posts a month, a weekly newsletter, and manage your entire online presence. We optimize your Google Business Profile, build your local citations, and run your retargeting. You get a 30-second approval request once a week. That is your only job.",
  },
  {
    q: "How fast do agents see results?",
    a: "Most agents see measurable movement in search visibility within the first 30 days. Full market ownership, where your name shows up consistently across search and AI tools, typically happens within 60 to 90 days. The agents who act first in their market see the fastest results because they have no competition to displace.",
  },
  {
    q: "Do I need a big following or a lot of content already?",
    a: "No. GEO builds everything from scratch. It does not depend on your follower count, your posting history, or your current online presence. We have launched agents with almost no digital footprint and turned them into the most visible agent in their market.",
  },
  {
    q: "How much does GEO cost?",
    a: "Less than a social media marketing company, and we give you 10x more authority. GEO has three tiers so you can pick the one that fits where you are right now. We cover pricing on the strategy call once we confirm your market is available. Solo agents afford this. That is by design.",
  },
  {
    q: "What happens if I wait?",
    a: "Someone else claims your market. We do not hold markets open. The moment another agent in your city books their strategy call, your window closes. Your market might be available right now. The only way to know is to check today.",
  },
];

const QUOTES = [
  { quote: "Got a call from my Google Business Profile last week. She said she found me searching for agents in my area and I was the only one who showed up everywhere she looked. Never had that happen before GEO.", name: "Sarah M.", location: "Austin, TX" },
  { quote: "A buyer found me online. Said she'd been reading my content for weeks before she reached out. She already trusted me before we ever spoke. Closed in 28 days.", name: "Rachel K.", location: "Scottsdale, AZ" },
  { quote: "Someone found one of my blog posts while searching for neighborhoods in Denver. She called me directly. Said I was the most visible agent she could find.", name: "David K.", location: "Denver, CO" },
  { quote: "My Google Business Profile views are up over 300% since month two. Calls coming in from people who just found me. I'm not chasing anyone. They find me.", name: "Derek L.", location: "Newport Beach, CA" },
  { quote: "Three organic leads in one month. No ads. No cold calls. They found me through search, read my content, and reached out ready to go. I just show up to the appointments.", name: "Jennifer R.", location: "Scottsdale, AZ" },
  { quote: "A seller called me because she said I showed up everywhere she searched in our market. She didn't interview anyone else. Signed the listing agreement on our first call.", name: "Marcus D.", location: "Denver, CO" },
];

const POPUPS = [
  { name: "Jennifer R.", city: "Cherry Creek, CO", msg: "just inquired about their market" },
  { name: "Marcus T.", city: "Brickell, FL", msg: "just inquired about their market" },
  { name: "Ashley M.", city: "The Woodlands, TX", msg: "just inquired about their market" },
  { name: "Derek W.", city: "Old Town Scottsdale, AZ", msg: "just inquired about their market" },
  { name: "Kayla B.", city: "Green Hills, TN", msg: "just inquired about their market" },
  { name: "Ryan H.", city: "South End, NC", msg: "just inquired about their market" },
  { name: "Tina L.", city: "Pacific Palisades, CA", msg: "just inquired about their market" },
];

// ─── Ticker ───────────────────────────────────────────────────────────────────

function Ticker() {
  return (
    <div className="bg-white border-b border-[#0F1E3A]/10 py-2.5 overflow-hidden">
      <div
        className="flex whitespace-nowrap"
        style={{ animation: "ticker 18s linear infinite" }}
      >
        {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
          <span key={i} className="text-[#0F1E3A] text-xs font-medium mx-10 shrink-0">
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── FOMO Popup ───────────────────────────────────────────────────────────────

function FomoPopup() {
  const [current, setCurrent] = useState<number | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const show = (idx: number) => {
      setCurrent(idx);
      setVisible(true);
      setTimeout(() => setVisible(false), 4500);
    };
    const first = setTimeout(() => show(Math.floor(Math.random() * POPUPS.length)), 8000);
    let i = 1;
    const interval = setInterval(() => { show((i++) % POPUPS.length); }, 14000);
    return () => { clearTimeout(first); clearInterval(interval); };
  }, []);

  if (current === null) return null;
  const p = POPUPS[current];

  return (
    <div className={`fixed bottom-20 md:bottom-6 left-4 z-50 transition-all duration-500 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"}`}>
      <div className="bg-white rounded-xl shadow-xl border border-[#0F1E3A]/8 px-4 py-3 flex items-center gap-3 max-w-[280px]">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#E8185C] to-[#162B4C] flex items-center justify-center shrink-0">
          <span className="text-white text-[10px] font-bold">{p.name.split(" ").map((w: string) => w[0]).join("")}</span>
        </div>
        <div>
          <p className="text-[#0F1E3A] text-xs font-semibold leading-tight">{p.name}</p>
          <p className="text-[#6B7FA0] text-[11px] leading-tight mt-0.5">{p.city} · {p.msg}</p>
        </div>
      </div>
    </div>
  );
}

// ─── FAQ Item ─────────────────────────────────────────────────────────────────

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-white rounded-xl overflow-hidden shadow-sm">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-6 py-5 text-left">
        <span className="font-semibold text-[#0F1E3A] pr-4">{q}</span>
        <span className="text-[#0F1E3A] text-xl font-bold shrink-0">{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div className="px-6 pb-5 border-t border-[#0F1E3A]/6">
          <p className="text-[#4A5E7A] leading-relaxed pt-4">{a}</p>
        </div>
      )}
    </div>
  );
}

// ─── Opt-In Form ──────────────────────────────────────────────────────────────

function ClaimForm({
  scheduleRoute,
  affiliateTag,
}: {
  scheduleRoute?: string;
  affiliateTag?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const inputClass =
    "w-full bg-[#F7F8FC] border border-[#0F1E3A]/12 rounded-xl px-4 py-3 text-[#0F1E3A] placeholder-[#9BACC0] focus:outline-none focus:border-[#E8185C] focus:bg-white transition-colors text-[16px]";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    try {
      const result = await submitClaimForm(fd);
      if (result.success) {
        const email = (fd.get("email") as string) ?? "";
        const city = (fd.get("city") as string) ?? "";
        const firstName = (fd.get("firstName") as string) ?? "";
        const lastName = (fd.get("lastName") as string) ?? "";
        const dest = scheduleRoute ?? "/schedule";
        router.push(`${dest}?source=claim&email=${encodeURIComponent(email)}&city=${encodeURIComponent(city)}&firstName=${encodeURIComponent(firstName)}&lastName=${encodeURIComponent(lastName)}`);
      } else {
        setError(result.error ?? "Something went wrong.");
        setLoading(false);
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input type="hidden" name="affiliateTag" value={affiliateTag ?? ""} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-[#0F1E3A] uppercase tracking-wide mb-1.5">First Name *</label>
          <input name="firstName" required placeholder="Sarah" className={inputClass} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#0F1E3A] uppercase tracking-wide mb-1.5">Last Name *</label>
          <input name="lastName" required placeholder="Johnson" className={inputClass} />
        </div>
      </div>
      <div>
        <label className="block text-xs font-semibold text-[#0F1E3A] uppercase tracking-wide mb-1.5">Email *</label>
        <input name="email" type="email" required placeholder="sarah@brokerage.com" className={inputClass} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-[#0F1E3A] uppercase tracking-wide mb-1.5">Your Market *</label>
          <input name="city" required placeholder="Austin, TX" className={inputClass} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#0F1E3A] uppercase tracking-wide mb-1.5">Website *</label>
          <input name="website" type="text" placeholder="yoursite.com" className={inputClass} />
        </div>
      </div>
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <button type="submit" disabled={loading} className={`w-full ${CTA_BTN} text-center`}>
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Checking your market...
          </span>
        ) : (
          "Find Out If My Market Is Available →"
        )}
      </button>
      <div className="flex items-center justify-center gap-6 flex-wrap pt-1">
        {["Free. No credit card.", "30-min strategy call.", "Market confirmed live."].map((item) => (
          <span key={item} className="flex items-center gap-1.5 text-xs text-[#6B7FA0]">
            <span className="text-green-500 font-bold">✓</span>{item}
          </span>
        ))}
      </div>
    </form>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
// Section order — strict alternating NAVY / LIGHT PURPLE:
//  1. HERO              — NAVY
//  2. THE SHIFT         — LIGHT PURPLE
//  3. WHAT IS GEO       — NAVY
//  4. HOW IT WORKS      — LIGHT PURPLE
//  5. PROOF             — NAVY
//  6. DASHBOARDS        — LIGHT PURPLE
//  7. TESTIMONIALS      — NAVY
//  8. PROOF MAP         — LIGHT PURPLE
//  9. WHAT'S INCLUDED   — NAVY
// 10. FOUNDER           — LIGHT PURPLE
// 11. ONE AGENT         — NAVY
// 12. FAQ               — LIGHT PURPLE
// 13. FORM              — NAVY
//     FOOTER            — DARK NAVY

import SocialIconRow from "./SocialIconRow";
import type { SocialUrls } from "../../lib/social-config";

interface AffiliateOverrides {
  funnelTag?: string;
  scheduleRoute?: string;
  socialUrls?: SocialUrls;
}

export default function LandingPage({ overrides }: { overrides?: AffiliateOverrides }) {
  return (
    <main className="min-h-screen font-sans">

      <Ticker />

      {/* ── 1. HERO — NAVY ────────────────────────────────────────────────── */}
      <section className="bg-[#0F1E3A] py-12 md:py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white rounded-full px-4 py-1.5 mb-6 md:mb-8">
            <span className="w-2 h-2 rounded-full bg-[#E8185C] animate-pulse" />
            <span className="text-[#0F1E3A] text-xs font-bold uppercase tracking-widest">Only 1 Agent Per Market</span>
          </div>
          <div className="mb-3 md:mb-4 -mx-6 md:mx-0 md:px-6">
            {/* Mobile image */}
            <Image
              src="/hero-headline-mobile.png"
              alt="The AI Marketing Engine That Makes you the Hyper-Local Authority in Your City."
              width={750}
              height={500}
              className="w-full h-auto block mx-auto md:hidden"
              priority
            />
            {/* Desktop image */}
            <Image
              src="/hero-headline.png"
              alt="The AI Marketing Engine That Makes you the Hyper-Local Authority in Your City."
              width={1814}
              height={558}
              className="w-full h-auto hidden md:block mx-auto"
              priority
            />
          </div>
          <p className="text-[#9BACC0] text-sm md:text-xl leading-relaxed mb-12 max-w-2xl mx-auto px-6 md:px-0">
            GEO builds your hyper-local AI authority so when buyers in your city ask ChatGPT, Perplexity, or Google AI who to call, you are the only name that comes up.
          </p>
          {/* Stats — white cards on navy */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
            {[
              { stat: "4 in 5", label: "Buyers now use AI to find agents" },
              { stat: "30 days", label: "To your first AI-referred lead" },
              { stat: "500+", label: "Agents in our coaching network" },
              { stat: "1 spot", label: "Per market · ever" },
            ].map((s) => (
              <div key={s.stat} className="bg-white rounded-2xl p-5">
                <p className="text-3xl font-extrabold text-[#0F1E3A] mb-1">{s.stat}</p>
                <p className="text-[#4A5E7A] text-xs leading-tight">{s.label}</p>
              </div>
            ))}
          </div>
          <a href="#claim-form" className={CTA_BTN}>Find Out If My Market Is Available →</a>
          <p className="text-[#6B7FA0] text-xs mt-3">Free. No credit card. 30 seconds.</p>
          <div className="mt-16">
            <p className="text-[#6B7FA0] text-xs uppercase tracking-widest mb-5">This is what day 34 looks like</p>
            <Image src="/proof-8.jpg" alt="Agent texts Misti after first ChatGPT referral" width={600} height={400} className="w-full max-w-md h-auto block rounded-2xl drop-shadow-xl mx-auto" />
          </div>
        </div>
      </section>

      {/* ── 2. THE SHIFT — LIGHT PURPLE ───────────────────────────────────── */}
      <section className="bg-[#EDF0FA] px-6 py-12 md:py-20">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-[#E8185C] text-xs font-bold uppercase tracking-widest mb-3">The Shift</p>
          <h2 className="text-3xl md:text-5xl font-extrabold text-[#0F1E3A] mb-6 leading-tight">
            Your Buyers Changed How They Search.{" "}
            <span className="text-[#E8185C]">Did Your Marketing?</span>
          </h2>
          <p className="text-[#4A5E7A] text-lg leading-relaxed mb-12 max-w-2xl mx-auto">
            Buyers used to Google "best realtor near me." Now they ask ChatGPT. They ask Perplexity. They ask Apple Intelligence. AI does not show them your Zillow reviews or your Instagram grid. It recommends the agent it has been trained to trust as the authority in that market.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-left">
            <div className="bg-white rounded-2xl p-7">
              <p className="text-red-500 font-bold text-sm uppercase tracking-wide mb-5">The Old Way</p>
              {[
                "Post 3x a week and pray for engagement",
                "Pay Zillow for leads who shop 12 other agents",
                "Cold call expired listings and get hung up on",
                "Run Google ads that buyers scroll past",
                "Chase leads who ghost you after one text",
              ].map((item) => (
                <div key={item} className="flex items-start gap-3 mb-3">
                  <span className="text-red-400 font-bold shrink-0 mt-0.5">✕</span>
                  <span className="text-[#4A5E7A] text-sm">{item}</span>
                </div>
              ))}
            </div>
            <div className="bg-white rounded-2xl p-7">
              <p className="text-green-600 font-bold text-sm uppercase tracking-wide mb-5">The GEO Way</p>
              {[
                "AI recommends you when buyers search your city",
                "Leads call you · you don't chase them",
                "Own your market before a competitor does",
                "Content published for you every single week",
                "Done entirely for you. Zero posting required.",
              ].map((item) => (
                <div key={item} className="flex items-start gap-3 mb-3">
                  <span className="text-green-500 font-bold shrink-0 mt-0.5">✓</span>
                  <span className="text-[#0F1E3A] text-sm font-medium">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. WHAT IS GEO — NAVY ─────────────────────────────────────────── */}
      <section className="bg-[#0F1E3A] px-6 py-12 md:py-20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-[#E8185C] text-xs font-bold uppercase tracking-widest mb-3">What Is GEO</p>
            <h2 className="text-2xl md:text-4xl lg:text-5xl font-extrabold text-white mb-5 leading-tight">
              GEO Stands for Generative Engine Optimization.
            </h2>
            <p className="text-[#9BACC0] text-base md:text-xl max-w-2xl mx-auto">
              Just like SEO taught Google to recommend your website, GEO teaches AI to recommend you as the expert in your market.
            </p>
          </div>
          {/* White cards on navy */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              { icon: "🤖", title: "AI Visibility", desc: "We build the exact signals that make ChatGPT, Perplexity, Google AI, and Apple Intelligence cite you as the top agent in your market." },
              { icon: "✍️", title: "Done-For-You Content", desc: "Two blogs a week, 28 social posts a month, a weekly newsletter. Written in your voice, published by us, zero effort from you." },
              { icon: "🗺️", title: "Local Authority", desc: "Google Business Profile, local citations, and authority signals so both AI and humans recognize you as the dominant local expert." },
            ].map((item) => (
              <div key={item.title} className="bg-white rounded-2xl p-7">
                <div className="text-3xl mb-4">{item.icon}</div>
                <h3 className="text-[#0F1E3A] font-bold text-lg mb-2">{item.title}</h3>
                <p className="text-[#4A5E7A] text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 4. HOW IT WORKS — LIGHT PURPLE ───────────────────────────────── */}
      <section className="bg-[#EDF0FA] px-6 py-12 md:py-20">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-[#E8185C] text-xs font-bold uppercase tracking-widest mb-3">How It Works</p>
          <h2 className="text-3xl md:text-4xl font-extrabold text-[#0F1E3A] mb-4">Three Steps. One Market. You Win.</h2>
          <p className="text-[#4A5E7A] text-lg mb-14">GEO runs in the background. You stay focused on clients.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-12">
            {[
              { step: "01", title: "Claim Your Market", desc: "Check if your market is available on the strategy call. First agent to move claims it permanently. Your competitors lose access the moment you do." },
              { step: "02", title: "We Build Your Presence", desc: "We publish content, optimize your profiles, and build your authority across every platform. All done for you. No effort required." },
              { step: "03", title: "Buyers Find You", desc: "Your name shows up everywhere buyers look. They find you, they trust you before they call, and they arrive ready to move." },
            ].map((s) => (
              <div key={s.step} className="bg-white rounded-2xl p-8">
                <div className="w-12 h-12 rounded-full bg-[#E8185C] flex items-center justify-center text-white font-extrabold text-sm mb-5 mx-auto">{s.step}</div>
                <h3 className="text-[#0F1E3A] font-bold text-lg mb-3">{s.title}</h3>
                <p className="text-[#4A5E7A] text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
          <a href="#claim-form" className={CTA_BTN}>Check If My Market Is Available →</a>
        </div>
      </section>

      {/* ── 5. PROOF — NAVY ──────────────────────────────────────────────── */}
      <section className="bg-[#0F1E3A] px-6 py-12 md:py-20">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-[#E8185C] text-xs font-bold uppercase tracking-widest mb-3">Real Results. Real Agents.</p>
            <h2 className="text-3xl md:text-4xl font-extrabold text-white">This Is What Success Looks Like.</h2>
            <p className="text-[#9BACC0] mt-3 text-lg">Visibility increasing. Dashboards climbing.</p>
          </div>
          {/* Row 1: wide map + score — white cards on navy */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5 items-start">
            <div className="bg-white rounded-2xl p-3 md:col-span-2">
              <Image src="/proof-7.jpg" alt="Map rankings before and after GEO" width={800} height={480} className="w-full h-auto block rounded-xl" />
            </div>
            <div className="bg-white rounded-2xl p-3">
              <Image src="/proof-6.jpg" alt="AI Visibility Score dashboard" width={500} height={480} className="w-full h-auto block rounded-xl" />
            </div>
          </div>
          {/* Row 2: DM screenshots — white cards on navy */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-12 items-start">
            {["/proof-1.jpg", "/proof-2.jpg", "/proof-10.jpg"].map((src, i) => (
              <div key={i} className="bg-white rounded-2xl p-3">
                <Image src={src} alt="Inbound buyer message" width={400} height={500} className="w-full h-auto block rounded-xl" />
              </div>
            ))}
          </div>
          <div className="text-center">
            <a href="#claim-form" className={CTA_BTN}>This Could Be My Market →</a>
          </div>
        </div>
      </section>

      {/* ── 6. DASHBOARDS — LIGHT PURPLE ────────────────────────────────── */}
      <section className="bg-[#EDF0FA] px-6 py-12 md:py-20">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-[#E8185C] text-xs font-bold uppercase tracking-widest mb-3">Full Transparency. Full Control.</p>
            <h2 className="text-3xl md:text-4xl font-extrabold text-[#0F1E3A] mb-4">You See Everything. Every Month.</h2>
            <p className="text-[#4A5E7A] text-lg max-w-2xl mx-auto">Your score. Your competitor rankings. Your content performance. All in one dashboard you can check in 60 seconds.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              { label: "AI Visibility Score", src: "/proof-6.jpg", caption: "Score climbs every month as authority builds" },
              { label: "Full Visibility Report", src: "/proof-9.jpg", caption: "See exactly how you rank vs every competitor" },
              { label: "Content Score", src: "/proof-5.jpg", caption: "Nothing publishes below 90. Most hit 97+" },
            ].map((d) => (
              <div key={d.label} className="bg-white rounded-2xl p-4">
                <p className="text-[#E8185C] text-[10px] font-bold uppercase tracking-widest mb-3 text-center">{d.label}</p>
                <Image src={d.src} alt={d.label} width={600} height={500} className="w-full h-auto block rounded-xl" />
                <p className="text-[#0F1E3A] text-xs font-semibold text-center mt-3">{d.caption}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 7. TESTIMONIALS — NAVY ───────────────────────────────────────── */}
      <section className="bg-[#0F1E3A] px-6 py-12 md:py-20">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-[#E8185C] text-xs font-bold uppercase tracking-widest mb-3">Real Agents. Real Results.</p>
            <h2 className="text-3xl md:text-4xl font-extrabold text-white">This Is What Success Looks Like.</h2>
            <p className="text-[#9BACC0] mt-3">Buyers finding them online. Calls coming in from Google. Showing up everywhere in their market.</p>
          </div>
          {/* White quote cards on navy */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-14">
            {QUOTES.map((q, i) => (
              <div key={i} className="bg-white rounded-2xl p-6">
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, j) => <span key={j} className="text-amber-400 text-sm">★</span>)}
                </div>
                <p className="text-[#0F1E3A] text-base font-medium mb-5 leading-snug">&ldquo;{q.quote}&rdquo;</p>
                <div className="flex items-center gap-3 border-t border-gray-100 pt-4">
                  <div className="w-9 h-9 rounded-full bg-[#0F1E3A] flex items-center justify-center text-white font-bold text-xs shrink-0">
                    {q.name.split(" ").map(n => n[0]).join("")}
                  </div>
                  <div>
                    <p className="font-semibold text-[#0F1E3A] text-sm">{q.name}</p>
                    <p className="text-[#9BACC0] text-xs">Real Estate Agent · {q.location.split(", ")[1]}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mb-6">
            <p className="text-[#9BACC0] text-xs uppercase tracking-widest">Inbound buyer messages.</p>
          </div>
          <div className="grid grid-cols-2 gap-5 max-w-xl mx-auto mb-12">
            {["/proof-3.jpg", "/proof-4.jpg"].map((src, i) => (
              <div key={i} className="bg-white rounded-2xl p-3">
                <Image src={src} alt="Inbound buyer message" width={500} height={600} className="w-full h-auto block rounded-xl" />
              </div>
            ))}
          </div>
          <p className="text-[#6B7FA0] text-xs text-center max-w-2xl mx-auto leading-relaxed">
            GEO is a visibility company. We position you as the authority in your market. We do not guarantee leads, calls, or specific outcomes. Results shown reflect individual agent experiences and are not typical. Your results will vary based on market, competition, and other factors.
          </p>
        </div>
      </section>

      {/* ── 8. PROOF MAP — LIGHT PURPLE ─────────────────────────────────── */}
      <section className="bg-[#EDF0FA] px-6 py-12 md:py-20">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-[#E8185C] text-xs font-bold uppercase tracking-widest mb-3">Local Market Domination</p>
          <h2 className="text-3xl md:text-4xl font-extrabold text-[#0F1E3A] mb-4">This is what owning your market looks like.</h2>
          <p className="text-[#4A5E7A] text-lg mb-10">From invisible to owning the entire grid. In 60 days.</p>
          <Image src="/proof-map.jpg" alt="Local market rankings map" width={900} height={600} className="w-full max-w-2xl h-auto block rounded-2xl drop-shadow-xl mx-auto" />
          <p className="text-[#4A5E7A] text-sm mt-5">Every green dot = #1 ranking. One agent owns this entire market.</p>
        </div>
      </section>

      {/* ── 9. WHAT'S INCLUDED — NAVY ────────────────────────────────────── */}
      <section className="bg-[#0F1E3A] px-6 py-12 md:py-20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-[#E8185C] text-xs font-bold uppercase tracking-widest mb-3">Everything Included. Nothing Left Out.</p>
            <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-3">One system. Total domination. Zero effort on your part.</h2>
            <p className="text-[#9BACC0]">GEO installs and runs everything listed below. You approve content in 30 seconds a week.</p>
          </div>
          {/* White cards on navy */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              { icon: "🤖", title: "AI Recommendation Engine", desc: "We build the exact signals that make ChatGPT, Perplexity, Google AI, and Apple Intelligence name you when buyers ask." },
              { icon: "📍", title: "Local Search Domination", desc: "Google Business Profile, Maps rankings, and local citations locked in so you own your city across every platform." },
              { icon: "✍️", title: "Done-for-You Content", desc: "Two blogs a week, 28 social posts a month, a weekly newsletter. Written in your voice, published by us." },
              { icon: "🧠", title: "Your AI Identity", desc: "A custom AI profile built around your voice, market, and expertise so every AI tool describes you accurately." },
              { icon: "📧", title: "Lead Capture and Nurture", desc: "Automated systems that turn AI visibility into booked appointments. Leads come in and get followed up automatically." },
              { icon: "🎯", title: "Retargeting Campaigns", desc: "Meta campaigns that re-engage warm audiences. 30 days of content softens them. The retarget closes them." },
            ].map((item, i) => (
              <div key={i} className="bg-white rounded-xl p-6">
                <span className="text-2xl mb-3 block">{item.icon}</span>
                <h3 className="font-bold text-[#0F1E3A] mb-2">{item.title}</h3>
                <p className="text-[#6B7FA0] text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 10. FOUNDER — LIGHT PURPLE ──────────────────────────────────── */}
      <section className="bg-[#EDF0FA] pt-12 md:pt-20 pb-0 overflow-hidden">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-8 md:gap-10 md:items-end">
            <div className="md:col-span-2 md:pb-20">
              <p className="text-[#E8185C] text-xs font-bold uppercase tracking-widest mb-4">The Founder</p>
              <h2 className="text-2xl md:text-3xl font-extrabold text-[#0F1E3A] mb-4">
                Built by an agent who understands what it takes to win local market authority.
              </h2>
              <p className="text-[#4A5E7A] text-sm md:text-base leading-relaxed mb-6">
                Misti Bruton spent years building one of the top real estate teams in the country. No cold calling, door knocking, or dancing on social media. She cracked the code on becoming the agent buyers find, rather than the agent who chases them. GEO is that system, available to one agent per market.
              </p>
              <div className="grid grid-cols-3 gap-3 mb-6">
                {[
                  { stat: "500+", label: "Agents coached" },
                  { stat: "$1B+", label: "In real estate sold" },
                  { stat: "Top 1%", label: "Teams nationwide" },
                ].map((c) => (
                  <div key={c.stat} className="bg-white rounded-xl p-3 md:p-4 text-center">
                    <p className="text-[#0F1E3A] text-xl md:text-2xl font-extrabold">{c.stat}</p>
                    <p className="text-[#4A5E7A] text-[10px] md:text-xs mt-1">{c.label}</p>
                  </div>
                ))}
              </div>
              <a href="#claim-form" className={CTA_BTN}>Claim Your Market →</a>
            </div>
            <div className="md:col-span-3 flex justify-end mt-8 md:mt-0">
              <Image src="/founder.png" alt="Misti Bruton, founder of GEO by HeyPearl" width={1100} height={1400} className="w-full max-h-[480px] md:max-h-none object-contain object-bottom md:object-auto h-auto block drop-shadow-2xl" />
            </div>
          </div>
        </div>
      </section>

      {/* ── 11. ONE AGENT PER MARKET — NAVY ─────────────────────────────── */}
      <section className="bg-[#0F1E3A] px-6 py-12 md:py-20">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-[#E8185C] text-xs font-bold uppercase tracking-widest mb-4">The Rule That Changes Everything</p>
          <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-6 leading-tight">
            One Agent Per Market.<br />No Exceptions.
          </h2>
          <p className="text-[#9BACC0] text-base md:text-xl leading-relaxed mb-8">
            GEO builds your AI presence as the dominant local authority. If we ran it for multiple agents in the same city, it wouldn't make sense. So we don't. One market, one agent.
          </p>
          {/* White card on navy */}
          <div className="bg-white rounded-2xl p-7 mb-8">
            <p className="text-[#0F1E3A] text-lg font-semibold leading-snug">
              The moment another agent in your city books their strategy call and moves forward, your market closes. Not temporarily. Permanently.
            </p>
          </div>
          <p className="text-[#9BACC0] mb-8">
            Every week, agents across the country claim their markets. Your city might still be open. It might close today. The only way to know is to check right now.
          </p>
          <a href="#claim-form" className={CTA_BTN}>Check If My Market Is Available →</a>
        </div>
      </section>

      {/* ── 12. FAQ — LIGHT PURPLE ───────────────────────────────────────── */}
      <section className="bg-[#EDF0FA] px-6 py-12 md:py-20">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-[#E8185C] text-xs font-bold uppercase tracking-widest mb-3">Questions</p>
            <h2 className="text-3xl font-extrabold text-[#0F1E3A]">Everything You Need to Know</h2>
          </div>
          {/* White accordion cards on light purple */}
          <div className="space-y-3">
            {FAQS.map((faq) => (
              <FAQItem key={faq.q} q={faq.q} a={faq.a} />
            ))}
          </div>
        </div>
      </section>

      {/* ── 13. FORM — NAVY ─────────────────────────────────────────────── */}
      <section id="claim-form" className="bg-[#0F1E3A] px-6 py-12 md:py-20">
        <div className="max-w-xl mx-auto">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 bg-white rounded-full px-4 py-1.5 mb-5">
              <span className="w-2 h-2 rounded-full bg-[#E8185C] animate-pulse" />
              <span className="text-[#0F1E3A] text-xs font-bold uppercase tracking-widest">Markets Filling Up</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-3">Is Your Market Still Available?</h2>
            <p className="text-[#9BACC0] text-base">Fill out the form. We'll confirm availability on your free 30-minute strategy call.</p>
          </div>
          {/* White form card on navy */}
          <div className="bg-white rounded-3xl p-5 md:p-8 shadow-2xl shadow-black/30">
            <ClaimForm
              scheduleRoute={overrides?.scheduleRoute}
              affiliateTag={overrides?.funnelTag}
            />
          </div>
          <div className="flex flex-wrap items-center justify-center gap-5 mt-8 text-sm text-[#9BACC0]">
            {["Free strategy call", "No obligation", "Market confirmed live", "3 free AI marketing assets"].map((item) => (
              <span key={item} className="flex items-center gap-1.5"><span className="text-green-400 font-bold">✓</span> {item}</span>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-white border-t border-gray-100 px-6 py-10">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <Image src="/geo-logo-nav.png" alt="GEO by HeyPearl" width={100} height={42} />
            <p className="text-[#6B7FA0] text-xs mt-2">The World's First AI Marketing Engine for Real Estate Agents</p>
          </div>
          <div className="flex gap-6 text-xs text-[#6B7FA0]">
            <Link href="/privacy" className="hover:text-[#0F1E3A] transition-colors">Privacy Policy</Link>
            <Link href={overrides?.funnelTag ? `/audit?affiliateSlug=${encodeURIComponent(overrides.funnelTag)}` : "/audit"} className="hover:text-[#0F1E3A] transition-colors">Free AI Score</Link>
          </div>
          <p className="text-[#6B7FA0] text-xs">&copy; {new Date().getFullYear()} GEO by HeyPearl</p>
        </div>
        <SocialIconRow urls={overrides?.socialUrls} />
      </footer>

      <FomoPopup />

      {/* MOBILE STICKY CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-[#0F1E3A]/95 backdrop-blur-sm px-5 py-2.5 flex items-center justify-center">
        <a href="#claim-form" className={STICKY_BTN}>
          Check My Market →
        </a>
      </div>

    </main>
  );
}
