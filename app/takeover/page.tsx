"use client";

import { useState, useEffect } from "react";

const NOTIFICATIONS = [
  { name: "Sarah M.", city: "Austin, TX" },
  { name: "James R.", city: "Nashville, TN" },
  { name: "Kayla T.", city: "Phoenix, AZ" },
  { name: "Derek L.", city: "Denver, CO" },
  { name: "Amanda W.", city: "Charlotte, NC" },
  { name: "Brian S.", city: "Atlanta, GA" },
  { name: "Nicole P.", city: "Dallas, TX" },
  { name: "Marcus H.", city: "Tampa, FL" },
  { name: "Rachel B.", city: "Seattle, WA" },
  { name: "Chris V.", city: "San Diego, CA" },
  { name: "Tiffany K.", city: "Chicago, IL" },
  { name: "Jordan E.", city: "Orlando, FL" },
];

const DAYS = [
  { day: "Day 1", title: "The AI Threat", teaser: "What's already happening in your market right now." },
  { day: "Day 2", title: "The 3 Tools", teaser: "Run your entire business for less than a cup of coffee." },
  { day: "Day 3", title: "Content on Autopilot", teaser: "A full week of hyper-local posts in 20 minutes." },
  { day: "Day 4", title: "Recruiting While You Sleep", teaser: "The system that finds agents before you ask." },
  { day: "Day 5", title: "Your 30-Day Blueprint", teaser: "Everything revealed. Live Q&A. Your city on the board." },
];

function SocialProofPopup() {
  const [current, setCurrent] = useState<number | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const show = (index: number) => {
      setCurrent(index);
      setVisible(true);
      setTimeout(() => setVisible(false), 4000);
    };
    const first = setTimeout(() => show(Math.floor(Math.random() * NOTIFICATIONS.length)), 4000);
    let idx = 1;
    const interval = setInterval(() => { show((idx++) % NOTIFICATIONS.length); }, 9000);
    return () => { clearTimeout(first); clearInterval(interval); };
  }, []);

  if (current === null) return null;
  const n = NOTIFICATIONS[current];

  return (
    <div
      className={`fixed bottom-6 left-6 z-50 transition-all duration-500 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"}`}
      style={{ maxWidth: "calc(100vw - 48px)" }}
    >
      <div className="bg-white rounded-xl shadow-xl border border-[#0F1E3A]/8 px-4 py-3 flex items-center gap-3 w-[260px]">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#E8185C] to-[#162B4C] flex items-center justify-center shrink-0">
          <span className="text-white text-[10px] font-bold">{n.name.split(" ").map(w => w[0]).join("")}</span>
        </div>
        <div>
          <p className="text-[#0F1E3A] text-xs font-semibold leading-tight">{n.name} from {n.city}</p>
          <p className="text-[#6B7FA0] text-[11px] leading-tight mt-0.5">just claimed their spot</p>
        </div>
      </div>
    </div>
  );
}

