"use client";

import { useState, useEffect } from "react";

interface Option {
  value: string;
  label: string;
  sub: string;
  icon: string;
}

interface Slide {
  step: number;
  question: string;
  context: string;
  options: Option[];
}

const SLIDES: Slide[] = [
  {
    step: 1,
    question: "What's your situation right now?",
    context:
      "No pressure. This helps us focus on what actually matters for you.",
    options: [
      {
        value: "ready",
        label: "I'm ready to sell",
        sub: "Need to move soon or ready to list",
        icon: "🏡",
      },
      {
        value: "exploring",
        label: "I'm exploring options",
        sub: "Not sure yet — want to understand what's possible",
        icon: "🔍",
      },
      {
        value: "curious",
        label: "Just curious",
        sub: "Want to know what my home is worth today",
        icon: "💡",
      },
    ],
  },
  {
    step: 2,
    question: "What matters most to you?",
    context:
      "No wrong answer. This shapes the recommendation you'll see at the end.",
    options: [
      {
        value: "max_money",
        label: "Maximum money",
        sub: "I want every dollar I can get",
        icon: "💰",
      },
      {
        value: "fast",
        label: "Sell fast",
        sub: "Speed matters more than squeezing out every dollar",
        icon: "⚡",
      },
      {
        value: "no_stress",
        label: "Minimum stress",
        sub: "I want the simplest, cleanest path out",
        icon: "✌️",
      },
    ],
  },
  {
    step: 3,
    question: "What's your biggest concern about selling?",
    context:
      "Most sellers share one of these. Knowing yours means we address it directly.",
    options: [
      {
        value: "fees",
        label: "Hidden fees",
        sub: "I don't know what I'd actually walk away with",
        icon: "📋",
      },
      {
        value: "price",
        label: "Leaving money behind",
        sub: "Pricing too low and not knowing it",
        icon: "📉",
      },
      {
        value: "repairs",
        label: "Surprise repairs",
        sub: "Finding out I need to fix things before I can sell",
        icon: "🔨",
      },
      {
        value: "timing",
        label: "How long it takes",
        sub: "Not knowing how long this will take",
        icon: "⏳",
      },
    ],
  },
];

const SITUATION_COPY: Record<string, string> = {
  ready: "You're ready to make a move.",
  exploring: "You're exploring your options.",
  curious: "You want to know your real number.",
};

const GOAL_COPY: Record<string, string> = {
  max_money: "We'll show you how to keep the most.",
  fast: "We'll show you the fastest paths and what each one costs.",
  no_stress: "We'll show you the cleanest route to the closing table.",
};

const CONCERN_COPY: Record<string, string> = {
  fees: "Every fee is broken out so nothing is buried.",
  price: "We compare your price against real nearby sales so you know where you stand.",
  repairs: "We model exactly how repairs affect your net — fix, credit, or sell as-is.",
  timing: "We show the cost of every month on market so you can decide with real numbers.",
};

interface SellerQuizProps {
  onComplete: () => void;
}

