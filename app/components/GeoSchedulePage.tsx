"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

const BOOKING_NOTIFICATIONS = [
  { name: "Ashley R.", neighborhood: "River Oaks, Houston" },
  { name: "Connor M.", neighborhood: "Buckhead, Atlanta" },
  { name: "Jade T.", neighborhood: "Cherry Creek, Denver" },
  { name: "Derek F.", neighborhood: "Old Town Scottsdale, AZ" },
  { name: "Brianna L.", neighborhood: "Dilworth, Charlotte" },
  { name: "Tyler S.", neighborhood: "Coconut Grove, Miami" },
  { name: "Kayla H.", neighborhood: "East Nashville, TN" },
  { name: "Marcus W.", neighborhood: "Pacific Heights, SF" },
  { name: "Rachel P.", neighborhood: "Arcadia, Phoenix" },
  { name: "Jordan B.", neighborhood: "South Congress, Austin" },
  { name: "Lauren C.", neighborhood: "Capitol Hill, Seattle" },
  { name: "Nate V.", neighborhood: "Brentwood, Nashville" },
  { name: "Simone K.", neighborhood: "Hyde Park, Chicago" },
  { name: "Travis E.", neighborhood: "Coronado, San Diego" },
  { name: "Melissa D.", neighborhood: "Westchase, Tampa" },
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
      <div className="bg-white rounded-xl shadow-xl border border-[#0F1E3A]/8 px-4 py-3 flex items-center gap-3 w-[260px]">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#E8185C] to-[#162B4C] flex items-center justify-center shrink-0">
          <span className="text-white text-[10px] font-bold">{n.name.split(" ").map((w: string) => w[0]).join("")}</span>
        </div>
        <div>
          <p className="text-[#0F1E3A] text-xs font-semibold leading-tight">{n.name}</p>
          <p className="text-[#6B7FA0] text-[11px] leading-tight mt-0.5">just booked a strategy call for <span className="font-semibold text-[#0F1E3A]">{n.neighborhood}</span></p>
        </div>
      </div>
    </div>
  );
}

