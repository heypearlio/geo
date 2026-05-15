"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import { submitAuditForm } from "../actions";

const PROOF_NOTIFICATIONS = [
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

    const first = setTimeout(() => {
      show(Math.floor(Math.random() * PROOF_NOTIFICATIONS.length));
    }, 5000);

    let idx = 1;
    const interval = setInterval(() => {
      show((idx++) % PROOF_NOTIFICATIONS.length);
    }, 12000);

    return () => { clearTimeout(first); clearInterval(interval); };
  }, []);

  if (current === null) return null;
  const n = PROOF_NOTIFICATIONS[current];

  return (
    <div
      className={`fixed bottom-6 left-6 z-50 transition-all duration-500 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
      }`}
    >
      <div className="bg-white rounded-xl shadow-xl border border-[#0F1E3A]/8 px-4 py-3 flex items-center gap-3 max-w-[260px]">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#E8185C] to-[#162B4C] flex items-center justify-center shrink-0">
          <span className="text-white text-[10px] font-bold">{n.name.split(" ").map((w: string) => w[0]).join("")}</span>
        </div>
        <div>
          <p className="text-[#0F1E3A] text-xs font-semibold leading-tight">{n.name} from {n.city}</p>
          <p className="text-[#6B7FA0] text-[11px] leading-tight mt-0.5">just got their AI visibility score</p>
        </div>
      </div>
    </div>
  );
}

const QUIZ_QUESTIONS: Array<{
  q: string;
  options: string[];
  scores: number[];
  reveal: string;
  key: string;
}> = [
  {
    q: "Do prospects contact you without a referral?",
    options: ["Yes, regularly", "Sometimes", "Rarely", "Almost never"],
    scores: [3, 2, 1, 0],
    reveal: "Inbound leads from new prospects = AI and search are working for you. No inbound = you are invisible to buyers who do not already know you.",
    key: "inbound_leads",
  },
  {
    q: "Is your Google Business Profile fully set up?",
    options: ["Yes, complete", "Basic setup", "No", "What's that?"],
    scores: [3, 1, 0, 0],
    reveal: "Google Business Profile is one of the top signals AI uses to recommend local agents. Most agents leave it empty.",
    key: "gbp_status",
  },
  {
    q: "Have you ever gotten a lead from AI, ChatGPT, or voice search?",
    options: ["Yes!", "Not that I know of", "No", "What is AI search?"],
    scores: [3, 1, 0, 0],
    reveal: "Buyers are asking AI for agent recommendations millions of times a day. If you have never gotten one of those leads, AI does not know you exist.",
    key: "ai_leads",
  },
  {
    q: "How full is your calendar right now?",
    options: ["Booked solid", "It's ok", "Empty", "What calendar?"],
    scores: [3, 2, 1, 0],
    reveal: "A slow calendar almost always means weak visibility. The agents with full pipelines have figured out how to get found by buyers who have never heard of them.",
    key: "calendar_status",
  },
];

