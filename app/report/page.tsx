"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

const GPT_ICON = (
  <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
    <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.8956zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z" />
  </svg>
);

function GPTAvatar() {
  return (
    <div className="w-7 h-7 rounded-full bg-[#10a37f] flex items-center justify-center shrink-0 mt-0.5">
      {GPT_ICON}
    </div>
  );
}

function TypingDots() {
  return (
    <div className="flex gap-3 items-start">
      <div className="w-7 h-7 rounded-full bg-[#10a37f] flex items-center justify-center shrink-0">{GPT_ICON}</div>
      <div className="bg-[#F7F8FC] border border-[#0F1E3A]/8 px-4 py-3 rounded-2xl rounded-tl-sm">
        <div className="flex gap-1">
          {[0, 1, 2].map(i => (
            <div key={i} className="w-2 h-2 bg-[#6B7FA0] rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      </div>
    </div>
  );
}

function TypewriterText({ text, speed = 18, onDone }: { text: string; speed?: number; onDone?: () => void }) {
  const [displayed, setDisplayed] = useState("");
  const i = useRef(0);
  useEffect(() => {
    if (i.current >= text.length) { onDone?.(); return; }
    const t = setTimeout(() => { setDisplayed(text.slice(0, i.current + 1)); i.current += 1; }, speed);
    return () => clearTimeout(t);
  }, [displayed, text, speed, onDone]);
  return <span>{displayed}<span className="animate-pulse">|</span></span>;
}

function AISimulator({ scheduleHref }: { scheduleHref: string }) {
  const [cityInput, setCityInput] = useState("");
  const cityRef = useRef("");
  const [phase, setPhase] = useState<"idle" | "typing-query" | "asking" | "responding" | "done" | "error">("idle");
  const [typedQuery, setTypedQuery] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const queryRef = useRef(0);
  const runTest = (c: string) => {
    cityRef.current = c;
    queryRef.current = 0;
    setTypedQuery("");
    setPhase("typing-query");
  };

  useEffect(() => {
    if (phase !== "typing-query") return;
    const q = `Who is the best real estate agent in ${cityRef.current}?`;
    if (queryRef.current >= q.length) { setTimeout(callChatGPT, 500); return; }
    const t = setTimeout(() => { setTypedQuery(q.slice(0, queryRef.current + 1)); queryRef.current += 1; }, 38);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, typedQuery]);

  const callChatGPT = async () => {
    setPhase("asking");
    try {
      const res = await fetch("/api/chatgpt-sim", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ city: cityRef.current }) });
      const data = await res.json();
      if (data.response) { setAiResponse(data.response); setPhase("responding"); }
      else setPhase("error");
    } catch { setPhase("error"); }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-[#0F1E3A] font-bold text-lg leading-snug">See who ChatGPT recommends in your city right now.</h3>
      <p className="text-[#4A5E7A] text-sm">Is your name in the answer?</p>

      {phase === "idle" && (
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Enter your city (e.g. Austin, TX)"
            value={cityInput}
            onChange={e => setCityInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && cityInput.trim()) runTest(cityInput.trim()); }}
            className="flex-1 border border-[#0F1E3A]/15 rounded-xl px-4 py-3 text-sm text-[#0F1E3A] placeholder-[#9BACC0] focus:outline-none focus:border-[#E8185C]/40"
          />
          <button
            onClick={() => { if (cityInput.trim()) runTest(cityInput.trim()); }}
            disabled={!cityInput.trim()}
            className="inline-flex items-center gap-2 bg-[#22c55e] hover:bg-[#16a34a] disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold px-5 py-3 rounded-xl transition-colors text-sm shadow-md shadow-green-500/30 whitespace-nowrap"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Run test
          </button>
        </div>
      )}

      {phase === "error" && (
        <div className="text-center py-2">
          <p className="text-[#6B7FA0] text-sm mb-2">Could not load result. Try again.</p>
          <button onClick={() => { setCityInput(cityRef.current); setPhase("idle"); }} className="text-[#E8185C] text-sm font-medium underline">Retry</button>
        </div>
      )}

      {(phase === "typing-query" || phase === "asking" || phase === "responding" || phase === "done") && (
        <div className="flex justify-end">
          <div className="bg-[#0F1E3A] text-white text-sm px-4 py-3 rounded-2xl rounded-tr-sm max-w-sm">
            {phase === "typing-query" ? <>{typedQuery}<span className="animate-pulse">|</span></> : `Who is the best real estate agent in ${cityRef.current}?`}
          </div>
        </div>
      )}
      {phase === "asking" && <TypingDots />}
      {(phase === "responding" || phase === "done") && (
        <div className="flex gap-3 items-start">
          <GPTAvatar />
          <div className="bg-[#F7F8FC] border border-[#0F1E3A]/8 text-[#0F1E3A] text-sm px-4 py-3 rounded-2xl rounded-tl-sm flex-1">
            {phase === "responding" ? <TypewriterText text={aiResponse} onDone={() => setPhase("done")} /> : aiResponse}
          </div>
        </div>
      )}
      {phase === "done" && (
        <div className="bg-[#E8185C]/8 border border-[#E8185C]/25 rounded-xl px-5 py-4">
          <p className="text-[#E8185C] font-bold text-sm mb-1">Your name is not in that answer.</p>
          <p className="text-[#0F1E3A] text-sm leading-relaxed mb-3">
            A buyer just asked for the best agent in {cityRef.current} and got sent to someone else. This is happening right now. Spots are one per market and they are filling.
          </p>
          <Link href={scheduleHref} className="inline-block bg-[#E8185C] hover:bg-[#c4134d] text-white font-bold text-sm px-5 py-2.5 rounded-lg transition-colors">
            Claim My Market Now
          </Link>
        </div>
      )}
    </div>
  );
}

