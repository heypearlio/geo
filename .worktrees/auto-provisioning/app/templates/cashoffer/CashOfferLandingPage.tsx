// app/templates/cashoffer/CashOfferLandingPage.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { CashOfferFunnelConfig } from "./config.types";

// ─── Meta Pixel ───────────────────────────────────────────────────────────────

function MetaPixelScript({ id }: { id: string }) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const w = window as Window & { fbq?: (...args: unknown[]) => void; _fbq?: unknown };
    if (w.fbq) { w.fbq("init", id); w.fbq("track", "PageView"); return; }
    const script = document.createElement("script");
    script.async = true;
    script.src = "https://connect.facebook.net/en_US/fbevents.js";
    const n: ((...args: unknown[]) => void) & { callMethod?: (...args: unknown[]) => void; queue?: unknown[]; push?: unknown; loaded?: boolean; version?: string } = function (...args: unknown[]) {
      if (n.callMethod) n.callMethod(...args); else n.queue!.push(args);
    };
    n.push = n; n.loaded = true; n.version = "2.0"; n.queue = [];
    w.fbq = n; w._fbq = n;
    script.onload = () => { if (w.fbq) { w.fbq("init", id); w.fbq("track", "PageView"); } };
    document.head.appendChild(script);
  }, [id]);
  return null;
}

// ─── FOMO Popup ───────────────────────────────────────────────────────────────

function FomoPopup({ config }: { config: CashOfferFunnelConfig }) {
  const [current, setCurrent] = useState<number | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const show = (index: number) => {
      setCurrent(index);
      setVisible(true);
      setTimeout(() => setVisible(false), 4500);
    };
    const first = setTimeout(() => show(Math.floor(Math.random() * config.fomoEntries.length)), 6000);
    let idx = 1;
    const interval = setInterval(() => { show((idx++) % config.fomoEntries.length); }, 13000);
    return () => { clearTimeout(first); clearInterval(interval); };
  }, [config.fomoEntries.length]);

  if (current === null) return null;
  const n = config.fomoEntries[current];

  return (
    <div
      className={`fixed bottom-6 left-6 z-50 transition-all duration-500 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"}`}
      style={{ maxWidth: "calc(100vw - 48px)" }}
    >
      <div className="bg-white rounded-xl shadow-xl border border-[#0F1E3A]/10 px-4 py-3 flex items-center gap-3 w-[300px]">
        <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: config.colorPrimary }}>
          <span className="text-[#0F1E3A] text-[10px] font-bold">{n.name.split(" ").map((w: string) => w[0]).join("")}</span>
        </div>
        <div>
          <p className="text-[#0F1E3A] text-xs font-semibold leading-tight">{n.name} · <span className="font-bold">{n.city}</span></p>
          <p className="text-[#6B7FA0] text-[11px] leading-tight mt-0.5">{config.fomoPopupLabel}</p>
        </div>
      </div>
    </div>
  );
}

// ─── FAQ Item ─────────────────────────────────────────────────────────────────