function QuizGame({ email, auditId, scheduleHref }: { email: string; auditId: string | null; scheduleHref: string }) {
  const [qIndex, setQIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [totalScore, setTotalScore] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);
  const q = QUIZ_QUESTIONS[qIndex];

  function pick(i: number) {
    if (selected !== null) return;
    setSelected(i);
    const newScore = totalScore + q.scores[i];
    const newAnswers = { ...answers, [q.key]: q.options[i] };
    setAnswers(newAnswers);
    setTotalScore(newScore);
    setTimeout(() => {
      if (qIndex + 1 >= QUIZ_QUESTIONS.length) {
        setDone(true);
        if (email) {
          fetch("/api/quiz-answers", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, auditId, answers: { ...newAnswers, visibility_score: newScore } }),
          }).catch(() => {});
        }
      } else {
        setQIndex(qi => qi + 1);
        setSelected(null);
      }
    }, 1800);
  }

  if (done) {
    const { headline, sub, urgency } =
      totalScore >= 9
        ? { headline: "You have a foundation. Someone is about to take it.", sub: "Your visibility is above average — but above average does not mean dominant. The agents who claim their market first lock everyone else out.", urgency: "Your window to go first is still open. Barely." }
        : totalScore >= 5
        ? { headline: "You are losing leads you do not even know about.", sub: "Buyers are asking AI for agents in your city right now and getting sent to someone else. Your calendar reflects it.", urgency: "The gap is closable. But not if you wait." }
        : { headline: "AI does not know you exist yet.", sub: "Every AI-referred buyer in your market is going to a competitor. That is happening dozens of times a day.", urgency: "Your market is still wide open. That changes fast." };

    return (
      <div className="mt-6 pt-6 border-t border-[#0F1E3A]/8 text-center">
        <p className="text-[#0F1E3A] font-bold text-lg leading-snug mb-2">{headline}</p>
        <p className="text-[#4A5E7A] text-sm leading-relaxed mb-2">{sub}</p>
        <p className="text-[#E8185C] text-sm font-semibold mb-5">{urgency}</p>
        <a
          href={scheduleHref}
          className="flex items-center justify-center gap-2 bg-[#E8185C] hover:bg-[#c4134d] text-white font-bold text-base px-8 py-4 rounded-xl transition-all duration-200 shadow-lg shadow-[#E8185C]/30 w-full"
        >
          Book My Free Strategy Call
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </a>
        <p className="text-[#9BACC0] text-xs mt-3">Free. No pitch until you have seen your full results.</p>
      </div>
    );
  }

  return (
    <div className="mt-6 pt-6 border-t border-[#0F1E3A]/8">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[#0F1E3A] text-xs font-bold uppercase tracking-widest">Quick check</p>
        <div className="flex items-center gap-1.5">
          {QUIZ_QUESTIONS.map((_, i) => (
            <div key={i} className={`w-2 h-2 rounded-full transition-all duration-300 ${i < qIndex ? "bg-[#E8185C]" : i === qIndex ? "bg-[#E8185C] scale-125" : "bg-[#0F1E3A]/15"}`} />
          ))}
        </div>
      </div>
      <p className="text-[#0F1E3A] font-bold text-base leading-snug mb-3">{q.q}</p>
      <div className="grid grid-cols-2 gap-2 mb-3">
        {q.options.map((opt, i) => {
          const isSelected = selected === i;
          let cls = "px-3 py-3 rounded-xl text-sm font-medium border text-left transition-all duration-200 ";
          if (selected === null) {
            cls += "bg-[#F7F8FC] border-[#0F1E3A]/10 text-[#0F1E3A] hover:bg-[#EDF0FA] hover:border-[#0F1E3A]/25 cursor-pointer";
          } else if (isSelected) {
            cls += "bg-[#E8185C]/8 border-[#E8185C]/40 text-[#0F1E3A] font-semibold";
          } else {
            cls += "bg-[#F7F8FC] border-[#0F1E3A]/10 text-[#6B7FA0] opacity-40";
          }
          return (
            <button key={i} onClick={() => pick(i)} disabled={selected !== null} className={cls}>
              {opt}
            </button>
          );
        })}
      </div>
      {selected !== null && (
        <div className="rounded-xl px-4 py-3 bg-[#F7F8FC] border border-[#0F1E3A]/8 text-sm leading-relaxed text-[#4A5E7A]">
          {q.reveal}
        </div>
      )}
    </div>
  );
}

const SCAN_STEPS = [
  { label: "Scanning ChatGPT recommendations...", until: 18, platform: "ChatGPT" },
  { label: "Checking Perplexity AI results...", until: 35, platform: "Perplexity" },
  { label: "Checking Google AI Overviews...", until: 52, platform: "Google AI" },
  { label: "Checking Apple Maps and local search...", until: 68, platform: "Apple Maps" },
  { label: "Scanning competitor agent profiles...", until: 83, platform: "Competitors" },
  { label: "Calculating your visibility score...", until: 95, platform: "Scoring" },
];


function TypewriterText({ text, speed = 18, onDone }: { text: string; speed?: number; onDone?: () => void }) {
  const [displayed, setDisplayed] = useState("");
  const i = useRef(0);

  useEffect(() => {
    if (i.current >= text.length) { onDone?.(); return; }
    const t = setTimeout(() => {
      setDisplayed(text.slice(0, i.current + 1));
      i.current += 1;
    }, speed);
    return () => clearTimeout(t);
  }, [displayed, text, speed, onDone]);

  return <span>{displayed}<span className="animate-pulse">|</span></span>;
}

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