export default function SellerQuiz({ onComplete }: SellerQuizProps) {
  const [step, setStep] = useState(0); // 0–2 quiz, 3 bridge
  const [answers, setAnswers] = useState<(string | null)[]>([null, null, null]);
  const [selected, setSelected] = useState<string | null>(null);
  const [visible, setVisible] = useState(true);

  const slide = SLIDES[step];

  function advance(value: string) {
    const newAnswers = [...answers];
    newAnswers[step] = value;
    setAnswers(newAnswers);

    setVisible(false);
    setTimeout(() => {
      if (step < SLIDES.length - 1) {
        setStep(step + 1);
        setSelected(newAnswers[step + 1]);
      } else {
        setStep(3); // bridge
        setSelected(null);
      }
      setVisible(true);
    }, 220);
  }

  function goBack() {
    if (step === 0) return;
    setVisible(false);
    setTimeout(() => {
      const prev = step - 1;
      setStep(prev);
      setSelected(answers[prev]);
      setVisible(true);
    }, 220);
  }

  // Bridge screen
  if (step === 3) {
    const sit = answers[0] ?? "exploring";
    const goal = answers[1] ?? "max_money";
    const concern = answers[2] ?? "fees";

    return (
      <div
        className="rounded-3xl overflow-hidden"
        style={{
          background: "linear-gradient(160deg, #0F1E3A 0%, #0a1628 100%)",
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(12px)",
          transition: "opacity 0.3s ease, transform 0.3s ease",
        }}
      >
        <div className="px-6 md:px-12 py-10 md:py-14">
          {/* Checkmark */}
          <div className="flex justify-center mb-8">
            <div className="w-16 h-16 rounded-full bg-[#16A34A]/20 border-2 border-[#16A34A] flex items-center justify-center">
              <svg className="w-8 h-8 text-[#16A34A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>

          {/* Personalized intro */}
          <div className="text-center mb-10">
            <p className="text-[#16A34A] text-xs font-bold uppercase tracking-widest mb-3">
              Here&apos;s what we&apos;ll show you
            </p>
            <h3 className="text-white text-2xl md:text-3xl font-extrabold leading-tight mb-2">
              {SITUATION_COPY[sit]}
            </h3>
            <p className="text-[#9BACC0] text-base">
              {GOAL_COPY[goal]}
            </p>
          </div>

          {/* What they'll see */}
          <div className="space-y-3 mb-10 max-w-md mx-auto">
            {[
              { icon: "📊", text: "Your net proceeds across 3 selling scenarios — side by side" },
              { icon: "💸", text: "Exactly how much every month on market costs you" },
              { icon: "🏘️", text: "Where your home sits compared to nearby sales" },
              { icon: "✅", text: CONCERN_COPY[concern] },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3 bg-white/6 border border-white/10 rounded-xl px-4 py-3">
                <span className="text-lg shrink-0">{item.icon}</span>
                <p className="text-white/90 text-sm leading-snug">{item.text}</p>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="text-center">
            <button
              onClick={onComplete}
              className="w-full md:w-auto inline-flex items-center justify-center gap-2 bg-[#16A34A] hover:bg-[#15803d] text-white font-bold text-base px-8 py-4 rounded-xl transition-all duration-200 shadow-lg shadow-[#16A34A]/30"
            >
              Run My Numbers
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>
            <p className="text-[#6B7FA0] text-xs mt-3">Free. 90 seconds. No commitment.</p>
          </div>
        </div>
      </div>
    );
  }

  // Quiz slides
  return (
    <div
      className="rounded-3xl overflow-hidden"
      style={{
        background: "linear-gradient(160deg, #0F1E3A 0%, #0a1628 100%)",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(12px)",
        transition: "opacity 0.22s ease, transform 0.22s ease",
      }}
    >
      <div className="px-6 md:px-10 pt-8 pb-10">

        {/* Progress */}
        <div className="flex items-center gap-2 mb-8 max-w-xs mx-auto">
          {SLIDES.map((_, i) => (
            <div
              key={i}
              className="h-1 flex-1 rounded-full transition-all duration-300"
              style={{
                background: i <= step ? "#16A34A" : "rgba(255,255,255,0.12)",
              }}
            />
          ))}
        </div>

        {/* Step label */}
        <p className="text-[#16A34A] text-xs font-bold uppercase tracking-widest mb-4 text-center">
          Question {slide.step} of {SLIDES.length}
        </p>

        {/* Question */}
        <h3 className="text-white text-2xl md:text-3xl font-extrabold leading-tight mb-2 text-center">
          {slide.question}
        </h3>
        <p className="text-[#9BACC0] text-sm mb-8 text-center">{slide.context}</p>

        {/* Options */}
        <div className={`grid gap-3 mb-8 ${slide.options.length === 4 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"}`}>
          {slide.options.map((opt) => {
            const isSelected = selected === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => advance(opt.value)}
                className="text-left rounded-2xl border-2 px-5 py-4 transition-all duration-150 group"
                style={{
                  background: isSelected ? "#16A34A" : "rgba(255,255,255,0.05)",
                  borderColor: isSelected ? "#16A34A" : "rgba(255,255,255,0.12)",
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(22,163,74,0.6)";
                    (e.currentTarget as HTMLButtonElement).style.background = "rgba(22,163,74,0.08)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.12)";
                    (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.05)";
                  }
                }}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{opt.icon}</span>
                  <div>
                    <p className={`font-bold text-base ${isSelected ? "text-white" : "text-white/90"}`}>
                      {opt.label}
                    </p>
                    <p className={`text-sm mt-0.5 ${isSelected ? "text-white/80" : "text-[#6B7FA0]"}`}>
                      {opt.sub}
                    </p>
                  </div>
                  {isSelected && (
                    <div className="ml-auto shrink-0">
                      <div className="w-5 h-5 rounded-full bg-white/25 flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Back */}
        {step > 0 && (
          <div className="text-center">
            <button
              onClick={goBack}
              className="text-[#6B7FA0] text-sm hover:text-white/70 transition-colors"
            >
              ← Back
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
