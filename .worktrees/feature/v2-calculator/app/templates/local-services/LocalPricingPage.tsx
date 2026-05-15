"use client";

import { useEffect } from "react";
import type { LocalServicesFunnelConfig } from "./config.types";

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

export default function LocalPricingPage({ config }: { config: LocalServicesFunnelConfig }) {
  const [starter, growth, pro] = config.pricingTiers;

  const ctaBtnStyle: React.CSSProperties = {
    background: config.colorButton ?? config.colorPrimary,
    color: "#0F1E3A",
    fontWeight: "bold",
    fontSize: "1rem",
    padding: "0.75rem 2rem",
    borderRadius: "0.75rem",
    boxShadow: "0 4px 14px rgba(0,0,0,0.15)",
    cursor: "pointer",
    display: "block",
    width: "100%",
    textAlign: "center",
    transition: "opacity 0.2s",
  };

  // Growth card is dark navy — button must use accent color to be visible
  const ctaBtnStyleOnDark: React.CSSProperties = {
    ...ctaBtnStyle,
    background: config.colorPrimary,
    textDecoration: "none",
    marginTop: "auto",
  };

  return (
    <main className="min-h-screen font-sans" style={{ background: config.colorBg }}>
      {config.metaPixelId && <MetaPixelScript id={config.metaPixelId} />}

      {/* NAV */}
      <nav className="flex items-center justify-center py-5 px-6 border-b border-white/10" style={{ background: config.colorNavy }}>
        {config.logoUrl
          ? <img src={config.logoUrl} alt={config.brandName} className="h-10 w-auto" />
          : <span className="text-white text-xl font-extrabold tracking-tight">{config.brandName}</span>
        }
      </nav>

      {/* HEADER */}
      <section className="px-6 pt-14 pb-20 text-center" style={{ background: config.colorNavy }}>
        <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: config.colorPrimary }}>Simple Pricing</p>
        <h1 className="text-3xl md:text-5xl font-extrabold text-white mb-4 leading-tight max-w-2xl mx-auto">
          Pick the plan that fits where you are
        </h1>
        <p className="text-[#9BACC0] text-base md:text-lg max-w-xl mx-auto">
          No contracts. No surprises. Pricing is shared on the call so we can match the right plan to your business.
        </p>
      </section>

      {/* PRICING CARDS */}
      <section className="px-6 -mt-8 pb-16 md:pb-20">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">

          {/* Starter */}
          <div className="bg-white rounded-2xl p-8 border border-[#0F1E3A]/10 shadow-sm flex flex-col">
            <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: config.colorPrimary }}>{starter.name}</p>
            <p className="text-4xl font-extrabold mb-1" style={{ color: config.colorNavy }}>
              {starter.price}<span className="text-lg font-normal text-[#6B7FA0]">/{starter.period ?? "mo"}</span>
            </p>
            <p className="text-[#9BACC0] text-xs mb-6">Billed monthly. Cancel anytime.</p>
            <div className="border-t border-[#0F1E3A]/8 pt-6 space-y-3 mb-8 flex-1">
              {starter.features.map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <span className="font-bold shrink-0 mt-0.5 text-sm" style={{ color: config.colorPrimary }}>&#10003;</span>
                  <span className="text-[#4A5E7A] text-sm">{item}</span>
                </div>
              ))}
            </div>
            <a href={starter.ctaHref ?? "#"} style={ctaBtnStyle}>
              {starter.ctaLabel ?? "Get Started"}
            </a>
          </div>

          {/* Growth — MOST POPULAR */}
          <div className="rounded-2xl p-8 relative shadow-xl flex flex-col" style={{ background: config.colorNavy, outline: `2px solid ${config.colorPrimary}` }}>
            {growth.highlight && (
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap">
                <span className="text-[#0F1E3A] text-[11px] font-bold uppercase tracking-widest px-4 py-1 rounded-full" style={{ background: config.colorPrimary }}>
                  Most Popular
                </span>
              </div>
            )}
            <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: config.colorPrimary }}>{growth.name}</p>
            <p className="text-white text-4xl font-extrabold mb-1">
              {growth.price}<span className="text-lg font-normal text-[#9BACC0]">/{growth.period ?? "mo"}</span>
            </p>
            <p className="text-[#6B7FA0] text-xs mb-6">Billed monthly. Cancel anytime.</p>
            <div className="border-t border-white/10 pt-6 space-y-3 mb-8 flex-1">
              {growth.features.map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <span className="text-green-400 font-bold shrink-0 mt-0.5 text-sm">&#10003;</span>
                  <span className="text-white/80 text-sm">{item}</span>
                </div>
              ))}
            </div>
            <a href={growth.ctaHref ?? "#"} style={ctaBtnStyleOnDark}>
              {growth.ctaLabel ?? "Get Started"}
            </a>
          </div>

          {/* Pro */}
          <div className="bg-white rounded-2xl p-8 border border-[#0F1E3A]/10 shadow-sm flex flex-col">
            <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: config.colorPrimary }}>{pro.name}</p>
            <p className="text-4xl font-extrabold mb-1" style={{ color: config.colorNavy }}>
              {pro.price}<span className="text-lg font-normal text-[#6B7FA0]">/{pro.period ?? "mo"}</span>
            </p>
            <p className="text-[#9BACC0] text-xs mb-6">Billed monthly. Cancel anytime.</p>
            <div className="border-t border-[#0F1E3A]/8 pt-6 space-y-3 mb-8 flex-1">
              {pro.features.map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <span className="font-bold shrink-0 mt-0.5 text-sm" style={{ color: config.colorPrimary }}>&#10003;</span>
                  <span className="text-[#4A5E7A] text-sm">{item}</span>
                </div>
              ))}
            </div>
            <a href={pro.ctaHref ?? "#"} style={ctaBtnStyle}>
              {pro.ctaLabel ?? "Get Started"}
            </a>
          </div>

        </div>
      </section>

      {/* COMPARISON TABLE */}
      <section className="bg-white border-y border-[#0F1E3A]/8 px-6 py-12 md:py-16">
        <div className="max-w-4xl mx-auto">
          <p className="text-center text-xs font-bold uppercase tracking-widest mb-3" style={{ color: config.colorPrimary }}>Compare Plans</p>
          <h2 className="text-2xl md:text-3xl font-extrabold text-center mb-10" style={{ color: config.colorNavy }}>What is included in each plan</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#0F1E3A]/8">
                  <th className="text-left py-3 pr-6 font-bold w-1/2" style={{ color: config.colorNavy }}>Feature</th>
                  <th className="text-center py-3 px-4 text-[#4A5E7A] font-semibold">{starter.name}</th>
                  <th className="text-center py-3 px-4 font-bold" style={{ color: config.colorPrimary }}>{growth.name}</th>
                  <th className="text-center py-3 px-4 text-[#4A5E7A] font-semibold">{pro.name}</th>
                </tr>
              </thead>
              <tbody>
                {config.pricingComparisonRows.map((row, i) => (
                  <tr key={row.feature} className={`border-b border-[#0F1E3A]/6 ${i % 2 === 0 ? "" : ""}`} style={{ background: i % 2 === 0 ? config.colorBg + "80" : "transparent" }}>
                    <td className="py-3 pr-6 font-medium" style={{ color: config.colorNavy }}>{row.feature}</td>
                    {[row.starter, row.growth, row.pro].map((val, j) => (
                      <td key={j} className="text-center py-3 px-4">
                        {val === true ? (
                          <span className="font-bold text-base" style={{ color: config.colorPrimary }}>&#10003;</span>
                        ) : val === false ? (
                          <span className="text-[#0F1E3A]/20 font-bold">&#8212;</span>
                        ) : (
                          <span className="text-[#4A5E7A] text-xs font-semibold">{val}</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="px-6 py-8 text-center" style={{ background: "#080F1E" }}>
        <p className="text-[#4A5E7A] text-xs">
          &copy; {new Date().getFullYear()} {config.brandName} &middot; {config.brandTagline} &middot;{" "}
          <a href="/privacy" className="underline hover:text-[#9BACC0]">Privacy Policy</a>
        </p>
      </footer>

    </main>
  );
}
