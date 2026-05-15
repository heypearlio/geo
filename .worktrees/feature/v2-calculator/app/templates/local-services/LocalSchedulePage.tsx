"use client";

import { useState, useEffect, useRef, Suspense } from "react";

function MetaPixelScript({ id }: { id: string }) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const w = window as Window & { fbq?: (...args: unknown[]) => void; _fbq?: unknown };
    if (w.fbq) {
      w.fbq("init", id);
      w.fbq("track", "PageView");
      return;
    }
    const script = document.createElement("script");
    script.async = true;
    script.src = "https://connect.facebook.net/en_US/fbevents.js";
    const n: ((...args: unknown[]) => void) & { callMethod?: (...args: unknown[]) => void; queue?: unknown[]; push?: unknown; loaded?: boolean; version?: string } = function (...args: unknown[]) {
      if (n.callMethod) n.callMethod(...args); else n.queue!.push(args);
    };
    n.push = n;
    n.loaded = true;
    n.version = "2.0";
    n.queue = [];
    w.fbq = n;
    w._fbq = n;
    script.onload = () => { if (w.fbq) { w.fbq("init", id); w.fbq("track", "PageView"); } };
    document.head.appendChild(script);
  }, [id]);
  return null;
}
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { LocalServicesFunnelConfig } from "./config.types";

// ─── FOMO Popup ───────────────────────────────────────────────────────────────

function FomoPopup({ config }: { config: LocalServicesFunnelConfig }) {
  const [current, setCurrent] = useState<number | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const show = (index: number) => {
      setCurrent(index);
      setVisible(true);
      setTimeout(() => setVisible(false), 4500);
    };
    const first = setTimeout(() => show(Math.floor(Math.random() * config.fomoEntries.length)), 5000);
    let idx = 1;
    const interval = setInterval(() => { show((idx++) % config.fomoEntries.length); }, 12000);
    return () => { clearTimeout(first); clearInterval(interval); };
  }, [config.fomoEntries.length]);

  if (current === null) return null;
  const n = config.fomoEntries[current];

  return (
    <div
      className={`fixed bottom-6 left-6 z-50 transition-all duration-500 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"}`}
      style={{ maxWidth: "calc(100vw - 48px)" }}
    >
      <div className="bg-white rounded-xl shadow-xl border border-[#0F1E3A]/8 px-4 py-3 flex items-center gap-3 w-[300px]">
        <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: config.colorButton ?? config.colorPrimary }}>
          <span className="text-[#0F1E3A] text-[10px] font-bold">{n.name.split(" ").map((w: string) => w[0]).join("")}</span>
        </div>
        <div>
          <p className="text-[#0F1E3A] text-xs font-semibold leading-tight">{n.name} · <span className="text-[#0F1E3A] font-bold">{n.business}</span></p>
          <p className="text-[#6B7FA0] text-[11px] leading-tight mt-0.5">{n.city} &middot; {config.fomoPopupLabel}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Inner Content (uses searchParams) ───────────────────────────────────────

