"use client";

import { useState, useEffect } from "react";
import V2FormComponent from "@/app/components/V2Form";

const CTA_BTN =
  "inline-block bg-[#16A34A] hover:bg-[#15803d] text-white font-bold text-base md:text-lg px-6 md:px-8 py-3 md:py-4 rounded-xl transition-all duration-200 shadow-lg shadow-[#16A34A]/25 cursor-pointer";

const POPUPS = [
  { name: "Jennifer R.", city: "Cherry Creek, CO" },
  { name: "Marcus T.", city: "Brickell, FL" },
  { name: "Ashley M.", city: "The Woodlands, TX" },
  { name: "Derek W.", city: "Old Town Scottsdale, AZ" },
  { name: "Kayla B.", city: "Green Hills, TN" },
  { name: "Ryan H.", city: "South End, NC" },
  { name: "Tina L.", city: "Pacific Palisades, CA" },
];

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
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#16A34A] to-[#162B4C] flex items-center justify-center shrink-0">
          <span className="text-white text-[10px] font-bold">{p.name.split(" ").map((w: string) => w[0]).join("")}</span>
        </div>
        <div>
          <p className="text-[#0F1E3A] text-xs font-semibold leading-tight">{p.name}</p>
          <p className="text-[#6B7FA0] text-[11px] leading-tight mt-0.5">{p.city} · just claimed their listing market</p>
        </div>
      </div>
    </div>
  );
}