export default function TakeoverPage() {
  const [form, setForm] = useState({ firstName: "", email: "", phone: "", city: "", yearsInRE: "" });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const inputClass = "w-full bg-[#F7F8FC] border border-[#0F1E3A]/12 rounded-xl px-3 py-3 text-[#0F1E3A] placeholder-[#9BACC0] focus:outline-none focus:border-[#E8185C] focus:bg-white transition-colors text-[16px]";
  const labelClass = "block text-xs font-semibold text-[#0F1E3A] uppercase tracking-wide mb-1.5";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.firstName || !form.email || !form.city) {
      setError("Please fill in all required fields.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/challenge-optin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed");
      setDone(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#0F1E3A] text-white font-sans overflow-x-hidden">
      <SocialProofPopup />

      {/* Urgency bar */}
      <div className="bg-[#E8185C] text-white text-center text-sm font-semibold py-2.5 px-4">
        SPOTS FILLING FAST — Only a handful of markets still available
      </div>

      <div className="max-w-2xl mx-auto px-4 py-12 md:py-16">

        {/* Badge */}
        <div className="flex justify-center mb-6">
          <span className="bg-[#FACC15]/10 border border-[#FACC15]/30 text-[#FACC15] text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full">
            Free 5-Day Live Training for Realtors
          </span>
        </div>

        {/* Headline */}
        <h1 className="text-4xl md:text-5xl font-black text-center leading-tight mb-4">
          The AI Agent<br />
          <span className="text-[#E8185C]">Takeover</span>
        </h1>

        <p className="text-[#9BACC0] text-center text-lg md:text-xl leading-relaxed mb-3">
          5 days. Your entire real estate business on autopilot.<br />
          One agent per city gets this. Is yours still open?
        </p>

        <p className="text-[#FACC15] text-center text-sm font-semibold mb-10">
          Starting Soon &nbsp;•&nbsp; Limited Spots
        </p>

        {/* Registration card */}
        <div className="bg-white rounded-2xl shadow-2xl p-6 md:p-8 mb-10">
          {done ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 rounded-full bg-[#E8185C]/10 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-[#E8185C]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-[#0F1E3A] text-2xl font-black mb-2">You&apos;re in.</h2>
              <p className="text-[#6B7FA0] text-sm leading-relaxed">
                Check your inbox. Details on your city&apos;s spot are coming soon.<br />
                Don&apos;t let another agent in your market get there first.
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 bg-[#FFF7ED] border border-orange-200 rounded-xl px-3 py-2 mb-5">
                <span className="text-orange-500 text-sm">⚡</span>
                <p className="text-orange-700 text-xs font-medium">We only accept 1 agent per city. Claim yours before someone else does.</p>
              </div>

              <h2 className="text-[#0F1E3A] text-xl font-black mb-1">Claim Your Spot</h2>
              <p className="text-[#6B7FA0] text-sm mb-5">Free. 5 days. Your market. Let&apos;s go.</p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>First Name *</label>
                    <input className={inputClass} placeholder="Sarah" value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} />
                  </div>
                  <div>
                    <label className={labelClass}>Your City *</label>
                    <input className={inputClass} placeholder="Nashville, TN" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Email Address *</label>
                  <input type="email" className={inputClass} placeholder="sarah@realty.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                </div>

                <div>
                  <label className={labelClass}>Cell Phone</label>
                  <input type="tel" className={inputClass} placeholder="(615) 555-0100" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                </div>

                <div>
                  <label className={labelClass}>Years in Real Estate</label>
                  <select className={inputClass} value={form.yearsInRE} onChange={e => setForm(f => ({ ...f, yearsInRE: e.target.value }))}>
                    <option value="">Select...</option>
                    <option value="under-1">Less than 1 year</option>
                    <option value="1-3">1 to 3 years</option>
                    <option value="3-10">3 to 10 years</option>
                    <option value="10-20">10 to 20 years</option>
                    <option value="20+">20+ years</option>
                  </select>
                </div>

                {error && <p className="text-[#E8185C] text-sm font-medium">{error}</p>}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#E8185C] hover:bg-[#c4134d] disabled:opacity-60 text-white font-black text-base py-4 rounded-xl transition-all duration-200 shadow-lg shadow-[#E8185C]/30 mt-2"
                >
                  {loading ? "Claiming your spot..." : "Claim My Spot — It's Free"}
                </button>

                <p className="text-[#9BACC0] text-xs text-center">No spam. No pitch. Just 5 days that could change everything.</p>
              </form>
            </>
          )}
        </div>

        {/* 5-day preview */}
        <div className="mb-10">
          <h2 className="text-white text-xl font-black text-center mb-2">What&apos;s Inside</h2>
          <p className="text-[#6B7FA0] text-sm text-center mb-6">5 live sessions. Real tactics. No fluff.</p>
          <div className="space-y-3">
            {DAYS.map((d, i) => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-xl px-5 py-4 flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-[#E8185C]/10 border border-[#E8185C]/20 flex flex-col items-center justify-center shrink-0">
                  <span className="text-[#E8185C] text-[9px] font-bold uppercase tracking-wide">{d.day.split(" ")[0]}</span>
                  <span className="text-[#E8185C] text-lg font-black leading-none">{d.day.split(" ")[1]}</span>
                </div>
                <div>
                  <p className="text-white font-bold text-sm">{d.title}</p>
                  <p className="text-[#6B7FA0] text-sm mt-0.5">{d.teaser}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* About Misti */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
          <p className="text-[#9BACC0] text-xs uppercase tracking-widest mb-3">Your Host</p>
          <p className="text-white font-black text-lg mb-1">Misti Bruton</p>
          <p className="text-[#6B7FA0] text-sm leading-relaxed">
            30+ years in real estate. Published author. Now running AI marketing systems for agents across the country — one city at a time.
          </p>
        </div>

      </div>
    </main>
  );
}
