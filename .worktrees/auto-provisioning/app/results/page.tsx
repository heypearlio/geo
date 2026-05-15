"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function ResultsContent() {
  const searchParams = useSearchParams();
  const auditId = searchParams.get("auditId");

  const [status, setStatus] = useState<"loading" | "ready" | "failed">("loading");
  const [reportUrl, setReportUrl] = useState<string | null>(null);
  const [scores, setScores] = useState<{ overall: number; seo: number; ai: number } | null>(null);

  useEffect(() => {
    if (!auditId) { setStatus("failed"); return; }

    const tryFetch = async () => {
      try {
        const res = await fetch(`/api/audit-status?id=${auditId}`);
        const data = await res.json();
        if (data.status === "COMPLETED") {
          setScores({
            overall: Math.round(data.overallScore ?? 0),
            seo: Math.round(data.seoScore ?? 0),
            ai: Math.round(data.aiScore ?? 0),
          });
          setReportUrl(data.publicViewUrl ?? null);
          setStatus("ready");
          return true;
        } else if (data.status === "FAILED") {
          setStatus("failed");
          return true;
        }
      } catch {}
      return false;
    };

    tryFetch().then((done) => {
      if (done) return;
      const poll = setInterval(async () => {
        const done = await tryFetch();
        if (done) clearInterval(poll);
      }, 5000);
      return () => clearInterval(poll);
    });
  }, [auditId]);

  return (
    <main className="min-h-screen bg-[#F7F8FC] text-[#0F1E3A] font-sans">

      <nav className="bg-[#0F1E3A] flex items-center justify-center py-6 px-6 border-b border-white/10">
        <Link href="/">
          <Image src="/geo-logo.png" alt="GEO by HeyPearl" width={120} height={50} />
        </Link>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-12">

        {/* Booking confirmation hero */}
        <div className="bg-[#162B4C] rounded-2xl overflow-hidden mb-6 shadow-lg">

          {/* Top confirmed bar */}
          <div className="bg-green-500 px-6 py-3 flex items-center justify-center gap-2">
            <svg className="w-4 h-4 text-white shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <p className="text-white text-sm font-bold uppercase tracking-wide">You are booked. Check your email for your calendar invite.</p>
          </div>

          {/* Main content */}
          <div className="px-7 py-8">

            {/* Who they're meeting */}
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-full bg-[#E8185C] flex items-center justify-center text-white font-bold text-xl shrink-0 shadow-lg">
                MB
              </div>
              <div>
                <p className="text-gray-400 text-xs uppercase tracking-widest mb-0.5">Your strategy call is with</p>
                <p className="text-white text-xl font-bold leading-tight">Misti Bruton</p>
                <p className="text-[#E8185C] text-sm font-medium">Founder, GEO by HeyPearl</p>
              </div>
            </div>

            {/* Credentials */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              {[
                { stat: "500+", label: "Agents coached" },
                { stat: "$1B+", label: "In real estate sold" },
                { stat: "Top 1%", label: "Teams nationwide" },
              ].map((c, i) => (
                <div key={i} className="bg-white/6 rounded-xl p-3 text-center border border-white/8">
                  <p className="text-white font-bold text-lg leading-none">{c.stat}</p>
                  <p className="text-gray-400 text-xs mt-1">{c.label}</p>
                </div>
              ))}
            </div>

            {/* The free gift pitch */}
            <div className="bg-[#E8185C]/15 border border-[#E8185C]/30 rounded-xl px-5 py-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#E8185C] flex items-center justify-center shrink-0 mt-0.5 shadow">
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                  </svg>
                </div>
                <div>
                  <p className="text-white font-bold text-sm mb-1">Free for every agent who shows up:</p>
                  <p className="text-gray-200 text-sm leading-relaxed">
                    Misti is bringing her proven framework used by top 1% teams to double GCI in 2026. You will walk away with a custom action plan built for your market, your numbers, and your goals. This is what her private coaching clients pay thousands for.
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Report section */}
        {status === "loading" && (
          <div className="bg-white border border-[#0F1E3A]/8 rounded-2xl p-10 text-center mb-10 shadow-sm">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-5 h-5 border-2 border-[#0F1E3A]/20 border-t-[#0F1E3A] rounded-full animate-spin" />
              <span className="text-[#0F1E3A] font-semibold">Loading your full report...</span>
            </div>
            <p className="text-[#6B7FA0] text-sm">This usually takes under a minute.</p>
          </div>
        )}

        {status === "ready" && (
          <>
            {scores && (
              <div className="bg-white border border-[#0F1E3A]/8 rounded-2xl p-8 mb-8 text-center shadow-sm">
                <p className="text-[#0F1E3A] font-semibold uppercase tracking-widest text-xs mb-4">Your Full AI Visibility Results</p>
                <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto mb-6">
                  <div className="bg-[#F7F8FC] rounded-xl p-4 border border-[#0F1E3A]/8">
                    <p className="text-3xl font-bold text-[#0F1E3A]">{scores.overall}</p>
                    <p className="text-[#6B7FA0] text-xs mt-1">Overall Score</p>
                  </div>
                  <div className="bg-[#F7F8FC] rounded-xl p-4 border border-[#0F1E3A]/8">
                    <p className="text-3xl font-bold text-[#0F1E3A]">{scores.seo}</p>
                    <p className="text-[#6B7FA0] text-xs mt-1">SEO Score</p>
                  </div>
                  <div className="bg-[#F7F8FC] rounded-xl p-4 border border-[#0F1E3A]/8">
                    <p className="text-3xl font-bold text-[#0F1E3A]">{scores.ai}</p>
                    <p className="text-[#6B7FA0] text-xs mt-1">AI Search Score</p>
                  </div>
                </div>
                <p className="text-[#4A5E7A] text-sm">
                  {scores.overall < 40
                    ? "Your competitors are being recommended instead of you. We will fix that on the call."
                    : scores.overall < 70
                    ? "You have a foundation, but there are significant gaps costing you leads. We will go through each one."
                    : "Strong base. We will show you exactly how to convert this visibility into closed deals."}
                </p>
              </div>
            )}

            {reportUrl && (
              <div className="mb-8">
                <p className="text-[#0F1E3A] font-semibold mb-4 text-center">Your full report is ready below.</p>
                <div className="rounded-2xl overflow-hidden border border-[#0F1E3A]/8 shadow-md">
                  <iframe
                    src={reportUrl}
                    width="100%"
                    height="800"
                    style={{ border: "none", background: "#F7F8FC" }}
                    title="Your AI Visibility Report"
                  />
                </div>
                <div className="text-center mt-4">
                  <a
                    href={reportUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-[#E8185C] hover:text-[#c4134d] text-sm font-medium transition-colors"
                  >
                    Open full report in new tab
                    <span>→</span>
                  </a>
                </div>
              </div>
            )}

            {!reportUrl && (
              <div className="bg-white border border-[#0F1E3A]/8 rounded-2xl p-8 mb-8 text-center shadow-sm">
                <span className="text-3xl mb-4 block">📊</span>
                <h3 className="text-xl font-bold text-[#0F1E3A] mb-2">Your full report is on the way.</h3>
                <p className="text-[#6B7FA0] text-sm">We will walk through every detail together on your strategy call.</p>
              </div>
            )}
          </>
        )}

        {status === "failed" && (
          <div className="bg-white border border-[#0F1E3A]/8 rounded-2xl p-10 text-center mb-8 shadow-sm">
            <span className="text-3xl mb-4 block">📊</span>
            <h3 className="text-xl font-bold text-[#0F1E3A] mb-2">Your report is being finalized.</h3>
            <p className="text-[#6B7FA0] text-sm">We will walk through everything live on your strategy call. Nothing to do before then.</p>
          </div>
        )}

        {/* FREE GIFT: show up incentive */}
        <div className="relative bg-[#0F1E3A] rounded-2xl p-8 mb-6 overflow-hidden">
          {/* Subtle glow accent */}
          <div className="absolute -top-10 -right-10 w-48 h-48 bg-[#E8185C]/15 rounded-full blur-3xl pointer-events-none" />
          <div className="relative">
            <div className="inline-flex items-center gap-2 bg-[#E8185C]/20 border border-[#E8185C]/40 rounded-full px-3 py-1 mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-[#E8185C] animate-pulse" />
              <span className="text-[#E8185C] text-xs font-bold uppercase tracking-widest">Free Gift. Just For Showing Up.</span>
            </div>

            <h3 className="text-2xl font-bold text-white mb-3 leading-snug">
              Your Custom AI Authority Profile.<br />
              <span className="text-[#E8185C]">Built live on the call. Yours to keep.</span>
            </h3>

            <p className="text-gray-300 text-sm leading-relaxed mb-6">
              Every agent who shows up to their strategy call walks away with a done-for-you AI Authority Profile, custom-written for their name, market, and specialty. This is the exact asset that gets you recommended by ChatGPT, Perplexity, and Google AI instead of your competitors.
            </p>

            <div className="space-y-3 mb-6">
              {[
                { label: "AI-Optimized Bio", desc: "Written in the exact language AI search engines use to recommend agents. Drop it anywhere online and start getting found." },
                { label: "Google Business Profile Script", desc: "The exact description that ranks you in local AI and map searches. Most agents have never touched this. Yours will be perfect." },
                { label: "3 Market Authority Talking Points", desc: "Use these in your next listing appointment. When a seller hears \"AI recommended me,\" you win the listing." },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#E8185C] flex items-center justify-center shrink-0 mt-0.5">
                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-white text-sm font-semibold">{item.label}</p>
                    <p className="text-gray-400 text-xs leading-relaxed mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-white/8 border border-white/12 rounded-xl px-5 py-4">
              <p className="text-white text-sm font-semibold mb-1">What agents say after they get it:</p>
              <p className="text-gray-300 text-sm leading-relaxed italic">
                &ldquo;I used the listing talking points the next day. Won the appointment. The seller actually said, &apos;You are the only agent who showed me this.&apos;&rdquo;
              </p>
              <p className="text-gray-500 text-xs mt-2">Jennifer R., Real Estate Agent, Scottsdale AZ</p>
            </div>
          </div>
        </div>

        {/* What to expect next */}
        <div className="bg-white border border-[#0F1E3A]/8 rounded-2xl p-6 shadow-sm">
          <h3 className="text-[#0F1E3A] font-bold text-base mb-4">What happens on the call</h3>
          <ul className="space-y-3">
            {[
              { icon: "🔍", text: "We walk through your full AI visibility report line by line" },
              { icon: "📍", text: "We show you exactly which agents in your market are outranking you" },
              { icon: "✍️", text: "We build and hand you your custom AI Authority Profile, live" },
              { icon: "🎯", text: "No pitch until you have seen your results. Transparent, no pressure" },
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="text-lg shrink-0">{item.icon}</span>
                <span className="text-[#4A5E7A] text-sm leading-relaxed">{item.text}</span>
              </li>
            ))}
          </ul>
        </div>

      </div>

      <footer className="px-6 py-8 text-center border-t border-[#0F1E3A]/8">
        <p className="text-[#9BACC0] text-sm">&copy; {new Date().getFullYear()} GEO by HeyPearl &middot; All rights reserved.</p>
      </footer>

    </main>
  );
}

export default function ResultsPage() {
  return (
    <Suspense>
      <ResultsContent />
    </Suspense>
  );
}
