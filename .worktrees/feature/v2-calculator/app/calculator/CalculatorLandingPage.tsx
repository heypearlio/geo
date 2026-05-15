"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import SocialIconRow from "@/app/components/SocialIconRow";
import type { SocialUrls } from "@/lib/social-config";

const CTA_BTN =
  "inline-block bg-[#16A34A] hover:bg-[#15803d] text-white font-bold text-base md:text-lg px-6 md:px-8 py-3 md:py-4 rounded-xl transition-all duration-200 shadow-lg shadow-[#16A34A]/25 cursor-pointer";

const SELLERHQ_URL = process.env.NEXT_PUBLIC_SELLERHQ_URL ?? "";

export default function CalculatorLandingPage({ socialUrls }: { socialUrls?: SocialUrls }) {
  const router = useRouter();
  const capturedRef = useRef(false);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (!SELLERHQ_URL || !event.origin) return;
      const sellerhqOrigin = new URL(SELLERHQ_URL).origin;
      if (event.origin !== sellerhqOrigin) return;

      if (event.data?.type === "sellerhq:lead-captured" && !capturedRef.current) {
        capturedRef.current = true;
        const { email, name, phone } = event.data;
        fetch("/api/calculator-optin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, name, phone }),
        }).catch(() => {});
      }

      if (event.data?.type === "sellerhq:book-call") {
        router.push("/schedule");
      }
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [router]);

  return (
    <main className="min-h-screen font-sans">

      {/* 1. HERO — NAVY */}
      <section className="bg-[#0F1E3A] py-12 md:py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/15 rounded-full px-4 py-1.5 mb-6 md:mb-8">
            <span className="w-2 h-2 rounded-full bg-[#16A34A] animate-pulse" />
            <span className="text-white text-xs font-bold uppercase tracking-widest">Free · 90 Seconds · No Agent Required</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold text-white leading-[1.15] mb-6 max-w-3xl mx-auto">
            As a Seller, You Have Options.{" "}
            <span className="text-[#16A34A]">Here&apos;s What Each One Nets You.</span>
          </h1>
          <p className="text-[#9BACC0] text-base md:text-xl leading-relaxed mb-10 max-w-2xl mx-auto">
            Run every selling scenario in 90 seconds. See your real net. Then decide. On your terms, not an agent&apos;s.
          </p>
          <div className="grid grid-cols-3 gap-4 mb-10 max-w-md mx-auto">
            {[
              { stat: "3 Scenarios", label: "Side by side" },
              { stat: "Real Numbers", label: "After fees and costs" },
              { stat: "Your Choice", label: "No commitment" },
            ].map((s) => (
              <div key={s.stat} className="bg-white/8 rounded-2xl p-4 md:p-5">
                <p className="text-sm md:text-base font-extrabold text-[#16A34A] mb-1">{s.stat}</p>
                <p className="text-[#9BACC0] text-xs leading-tight">{s.label}</p>
              </div>
            ))}
          </div>
          <a href="#calculator" className={CTA_BTN}>See What I&apos;d Walk Away With &rarr;</a>
          <p className="text-[#6B7FA0] text-xs mt-3">Free. No commitment. Takes 90 seconds.</p>
        </div>
      </section>

      {/* 2. PROBLEM — LIGHT */}
      <section className="bg-[#F7F8FC] px-6 py-12 md:py-20">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-[#16A34A] text-xs font-bold uppercase tracking-widest mb-3">Why Most Sellers Leave Money Behind</p>
          <h2 className="text-3xl md:text-5xl font-extrabold text-[#0F1E3A] mb-6 leading-tight">
            Most Agents Hand You a Number<br />and Disappear.
          </h2>
          <p className="text-[#4A5E7A] text-base md:text-lg leading-relaxed mb-10 max-w-2xl mx-auto">
            You never see the math. You don&apos;t know what you&apos;re leaving on the table. Or what a different path might have netted you. This calculator changes that.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left max-w-xl mx-auto">
            {[
              "One price. One option. No context.",
              "Fees buried until closing day.",
              "Cash offer potential never mentioned.",
              "Repair costs come out of YOUR pocket without warning.",
            ].map((item) => (
              <div key={item} className="bg-white rounded-2xl p-5 flex items-start gap-3">
                <span className="text-red-400 font-bold shrink-0 mt-0.5">&#10005;</span>
                <span className="text-[#4A5E7A] text-sm">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. HOW IT WORKS — NAVY */}
      <section className="bg-[#0F1E3A] px-6 py-12 md:py-20">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-[#16A34A] text-xs font-bold uppercase tracking-widest mb-3">How It Works</p>
          <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-12 leading-tight">
            Three Steps. Your Real Number.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { num: "01", title: "Tell us about your home", body: "Address, condition, your goal, and any repairs needed." },
              { num: "02", title: "See all three scenarios", body: "Cash offer, traditional sale, and as-is — net proceeds side by side." },
              { num: "03", title: "Get your results", body: "Enter your contact info and unlock your personalized breakdown." },
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

      {/* 4. CALCULATOR — LIGHT */}
      <section id="calculator" className="bg-[#F7F8FC] px-6 py-12 md:py-20">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-3xl p-6 md:p-10 shadow-xl shadow-black/8 border border-[#E5E7EB]">
            <div className="mb-6 text-center">
              <div className="inline-flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-full px-3 py-1 mb-4">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-green-700 text-xs font-semibold">Free. No credit card. No commitment.</span>
              </div>
              <h2 className="text-[#0F1E3A] text-2xl md:text-3xl font-extrabold mb-2">Run Your Numbers</h2>
              <p className="text-[#6B7FA0] text-sm">See what you&apos;d walk away with across every selling scenario.</p>
            </div>
            {SELLERHQ_URL ? (
              <iframe
                src={`${SELLERHQ_URL}/demo/app`}
                className="w-full rounded-2xl border border-[#E5E7EB]"
                style={{ minHeight: "700px" }}
                allow="geolocation"
                title="Seller Net Proceeds Calculator"
              />
            ) : (
              <div className="flex items-center justify-center h-64 bg-[#F9FAFB] rounded-2xl border-2 border-dashed border-[#D1D5DB]">
                <p className="text-[#9BACC0] text-sm">Calculator unavailable — NEXT_PUBLIC_SELLERHQ_URL not set</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 5. PROOF — NAVY */}
      <section className="bg-[#0F1E3A] px-6 py-12 md:py-20">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-[#16A34A] text-xs font-bold uppercase tracking-widest mb-3">Real Sellers. Real Results.</p>
          <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-12 leading-tight">
            They Ran the Numbers. Then Made the Move.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-left">
            {[
              {
                quote: "I had no idea a cash offer would net me more after repairs and carrying costs. The calculator showed me what I was actually looking at. Closed in 11 days.",
                name: "Maria T.",
                location: "Phoenix, AZ",
              },
              {
                quote: "I thought I only had one option. Ran the scenarios and realized traditional sale put $18k more in my pocket. Went with an agent who actually showed me the math.",
                name: "James R.",
                location: "Dallas, TX",
              },
            ].map((t) => (
              <div key={t.name} className="bg-white/8 rounded-2xl p-6">
                <p className="text-[#9BACC0] text-sm italic leading-relaxed mb-4">&ldquo;{t.quote}&rdquo;</p>
                <p className="text-white text-xs font-bold">{t.name}</p>
                <p className="text-[#6B7FA0] text-xs">{t.location}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#080F1E] px-6 py-8 text-center">
        <SocialIconRow urls={socialUrls} />
        <p className="text-[#4A5E7A] text-xs">
          &copy; {new Date().getFullYear()} HeyPearl &middot; V2 Calculator &middot;{" "}
          <a href="/privacy" className="underline hover:text-[#9BACC0]">Privacy Policy</a>
        </p>
      </footer>

    </main>
  );
}