function AISimulator({ name, city, onComplete }: { name: string; city: string; onComplete?: () => void }) {
  const [phase, setPhase] = useState<"idle" | "typing-query" | "asking" | "responding" | "done" | "error">("idle");
  const [typedQuery, setTypedQuery] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const queryRef = useRef(0);

  const query = `Who is the best real estate agent in ${city || "your area"}?`;

  const start = () => {
    queryRef.current = 0;
    setTypedQuery("");
    setPhase("typing-query");
  };

  useEffect(() => {
    if (phase !== "typing-query") return;
    if (queryRef.current >= query.length) {
      setTimeout(callChatGPT, 500);
      return;
    }
    const t = setTimeout(() => {
      setTypedQuery(query.slice(0, queryRef.current + 1));
      queryRef.current += 1;
    }, 38);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, typedQuery]);

  const callChatGPT = async () => {
    setPhase("asking");
    try {
      const res = await fetch("/api/chatgpt-sim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ city: city || "your area" }),
      });
      const data = await res.json();
      if (data.response) { setAiResponse(data.response); setPhase("responding"); }
      else setPhase("error");
    } catch { setPhase("error"); }
  };

  const firstName = name || "";

  return (
    <div className="space-y-4">

      {/* Personalized heading */}
      <h3 className="text-[#0F1E3A] font-bold text-lg leading-snug">
        {firstName ? <>{firstName}, find</> : <>Find</>} out who ChatGPT is recommending in {city || "your market"} right now.
      </h3>

      {/* Run button */}
      {phase === "idle" && (
        <button
          onClick={start}
          className="inline-flex items-center gap-2 bg-[#22c55e] hover:bg-[#16a34a] text-white font-semibold px-6 py-3 rounded-xl transition-colors text-sm shadow-md shadow-green-500/30"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Run the live test
        </button>
      )}

      {phase === "error" && (
        <div className="text-center py-2">
          <p className="text-[#6B7FA0] text-sm mb-2">Could not load result. Try again.</p>
          <button onClick={start} className="text-[#E8185C] text-sm font-medium underline">Retry</button>
        </div>
      )}

      {/* Auto-typing query bubble */}
      {(phase === "typing-query" || phase === "asking" || phase === "responding" || phase === "done") && (
        <div className="flex justify-end">
          <div className="bg-[#0F1E3A] text-white text-sm px-4 py-3 rounded-2xl rounded-tr-sm max-w-sm">
            {phase === "typing-query"
              ? <>{typedQuery}<span className="animate-pulse">|</span></>
              : query}
          </div>
        </div>
      )}

      {/* Typing dots */}
      {phase === "asking" && <TypingDots />}

      {/* Real ChatGPT response */}
      {(phase === "responding" || phase === "done") && (
        <div className="flex gap-3 items-start">
          <GPTAvatar />
          <div className="bg-[#F7F8FC] border border-[#0F1E3A]/8 text-[#0F1E3A] text-sm px-4 py-3 rounded-2xl rounded-tl-sm flex-1">
            {phase === "responding"
              ? <TypewriterText text={aiResponse} onDone={() => { setPhase("done"); onComplete?.(); }} />
              : aiResponse}
          </div>
        </div>
      )}

      {phase === "done" && (() => {
        const nameInResponse = name && aiResponse.toLowerCase().includes(name.toLowerCase());
        return nameInResponse ? (
          <div className="bg-green-50 border border-green-300 rounded-xl px-5 py-4">
            <p className="text-green-700 font-bold text-sm mb-1">You are in there!</p>
            <p className="text-[#0F1E3A] text-sm leading-relaxed">
              ChatGPT is already recommending you in {city || "your market"}. Now the goal is to dominate that spot and make sure no other agent takes it. Your full report shows exactly how to lock it in.
            </p>
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4">
            <p className="text-amber-700 font-bold text-sm mb-1">Did you notice?</p>
            <p className="text-[#0F1E3A] text-sm leading-relaxed">
              Your name is not in that answer. A buyer just asked for the best agent in {city || "your market"} and got sent to someone else. This is happening dozens of times a day.
            </p>
          </div>
        );
      })()}
    </div>
  );
}