function FaqItem({ q, a, colorNavy, colorPrimary }: { q: string; a: string; colorNavy: string; colorPrimary: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-[#0F1E3A]/10 last:border-0">
      <button className="w-full flex items-center justify-between py-4 text-left gap-4" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span className="font-semibold text-sm leading-snug" style={{ color: colorNavy }}>{q}</span>
        <span className="text-xl font-light shrink-0" style={{ color: colorPrimary }}>{open ? "−" : "+"}</span>
      </button>
      {open && <p className="text-[#4A5E7A] text-sm pb-4 leading-relaxed">{a}</p>}
    </div>
  );
}

// ─── Address Form ─────────────────────────────────────────────────────────────

function AddressForm({
  address,
  setAddress,
  loading,
  onSubmit,
  ctaBtnStyle,
  placeholder = "Enter your home address...",
  label = "Get My Cash Offer →",
}: {
  address: string;
  setAddress: (v: string) => void;
  loading: boolean;
  onSubmit: (e: React.FormEvent) => void;
  ctaBtnStyle: React.CSSProperties;
  placeholder?: string;
  label?: string;
}) {
  return (
    <form onSubmit={onSubmit} className="flex flex-col sm:flex-row gap-3 w-full max-w-xl">
      <input
        type="text"
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        placeholder={placeholder}
        required
        className="flex-1 px-4 py-4 rounded-xl border border-[#0F1E3A]/20 text-[#0F1E3A] text-sm focus:outline-none focus:ring-2 focus:ring-[#0F1E3A]/30"
        style={{ background: "#fff" }}
      />
      <button type="submit" style={{ ...ctaBtnStyle, whiteSpace: "nowrap" }} disabled={loading}>
        {loading ? "One moment..." : label}
      </button>
    </form>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CashOfferLandingPage({ config }: { config: CashOfferFunnelConfig }) {
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const ctaBtnStyle: React.CSSProperties = {
    background: config.colorButton ?? config.colorPrimary,
    color: "#0F1E3A",
    fontWeight: "bold",
    fontSize: "1rem",
    padding: "1rem 2rem",
    borderRadius: "0.75rem",
    cursor: loading ? "not-allowed" : "pointer",
    opacity: loading ? 0.7 : 1,
    border: "none",
    transition: "opacity 0.2s",
  };

  const ctaBtnOnDarkStyle: React.CSSProperties = {
    ...ctaBtnStyle,
    background: config.colorPrimary,
    opacity: loading ? 0.7 : 1,
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!address.trim()) return;
    setLoading(true);
    try {
      await fetch(config.apiOptinRoute, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: address.trim(), slug: config.funnelTag }),
      });
    } catch { /* non-blocking — always redirect */ } finally {
      setLoading(false);
    }
    router.push(`${config.scheduleRoute}?address=${encodeURIComponent(address.trim())}`);
  }

  const [round1, round2] = [config.testimonials.slice(0, 3), config.testimonials.slice(3, 6)];

  return (
    <main className="min-h-screen text-[#0F1E3A] font-sans" style={{ background: config.colorBg }}>
      {config.metaPixelId && <MetaPixelScript id={config.metaPixelId} />}

      {/* NAV */}
      <nav className="flex items-center justify-center py-5 px-6 border-b border-white/10" style={{ background: config.colorNavy }}>
        {config.logoUrl
          ? <img src={config.logoUrl} alt={config.brandName} className="h-10 w-auto" />
          : <span className="text-white text-xl font-extrabold tracking-tight">{config.brandName}</span>
        }
      </nav>

      {/* HERO */}
      <section className="py-20 px-6 relative overflow-hidden" style={{ background: config.colorNavy }}>
        {config.heroPhoto && (
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${config.heroPhoto})`, opacity: 0.18 }}
          />
        )}
        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-6 border border-white/20 bg-white/10">
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: config.colorPrimary }} />
            <span className="text-white/80 text-sm font-medium">Free offer. No obligation. No agent needed.</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
            {config.heroHeadline}{config.heroHeadlineAccent && <>{" "}<span style={{ color: config.colorPrimary }}>{config.heroHeadlineAccent}</span></>}
          </h1>
          <p className="text-white/70 text-lg mb-10 leading-relaxed">{config.heroSubheadline}</p>
          <div className="flex justify-center">
            <AddressForm
              address={address}
              setAddress={setAddress}
              loading={loading}
              onSubmit={handleSubmit}
              ctaBtnStyle={ctaBtnOnDarkStyle}
            />
          </div>
          <p className="text-white/40 text-xs mt-4">Takes 30 seconds. No account. No pressure.</p>
        </div>
      </section>

      {/* TRUST STRIP */}
      <section className="py-10 px-6 border-b" style={{ background: config.colorLight, borderColor: config.colorNavy + "14" }}>
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {config.trustStats.map((s, i) => (
            <div key={i}>
              <p className="text-2xl font-bold" style={{ color: config.colorNavy }}>{s.stat}</p>
              <p className="text-[#6B7FA0] text-sm mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <p className="text-xs font-bold uppercase tracking-widest text-center mb-2" style={{ color: config.colorPrimary }}>Simple Process</p>
          <h2 className="text-3xl font-bold text-center mb-12" style={{ color: config.colorNavy }}>Three steps to sold.</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {config.steps.map((step, i) => (
              <div key={i} className="text-center">
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm mx-auto mb-4 shadow" style={{ background: config.colorPrimary }}>
                  {step.num}
                </div>
                <h3 className="font-bold text-lg mb-2" style={{ color: config.colorNavy }}>{step.title}</h3>
                <p className="text-[#4A5E7A] text-sm leading-relaxed">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PAIN SECTION */}
      <section className="py-16 px-6" style={{ background: config.colorNavy }}>
        <div className="max-w-4xl mx-auto">
          <p className="text-xs font-bold uppercase tracking-widest mb-2 text-center" style={{ color: config.colorPrimary }}>Why Cash</p>
          <h2 className="text-3xl font-bold text-white text-center mb-4">Why more homeowners are skipping the traditional process</h2>
          <p className="text-white/60 text-center mb-12 max-w-xl mx-auto">Listing with an agent works. Sometimes. But it comes with costs most sellers don&rsquo;t see coming.</p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {config.painCards.map((card, i) => (
              <div key={i} className="rounded-xl p-5 border border-white/10 bg-white/5">
                <p className="text-white font-bold text-sm mb-3">{card.headline}</p>
                <p className="text-white/50 text-xs leading-relaxed">{card.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS ROUND 1 */}
      <section className="py-16 px-6" style={{ background: config.colorLight }}>
        <div className="max-w-4xl mx-auto">
          <p className="text-xs font-bold uppercase tracking-widest mb-2 text-center" style={{ color: config.colorPrimary }}>Real Stories</p>
          <h2 className="text-3xl font-bold text-center mb-12" style={{ color: config.colorNavy }}>Homeowners like you, done and closed.</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {round1.map((t, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-[#0F1E3A]/8">
                <div className="inline-block rounded-full px-3 py-1 text-xs font-bold mb-4" style={{ background: config.colorPrimary + "22", color: config.colorNavy }}>{t.situation}</div>
                <p className="text-[#4A5E7A] text-sm leading-relaxed mb-4">&ldquo;{t.quote}&rdquo;</p>
                <div className="flex items-center gap-3 border-t border-[#0F1E3A]/8 pt-4">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ background: config.colorNavy }}>
                    {t.name.split(" ").map((w: string) => w[0]).join("")}
                  </div>
                  <div>
                    <p className="text-[#0F1E3A] text-xs font-semibold">{t.name}</p>
                    <p className="text-[#6B7FA0] text-xs">{t.location}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHAT YOU GET */}
      <section className="py-16 px-6">
        <div className="max-w-3xl mx-auto">
          <p className="text-xs font-bold uppercase tracking-widest mb-2 text-center" style={{ color: config.colorPrimary }}>What You Get</p>
          <h2 className="text-3xl font-bold text-center mb-12" style={{ color: config.colorNavy }}>Everything included. Nothing hidden.</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {config.valueItems.map((item, i) => (
              <div key={i} className="flex items-start gap-3 rounded-xl p-4 border" style={{ background: config.colorLight, borderColor: config.colorNavy + "14" }}>
                <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: config.colorPrimary }}>
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="#0F1E3A" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-sm font-medium" style={{ color: config.colorNavy }}>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS ROUND 2 */}
      <section className="py-16 px-6" style={{ background: config.colorNavy }}>
        <div className="max-w-4xl mx-auto">
          <p className="text-xs font-bold uppercase tracking-widest mb-2 text-center" style={{ color: config.colorPrimary }}>More Stories</p>
          <h2 className="text-3xl font-bold text-white text-center mb-12">From all kinds of situations.</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {round2.map((t, i) => (
              <div key={i} className="rounded-2xl p-6 border border-white/10 bg-white/5">
                <div className="inline-block rounded-full px-3 py-1 text-xs font-bold mb-4" style={{ background: config.colorPrimary + "33", color: config.colorPrimary }}>{t.situation}</div>
                <p className="text-white/70 text-sm leading-relaxed mb-4">&ldquo;{t.quote}&rdquo;</p>
                <div className="flex items-center gap-3 border-t border-white/10 pt-4">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-[#0F1E3A] text-xs font-bold shrink-0" style={{ background: config.colorPrimary }}>
                    {t.name.split(" ").map((w: string) => w[0]).join("")}
                  </div>
                  <div>
                    <p className="text-white text-xs font-semibold">{t.name}</p>
                    <p className="text-white/50 text-xs">{t.location}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 px-6" style={{ background: config.colorBg }}>
        <div className="max-w-2xl mx-auto">
          <p className="text-xs font-bold uppercase tracking-widest mb-2 text-center" style={{ color: config.colorPrimary }}>Questions</p>
          <h2 className="text-3xl font-bold text-center mb-10" style={{ color: config.colorNavy }}>Everything you want to know.</h2>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#0F1E3A]/8">
            {config.faqs.map((faq, i) => (
              <FaqItem key={i} q={faq.q} a={faq.a} colorNavy={config.colorNavy} colorPrimary={config.colorPrimary} />
            ))}
          </div>
        </div>
      </section>

      {/* BOTTOM CTA */}
      <section className="py-20 px-6" style={{ background: config.colorLight }}>
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4" style={{ color: config.colorNavy }}>Still thinking? Get your number.</h2>
          <p className="text-[#4A5E7A] mb-8">Free. No obligation. You can always say no.</p>
          <div className="flex justify-center">
            <AddressForm
              address={address}
              setAddress={setAddress}
              loading={loading}
              onSubmit={handleSubmit}
              ctaBtnStyle={ctaBtnStyle}
              label="Get My No-Obligation Offer →"
            />
          </div>
          <p className="text-[#9BACC0] text-xs mt-4">No contracts. No pressure. We buy homes. That&rsquo;s it.</p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="px-6 py-8 text-center border-t border-[#0F1E3A]/8">
        <p className="text-[#9BACC0] text-sm">&copy; {new Date().getFullYear()} {config.brandName} &middot; All rights reserved.</p>
      </footer>

      <FomoPopup config={config} />
    </main>
  );
}