function GeoScheduleContent({ calendlyUrl }: { calendlyUrl: string }) {
  const searchParams = useSearchParams();
  const auditId = searchParams.get("auditId") ?? "";
  const email = searchParams.get("email") ?? "";
  const firstName = searchParams.get("firstName") ?? undefined;
  const source = searchParams.get("source") ?? "";
  const router = useRouter();
  const calendlyLoaded = useRef(false);
  const ytPlayer = useRef<any>(null);
  const videoStartedRef = useRef(false);
  const videoWatchedFiredRef = useRef(false);
  const videoAbandonedFiredRef = useRef(false);

  useEffect(() => {
    // Skip schedule_abandoned tag for claim form redirects — they just opted in, they're not abandoning
    if (email && source !== "claim") {
      fetch("/api/tag", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, segment: "schedule", firstName }) }).catch(() => {});
    }
  }, [email, firstName, source]);

  // YouTube Player API — track play, 50% watched, and abandoned
  useEffect(() => {
    if (!email) return;

    function tag(segment: string) {
      fetch("/api/tag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, segment, firstName }),
      }).catch(() => {});
    }

    function initPlayer() {
      const YT = (window as any).YT;
      if (!YT || !YT.Player) return;
      ytPlayer.current = new YT.Player("yt-player", {
        events: {
          onStateChange: (event: any) => {
            const state = event.data;
            const YTStates = (window as any).YT.PlayerState;

            // First play
            if (state === YTStates.PLAYING && !videoStartedRef.current) {
              videoStartedRef.current = true;
              tag("video_started");
            }

            // Paused or ended before reaching 50%
            if ((state === YTStates.PAUSED || state === YTStates.ENDED) && videoStartedRef.current && !videoWatchedFiredRef.current && !videoAbandonedFiredRef.current) {
              const duration = ytPlayer.current?.getDuration?.() ?? 0;
              const current = ytPlayer.current?.getCurrentTime?.() ?? 0;
              if (duration > 0 && current / duration < 0.5) {
                videoAbandonedFiredRef.current = true;
                tag("video_abandoned");
              }
            }
          },
        },
      });
    }

    // Poll progress every 5s to detect 50% milestone
    const progressInterval = setInterval(() => {
      if (!ytPlayer.current || videoWatchedFiredRef.current) return;
      const duration = ytPlayer.current?.getDuration?.() ?? 0;
      const current = ytPlayer.current?.getCurrentTime?.() ?? 0;
      if (duration > 0 && current / duration >= 0.5) {
        videoWatchedFiredRef.current = true;
        videoAbandonedFiredRef.current = true; // prevent abandoned from firing too
        tag("video_watched");
      }
    }, 5000);

    // Load YouTube IFrame API
    if (!(window as any).YT) {
      (window as any).onYouTubeIframeAPIReady = initPlayer;
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      document.body.appendChild(script);
    } else {
      initPlayer();
    }

    return () => clearInterval(progressInterval);
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
            body: JSON.stringify({ email }),
          }).catch(() => {});
          router.push(`/results?auditId=${auditId}`);
        }
        // No email param = direct booking link — Calendly webhook handles capture, no redirect needed
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [auditId, email, router]);

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
            <span className="w-2 h-2 rounded-full bg-[#0F1E3A] animate-pulse" />
            <span className="text-[#0F1E3A] text-sm font-medium">Great news. Looks like we have one spot for you.</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-4 text-[#0F1E3A]">
            What is GEO?
          </h1>
          <p className="text-[#4A5E7A] text-lg leading-relaxed">
            GEO was built by someone who knows. After $1B in sold real estate with a top 1% team, Misti built the AI marketing engine real estate agents have been waiting for. Book your strategy call to find out how GEO can work for you.
          </p>
        </div>

        {/* VSL */}
        <div className="relative w-full rounded-2xl overflow-hidden shadow-xl mb-8" style={{ paddingBottom: "56.25%" }}>
          <iframe
            id="yt-player"
            className="absolute inset-0 w-full h-full"
            src="https://www.youtube.com/embed/8-PVfqgrP4g?enablejsapi=1&origin=https://geo.heypearl.io"
            title="GEO — The World's First AI Marketing Engine for Real Estate Agents"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>

        {/* CALENDLY */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold mb-3 text-[#0F1E3A]">Claim Your City Before It&rsquo;s Gone</h2>
          <button
            onClick={() => document.getElementById("calendar")?.scrollIntoView({ behavior: "smooth", block: "start" })}
            className="inline-block bg-[#E8185C] text-white font-bold text-base px-10 py-4 rounded-xl shadow-lg hover:bg-[#c4134d] transition-colors mb-3 cursor-pointer border-0"
          >
            Book My Free Strategy Call
          </button>
          <p className="text-[#4A5E7A] text-sm">30 minutes. Free. No pitch. Just results.</p>
        </div>

        <div className="bg-[#EDF0FA] border border-[#0F1E3A]/8 rounded-xl px-4 py-3 mb-4">
          <p className="text-[#0F1E3A] text-sm leading-relaxed">
            &ldquo;I almost did not book the call. Glad I did. They showed me 4 agents outranking me for searches I had no idea existed. Signed up that day.&rdquo;
          </p>
          <p className="text-[#6B7FA0] text-xs mt-1">Marcus D., Real Estate Agent, Denver CO</p>
        </div>

        <div
          id="calendar"
          className="calendly-inline-widget rounded-xl overflow-hidden mb-8"
          data-url={`${calendlyUrl}?hide_gdpr_banner=1&hide_event_type_details=1&hide_landing_page_details=1&background_color=ffffff&text_color=0F1E3A&primary_color=E8185C${email ? `&email=${encodeURIComponent(email)}` : ""}${firstName ? `&name=${encodeURIComponent(firstName)}` : ""}`}
          style={{ minWidth: "320px", height: "630px", scrollMarginTop: "16px" }}
        />

        <p className="text-center text-[#9BACC0] text-xs mb-10">Free. No obligation. Your market availability confirmed on the call.</p>

        {/* WHAT YOU GET ON THE CALL */}
        <div className="bg-[#0F1E3A] rounded-2xl p-8 mb-8">
          <p className="text-[#E8185C] text-xs font-bold uppercase tracking-widest mb-4">Free. Just For Showing Up.</p>
          <h2 className="text-2xl font-bold text-white mb-6">
            Every agent who books a call walks away with a complete AI growth plan. Regardless of whether you sign up.
          </h2>
          <div className="space-y-4 mb-6">
            {[
              {
                title: "Your Full AI Visibility Strategy",
                desc: "We pull your exact score across every major AI platform and show you precisely where you are being found, where you are invisible, and what it is costing you in leads right now.",
              },
              {
                title: "A Plan of Action to Fix Your Score and Get Found",
                desc: "You leave with a step-by-step roadmap built around your market, your score, and your competition. Not generic advice. A real plan you can act on the same day.",
              },
              {
                title: "How to Grow Your Business With AI Automation Systems",
                desc: "See how top agents are using AI to generate leads, nurture clients, and close more deals on autopilot. We show you exactly what this looks like for your specific market.",
              },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-4">
                <div className="w-6 h-6 rounded-full bg-[#E8185C] flex items-center justify-center shrink-0 mt-0.5 shadow">
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
              &ldquo;I had no idea how invisible I was. They showed me my score, told me exactly what to fix, and laid out an automation plan I could start that week. Worth every minute.&rdquo;
            </p>
            <p className="text-gray-500 text-xs mt-2">Jennifer R., Real Estate Agent, Scottsdale AZ</p>
          </div>
        </div>

        {/* WHAT HAPPENS ON THE CALL */}
        <div className="bg-white border border-[#0F1E3A]/8 rounded-2xl p-6 mb-8 shadow-sm">
          <h3 className="text-[#0F1E3A] font-bold text-base mb-4">What happens on the call</h3>
          <ul className="space-y-3">
            {[
              { icon: "🔍", text: "We walk through your full AI visibility report line by line" },
              { icon: "📍", text: "We show you exactly which agents in your market are outranking you and why" },
              { icon: "✍️", text: "We build and hand you your three AI authority assets, live on the call" },
              { icon: "🗺️", text: "We show you exactly what GEO looks like for your specific market" },
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
        <div className="bg-[#EDF0FA] border border-[#0F1E3A]/8 rounded-2xl p-6 mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-full bg-[#E8185C] flex items-center justify-center text-white font-bold text-lg shrink-0 shadow">
              MB
            </div>
            <div>
              <p className="text-[#6B7FA0] text-xs uppercase tracking-widest mb-0.5">Your strategy call is with</p>
              <p className="text-[#0F1E3A] text-xl font-bold">Misti Bruton</p>
              <p className="text-[#E8185C] text-sm font-medium">Founder, GEO by HeyPearl</p>
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
            className="inline-block bg-[#E8185C] text-white font-bold text-base px-10 py-4 rounded-xl shadow-lg hover:bg-[#c4134d] transition-colors cursor-pointer border-0"
          >
            Claim Your City — Book Now
          </button>
          <p className="text-[#9BACC0] text-xs mt-3">Free. No obligation. Your market confirmed on the call.</p>
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

export default function GeoSchedulePage({ calendlyUrl }: { calendlyUrl: string }) {
  return (
    <Suspense>
      <GeoScheduleContent calendlyUrl={calendlyUrl} />
    </Suspense>
  );
}
