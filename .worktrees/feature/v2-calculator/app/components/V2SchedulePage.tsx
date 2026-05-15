"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

const BOOKING_NOTIFICATIONS = [
  { name: "Jennifer R.", city: "Cherry Creek, CO" },
  { name: "Marcus T.", city: "Brickell, FL" },
  { name: "Ashley M.", city: "The Woodlands, TX" },
  { name: "Derek W.", city: "Old Town Scottsdale, AZ" },
  { name: "Kayla B.", city: "Green Hills, TN" },
  { name: "Ryan H.", city: "South End, NC" },
  { name: "Tina L.", city: "Pacific Palisades, CA" },
  { name: "Sarah J.", city: "River Oaks, Houston" },
  { name: "Connor P.", city: "Buckhead, Atlanta" },
  { name: "Brianna V.", city: "Coconut Grove, Miami" },
];

function SocialProofPopup() {
  const [current, setCurrent] = useState<number | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const show = (index: number) => {
      setCurrent(index);
      setVisible(true);
      setTimeout(() => setVisible(false), 4500);
    };
    const first = setTimeout(() => {
      show(Math.floor(Math.random() * BOOKING_NOTIFICATIONS.length));
    }, 5000);
    let idx = 1;
    const interval = setInterval(() => {
      show((idx++) % BOOKING_NOTIFICATIONS.length);
    }, 12000);
    return () => { clearTimeout(first); clearInterval(interval); };
  }, []);

  if (current === null) return null;
  const n = BOOKING_NOTIFICATIONS[current];

  return (
    <div
      className={`fixed bottom-6 left-6 z-50 transition-all duration-500 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
      }`}
      style={{ maxWidth: "calc(100vw - 48px)" }}
    >
      <div className="bg-white rounded-xl shadow-xl border border-[#0F1E3A]/8 px-4 py-3 flex items-center gap-3 w-[280px]">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#16A34A] to-[#162B4C] flex items-center justify-center shrink-0">
          <span className="text-white text-[10px] font-bold">{n.name.split(" ").map((w: string) => w[0]).join("")}</span>
        </div>
        <div>
          <p className="text-[#0F1E3A] text-xs font-semibold leading-tight">{n.name}</p>
          <p className="text-[#6B7FA0] text-[11px] leading-tight mt-0.5">just claimed their listing market in <span className="font-semibold text-[#0F1E3A]">{n.city}</span></p>
        </div>
      </div>
    </div>
  );
}

