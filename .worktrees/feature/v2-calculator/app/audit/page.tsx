"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { submitAuditForm } from "../actions";

declare global {
  interface Window { fbq?: (...args: unknown[]) => void; }
}

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
  { name: "Chris V.", city: "Las Vegas, NV" },
  { name: "Tiffany K.", city: "Chicago, IL" },
  { name: "Jordan E.", city: "Orlando, FL" },
  { name: "Lauren F.", city: "Houston, TX" },
  { name: "Tyler N.", city: "San Diego, CA" },
  { name: "Melissa C.", city: "Portland, OR" },
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
      show(Math.floor(Math.random() * NOTIFICATIONS.length));
    }, 3000);

    let idx = 1;
    const interval = setInterval(() => {
      show((idx++) % NOTIFICATIONS.length);
    }, 9000);

    return () => { clearTimeout(first); clearInterval(interval); };
  }, []);

  if (current === null) return null;
  const n = NOTIFICATIONS[current];

  return (
    <div
      className={`fixed bottom-6 left-6 z-50 transition-all duration-500 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
      }`}
      style={{ maxWidth: "calc(100vw - 48px)" }}
    >
      <div className="bg-white rounded-xl shadow-xl border border-[#0F1E3A]/8 px-4 py-3 flex items-center gap-3 w-[240px]">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#E8185C] to-[#162B4C] flex items-center justify-center shrink-0">
          <span className="text-white text-[10px] font-bold">{n.name.split(" ").map(w => w[0]).join("")}</span>
        </div>
        <div>
          <p className="text-[#0F1E3A] text-xs font-semibold leading-tight">{n.name} from {n.city}</p>
          <p className="text-[#6B7FA0] text-[11px] leading-tight mt-0.5">just got their AI visibility score</p>
        </div>
      </div>
    </div>
  );
}

function trackFunnelEvent(eventType: string, email?: string) {
  const params = new URLSearchParams(window.location.search);
  fetch("/api/funnel-event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      event_type: eventType,
      email: email ?? null,
      referrer: document.referrer || null,
      utm_source: params.get("utm_source"),
      utm_medium: params.get("utm_medium"),
      utm_campaign: params.get("utm_campaign"),
      utm_content: params.get("utm_content"),
    }),
  }).catch(() => {});
}

