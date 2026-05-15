// app/templates/cashoffer/CashOfferSchedulePage.tsx
"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { CashOfferFunnelConfig } from "./config.types";

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

function ScheduleContent({ config }: { config: CashOfferFunnelConfig }) {
  const searchParams = useSearchParams();
  const address = searchParams.get("address") ?? "";
  const [booked, setBooked] = useState(false);
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
        setBooked(true);
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  const landingHref = config.scheduleRoute.replace(/\/schedule$/, "");

  const calendlyDataUrl = `${config.calendlyUrl}?hide_gdpr_banner=1&hide_event_type_details=1&hide_landing_page_details=1&background_color=ffffff&text_color=${config.colorNavy.replace("#", "")}&primary_color=${config.colorNavy.replace("#", "")}`;

  if (booked) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center" style={{ background: config.colorBg }}>
        <div className="w-16 h-16 rounded-full flex items-center justify-center mb-6 shadow-lg" style={{ background: config.colorPrimary }}>
          <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="#0F1E3A" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold mb-4" style={{ color: config.colorNavy }}>You&rsquo;re booked.</h1>
        <p className="text-[#4A5E7A] text-lg max-w-md">Check your email for confirmation details. We look forward to talking through your offer.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen text-[#0F1E3A] font-sans" style={{ background: config.colorBg }}>
      {config.metaPixelId && <MetaPixelScript id={config.metaPixelId} />}

      {/* NAV */}
      <nav className="flex items-center justify-center py-5 px-6 border-b border-white/10" style={{ background: config.colorNavy }}>
        <Link href={landingHref}>
          {config.logoUrl
            ? <img src={config.logoUrl} alt={config.brandName} className="h-10 w-auto" />
            : <span className="text-white text-xl font-extrabold tracking-tight">{config.brandName}</span>
          }
        </Link>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-12">

        {/* HEADER */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-6 border" style={{ background: config.colorPrimary + "1A", borderColor: config.colorPrimary + "40" }}>
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: config.colorPrimary }} />
            <span className="text-sm font-medium" style={{ color: config.colorNavy }}>Free call. No obligation.</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: config.colorNavy }}>{config.scheduleHeadline}</h1>
          <p className="text-[#4A5E7A] text-lg leading-relaxed">{config.scheduleSubheadline}</p>
        </div>

        {/* ADDRESS CONFIRMATION */}
        {address && (
          <div className="rounded-xl px-4 py-3 mb-6 border flex items-center gap-3" style={{ background: config.colorLight, borderColor: config.colorNavy + "14" }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: config.colorPrimary }}>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="#0F1E3A" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-[#6B7FA0]">Your property</p>
              <p className="text-sm font-semibold" style={{ color: config.colorNavy }}>{address}</p>
            </div>
          </div>
        )}

        {/* CALENDLY */}
        <div id="calendar" className="rounded-2xl overflow-hidden mb-8 shadow-lg" style={{ border: `2px solid ${config.colorNavy}`, scrollMarginTop: "16px" }}>
          <div className="flex items-center justify-between px-5 py-4" style={{ background: config.colorNavy }}>
            <div>
              <p className="text-white font-bold text-sm">Pick a time for your offer call</p>
              <p className="text-[#9BACC0] text-xs mt-0.5">15 min · Free · No obligation</p>
            </div>
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: config.colorPrimary }}>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke={config.colorNavy} strokeWidth={2.5}>
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18" />
              </svg>
            </div>
          </div>
          <div className="calendly-inline-widget" data-url={calendlyDataUrl} style={{ minWidth: "320px", height: "600px" }} />
        </div>

        {/* WHAT HAPPENS ON THE CALL */}
        <div className="bg-white border border-[#0F1E3A]/8 rounded-2xl p-6 mb-8 shadow-sm">
          <h3 className="font-bold text-base mb-4" style={{ color: config.colorNavy }}>What happens on the call</h3>
          <ul className="space-y-3">
            {config.scheduleCallItems.map((item, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="text-lg shrink-0">{item.icon}</span>
                <span className="text-[#4A5E7A] text-sm leading-relaxed">{item.text}</span>
              </li>
            ))}
          </ul>
        </div>

      </div>

      <footer className="px-6 py-8 text-center border-t border-[#0F1E3A]/8">
        <p className="text-[#9BACC0] text-sm">&copy; {new Date().getFullYear()} {config.brandName} &middot; All rights reserved.</p>
      </footer>
    </main>
  );
}

export default function CashOfferSchedulePage({ config }: { config: CashOfferFunnelConfig }) {
  return (
    <Suspense>
      <ScheduleContent config={config} />
    </Suspense>
  );
}