function V2ScheduleContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const firstName = searchParams.get("firstName") ?? undefined;
  const router = useRouter();
  const calendlyLoaded = useRef(false);

  useEffect(() => {
    if (email) {
      fetch("/api/tag", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, segment: "schedule", firstName }) }).catch(() => {});
    }
  }, [email, firstName]);

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
        if (email) {
          fetch("/api/booked", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, first_name: firstName, source: "v2" }),
          }).catch(() => {});
        }
        // Calendly shows its own confirmation screen — no redirect needed
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [email, router]);

  return (
    <main className="min-h-screen bg-[#F7F8FC] text-[#0F1E3A] font-sans">

      <nav className="bg-[#0F1E3A] flex items-center justify-center py-6 px-6 border-b border-white/10">
        <Link href="https://geo.heypearl.io">
          <Image src="/geo-logo.png" alt="GEO by HeyPearl" width={120} height={50} />
        </Link>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-12">

        {/* HEADER */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-[#0F1E3A]/10 border border-[#0F1E3A]/25 rounded-full px-4 py-1.5 mb-6">
            <span className="w-2 h-2 rounded-full bg-[#16A34A] animate-pulse" />
            <span className="text-[#0F1E3A] text-sm font-medium">Only 1 listing market per city. Ever.</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-4 text-[#0F1E3A]">
            The Appointment-Setting Machine That Fills Your Calendar With Ready-To-List Sellers.
          </h1>
          <p className="text-[#4A5E7A] text-lg leading-relaxed">
            While you&apos;re showing homes and closing deals, we&apos;re building your pipeline. Book your strategy call to find out how GEO V2 can work in your market.
          </p>
        </div>

        {/* VSL */}
        <div className="relative w-full rounded-2xl overflow-hidden shadow-xl mb-8">
          <video
            src="/v2video.mp4"
            controls
            playsInline
            className="w-full block"
            style={{ maxHeight: "500px", background: "#000" }}
          />
        </div>

        {/* CALENDLY CTA */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold mb-3 text-[#0F1E3A]">Claim Your Listing Market Before It&rsquo;s Gone</h2>
          <button
            onClick={() => document.getElementById("calendar")?.scrollIntoView({ behavior: "smooth", block: "start" })}
            className="inline-block bg-[#16A34A] text-white font-bold text-base px-10 py-4 rounded-xl shadow-lg hover:bg-[#15803d] transition-colors mb-3 cursor-pointer border-0"
          >
            Book My Free Strategy Call
          </button>
          <p className="text-[#4A5E7A] text-sm">30 minutes. Free. No pitch. Just results.</p>
        </div>

        <div className="bg-[#F7F8FC] border border-[#0F1E3A]/8 rounded-xl px-4 py-3 mb-4">
          <p className="text-[#0F1E3A] text-sm leading-relaxed">
            &ldquo;I had three seller appointments in my first two weeks. Didn&apos;t make a single cold call. They were already warm when they showed up. First one signed on the spot.&rdquo;
          </p>
          <p className="text-[#6B7FA0] text-xs mt-1">Sarah M., Real Estate Agent, Austin TX</p>
        </div>

        <div
          id="calendar"
          className="calendly-inline-widget rounded-xl overflow-hidden mb-8"
          data-url={`https://calendly.com/hey-pearl/meet?hide_gdpr_banner=1&hide_event_type_details=1&hide_landing_page_details=1&background_color=ffffff&text_color=0F1E3A&primary_color=16A34A${email ? `&email=${encodeURIComponent(email)}` : ""}${firstName ? `&name=${encodeURIComponent(firstName)}` : ""}`}
          style={{ minWidth: "320px", height: "630px", scrollMarginTop: "16px" }}
        />

        <p className="text-center text-[#9BACC0] text-xs mb-10">Free. No obligation. Market exclusivity confirmed on the call.</p>

        {/* WHAT YOU GET ON THE CALL */}
        <div className="bg-[#0F1E3A] rounded-2xl p-8 mb-8">
          <p className="text-[#16A34A] text-xs font-bold uppercase tracking-widest mb-4">Free. Just For Showing Up.</p>
          <h2 className="text-2xl font-bold text-white mb-6">
            Every agent who books a call walks away knowing exactly what a full listing pipeline looks like. Regardless of whether you sign up.
          </h2>
          <div className="space-y-4 mb-6">
            {[
              {
                title: "Your Full Seller Appointment Strategy",
                desc: "We show you exactly how the system works in your specific market — what it takes to have warm, ready-to-list sellers showing up on your calendar without a single cold call.",
              },
              {
                title: "A Clear Picture of Your Competition",
                desc: "We show you which agents in your market are already dominating the listing side, how they are doing it, and exactly what it would take to position yourself ahead of them.",
              },
              {
                title: "Done-For-You vs. DIY — The Real Numbers",
                desc: "See what agents are actually spending in time, money, and energy trying to fill their own listing pipeline — versus what this system costs. The math is obvious.",
              },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-4">
                <div className="w-6 h-6 rounded-full bg-[#16A34A] flex items-center justify-center shrink-0 mt-0.5 shadow">
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
          <div className="bg-white/6 border border-white/12 rounded-xl px-5 py-4">
            <p className="text-white text-sm font-semibold mb-1">What agents say after the call:</p>
            <p className="text-gray-300 text-sm leading-relaxed italic">
              &ldquo;My calendar has more listing appointments on it right now than it did all of last quarter. And I haven&apos;t knocked a door or dialed a number. I just show up.&rdquo;
            </p>
            <p className="text-gray-500 text-xs mt-2">Derek L., Real Estate Agent, Newport Beach CA</p>
          </div>
        </div>

        {/* WHAT HAPPENS ON THE CALL */}
        <div className="bg-white border border-[#0F1E3A]/8 rounded-2xl p-6 mb-8 shadow-sm">
          <h3 className="text-[#0F1E3A] font-bold text-base mb-4">What happens on the call</h3>
          <ul className="space-y-3">
            {[
              { icon: "🔍", text: "We walk through how the appointment-setting system works in your specific market" },
              { icon: "📍", text: "We show you which agents are winning listing appointments right now — and how" },
              { icon: "✍️", text: "We map out your market opportunity live on the call" },
              { icon: "🗺️", text: "We show you exactly what GEO V2 looks like for your city" },
              { icon: "🎯", text: "No pitch until you have seen everything. Transparent. No pressure." },
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="text-lg shrink-0">{item.icon}</span>
                <span className="text-[#4A5E7A] text-sm leading-relaxed">{item.text}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* WHO YOU ARE MEETING */}
        <div className="bg-[#F7F8FC] border border-[#0F1E3A]/8 rounded-2xl p-6 mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-full bg-[#16A34A] flex items-center justify-center text-white font-bold text-lg shrink-0 shadow">
              MB
            </div>
            <div>
              <p className="text-[#6B7FA0] text-xs uppercase tracking-widest mb-0.5">Your strategy call is with</p>
              <p className="text-[#0F1E3A] text-xl font-bold">Misti Bruton</p>
              <p className="text-[#16A34A] text-sm font-medium">Founder, GEO by HeyPearl</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { stat: "500+", label: "Agents coached" },
              { stat: "$1B+", label: "In real estate sold" },
              { stat: "Top 1%", label: "Teams nationwide" },
            ].map((c, i) => (
              <div key={i} className="bg-white rounded-xl p-3 text-center border border-[#0F1E3A]/8">
                <p className="text-[#0F1E3A] font-bold text-lg leading-none">{c.stat}</p>
                <p className="text-[#6B7FA0] text-xs mt-1">{c.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="text-center mb-8">
          <button
            onClick={() => document.getElementById("calendar")?.scrollIntoView({ behavior: "smooth", block: "start" })}
            className="inline-block bg-[#16A34A] text-white font-bold text-base px-10 py-4 rounded-xl shadow-lg hover:bg-[#15803d] transition-colors cursor-pointer border-0"
          >
            Claim Your Listing Market — Book Now
          </button>
          <p className="text-[#9BACC0] text-xs mt-3">Free. No obligation. Market exclusivity confirmed on the call.</p>
        </div>

      </div>

      <footer className="px-6 py-8 text-center border-t border-[#0F1E3A]/8">
        <p className="text-[#9BACC0] text-sm">&copy; {new Date().getFullYear()} GEO by HeyPearl &middot; All rights reserved.</p>
        <a href="/pricing" className="text-[#4A5E7A] text-xs mt-2 inline-block hover:text-[#9BACC0]">View Pricing</a>
      </footer>

      <SocialProofPopup />
    </main>
  );
}

export default function V2SchedulePage() {
  return (
    <Suspense>
      <V2ScheduleContent />
    </Suspense>
  );
}