export default function AuditPage() {
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const [affiliateSlug, setAffiliateSlug] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setAffiliateSlug(params.get("affiliateSlug") ?? "");
  }, []);

  useEffect(() => {
    trackFunnelEvent("page_load");
  }, []);

  function handleSubmit(formData: FormData) {
    setError("");
    const emailVal = (formData.get("email") as string)?.trim() ?? "";
    trackFunnelEvent("form_submitted", emailVal);
    startTransition(async () => {
      const result = await submitAuditForm(formData);
      if (result.success) {
        if (typeof window !== "undefined" && window.fbq) {
          window.fbq("track", "Lead");
        }
        const auditId = result.auditId ?? "";
        const email = encodeURIComponent(result.email ?? "");
        const city = encodeURIComponent((formData.get("city") as string)?.trim() ?? "");
        const firstName = encodeURIComponent((formData.get("firstName") as string)?.trim() ?? "");
        const website = encodeURIComponent((formData.get("website") as string)?.trim() ?? "");
        router.push(`/score?auditId=${auditId}&email=${email}&city=${city}&name=${firstName}&website=${website}&affiliateSlug=${encodeURIComponent(affiliateSlug)}`);
      } else {
        setError(result.error || "Something went wrong. Please try again.");
      }
    });
  }

  const inputClass = "w-full bg-[#F7F8FC] border border-[#0F1E3A]/12 rounded-xl px-3 py-3 text-[#0F1E3A] placeholder-[#9BACC0] focus:outline-none focus:border-[#E8185C] focus:bg-white transition-colors text-[16px]";

  return (
    <main className="min-h-screen bg-[#0F1E3A] text-white font-sans overflow-x-hidden">

      <div className="max-w-5xl mx-auto px-5 py-6 lg:py-10 lg:min-h-screen lg:flex lg:items-center">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center w-full">

          {/* HERO — first in DOM so it's first on mobile */}
          <div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-[1.15] mb-4">
              You're way too good to be{" "}
              <span className="text-[#FACC15]">invisible.</span>{" "}
              If your calendar isn't booked, your online{" "}
              <span className="text-[#FACC15]">authority</span>{" "}
              is broken.
            </h1>

            <p className="text-gray-300 text-sm md:text-base leading-relaxed mb-6">
              See who's being found online, who's getting picked over you, and the exact steps to start filling your calendar.
            </p>

            <div className="flex items-center gap-4">
              <div className="flex -space-x-2">
                {["MB", "JR", "SK", "TL", "AW"].map((initials, i) => (
                  <div key={i} className="w-9 h-9 rounded-full bg-gradient-to-br from-[#E8185C] to-[#162B4C] border-2 border-[#0F1E3A] flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                    {initials}
                  </div>
                ))}
              </div>
              <div>
                <p className="text-white text-sm font-semibold">100k+ agents checked their score</p>
                <p className="text-gray-400 text-xs">Most scored under 40. All found out why.</p>
              </div>
            </div>

            <div className="mt-5 space-y-2.5">
              {[
                "Find out which agents AI is recommending in your market right now",
                "See if buyers asking ChatGPT for an agent are getting sent to you or someone else",
                "Get your personal AI visibility score in under 60 seconds, free",
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-white/15 border border-white/30 flex items-center justify-center shrink-0 mt-0.5">
                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-gray-300 text-sm leading-relaxed">{item}</p>
                </div>
              ))}
            </div>
          </div>

          {/* FORM — second in DOM so it's below hero on mobile */}
          <div>
            <div className="bg-white rounded-2xl p-6 md:p-8 shadow-2xl shadow-black/40">

              <div className="mb-5">
                <div className="inline-flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-full px-3 py-1 mb-4">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-green-700 text-xs font-semibold">Free. Instant. No credit card.</span>
                </div>
                <h2 className="text-[#0F1E3A] text-xl md:text-2xl font-bold leading-snug">
                  Get Your Free AI Visibility Score
                </h2>
                <p className="text-[#6B7FA0] text-sm mt-1">Takes 30 seconds. Results in under a minute.</p>
              </div>

              {/* Urgency badge */}
              <div className="flex items-center gap-2 bg-[#FFF7ED] border border-orange-200 rounded-xl px-3 py-2 mb-4">
                <span className="text-orange-500 text-sm">🔒</span>
                <span className="text-orange-700 text-xs font-semibold">1 spot per market. 47 markets claimed this month.</span>
              </div>

              <form action={handleSubmit} className="space-y-4" onFocus={(e) => {
                if ((e.target as HTMLElement).tagName === "INPUT") trackFunnelEvent("form_started");
              }}>
                <div>
                  <label htmlFor="firstName" className="block text-xs font-semibold text-[#0F1E3A] uppercase tracking-wide mb-1.5">First Name</label>
                  <input
                    id="firstName" name="firstName" type="text" required placeholder="Sarah"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="city" className="block text-xs font-semibold text-[#0F1E3A] uppercase tracking-wide mb-1.5">City / State</label>
                  <input
                    id="city" name="city" type="text" required placeholder="Austin, TX"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-xs font-semibold text-[#0F1E3A] uppercase tracking-wide mb-1.5">Email Address</label>
                  <input
                    id="email" name="email" type="email" required placeholder="sarah@youragency.com"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="website" className="block text-xs font-semibold text-[#0F1E3A] uppercase tracking-wide mb-1.5">
                    Website URL <span className="text-[#9BACC0] font-normal normal-case">(optional — improves your score)</span>
                  </label>
                  <input
                    id="website" name="website" type="text" placeholder="yoursite.com or zillow.com/profile/..."
                    className={inputClass}
                  />
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                    <p className="text-red-600 text-sm">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full bg-[#E8185C] hover:bg-[#c4134d] disabled:opacity-60 text-white font-bold text-base py-4 rounded-xl transition-all duration-200 shadow-lg shadow-[#E8185C]/30 mt-2 flex items-center justify-center gap-2"
                >
                  {isPending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Running your audit...
                    </>
                  ) : (
                    <>
                      Get My Free Score Now
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </>
                  )}
                </button>

                <p className="text-[#9BACC0] text-xs text-center">No spam. No pitch. Just your score.</p>
              </form>

              {/* Testimonial */}
              <div className="mt-4 pt-4 border-t border-[#0F1E3A]/8">
                <p className="text-[#4A5E7A] text-xs italic leading-relaxed">
                  &ldquo;I had no idea I was invisible to AI. Ran the score, booked the call, and within 3 weeks buyers were finding me through ChatGPT.&rdquo;
                </p>
                <p className="text-[#9BACC0] text-xs mt-1">Jennifer R., Real Estate Agent, Scottsdale AZ</p>
              </div>

            </div>
          </div>

        </div>
      </div>

      <SocialProofPopup />
    </main>
  );
}