function ScheduleContent({ config }: { config: LocalServicesFunnelConfig }) {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const firstName = searchParams.get("firstName") ?? undefined;
  const router = useRouter();
  const calendlyLoaded = useRef(false);

  useEffect(() => {
    if (calendlyLoaded.current) return;
    calendlyLoaded.current = true;
    const script = document.createElement("script");
    script.src = "https://assets.calendly.com/assets/external/widget.js";
    script.async = true;
    document.body.appendChild(script);
    return () => { try { document.body.removeChild(script); } catch {} };
  }, []);

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.data?.event === "calendly.event_scheduled") {
        if (email) router.push("/results");
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [email, router]);

  const ctaBtnStyle: React.CSSProperties = {
    background: config.colorButton ?? config.colorPrimary,
    color: config.colorOnPrimary ?? "#ffffff",
    fontWeight: "bold",
    fontSize: "1rem",
    padding: "1rem 2.5rem",
    borderRadius: "0.75rem",
    boxShadow: "0 4px 14px rgba(0,0,0,0.2)",
    cursor: "pointer",
    border: "none",
    display: "inline-block",
    transition: "opacity 0.2s",
  };

  // Calendly: navy text + white bg + brand primary for green circles on dates/buttons.
  // The embed is wrapped in a navy card so navy feels dominant even with lime circles.
  const calendlyDataUrl = `${config.calendlyUrl}?hide_gdpr_banner=1&hide_event_type_details=1&hide_landing_page_details=1&background_color=ffffff&text_color=${config.colorNavy.replace("#", "")}&primary_color=${config.colorNavy.replace("#", "")}${email ? `&email=${encodeURIComponent(email)}` : ""}${firstName ? `&name=${encodeURIComponent(firstName)}` : ""}`;

  // derive nav link back to main landing
  const landingHref = config.scheduleRoute.replace(/schedule$/, "");

  return (
    <main className="min-h-screen text-[#0F1E3A] font-sans" style={{ background: config.colorBg }}>
      {config.metaPixelId && <MetaPixelScript id={config.metaPixelId} />}

      {/* NAV */}
      <nav className="flex items-center justify-center py-6 px-6 border-b border-white/10" style={{ background: config.colorNavy }}>
        <Link href={landingHref}>
          {config.logoUrl
            ? <img src={config.logoUrl} alt={config.brandName} className="h-10 w-auto" />
            : <span className="text-white text-xl font-extrabold tracking-tight">{config.brandName}</span>
          }
        </Link>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-12">

        {/* HEADER */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-6 border" style={{ background: config.colorNavy + "1A", borderColor: config.colorNavy + "40" }}>
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: config.colorButton ?? config.colorPrimary }} />
            <span className="text-sm font-medium" style={{ color: config.colorNavy }}>Free. No obligation. No tech skills needed.</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: config.colorNavy }}>{config.scheduleHeadline}</h1>
          <p className="text-[#4A5E7A] text-lg leading-relaxed">{config.scheduleSubheadline}</p>
        </div>

        {/* SCROLL CTA */}
        <div className="text-center mb-8">
          <button
            onClick={() => document.getElementById("calendar")?.scrollIntoView({ behavior: "smooth", block: "start" })}
            style={ctaBtnStyle}
          >
            Pick a Time That Works For Me &rarr;
          </button>
          <p className="text-[#4A5E7A] text-sm mt-2">30 minutes. Free. No pressure.</p>
        </div>

        {/* TESTIMONIAL */}
        <div className="rounded-xl px-4 py-3 mb-6 border" style={{ background: config.colorLight, borderColor: config.colorNavy + "14" }}>
          <p className="text-sm leading-relaxed" style={{ color: config.colorNavy }}>&ldquo;{config.scheduleTestimonialQuote}&rdquo;</p>
          <p className="text-[#6B7FA0] text-xs mt-1">{config.scheduleTestimonialAuthor}</p>
        </div>

        {/* CALENDLY */}
        <div id="calendar" className="rounded-2xl overflow-hidden mb-8 shadow-lg" style={{ border: `2px solid ${config.colorNavy}`, scrollMarginTop: "16px" }}>
          {/* Navy header bar */}
          <div className="flex items-center justify-between px-5 py-4" style={{ background: config.colorNavy }}>
            <div>
              <p className="text-white font-bold text-sm">Pick a time that works for you</p>
              <p className="text-[#9BACC0] text-xs mt-0.5">30 min · Free · No obligation</p>
            </div>
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: config.colorPrimary }}>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke={config.colorNavy} strokeWidth={2.5}>
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18" />
              </svg>
            </div>
          </div>
          {/* Embed */}
          <div
            className="calendly-inline-widget"
            data-url={calendlyDataUrl}
            style={{ minWidth: "320px", height: "600px" }}
          />
        </div>

        <p className="text-center text-[#9BACC0] text-xs mb-10">Free. No obligation. We&rsquo;ll recommend the right plan for your business.</p>

        {/* WHAT YOU GET ON THE CALL */}
        <div className="rounded-2xl p-8 mb-8" style={{ background: config.colorNavy }}>
          <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: config.colorButton ?? config.colorPrimary }}>Free. Just For Showing Up.</p>
          <h2 className="text-2xl font-bold text-white mb-6">
            Every business owner who books a call walks away with a complete local growth plan. Whether you sign up or not.
          </h2>
          <div className="space-y-4 mb-6">
            {config.scheduleCallItems.map((item, i) => (
              <div key={i} className="flex items-start gap-4">
                <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 shadow" style={{ background: config.colorPrimary }}>
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="text-white font-semibold mb-1">{item.title}</p>
                  <p className="text-gray-400 text-sm leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* WHAT HAPPENS ON THE CALL */}
        <div className="bg-white border border-[#0F1E3A]/8 rounded-2xl p-6 mb-8 shadow-sm">
          <h3 className="font-bold text-base mb-4" style={{ color: config.colorNavy }}>What happens on the call</h3>
          <ul className="space-y-3">
            {config.scheduleWhatHappens.map((item, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="text-lg shrink-0">{item.icon}</span>
                <span className="text-[#4A5E7A] text-sm leading-relaxed">{item.text}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* FOUNDER BIO */}
        <div className="rounded-2xl p-6 mb-8 border" style={{ background: config.colorLight, borderColor: config.colorNavy + "14" }}>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0 shadow" style={{ background: config.colorPrimary }}>
              {config.founder.initials}
            </div>
            <div>
              <p className="text-[#6B7FA0] text-xs uppercase tracking-widest mb-0.5">Your growth call is with</p>
              <p className="text-xl font-bold" style={{ color: config.colorNavy }}>{config.founder.name}</p>
              <p className="text-sm font-medium">
                {config.founder.title.includes(",") ? (
                  <>
                    <span style={{ color: config.colorNavy }}>{config.founder.title.split(",")[0]},</span>
                    {" "}
                    <span style={{ color: config.colorNavy }}>{config.founder.title.split(",").slice(1).join(",").trim()}</span>
                  </>
                ) : (
                  <span style={{ color: config.colorButton ?? config.colorPrimary }}>{config.founder.title}</span>
                )}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {config.founder.stats.map((c, i) => (
              <div key={i} className="bg-white rounded-xl p-3 text-center border border-[#0F1E3A]/8">
                <p className="font-bold text-lg leading-none" style={{ color: config.colorNavy }}>{c.stat}</p>
                <p className="text-[#6B7FA0] text-xs mt-1">{c.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* BOTTOM CTA */}
        <div className="text-center mb-8">
          <button
            onClick={() => document.getElementById("calendar")?.scrollIntoView({ behavior: "smooth", block: "start" })}
            style={ctaBtnStyle}
          >
            Book My Free Growth Call &rarr;
          </button>
          <p className="text-[#9BACC0] text-xs mt-3">No contracts. No surprises. Cancel anytime.</p>
        </div>
      </div>

      <footer className="px-6 py-8 text-center border-t border-[#0F1E3A]/8">
        <p className="text-[#9BACC0] text-sm">&copy; {new Date().getFullYear()} {config.brandName} &middot; All rights reserved.</p>
        {config.pricingRoute && (
          <a href={config.pricingRoute} className="text-[#4A5E7A] text-xs mt-2 inline-block hover:text-[#9BACC0]">View Pricing</a>
        )}
      </footer>

      <FomoPopup config={config} />
    </main>
  );
}

// ─── Exported Page Component ──────────────────────────────────────────────────

export default function LocalSchedulePage({ config }: { config: LocalServicesFunnelConfig }) {
  return (
    <Suspense>
      <ScheduleContent config={config} />
    </Suspense>
  );
}