function AuditLoadingBar({ auditReady }: { auditReady: boolean }) {
  const DURATION = 75;
  const [elapsed, setElapsed] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setElapsed(prev => Math.min(prev + 1, DURATION)), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => { if (auditReady && !done) setDone(true); }, [auditReady, done]);

  const progress = done ? 100 : Math.min((elapsed / DURATION) * 100, 95);
  const stepIndex = Math.min(Math.floor((elapsed / DURATION) * SCAN_STEPS.length), SCAN_STEPS.length - 1);
  const currentStep = SCAN_STEPS[stepIndex];
  const remaining = Math.max(DURATION - elapsed, 0);

  return (
    <>
      {/* Fixed top banner — whenever scan is done */}
      {done && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-green-500 shadow-lg">
          <div className="max-w-2xl mx-auto px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-white animate-pulse shrink-0" />
              <span className="text-white font-bold text-sm">Your AI Visibility Score is ready.</span>
            </div>
            <button
              onClick={() => document.getElementById("score-reveal")?.scrollIntoView({ behavior: "smooth" })}
              className="text-white font-bold text-sm underline underline-offset-2 hover:text-green-100 transition-colors shrink-0"
            >
              See your score
              <svg className="w-3.5 h-3.5 inline-block ml-1 -mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Loading bar — stays on page permanently */}
      <div className={`sticky top-0 z-40 rounded-xl border px-5 pt-4 pb-3 mb-8 shadow-md ${done ? "bg-green-50 border-green-300" : "bg-white border-[#0F1E3A]/10"}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {done
              ? <div className="w-4 h-4 rounded-full bg-green-500 shrink-0" />
              : <div className="w-4 h-4 border-2 border-[#E8185C]/30 border-t-[#E8185C] rounded-full animate-spin shrink-0" />}
            <span className={`text-sm font-semibold ${done ? "text-green-700" : "text-[#0F1E3A]"}`}>
              {done ? "Scan complete. All platforms checked." : currentStep.label}
            </span>
          </div>
          <span className={`text-sm font-bold tabular-nums shrink-0 ml-3 ${done ? "text-green-700" : "text-[#E8185C]"}`}>
            {done ? "100%" : remaining > 0 ? `${remaining}s` : "Almost done..."}
          </span>
        </div>
        <div className="w-full bg-[#0F1E3A]/8 rounded-full h-2.5 overflow-hidden mb-3">
          <div className="h-2.5 rounded-full transition-all duration-1000 ease-linear" style={{ width: `${progress}%`, backgroundColor: done ? "#22c55e" : "#E8185C" }} />
        </div>
        <div className="flex justify-between">
          {SCAN_STEPS.map((step, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <div className={`w-2 h-2 rounded-full transition-colors duration-300 ${done || i < stepIndex ? "bg-green-500" : i === stepIndex ? "bg-[#E8185C] animate-pulse" : "bg-[#0F1E3A]/20"}`} />
              <span className="text-[9px] text-[#6B7FA0] hidden sm:block">{step.platform}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}


function ScoreRing({ score }: { score: number }) {
  const color = score >= 70 ? "#22c55e" : score >= 40 ? "#f59e0b" : "#dc2626";
  return (
    <div className="relative inline-flex items-center justify-center w-44 h-44 rounded-full" style={{ background: `conic-gradient(${color} ${score}%, rgba(15,30,58,0.08) 0%)` }}>
      <div className="absolute inset-2 bg-white rounded-full flex flex-col items-center justify-center shadow-sm">
        <span className="text-5xl font-bold text-[#0F1E3A] leading-none">{score}</span>
        <span className="text-[#6B7FA0] text-sm mt-1">/100</span>
      </div>
    </div>
  );
}


function ScoreContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const auditId = searchParams.get("auditId");
  const email = searchParams.get("email") ?? "";
  const city = searchParams.get("city") ?? "";
  const name = searchParams.get("name") ?? "";
  const lastName = searchParams.get("lastName") ?? "";
  const originalWebsite = searchParams.get("website") ?? "";
  const affiliateSlug = searchParams.get("affiliateSlug") ?? "";

  const [auditState, setAuditState] = useState<"loading" | "ready" | "failed">("loading");
  const [scores, setScores] = useState<{ overall: number; seo: number; ai: number } | null>(null);
  const [retryWebsite, setRetryWebsite] = useState(originalWebsite);
  const [retryName, setRetryName] = useState(name);
  const [retryEmail, setRetryEmail] = useState(email);
  const [retryError, setRetryError] = useState("");
  const [retryPending, startRetryTransition] = useTransition();
  const [showExitIntent, setShowExitIntent] = useState(false);
  const exitShown = useRef(false);
  const calendlyLoaded = useRef(false);

  useEffect(() => {
    if (email) {
      fetch("/api/tag", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, segment: "score" }) }).catch(() => {});
    }
  }, [email]);

  useEffect(() => {
    if (!auditId) { setAuditState("failed"); return; }
    const poll = setInterval(async () => {
      try {
        const res = await fetch(`/api/audit-status?id=${auditId}`);
        const data = await res.json();
        if (data.status === "COMPLETED") {
          const overall = Math.round(data.overallScore ?? 0);
          const seo = Math.round(data.seoScore ?? 0);
          const ai = Math.round(data.aiScore ?? 0);
          setScores({ overall, seo, ai });
          setAuditState("ready");
          clearInterval(poll);
          setTimeout(() => document.getElementById("score-reveal")?.scrollIntoView({ behavior: "smooth", block: "start" }), 300);
          // Fire AI email generation — scores now confirmed
          if (email) {
            fetch("/api/generate-audit-email", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email, firstName: name, city, auditId, overall, seo, ai, affiliateSlug }),
            }).catch(() => {});
          }
        } else if (data.status === "FAILED") {
          setAuditState("failed");
          clearInterval(poll);
          if (email) {
            fetch("/api/tag", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, segment: "audit_failed" }) }).catch(() => {});
          }
        }
      } catch {}
    }, 5000);
    return () => clearInterval(poll);
  }, [auditId]);

  // Load Calendly widget script once score is ready
  useEffect(() => {
    if (auditState !== "ready" && auditState !== "failed") return;
    if (calendlyLoaded.current) return;
    calendlyLoaded.current = true;
    const script = document.createElement("script");
    script.src = "https://assets.calendly.com/assets/external/widget.js";
    script.async = true;
    document.body.appendChild(script);
  }, [auditState]);

  // Handle Calendly booking event
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.data?.event === "calendly.event_scheduled" && email) {
        fetch("/api/booked", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        }).catch(() => {});
        window.location.href = `/results?auditId=${auditId ?? ""}`;
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [auditId, email]);

  // Exit-intent detection (mouse leaves top of viewport)
  useEffect(() => {
    // Only arm after 8 seconds so we don't fire immediately
    let armed = false;
    const arm = setTimeout(() => { armed = true; }, 8000);
    function handleMouseLeave(e: MouseEvent) {
      if (!armed || exitShown.current) return;
      if (e.clientY <= 5) {
        exitShown.current = true;
        setShowExitIntent(true);
      }
    }
    document.addEventListener("mouseleave", handleMouseLeave);
    return () => { clearTimeout(arm); document.removeEventListener("mouseleave", handleMouseLeave); };
  }, []);

  const reportHref = `/schedule?email=${encodeURIComponent(email)}&firstName=${encodeURIComponent(name)}&auditId=${auditId ?? ""}`;
  const auditReady = auditState === "ready" || auditState === "failed";
  const [simDone, setSimDone] = useState(false);

  return (
    <main className="min-h-screen bg-[#F7F8FC] text-[#0F1E3A] font-sans">

      <nav className="bg-[#0F1E3A] flex items-center justify-center py-6 px-6 border-b border-white/10">
        <Link href="https://geo.heypearl.io"><Image src="/geo-logo.png" alt="GEO by HeyPearl" width={120} height={50} /></Link>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-10">

        {/* HERO */}
        <div className="text-center mb-6">
          <h1 className="text-3xl md:text-4xl font-bold mb-3 text-[#0F1E3A]">
            Your instant AI visibility audit is running.
          </h1>
          <p className="text-[#4A5E7A] leading-relaxed">
            Your score will be ready in under 60 seconds. Read below while you wait.
          </p>
        </div>

        <AuditLoadingBar auditReady={auditReady} />

        {/* LIVE AI TEST + WHY QUIZ — combined */}
        <div className="bg-white border border-[#0F1E3A]/8 rounded-2xl p-6 mb-6 shadow-sm">
          <AISimulator name={name} city={city} onComplete={() => setSimDone(true)} />
          {simDone && (
            <QuizGame email={email} auditId={auditId} scheduleHref={reportHref} />
          )}
        </div>

        {/* WHAT YOUR SCORE MEANS */}
        <div className="bg-[#0F1E3A] rounded-2xl p-8 mb-6 text-white">
          <p className="text-[#E8185C] text-xs font-bold uppercase tracking-widest mb-3">What This Score Measures</p>
          <h2 className="text-2xl font-bold mb-4">One thing: when a buyer asks AI for an agent in {city || "your city"}, does your name come up?</h2>
          <p className="text-gray-300 text-sm leading-relaxed mb-6">
            Not followers. Not reviews. Not how nice your website looks. This score measures whether the fastest-growing buyer search channel in real estate is working for you or against you right now.
          </p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { range: "0-39", label: "Invisible", desc: "AI tools do not know you exist.", color: "text-red-400" },
              { range: "40-69", label: "Partial", desc: "You show up, but not first.", color: "text-amber-400" },
              { range: "70-100", label: "Visible", desc: "Foundation exists. Not dominant yet.", color: "text-green-400" },
            ].map((s, i) => (
              <div key={i} className="bg-white/6 border border-white/10 rounded-xl p-4 text-center">
                <p className={`text-lg font-bold ${s.color}`}>{s.range}</p>
                <p className="text-white font-semibold text-xs mt-1 mb-1">{s.label}</p>
                <p className="text-gray-400 text-xs leading-tight">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* SCORE REVEAL */}
        {auditState === "failed" && (
          <div id="score-reveal" className="bg-white border border-[#0F1E3A]/8 rounded-2xl p-8 mb-6 shadow-sm">
            <div className="text-center mb-6">
              <span className="text-3xl mb-3 block">⚠️</span>
              <h3 className="text-xl font-bold text-[#0F1E3A] mb-2">We couldn&apos;t scan your website.</h3>
              <p className="text-[#4A5E7A] text-sm leading-relaxed">That happens sometimes with certain site setups. Your score may still be lower than you think — book a free strategy call and we&apos;ll review your AI visibility together.</p>
            </div>

            {/* PRIMARY CTA — scroll to embedded Calendly */}
            <button
              onClick={() => document.getElementById("book-call")?.scrollIntoView({ behavior: "smooth", block: "start" })}
              className="flex items-center justify-center gap-2 w-full bg-[#E8185C] hover:bg-[#c4134d] text-white font-bold text-base py-4 rounded-xl transition-all duration-200 shadow-lg shadow-[#E8185C]/30 mb-4"
            >
              Book My Free Strategy Call
            </button>

            {/* SECONDARY — Re-run with corrected URL */}
            <p className="text-[#6B7FA0] text-xs text-center mb-3">Or fix your website URL and try again:</p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setRetryError("");
                const fd = new FormData();
                fd.set("firstName", retryName || "Agent");
                fd.set("lastName", lastName);
                fd.set("email", retryEmail);
                fd.set("city", city || "");
                fd.set("website", retryWebsite);
                startRetryTransition(async () => {
                  const result = await submitAuditForm(fd);
                  if (result.success) {
                    const newAuditId = result.auditId ?? "";
                    const params = new URLSearchParams({
                      auditId: newAuditId,
                      email: retryEmail,
                      city: city || "",
                      name: retryName || "Agent",
                      lastName,
                      website: retryWebsite,
                      affiliateSlug,
                    });
                    router.push(`/score?${params.toString()}`);
                  } else {
                    setRetryError(result.error || "Something went wrong. Please try again.");
                  }
                });
              }}
              className="space-y-3"
            >
              {!email && (
                <div>
                  <label className="block text-xs font-semibold text-[#0F1E3A] uppercase tracking-wide mb-1.5">Email Address</label>
                  <input
                    type="email"
                    value={retryEmail}
                    onChange={(e) => setRetryEmail(e.target.value)}
                    required
                    placeholder="sarah@youragency.com"
                    className="w-full bg-[#F7F8FC] border border-[#0F1E3A]/12 rounded-xl px-3 py-3 text-[#0F1E3A] placeholder-[#9BACC0] focus:outline-none focus:border-[#E8185C] focus:bg-white transition-colors text-[16px]"
                  />
                </div>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={retryWebsite}
                  onChange={(e) => setRetryWebsite(e.target.value)}
                  required
                  placeholder="https://yoursite.com"
                  className="flex-1 bg-[#F7F8FC] border border-[#0F1E3A]/12 rounded-xl px-3 py-3 text-[#0F1E3A] placeholder-[#9BACC0] focus:outline-none focus:border-[#E8185C] focus:bg-white transition-colors text-[16px]"
                />
                <button
                  type="submit"
                  disabled={retryPending}
                  className="bg-[#0F1E3A] hover:bg-[#162B4C] disabled:opacity-60 text-white font-bold text-sm px-4 rounded-xl transition-colors flex items-center gap-2 whitespace-nowrap"
                >
                  {retryPending ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "Retry"}
                </button>
              </div>
              {retryError && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  <p className="text-red-600 text-sm">{retryError}</p>
                </div>
              )}
            </form>
          </div>
        )}
        {(auditState === "ready" && scores) && (
          <div id="score-reveal" className="bg-white border border-[#0F1E3A]/8 rounded-2xl p-8 mb-6 text-center shadow-sm">
            <p className="text-[#6B7FA0] font-semibold uppercase tracking-widest text-xs mb-6">Your AI Visibility Score</p>
            <div className="flex justify-center mb-5">
              <ScoreRing score={scores.overall} />
            </div>
            <div className="grid grid-cols-2 gap-3 mb-5 max-w-xs mx-auto">
              <div className="bg-[#F7F8FC] rounded-xl p-4 border border-[#0F1E3A]/8">
                <p className="text-2xl font-bold text-[#0F1E3A]">{scores.seo}</p>
                <p className="text-[#6B7FA0] text-xs mt-1">SEO Score</p>
              </div>
              <div className="bg-[#F7F8FC] rounded-xl p-4 border border-[#0F1E3A]/8">
                <p className="text-2xl font-bold text-[#E8185C]">{scores.ai}</p>
                <p className="text-[#6B7FA0] text-xs mt-1">AI Search Score</p>
              </div>
            </div>
            <div className={`rounded-xl px-5 py-4 text-left ${scores.overall < 40 ? "bg-red-50 border border-red-200" : scores.overall < 70 ? "bg-amber-50 border border-amber-200" : "bg-green-50 border border-green-200"}`}>
              <p className={`font-bold text-sm mb-1 ${scores.overall < 40 ? "text-red-600" : scores.overall < 70 ? "text-amber-700" : "text-green-700"}`}>
                {scores.overall < 40 ? "Critical: AI Cannot Find You" : scores.overall < 70 ? "Partial: You Are Losing High-Intent Buyers" : "Good Foundation: Not Dominant Yet"}
              </p>
              <p className="text-[#0F1E3A] text-sm leading-relaxed">
                {scores.overall < 40
                  ? "Right now, another agent is getting every AI-referred lead in your market. This is significant but completely fixable."
                  : scores.overall < 70
                  ? "You have some presence. The highest-intent buyers, pre-approved and ready to act, are still finding other agents first."
                  : "You are ahead of most agents. The gap between visibility and dominance is smaller than you think."}
              </p>
            </div>

            <div className="mt-6 pt-6 border-t border-[#0F1E3A]/8">
              <p className="text-[#0F1E3A] font-bold text-lg mb-1">
                {scores.overall < 40
                  ? "See exactly how to fix this before someone else claims your market."
                  : scores.overall < 70
                  ? "See exactly what is costing you high-intent leads right now."
                  : "See exactly what it takes to go from visible to dominant."}
              </p>
              <p className="text-[#6B7FA0] text-sm mb-5">See the AI marketing engine built to move this number and what it looks like in your market.</p>
              <button
                onClick={() => document.getElementById("book-call")?.scrollIntoView({ behavior: "smooth", block: "start" })}
                className="flex items-center justify-center gap-2 bg-[#E8185C] hover:bg-[#c4134d] text-white font-bold text-base px-8 py-4 rounded-xl transition-all duration-200 shadow-lg shadow-[#E8185C]/30 w-full"
              >
                Book My Free Strategy Call
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
              <p className="text-[#9BACC0] text-xs text-center mt-3">Free. No pitch until you have seen your full results.</p>
            </div>
          </div>
        )}

        {/* CALENDLY EMBED — shown after score is ready */}
        {(auditState === "ready" || auditState === "failed") && (
          <div id="book-call" className="bg-white border border-[#0F1E3A]/8 rounded-2xl p-8 mb-6 shadow-sm">
            <p className="text-[#E8185C] text-xs font-bold uppercase tracking-widest mb-2 text-center">Free Strategy Call</p>
            <h2 className="text-xl font-bold text-[#0F1E3A] mb-2 text-center leading-snug">
              Book your free 30-minute strategy call
            </h2>
            <p className="text-[#4A5E7A] text-sm text-center mb-6">
              We will walk through your score together, show you who is being recommended in your market right now, and map out exactly what it would take to make your name the answer.
            </p>
            <div
              className="calendly-inline-widget"
              data-url={`https://calendly.com/hey-pearl/meet?hide_gdpr_banner=1&hide_event_type_details=1&hide_landing_page_details=1&background_color=ffffff&text_color=0F1E3A&primary_color=E8185C${email ? `&email=${encodeURIComponent(email)}` : ""}${name ? `&name=${encodeURIComponent(name)}` : ""}`}
              style={{ minWidth: 320, height: 700 }}
            />
            <p className="text-[#9BACC0] text-xs text-center mt-4">Free. No pitch until you see the full breakdown.</p>
          </div>
        )}

        {/* SCORE CTA */}
        {(auditState === "ready" && scores) && (
          <div className="bg-[#0F1E3A] rounded-2xl p-8 mb-6 text-center">
            <p className="text-[#E8185C] text-xs font-bold uppercase tracking-widest mb-3">Want To Improve This Score?</p>
            <h2 className="text-2xl font-bold text-white mb-3 leading-snug">
              {scores.overall < 40
                ? "Your score is low. That means the opportunity in your market is still wide open."
                : scores.overall < 70
                ? "Your score has gaps. The agents filling them are getting your leads."
                : "You have a foundation. Dominating your market is the next step."}
            </h2>
            <p className="text-gray-400 text-sm leading-relaxed">
              GEO is the AI marketing engine built specifically to move this number. It handles every signal AI looks for, builds your authority in your market, and runs the entire system for you every month.
            </p>
          </div>
        )}

        {/* SEO VS AI */}
        <div className="bg-white border border-[#0F1E3A]/8 rounded-2xl p-8 mb-6 shadow-sm">
          <p className="text-[#E8185C] text-xs font-bold uppercase tracking-widest mb-3">Your Two Scores Explained</p>
          <h2 className="text-xl font-bold mb-5 text-[#0F1E3A]">SEO is Google. AI is ChatGPT, Perplexity, and every smart device your buyer owns. They are not the same thing and you need to win both.</h2>
          <div className="space-y-5">
            <div className="flex gap-4 items-start">
              <div className="w-10 h-10 rounded-xl bg-[#0F1E3A] flex items-center justify-center shrink-0">
                <span className="text-white text-xs font-bold">SEO</span>
              </div>
              <div>
                <p className="font-bold text-[#0F1E3A] mb-1 text-sm">SEO Score: traditional search</p>
                <p className="text-[#4A5E7A] text-sm leading-relaxed">Google rankings, your Business Profile, local citations. This is table stakes. Every agent has some version of this. A strong SEO score means buyers who already know to Google you can find you. It does not mean AI knows you exist.</p>
              </div>
            </div>
            <div className="border-t border-[#0F1E3A]/8 pt-5 flex gap-4 items-start">
              <div className="w-10 h-10 rounded-xl bg-[#E8185C] flex items-center justify-center shrink-0">
                <span className="text-white text-xs font-bold">AI</span>
              </div>
              <div>
                <p className="font-bold text-[#0F1E3A] mb-1 text-sm">AI Score: where buyers are going right now</p>
                <p className="text-[#4A5E7A] text-sm leading-relaxed">ChatGPT, Perplexity, and Google AI are answering buyer questions with specific agent names. This is happening millions of times a day. The agents being named are not the most experienced. They are the most optimized. Right now, almost nobody in your market has claimed this position. That window is closing fast.</p>
              </div>
            </div>
          </div>
        </div>

        {/* GEO EDUCATION */}
        <div className="bg-white border border-[#0F1E3A]/8 rounded-2xl p-8 shadow-sm">
          <p className="text-[#E8185C] text-xs font-bold uppercase tracking-widest mb-3">Why Your Score Looks Like This</p>
          <h2 className="text-xl font-bold text-[#0F1E3A] mb-5">AI does not search the web. It pulls from a very specific set of signals. Most agents have none of them.</h2>
          <p className="text-[#4A5E7A] text-sm leading-relaxed mb-6">
            When a buyer asks ChatGPT who the best agent in your city is, it does not Google the answer. It synthesizes from structured data on your website, consistent citations across directories, authority signals from third-party sources, published content written in the format AI uses to form recommendations, and review patterns that signal trust. If those signals are weak or missing, AI has no reason to name you.
          </p>
          <div className="bg-[#F7F8FC] rounded-xl p-5 mb-6">
            <p className="text-[#0F1E3A] text-xs font-bold uppercase tracking-widest mb-3">The New Discipline: Generative Engine Optimization</p>
            <p className="text-[#4A5E7A] text-sm leading-relaxed">
              The practice of optimizing for AI recommendation engines is called Generative Engine Optimization. GEO is to ChatGPT what SEO is to Google. It is a different game with different rules and most agents do not know it exists yet. The ones who figure it out first will own their markets in AI search for years.
            </p>
          </div>
          <div className="space-y-3">
            {[
              "Structured data that tells AI exactly who you are, where you work, and what you specialize in",
              "Citation consistency across every directory AI pulls from",
              "Answer-based content written in the format AI uses to form recommendations",
              "Authority signals that make AI confident enough to name you by name",
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-[#E8185C]/10 border border-[#E8185C]/30 flex items-center justify-center shrink-0 mt-0.5">
                  <svg className="w-2.5 h-2.5 text-[#E8185C]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-[#4A5E7A] text-sm leading-relaxed">{item}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="bg-[#0F1E3A] rounded-2xl p-8 text-center">
          <p className="text-[#E8185C] text-xs font-bold uppercase tracking-widest mb-3">The Answer Is GEO</p>
          <h2 className="text-2xl font-bold text-white mb-3 leading-snug">
            If you want AI to consistently recommend you in your market, you need GEO.
          </h2>
          <p className="text-gray-300 text-sm leading-relaxed mb-8">
            GEO is the world's first AI marketing engine built specifically for real estate agents. It handles every signal AI looks for, every month, so you become the undeniable authority in your market without lifting a finger.
          </p>
          {auditReady ? (
            <button
              onClick={() => document.getElementById("book-call")?.scrollIntoView({ behavior: "smooth", block: "start" })}
              className="inline-block bg-[#E8185C] hover:bg-[#c4134d] text-white font-bold text-lg px-8 py-4 rounded-xl transition-all duration-200 shadow-lg shadow-[#E8185C]/30"
            >
              Book My Free Strategy Call
            </button>
          ) : (
            <div className="space-y-3">
              <div className="inline-flex items-center gap-3 bg-white/5 border border-white/10 text-gray-400 font-semibold text-base px-8 py-4 rounded-xl cursor-not-allowed select-none">
                <div className="w-4 h-4 border-2 border-[#E8185C]/30 border-t-[#E8185C] rounded-full animate-spin shrink-0" />
                Unlocks when your score is ready
              </div>
              <p className="text-gray-600 text-xs">This button unlocks automatically. No refresh needed.</p>
            </div>
          )}
        </div>

      </div>

      <footer className="px-6 py-8 text-center border-t border-[#0F1E3A]/8">
        <p className="text-[#9BACC0] text-sm">&copy; {new Date().getFullYear()} GEO by HeyPearl &middot; All rights reserved.</p>
      </footer>

      {/* Exit-intent popup */}
      {showExitIntent && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-5" onClick={() => setShowExitIntent(false)}>
          <div
            className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl text-center"
            onClick={e => e.stopPropagation()}
          >
            <div className="text-4xl mb-4">⚠️</div>
            <h2 className="text-[#0F1E3A] text-2xl font-bold mb-3 leading-snug">
              Wait — your market may still be open.
            </h2>
            <p className="text-[#4A5E7A] text-sm leading-relaxed mb-6">
              GEO locks one agent per market. Once your market is claimed, it is gone. A 30-minute call costs you nothing and shows you exactly where you stand before someone else takes your spot.
            </p>
            <button
              onClick={() => {
                setShowExitIntent(false);
                document.getElementById("book-call")?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              className="w-full bg-[#E8185C] hover:bg-[#c4134d] text-white font-bold text-base py-4 rounded-xl transition-all duration-200 shadow-lg shadow-[#E8185C]/30 mb-3"
            >
              Book My Free Strategy Call
            </button>
            <button
              onClick={() => setShowExitIntent(false)}
              className="text-[#9BACC0] text-xs underline cursor-pointer bg-transparent border-none"
            >
              No thanks, I will take my chances
            </button>
          </div>
        </div>
      )}

    </main>
  );
}

export default function ScorePage() {
  return (
    <Suspense>
      <ScoreContent />
      <SocialProofPopup />
    </Suspense>
  );
}