export default function V2LandingPage({ affiliateTag, scheduleRoute }: { affiliateTag?: string; scheduleRoute?: string }) {
  return (
    <main className="min-h-screen font-sans">

      {/* ── 1. HERO — NAVY ──────────────────────────────────────────────── */}
      <section className="bg-[#0F1E3A] py-12 md:py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">

          <div className="inline-flex items-center gap-2 bg-white rounded-full px-4 py-1.5 mb-6 md:mb-8">
            <span className="w-2 h-2 rounded-full bg-[#16A34A] animate-pulse" />
            <span className="text-[#0F1E3A] text-xs font-bold uppercase tracking-widest">Only 1 Listing Market Per City · Ever</span>
          </div>

          <h1 className="text-3xl md:text-5xl font-extrabold text-white leading-[1.15] mb-6 max-w-3xl mx-auto">
            The Appointment-Setting Machine That Fills Your Calendar With{" "}
            <span className="text-[#16A34A]">Ready-To-List Sellers.</span>
          </h1>

          <p className="text-[#9BACC0] text-base md:text-xl leading-relaxed mb-10 max-w-2xl mx-auto">
            While you&apos;re showing homes and closing deals, we&apos;re building your pipeline. You do what you do best. We handle the rest.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
            {[
              { stat: "Done For You", label: "We run it. You close." },
              { stat: "Zero", label: "Cold calls. Ever." },
              { stat: "Sellers Only", label: "Listing appointments. Not buyers." },
              { stat: "1 Spot", label: "Per market · ever" },
            ].map((s) => (
              <div key={s.stat} className="bg-white rounded-2xl p-5">
                <p className="text-xl md:text-2xl font-extrabold text-[#0F1E3A] mb-1">{s.stat}</p>
                <p className="text-[#4A5E7A] text-xs leading-tight">{s.label}</p>
              </div>
            ))}
          </div>

          <a href="#claim-form" className={CTA_BTN}>Find Out If My Market Is Available →</a>
          <p className="text-[#6B7FA0] text-xs mt-3">Free. No credit card. 30 seconds.</p>

          <div className="mt-16 max-w-md mx-auto">
            <p className="text-[#6B7FA0] text-xs uppercase tracking-widest mb-5">Real results from the system</p>
            <img
              src="/v2proof.jpg"
              alt="Listing appointments dashboard showing confirmed bookings"
              className="w-full rounded-2xl shadow-2xl shadow-black/40"
            />
          </div>

        </div>
      </section>

      {/* ── 2. THE PROBLEM — LIGHT PURPLE ───────────────────────────────── */}
      <section className="bg-[#F7F8FC] px-6 py-12 md:py-20">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-[#16A34A] text-xs font-bold uppercase tracking-widest mb-3">The Old Way vs The New Way</p>
          <h2 className="text-3xl md:text-5xl font-extrabold text-[#0F1E3A] mb-6 leading-tight">
            Your Competitors Are Working Harder.{" "}
            <span className="text-[#16A34A]">You&apos;re About to Work Smarter.</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-left mt-10">
            <div className="bg-white rounded-2xl p-7">
              <p className="text-red-500 font-bold text-sm uppercase tracking-wide mb-5">The Old Way</p>
              {[
                "Cold call expired listings and get hung up on",
                "Pay for Zillow leads who interview 6 other agents",
                "Door knock neighborhoods on your day off",
                "Chase seller leads who ghost you after one text",
                "Burn out trying to fill your own listing pipeline",
              ].map((item) => (
                <div key={item} className="flex items-start gap-3 mb-3">
                  <span className="text-red-400 font-bold shrink-0 mt-0.5">✕</span>
                  <span className="text-[#4A5E7A] text-sm">{item}</span>
                </div>
              ))}
            </div>
            <div className="bg-[#0F1E3A] rounded-2xl p-7">
              <p className="text-[#16A34A] font-bold text-sm uppercase tracking-wide mb-5">The GEO V2 Way</p>
              {[
                "Wake up to a listing appointment already on your calendar",
                "Talk to sellers who came to you — not 6 other agents",
                "Spend your weekends closing, not prospecting",
                "Have sellers who are warmed up and ready to list",
                "Let the system run while you focus on what you do best",
              ].map((item) => (
                <div key={item} className="flex items-start gap-3 mb-3">
                  <span className="text-green-400 font-bold shrink-0 mt-0.5">✓</span>
                  <span className="text-white/80 text-sm">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. HOW IT WORKS — NAVY ──────────────────────────────────────── */}
      <section className="bg-[#0F1E3A] px-6 py-12 md:py-20">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-[#16A34A] text-xs font-bold uppercase tracking-widest mb-3">How It Works</p>
          <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-12 leading-tight">
            Three Steps. Full Calendar.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                num: "01",
                title: "We Build Your System",
                body: "We set up the exact appointment-setting infrastructure we built for our own team. Done for you. Nothing to learn. Nothing to manage.",
              },
              {
                num: "02",
                title: "Sellers Find You",
                body: "Warm, ready-to-list sellers start showing up in your pipeline. No cold outreach on your end. Not one call. Not one door knocked.",
              },
              {
                num: "03",
                title: "You Show Up and Close",
                body: "Your only job is the appointment. We handle everything before it. You do what you do best — win the listing.",
              },
            ].map((step) => (
              <div key={step.num} className="bg-white/8 border border-white/10 rounded-2xl p-7 text-left">
                <p className="text-[#16A34A] text-4xl font-extrabold mb-4">{step.num}</p>
                <p className="text-white font-bold text-lg mb-3">{step.title}</p>
                <p className="text-[#9BACC0] text-sm leading-relaxed">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 4. PROOF — LIGHT PURPLE ─────────────────────────────────────── */}
      <section className="bg-[#F7F8FC] px-6 py-12 md:py-20">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-[#16A34A] text-xs font-bold uppercase tracking-widest mb-3">Real Results</p>
          <h2 className="text-3xl md:text-5xl font-extrabold text-[#0F1E3A] mb-12 leading-tight">
            Listing Appointments. Not Promises.
          </h2>

          <div className="w-full max-w-xl mx-auto mb-10 rounded-2xl overflow-hidden shadow-xl">
            <video
              src="/v2proofvideo.mp4"
              controls
              playsInline
              className="w-full"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-left">
            {[
              {
                quote: "I had three seller appointments in my first two weeks. Didn't make a single cold call. They were already warm when they showed up. First one signed on the spot.",
                name: "Sarah M.",
                location: "Austin, TX",
              },
              {
                quote: "My calendar has more listing appointments on it right now than it did all of last quarter. And I haven't knocked a door or dialed a number. I just show up.",
                name: "Derek L.",
                location: "Newport Beach, CA",
              },
              {
                quote: "A seller called me saying she'd been following my content and was ready to list. Said she didn't want to talk to anyone else. We signed the listing agreement that afternoon.",
                name: "Rachel K.",
                location: "Scottsdale, AZ",
              },
            ].map((t) => (
              <div key={t.name} className="bg-white rounded-2xl p-6 shadow-sm">
                <p className="text-[#4A5E7A] text-sm italic leading-relaxed mb-4">&ldquo;{t.quote}&rdquo;</p>
                <p className="text-[#0F1E3A] text-xs font-bold">{t.name}</p>
                <p className="text-[#9BACC0] text-xs">{t.location}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 5. ONE AGENT — NAVY ─────────────────────────────────────────── */}
      <section className="bg-[#0F1E3A] px-6 py-12 md:py-20">
        <div className="max-w-2xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 mb-6">
            <span className="w-2 h-2 rounded-full bg-[#16A34A] animate-pulse" />
            <span className="text-white text-xs font-bold uppercase tracking-widest">Market Exclusivity</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-6 leading-tight">
            We Only Work With One Agent Per Market. Ever.
          </h2>
          <p className="text-[#9BACC0] text-lg leading-relaxed mb-10">
            We do not split markets. We do not run this for two agents in the same city. The agent who moves first owns their market — and the agents who wait find out their city is already taken.
          </p>
          <a href="#claim-form" className={CTA_BTN}>Find Out If My Market Is Available →</a>
          <p className="text-[#6B7FA0] text-xs mt-3">Free strategy call. Market confirmed live.</p>
        </div>
      </section>

      {/* ── 6. FORM — NAVY ──────────────────────────────────────────────── */}
      <section id="claim-form" className="bg-[#0F1E3A] px-6 pb-16 md:pb-24">
        <div className="max-w-xl mx-auto">
          <div className="bg-white rounded-3xl p-8 md:p-10 shadow-2xl shadow-black/40">
            <div className="mb-6 text-center">
              <div className="inline-flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-full px-3 py-1 mb-4">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-green-700 text-xs font-semibold">Free. Instant. No credit card.</span>
              </div>
              <h2 className="text-[#0F1E3A] text-2xl md:text-3xl font-extrabold mb-2">
                Claim Your Listing Market
              </h2>
              <p className="text-[#6B7FA0] text-sm">One spot per city. Check yours before it&apos;s gone.</p>
            </div>
            <div className="flex items-center gap-2 bg-[#FFF7ED] border border-orange-200 rounded-xl px-3 py-2 mb-6">
              <span className="text-orange-500 text-sm">🔒</span>
              <span className="text-orange-700 text-xs font-semibold">1 listing market per city. Ever.</span>
            </div>
            <V2FormComponent affiliateTag={affiliateTag} scheduleRoute={scheduleRoute} />
          </div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────── */}
      <footer className="bg-[#080F1E] px-6 py-8 text-center">
        <p className="text-[#4A5E7A] text-xs">
          © {new Date().getFullYear()} HeyPearl · GEO V2 ·{" "}
          <a href="/privacy" className="underline hover:text-[#9BACC0]">Privacy Policy</a>
        </p>
      </footer>

      <FomoPopup />
    </main>
  );
}