const BOOKINGS = [
  { name: "Sarah M.", city: "Austin, TX" },
  { name: "James R.", city: "Nashville, TN" },
  { name: "Kayla T.", city: "Phoenix, AZ" },
  { name: "Derek L.", city: "Denver, CO" },
  { name: "Amanda W.", city: "Charlotte, NC" },
  { name: "Brian S.", city: "Atlanta, GA" },
  { name: "Nicole P.", city: "Dallas, TX" },
  { name: "Marcus H.", city: "Tampa, FL" },
  { name: "Rachel B.", city: "Seattle, WA" },
  { name: "Chris V.", city: "Las Vegas, NV" },
  { name: "Tiffany K.", city: "Chicago, IL" },
  { name: "Jordan E.", city: "Orlando, FL" },
  { name: "Lauren C.", city: "San Diego, CA" },
  { name: "Mike T.", city: "Miami, FL" },
  { name: "Priya N.", city: "Houston, TX" },
];

function BookingPopup() {
  const [current, setCurrent] = useState<number | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const show = (index: number) => {
      setCurrent(index);
      setVisible(true);
      setTimeout(() => setVisible(false), 5000);
    };

    const first = setTimeout(() => {
      show(Math.floor(Math.random() * BOOKINGS.length));
    }, 8000);

    let idx = 1;
    const interval = setInterval(() => {
      show((idx++) % BOOKINGS.length);
    }, 22000);

    return () => { clearTimeout(first); clearInterval(interval); };
  }, []);

  if (current === null) return null;
  const n = BOOKINGS[current];
  const initials = n.name.split(" ").map((w: string) => w[0]).join("");

  return (
    <div className={`fixed bottom-20 left-4 z-50 transition-all duration-500 md:bottom-6 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3 pointer-events-none"}`}>
      <div className="bg-white rounded-xl shadow-xl border border-[#0F1E3A]/8 px-4 py-3 flex items-center gap-3 max-w-[270px]">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#E8185C] to-[#162B4C] flex items-center justify-center shrink-0">
          <span className="text-white text-[10px] font-bold">{initials}</span>
        </div>
        <div>
          <p className="text-[#0F1E3A] text-xs font-semibold leading-tight">{n.name} from {n.city}</p>
          <p className="text-[#6B7FA0] text-[11px] leading-tight mt-0.5">just booked a strategy call</p>
        </div>
      </div>
    </div>
  );
}

function scoreColor(score: number) {
  if (score < 40) return { text: "text-red-500", bar: "bg-red-500", ring: "#dc2626", label: "Critical" };
  if (score < 70) return { text: "text-amber-400", bar: "bg-amber-400", ring: "#fbbf24", label: "Partial" };
  return { text: "text-emerald-400", bar: "bg-emerald-400", ring: "#34d399", label: "Good" };
}

function ReportContent() {
  const searchParams = useSearchParams();
  const auditId = searchParams.get("auditId");
  const email = searchParams.get("email") ?? "";
  const firstName = searchParams.get("firstName") ?? "";

  const urlOverall = parseInt(searchParams.get("overall") ?? "", 10);
  const urlSeo = parseInt(searchParams.get("seo") ?? "", 10);
  const urlAi = parseInt(searchParams.get("ai") ?? "", 10);
  const hasUrlScores = !isNaN(urlOverall) && !isNaN(urlSeo) && !isNaN(urlAi);

  // No URL scores = show failed state immediately. Silently try to upgrade in background.
  const [status, setStatus] = useState<"ready" | "failed">(hasUrlScores ? "ready" : "failed");
  const [scores, setScores] = useState<{ overall: number; seo: number; ai: number } | null>(
    hasUrlScores ? { overall: urlOverall, seo: urlSeo, ai: urlAi } : null
  );

  useEffect(() => {
    if (hasUrlScores || !auditId) return;
    // Silent background poll — upgrades to full report if scores become available
    const tryFetch = async () => {
      try {
        const res = await fetch(`/api/audit-status?id=${auditId}`);
        const data = await res.json();
        if (data.status === "COMPLETED") {
          setScores({ overall: Math.round(data.overallScore ?? 0), seo: Math.round(data.seoScore ?? 0), ai: Math.round(data.aiScore ?? 0) });
          setStatus("ready");
          return true;
        } else if (data.status === "FAILED") { return true; }
      } catch {}
      return false;
    };
    const timeout = setTimeout(() => clearInterval(poll), 10000);
    const poll = setInterval(async () => { if (await tryFetch()) { clearTimeout(timeout); clearInterval(poll); } }, 3000);
    return () => { clearTimeout(timeout); clearInterval(poll); };
  }, [auditId, hasUrlScores]);

  const scheduleHref = `/schedule?auditId=${auditId ?? ""}&email=${encodeURIComponent(email)}${firstName ? `&firstName=${encodeURIComponent(firstName)}` : ""}`;
  const s = scores ?? { overall: 0, seo: 0, ai: 0 };
  const overallC = scoreColor(s.overall);
  const seoC = scoreColor(s.seo);
  const aiC = scoreColor(s.ai);

  const verdict = s.overall < 40
    ? "Right now, AI is sending buyers in your market to your competitors."
    : s.overall < 70
    ? "You show up sometimes, but the highest-intent buyers are still finding someone else first."
    : "You have a foundation. There is still a gap between visible and dominant.";

  if (status === "failed") {
    return (
      <main className="min-h-screen bg-[#F7F8FC] text-[#0F1E3A] font-sans pb-24 md:pb-0">
        <nav className="bg-[#0F1E3A] flex items-center justify-center py-6 px-6">
          <Link href="https://geo.heypearl.io"><Image src="/geo-logo.png" alt="GEO by HeyPearl" width={120} height={50} /></Link>
        </nav>

        <div className="max-w-2xl mx-auto px-6 py-10 space-y-5">

          {/* HEADER */}
          <div className="text-center pt-2 pb-4">
            <div className="inline-flex items-center gap-2 bg-[#E8185C]/10 border border-[#E8185C]/20 rounded-full px-4 py-1.5 mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-[#E8185C] animate-pulse" />
              <span className="text-[#E8185C] text-xs font-bold uppercase tracking-widest">One Agent Per Market</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-[#0F1E3A] leading-tight mb-3">
              {firstName ? `${firstName}, your` : "Your"} site could not be scanned automatically.
            </h1>
            <p className="text-[#4A5E7A] text-base leading-relaxed max-w-lg mx-auto">
              This usually happens for one of two reasons: the website URL was entered without <span className="font-semibold text-[#0F1E3A]">https://</span> (for example, entering <span className="font-mono text-sm bg-[#0F1E3A]/6 px-1 rounded">www.yoursite.com</span> instead of <span className="font-mono text-sm bg-[#0F1E3A]/6 px-1 rounded">https://www.yoursite.com</span>), or the site blocks automated scans. Either way, we pull your full score live on the strategy call.
            </p>
          </div>

          {/* CHATGPT WIDGET (white card) */}
          <div className="bg-white border border-[#0F1E3A]/8 rounded-2xl p-7 shadow-sm">
            <AISimulator scheduleHref={scheduleHref} />
          </div>

          {/* WHY THIS MATTERS (dark navy card) */}
          <div className="bg-[#0F1E3A] rounded-2xl p-8">
            <p className="text-[#9BACC0] text-xs uppercase tracking-widest text-center mb-5">Why Your Website Is The Starting Point</p>
            <p className="text-white text-base leading-relaxed mb-5">
              AI tools like ChatGPT, Perplexity, and Google AI do not pull agent recommendations out of thin air. They look for structured signals: your website, your Google Business Profile, your local citations, and content published about you across the web.
            </p>
            <p className="text-white/70 text-sm leading-relaxed mb-6">
              If those signals are weak, outdated, or missing entirely, AI has nothing to work with. It recommends someone else. Every single time a buyer searches for an agent in your city, that is a moment you either win or lose based on what is already built.
            </p>
            <div className="bg-white/6 border border-white/10 rounded-xl px-5 py-4 mb-6">
              <p className="text-white text-sm leading-relaxed font-medium">
                Most agents in your market are invisible to AI right now. That is not permanent. It is a gap that can be fixed, and the agents who fix it first will own their market before anyone else gets the chance.
              </p>
            </div>
            <Link
              href={scheduleHref}
              className="block w-full bg-[#E8185C] hover:bg-[#c4134d] text-white font-bold text-base py-4 rounded-xl text-center transition-all duration-200 shadow-lg shadow-[#E8185C]/30"
            >
              Claim My Market Before Someone Else Does
            </Link>
            <p className="text-white/30 text-xs text-center mt-2">Free. 30 minutes. One agent per market. Spots are limited.</p>
          </div>

          {/* THE PROBLEM (white card) */}
          <div className="bg-white border border-[#0F1E3A]/8 rounded-2xl p-7 shadow-sm">
            <p className="text-[#E8185C] text-xs font-bold uppercase tracking-widest mb-1">The Problem With Most Agent Websites</p>
            <h2 className="text-xl font-bold text-[#0F1E3A] mb-5">Built for humans. Invisible to AI.</h2>
            <div className="space-y-5">
              {[
                {
                  label: "WEB",
                  title: "No Structured Data",
                  body: "Most agent sites are built on generic templates with no schema markup, no semantic structure, and no signals that tell AI who you are, where you work, or why you are the expert in your city. AI cannot recommend what it cannot read.",
                },
                {
                  label: "AI",
                  title: "No AI Authority Signals",
                  body: "ChatGPT and Perplexity build recommendations from published content, third-party mentions, and consistent citation patterns. A website alone is not enough. You need a system that feeds those platforms continuously.",
                },
                {
                  label: "GEO",
                  title: "No Local Relevance Layer",
                  body: "Showing up for your city in AI search requires a specific combination of location signals, market-specific content, and review patterns that most agent sites are never built to create. This is the gap between agents who get recommended and agents who do not.",
                },
              ].map((gap, i) => (
                <div key={i} className="flex gap-4 items-start pb-5 border-b border-[#EDF0FA] last:border-0 last:pb-0">
                  <div className="w-10 h-10 rounded-xl bg-[#0F1E3A] flex items-center justify-center shrink-0">
                    <span className="text-white text-xs font-bold">{gap.label}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[#0F1E3A] font-bold text-sm mb-1">{gap.title}</p>
                    <p className="text-[#4A5E7A] text-sm leading-relaxed">{gap.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* WHAT GEO BUILDS (navy card) */}
          <div className="bg-[#0F1E3A] rounded-2xl p-8">
            <p className="text-[#9BACC0] text-xs uppercase tracking-widest mb-3">What GEO Builds For You</p>
            <h2 className="text-xl font-bold text-white mb-5">A landing page and visibility system built specifically for AI search.</h2>
            <div className="space-y-3 mb-6">
              {[
                "A custom landing page built with the exact structure AI tools look for when recommending agents in your city",
                "Structured data installed so ChatGPT, Perplexity, and Google AI can read and cite you correctly",
                "Google Business Profile optimized with the language and format that ranks in local AI and map searches",
                "Local citations cleaned and consistent across 40+ directories so your signals are trustworthy",
                "Authority content published weekly in the format AI uses to make recommendations",
                "Monthly monitoring to maintain your position while competitors fall further behind",
              ].map((task, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#E8185C] flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-white text-[10px] font-bold">{i + 1}</span>
                  </div>
                  <p className="text-white/70 text-sm leading-relaxed">{task}</p>
                </div>
              ))}
            </div>
            <div className="bg-white/6 border border-white/10 rounded-xl p-5">
              <p className="text-white font-bold mb-2">This is not a course or a template. It is done entirely for you.</p>
              <p className="text-white/60 text-sm leading-relaxed">
                GEO builds and manages your entire AI visibility system so you can focus on selling. One agent per market. Once your city is claimed, no other agent gets access.
              </p>
            </div>
          </div>

          {/* CTA (white card) */}
          <div className="bg-white border border-[#0F1E3A]/8 rounded-2xl p-8 shadow-sm">
            <p className="text-[#E8185C] text-xs font-bold uppercase tracking-widest mb-3">What Happens On Your Strategy Call</p>
            <h2 className="text-2xl font-bold text-[#0F1E3A] mb-3 leading-snug">
              We pull your live score, show you your market, and hand you three done-for-you assets. Free.
            </h2>
            <p className="text-[#4A5E7A] text-sm leading-relaxed mb-6">
              Even without an automated score, Misti will pull your full AI visibility report live during the call. You will see exactly where you rank in your city, which agents are ahead of you, and what it would take to change that.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
              {[
                "Your live AI visibility score for your exact market",
                "Which agents are outranking you and why",
                "Your AI-Optimized Bio written and ready to use",
                "Your Google Business Profile script",
                "3 Market Authority Talking Points for your next listing appointment",
                "A clear plan for owning your market before another agent does",
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-[#E8185C]/10 border border-[#E8185C]/30 flex items-center justify-center shrink-0 mt-0.5">
                    <svg className="w-2.5 h-2.5 text-[#E8185C]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-[#4A5E7A] text-sm">{item}</p>
                </div>
              ))}
            </div>
            <div className="bg-[#F7F8FC] border border-[#EDF0FA] rounded-xl px-5 py-4 mb-6">
              <p className="text-[#4A5E7A] text-sm leading-relaxed italic mb-2">
                &ldquo;I almost did not book the call. Glad I did. They showed me 4 agents outranking me for searches I had no idea existed. I signed up that day.&rdquo;
              </p>
              <p className="text-[#9BACC0] text-xs">Marcus D., Real Estate Agent, Denver CO</p>
            </div>
            <div className="text-center">
              <Link
                href={scheduleHref}
                className="inline-block bg-[#E8185C] hover:bg-[#c4134d] text-white font-bold text-lg px-10 py-5 rounded-xl transition-all duration-200 shadow-xl shadow-[#E8185C]/30 mb-3"
              >
                Claim My Market Before Someone Else Does
              </Link>
              <p className="text-[#9BACC0] text-xs">Free. 30 minutes. One agent per market. Spots are filling fast.</p>
            </div>
          </div>

        </div>

        <BookingPopup />

        <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-[#0F1E3A] border-t border-white/10 px-4 py-3">
          <Link href={scheduleHref} className="block w-full bg-[#E8185C] hover:bg-[#c4134d] text-white font-bold text-base py-3.5 rounded-xl text-center transition-colors">
            Claim My Market Before Someone Else Does
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F7F8FC] text-[#0F1E3A] font-sans pb-24 md:pb-0">

      {/* NAV */}
      <nav className="bg-[#0F1E3A] flex items-center justify-center py-6 px-6">
        <Link href="https://geo.heypearl.io"><Image src="/geo-logo.png" alt="GEO by HeyPearl" width={120} height={50} /></Link>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-10 space-y-5">

        {/* ── 1. WELCOME ── */}
        <div className="text-center pt-2 pb-4">
          <div className="inline-flex items-center gap-2 bg-[#E8185C]/10 border border-[#E8185C]/20 rounded-full px-4 py-1.5 mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-[#E8185C] animate-pulse" />
            <span className="text-[#E8185C] text-xs font-bold uppercase tracking-widest">One Agent Per Market</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-[#0F1E3A] leading-tight mb-3">
            {firstName ? `Welcome back, ${firstName}.` : "Welcome back."}<br />
            Your AI Visibility Score is ready.
          </h1>
          <p className="text-[#4A5E7A] text-base leading-relaxed max-w-lg mx-auto">
            See exactly how visible you are to AI and what it will take to own your market before another agent does.
          </p>
        </div>

        {/* ── 2. SCORE CARD (dark) ── */}
        <div className="bg-[#0F1E3A] rounded-2xl p-8">
          <p className="text-[#9BACC0] text-xs uppercase tracking-widest text-center mb-6">Your AI Visibility Score</p>

          {/* Score ring + bars */}
          <div className="flex items-center justify-center gap-8 mb-6">
            {/* Overall ring */}
            <div className="text-center shrink-0">
              <div
                className="relative inline-flex items-center justify-center w-32 h-32 rounded-full"
                style={{ background: `conic-gradient(${overallC.ring} ${s.overall}%, rgba(255,255,255,0.06) 0%)` }}
              >
                <div className="absolute inset-2 bg-[#0F1E3A] rounded-full flex flex-col items-center justify-center">
                  <span className={`text-4xl font-bold leading-none ${overallC.text}`}>{s.overall}</span>
                  <span className="text-white/30 text-xs mt-0.5">/100</span>
                </div>
              </div>
              <p className={`text-xs font-bold uppercase tracking-widest mt-2 ${overallC.text}`}>{overallC.label}</p>
              <p className="text-white/40 text-xs">Overall</p>
            </div>

            {/* Sub-scores */}
            <div className="flex-1 space-y-4 max-w-[200px]">
              {[
                { label: "SEO Score", score: s.seo, c: seoC },
                { label: "AI Search", score: s.ai, c: aiC },
              ].map((item) => (
                <div key={item.label}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-white/60 text-sm">{item.label}</span>
                    <span className={`text-sm font-bold ${item.c.text}`}>{item.score}</span>
                  </div>
                  <div className="w-full bg-white/8 rounded-full h-2">
                    <div className={`h-2 rounded-full ${item.c.bar} transition-all duration-1000`} style={{ width: `${item.score}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Verdict */}
          <div className="bg-white/6 border border-white/10 rounded-xl px-5 py-4 text-center mb-6">
            <p className="text-white text-sm leading-relaxed font-medium">{verdict}</p>
          </div>

          {/* CTA inside score card */}
          <Link
            href={scheduleHref}
            className="block w-full bg-[#E8185C] hover:bg-[#c4134d] text-white font-bold text-base py-4 rounded-xl text-center transition-all duration-200 shadow-lg shadow-[#E8185C]/30"
          >
            Book My Free Strategy Call
          </Link>
          <p className="text-white/30 text-xs text-center mt-2">Free. 30 minutes. We walk through this live.</p>
        </div>

        {/* ── 3. WHAT'S BROKEN ── */}
        <div className="bg-white border border-[#0F1E3A]/8 rounded-2xl p-7 shadow-sm">
          <p className="text-[#E8185C] text-xs font-bold uppercase tracking-widest mb-1">Why You Are Not Being Recommended</p>
          <h2 className="text-xl font-bold text-[#0F1E3A] mb-6">Three gaps keeping you out of AI results.</h2>

          <div className="space-y-5">
            {[
              {
                label: "SEO", score: s.seo, c: seoC,
                title: "Search Foundation",
                body: s.seo < 40
                  ? "Your Google Business Profile, local citations, and website structure are not set up in a way AI tools can read. Without this base layer, AI has nothing to work with."
                  : s.seo < 70
                  ? "You have some presence but critical gaps remain. Inconsistent citations and an under-optimized Business Profile are sending incomplete signals."
                  : "Your SEO is solid. The issue is that SEO alone does not reach the AI recommendation layer.",
              },
              {
                label: "AI", score: s.ai, c: aiC,
                title: "AI Recommendation Signals",
                body: s.ai < 40
                  ? "ChatGPT, Perplexity, and Google AI have almost no data connecting you to your city and expertise. When they need to recommend an agent, you are not in the running."
                  : s.ai < 70
                  ? "You have some AI presence but it is inconsistent. Competitors with stronger authority signals are winning the recommendation more often."
                  : "You are visible to AI but not dominant. Being visible and being the one AI recommends first are not the same thing.",
              },
              {
                label: "AUTH", score: null, c: { text: "text-white", bar: "bg-[#0F1E3A]", ring: "#0F1E3A", label: "" },
                title: "Market Authority",
                body: "AI builds recommendations from patterns: reviews, citations, published content, third-party mentions. The more those signals point to you as the expert in your city, the more confidently AI recommends you. Right now those signals are not strong enough.",
              },
            ].map((gap, i) => (
              <div key={i} className="flex gap-4 items-start pb-5 border-b border-[#EDF0FA] last:border-0 last:pb-0">
                <div className="w-10 h-10 rounded-xl bg-[#0F1E3A] flex items-center justify-center shrink-0">
                  <span className="text-white text-xs font-bold">{gap.label}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[#0F1E3A] font-bold text-sm">{gap.title}</p>
                    {gap.score !== null && <span className={`text-sm font-bold ${gap.c.text}`}>{gap.score}/100</span>}
                  </div>
                  {gap.score !== null && (
                    <div className="w-full bg-[#EDF0FA] rounded-full h-1.5 mb-2">
                      <div className={`h-1.5 rounded-full ${gap.c.bar}`} style={{ width: `${gap.score}%` }} />
                    </div>
                  )}
                  <p className="text-[#4A5E7A] text-sm leading-relaxed">{gap.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── 4. WHAT IT TAKES ── */}
        <div className="bg-white border border-[#0F1E3A]/8 rounded-2xl p-7 shadow-sm">
          <p className="text-[#E8185C] text-xs font-bold uppercase tracking-widest mb-1">What Fixing This Actually Requires</p>
          <h2 className="text-xl font-bold text-[#0F1E3A] mb-5">Every gap has a fix. Here is what it looks like.</h2>
          <div className="space-y-3 mb-6">
            {[
              "Audit and repair your Google Business Profile so AI tools can trust and cite it",
              "Clean up local citations across 40+ directories so your data is consistent everywhere AI looks",
              "Install structured data on your website so AI can understand who you are and where you work",
              "Publish answer-based content every week written in the format AI uses to make recommendations",
              "Build authority signals across the platforms that feed ChatGPT, Perplexity, and Google AI",
              "Monitor competitor positions monthly and maintain your lead so no one closes the gap",
            ].map((task, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-[#0F1E3A] flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-white text-[10px] font-bold">{i + 1}</span>
                </div>
                <p className="text-[#4A5E7A] text-sm leading-relaxed">{task}</p>
              </div>
            ))}
          </div>
          <div className="bg-[#F7F8FC] border border-[#EDF0FA] rounded-xl p-5">
            <p className="text-[#0F1E3A] font-bold mb-2">That is a lot. And it compounds every month.</p>
            <p className="text-[#4A5E7A] text-sm leading-relaxed">
              Most agents who read this feel two things: clarity about what is broken, and a quiet recognition they are not going to do all of this themselves. Your time is too valuable to spend on this. That is exactly why GEO exists.
            </p>
          </div>
        </div>

        {/* ── 5. THE SOLUTION (dark) ── */}
        <div className="bg-[#0F1E3A] rounded-2xl p-8">
          <p className="text-[#E8185C] text-xs font-bold uppercase tracking-widest mb-3">That Is Why We Built GEO</p>
          <h2 className="text-2xl font-bold text-white mb-3 leading-snug">
            GEO handles every step on that list. Every month. Done entirely for you.
          </h2>
          <p className="text-white/60 text-sm leading-relaxed mb-6">
            We built GEO so agents never have to choose between running their business and owning their AI visibility. Our team handles everything and compounds it month after month so your position only gets stronger.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
            {[
              "Buyers find you through ChatGPT and Perplexity",
              "Your name appears in Google AI Overviews",
              "Google Business Profile dominates local AI search",
              "New authority content published every week automatically",
              "Competitors cannot close the gap on your position",
              "You wake up to leads you did not chase",
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <div className="w-4 h-4 rounded-full bg-[#E8185C]/20 border border-[#E8185C]/50 flex items-center justify-center shrink-0 mt-0.5">
                  <svg className="w-2.5 h-2.5 text-[#E8185C]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-white/70 text-sm">{item}</p>
              </div>
            ))}
          </div>

          {/* Testimonial */}
          <div className="bg-white/6 border border-white/10 rounded-xl px-5 py-4 mb-6">
            <p className="text-white/80 text-sm leading-relaxed italic mb-2">
              &ldquo;I almost did not book the call. Glad I did. They showed me 4 agents outranking me for searches I had no idea existed. I signed up that day.&rdquo;
            </p>
            <p className="text-white/40 text-xs">Marcus D., Real Estate Agent, Denver CO</p>
          </div>

          {/* Final CTA */}
          <div className="text-center">
            <Link
              href={scheduleHref}
              className="inline-block bg-[#E8185C] hover:bg-[#c4134d] text-white font-bold text-lg px-10 py-5 rounded-xl transition-all duration-200 shadow-xl shadow-[#E8185C]/30 mb-3"
            >
              Book My Free Strategy Call
            </Link>
            <p className="text-white/30 text-xs">Free. 30 minutes. No obligation. One spot per market.</p>
          </div>
        </div>

      </div>

      <BookingPopup />

      {/* MOBILE STICKY CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-[#0F1E3A] border-t border-white/10 px-4 py-3">
        <Link href={scheduleHref} className="block w-full bg-[#E8185C] hover:bg-[#c4134d] text-white font-bold text-base py-3.5 rounded-xl text-center transition-colors">
          Book My Free Strategy Call
        </Link>
      </div>

      <footer className="px-6 py-8 text-center border-t border-[#0F1E3A]/8">
        <p className="text-[#9BACC0] text-sm">&copy; {new Date().getFullYear()} GEO by HeyPearl &middot; All rights reserved.</p>
      </footer>

    </main>
  );
}

export default function ReportPage() {
  return (
    <Suspense>
      <ReportContent />
    </Suspense>
  );
}
