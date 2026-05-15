"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { LocalServicesFunnelConfig } from "./config.types";

// ─── Meta Pixel Injection ─────────────────────────────────────────────────────

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
    script.onload = () => {
      if (w.fbq) { w.fbq("init", id); w.fbq("track", "PageView"); }
    };
    // Bootstrap fbq queue before the script loads
    const n: ((...args: unknown[]) => void) & { callMethod?: (...args: unknown[]) => void; queue?: unknown[]; push?: unknown; loaded?: boolean; version?: string; _fbq?: unknown } = function (...args: unknown[]) {
      if (n.callMethod) n.callMethod(...args); else n.queue!.push(args);
    };
    n.push = n;
    n.loaded = true;
    n.version = "2.0";
    n.queue = [];
    w.fbq = n;
    w._fbq = n;
    document.head.appendChild(script);
  }, [id]);
  return null;
}

// ─── Shared UI Atoms ──────────────────────────────────────────────────────────

function PhotoPlaceholder({ label, aspect, rounded }: { label: string; aspect?: string; rounded?: string }) {
  return (
    <div className={`w-full ${aspect ?? "aspect-video"} ${rounded ?? "rounded-2xl"} border-2 border-dashed border-[#0F1E3A]/20 bg-[#F0F2F8] flex flex-col items-center justify-center gap-2`}>
      <span className="text-[#9BACC0] text-xs font-semibold uppercase tracking-widest">Photo</span>
      <span className="text-[#9BACC0] text-xs font-medium text-center px-4">{label}</span>
    </div>
  );
}

function AvatarPlaceholder({ initials }: { initials: string }) {
  return (
    <div className="w-12 h-12 rounded-full border-2 border-dashed border-[#0F1E3A]/20 bg-[#F0F2F8] flex items-center justify-center shrink-0">
      <span className="text-[#9BACC0] text-xs font-bold">{initials}</span>
    </div>
  );
}

// ─── FOMO Popup ───────────────────────────────────────────────────────────────

function FomoPopup({ config }: { config: LocalServicesFunnelConfig }) {
  const [current, setCurrent] = useState<number | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const show = (idx: number) => {
      setCurrent(idx);
      setVisible(true);
      setTimeout(() => setVisible(false), 4500);
    };
    const first = setTimeout(() => show(Math.floor(Math.random() * config.fomoEntries.length)), 8000);
    let i = 1;
    const interval = setInterval(() => { show((i++) % config.fomoEntries.length); }, 14000);
    return () => { clearTimeout(first); clearInterval(interval); };
  }, [config.fomoEntries.length]);

  if (current === null) return null;
  const p = config.fomoEntries[current];

  return (
    <div className={`fixed bottom-20 md:bottom-6 left-4 z-50 transition-all duration-500 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"}`}>
      <div className="bg-white rounded-xl shadow-xl border border-[#0F1E3A]/8 px-4 py-3 flex items-center gap-3 max-w-[300px]">
        <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: config.colorButton ?? config.colorPrimary }}>
          <span className="text-[#0F1E3A] text-[10px] font-bold">{p.name.split(" ").map((w: string) => w[0]).join("")}</span>
        </div>
        <div>
          <p className="text-[#0F1E3A] text-xs font-semibold leading-tight">{p.name} · <span className="text-[#0F1E3A] font-bold">{p.business}</span></p>
          <p className="text-[#6B7FA0] text-[11px] leading-tight mt-0.5">{p.city} · {config.fomoPopupLabel}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Opt-In Form ──────────────────────────────────────────────────────────────

function OptInForm({ config }: { config: LocalServicesFunnelConfig }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const inputClass = `w-full border border-[#0F1E3A]/12 rounded-xl px-4 py-3 text-[#0F1E3A] placeholder-[#9BACC0] focus:outline-none focus:bg-white transition-colors text-[16px]`;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    const firstName = fd.get("firstName") as string;
    const email = fd.get("email") as string;
    const businessType = fd.get("businessType") as string;

    try {
      await fetch(config.apiOptinRoute, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, email, businessType, funnel: config.funnelTag }),
      });
      router.push(`${config.scheduleRoute}?email=${encodeURIComponent(email)}&firstName=${encodeURIComponent(firstName)}`);
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-semibold text-[#0F1E3A] uppercase tracking-wide mb-1.5">First Name</label>
        <input name="firstName" placeholder="Maria" className={inputClass} style={{ background: config.colorBg }} />
      </div>
      <div>
        <label className="block text-xs font-semibold text-[#0F1E3A] uppercase tracking-wide mb-1.5">Email *</label>
        <input name="email" type="email" required placeholder="maria@yourbusiness.com" className={inputClass} style={{ background: config.colorBg }} />
      </div>
      <div>
        <label className="block text-xs font-semibold text-[#0F1E3A] uppercase tracking-wide mb-1.5">Type of Business</label>
        <input name="businessType" placeholder="e.g. Salon, HVAC, Restaurant..." className={inputClass} style={{ background: config.colorBg }} />
      </div>
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full text-center font-bold text-base md:text-lg px-6 md:px-8 py-3 md:py-4 rounded-xl transition-all duration-200 shadow-lg cursor-pointer"
        style={{ background: config.colorButton ?? config.colorPrimary, color: config.colorOnPrimary ?? "#ffffff" }}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-[#0F1E3A]/30 border-t-[#0F1E3A] rounded-full animate-spin" />
            One moment...
          </span>
        ) : `${config.formCtaLabel} \u2192`}
      </button>
      <div className="flex items-center justify-center gap-5 flex-wrap pt-1">
        {["Free. No credit card.", "No contracts.", "Setup in 48 hrs."].map((item) => (
          <span key={item} className="flex items-center gap-1.5 text-xs text-[#6B7FA0]">
            <span className="text-green-500 font-bold">✓</span>{item}
          </span>
        ))}
      </div>
    </form>
  );
}

// ─── Vapi Inline Button ───────────────────────────────────────────────────────

function VapiCallButton({ publicKey, assistantId, primaryColor = "#16A34A", variant = "dark" }: { publicKey: string; assistantId: string; primaryColor?: string; variant?: "dark" | "light" }) {
  type CallStatus = "idle" | "connecting" | "active" | "ending";
  const vapiRef = useRef<import("@vapi-ai/web").default | null>(null);
  const [status, setStatus] = useState<CallStatus>("idle");
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    import("@vapi-ai/web").then(({ default: Vapi }) => {
      const instance = new Vapi(publicKey);
      vapiRef.current = instance;
      instance.on("call-start", () => setStatus("active"));
      instance.on("call-end", () => { setStatus("idle"); setIsMuted(false); });
      instance.on("error", () => setStatus("idle"));
    });
    return () => { try { vapiRef.current?.stop(); } catch {} };
  }, [publicKey]);

  async function toggleCall() {
    if (!vapiRef.current) return;
    if (status === "active" || status === "connecting") {
      setStatus("ending");
      vapiRef.current.stop();
    } else {
      setStatus("connecting");
      try { await vapiRef.current.start(assistantId); }
      catch { setStatus("idle"); }
    }
  }

  const isActive = status === "active";
  const isBusy = status === "connecting" || status === "ending";

  return (
    <div
      className="w-full rounded-2xl p-8 flex flex-col items-center text-center"
      style={{ background: "#ffffff" }}
    >
      {/* Pearl photo */}
      <div className="relative mb-5">
        {!isActive && !isBusy && (
          <span className="absolute -inset-2 rounded-full animate-ping opacity-20"
            style={{ background: primaryColor, animationDuration: "2s" }} />
        )}
        {isActive && (
          <span className="absolute -inset-2 rounded-full animate-ping opacity-30"
            style={{ background: "#DC2626", animationDuration: "1s" }} />
        )}
        <div
          className="relative rounded-full overflow-hidden"
          style={{
            width: 96,
            height: 96,
            border: isActive ? `3px solid #DC2626` : `3px solid ${primaryColor}`,
            boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
          }}
        >
          <img
            src="/pearl-avatar.jpg"
            alt="Pearl AI"
            style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top center" }}
          />
        </div>
        <span
          className="absolute bottom-0.5 right-0.5 w-4 h-4 rounded-full border-2 border-white"
          style={{ background: isActive ? "#DC2626" : primaryColor }}
        />
      </div>

      {/* Status label */}
      <span className="text-xs font-bold uppercase tracking-widest mb-2"
        style={{ color: isActive ? "#DC2626" : primaryColor }}>
        {isActive ? "Live Call" : isBusy ? "Connecting…" : "Available Now"}
      </span>

      {/* Headline */}
      <p className="font-extrabold text-xl mb-1.5" style={{ color: "#0F1E3A" }}>
        {isActive ? "Speaking with Pearl" : "Have a question? Ask Pearl."}
      </p>

      {/* Subheadline */}
      <p className="text-[#6B7FA0] text-sm leading-relaxed mb-6 max-w-sm">
        {isActive
          ? "Pearl is listening — ask anything about growing your business."
          : "Get instant answers about our services, pricing, and how we can help your business grow. No sales call needed."}
      </p>

      {/* CTA */}
      <div className="flex items-center gap-3">
        <button
          onClick={toggleCall}
          disabled={isBusy}
          className="inline-flex items-center gap-2 font-bold text-sm px-6 py-3 rounded-xl transition-all duration-200"
          style={{
            background: isActive ? "#DC2626" : "#0F1E3A",
            color: "#ffffff",
            cursor: isBusy ? "default" : "pointer",
            opacity: isBusy ? 0.6 : 1,
            boxShadow: "0 4px 14px rgba(0,0,0,0.15)",
          }}
        >
          <span>{isActive ? "✕" : isBusy ? "⋯" : "🎙️"}</span>
          <span>{isActive ? "End Call" : isBusy ? "Connecting…" : "Speak with Pearl"}</span>
        </button>

        {isActive && (
          <button
            onClick={() => { if (!vapiRef.current) return; const next = !isMuted; vapiRef.current.setMuted(next); setIsMuted(next); }}
            className="text-xs font-semibold px-4 py-3 rounded-xl border transition-colors"
            style={{ background: "transparent", borderColor: "rgba(15,30,58,0.15)", color: "#6B7FA0" }}
          >
            {isMuted ? "Unmute" : "Mute"}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LocalLandingPage({ config }: { config: LocalServicesFunnelConfig }) {
  const vapiPublicKey = config.vapiPublicKey;
  const vapiAssistantId = config.vapiAssistantId;
  const ctaBtnStyle: React.CSSProperties = {
    background: config.colorButton ?? config.colorPrimary,
    color: config.colorOnPrimary ?? "#ffffff",
    fontWeight: "bold",
    borderRadius: "0.75rem",
    padding: "0.75rem 2rem",
    transition: "all 0.2s",
    boxShadow: "0 4px 14px rgba(0,0,0,0.2)",
    cursor: "pointer",
    display: "inline-block",
    fontSize: "1rem",
    border: "none",
  };

  // For buttons sitting on dark navy backgrounds — always use accent so they're visible
  const ctaBtnOnDarkStyle: React.CSSProperties = {
    ...ctaBtnStyle,
    background: config.colorPrimary,
  };

  const stickyBtnStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    color: "white",
    fontSize: "0.875rem",
    fontWeight: 600,
    padding: "0.375rem 1.5rem",
    borderRadius: "9999px",
    border: "1px solid rgba(255,255,255,0.3)",
    cursor: "pointer",
    background: "transparent",
  };

  return (
    <main className="min-h-screen font-sans">

      {config.metaPixelId && <MetaPixelScript id={config.metaPixelId} />}

      {/* MOBILE STICKY CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden backdrop-blur-sm px-4 py-3 flex items-center justify-between gap-3 border-t border-white/10" style={{ background: config.colorNavy + "F5" }}>
        <div>
          <p className="text-white text-xs font-bold leading-tight">{config.brandName}</p>
          <p className="text-[#9BACC0] text-[11px] leading-tight">{config.brandTagline}</p>
        </div>
        <button
          onClick={() => document.getElementById("get-started")?.scrollIntoView({ behavior: "smooth", block: "start" })}
          style={stickyBtnStyle}
        >
          Get Started &rarr;
        </button>
      </div>

      {/* NAV */}
      <nav className="flex items-center justify-center py-5 px-6 border-b border-white/10" style={{ background: config.colorNavy }}>
        {config.logoUrl
          ? <img src={config.logoUrl} alt={config.brandName} className="h-10 w-auto" />
          : <span className="text-white text-xl font-extrabold tracking-tight">{config.brandName}</span>
        }
      </nav>

      {/* 1. HERO — NAVY */}
      <section className="py-14 md:py-24 px-6" style={{ background: config.colorNavy }}>
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white rounded-full px-4 py-1.5 mb-6 md:mb-8">
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: config.colorPrimary }} />
            <span className="text-[#0F1E3A] text-xs font-bold uppercase tracking-widest">{config.brandTagline}</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold text-white leading-[1.1] mb-6 max-w-3xl mx-auto">
            {config.heroHeadline}{" "}
            <span style={{ color: config.colorPrimary }}>{config.heroHeadlineAccent}</span>
          </h1>
          <p className="text-[#9BACC0] text-base md:text-xl leading-relaxed mb-10 max-w-2xl mx-auto">
            {config.heroSubheadline}
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
            {config.heroStats.map((s) => (
              <div key={s.stat} className="bg-white rounded-2xl p-5">
                <p className="text-xl md:text-2xl font-extrabold mb-1" style={{ color: config.colorNavy }}>{s.stat}</p>
                <p className="text-[#4A5E7A] text-xs leading-tight">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="mb-10 max-w-2xl mx-auto">
            <p className="text-[#6B7FA0] text-xs uppercase tracking-widest mb-4">Real results from real businesses</p>
            {config.heroPhoto
              ? <img src={config.heroPhoto} alt="Before and after results" className="w-full rounded-2xl" style={{ display: "block" }} />
              : <PhotoPlaceholder label="Hero proof screenshot — e.g. Google Business dashboard, review growth, or before/after rankings (recommended: 1200×600px)" aspect="aspect-[2/1]" rounded="rounded-2xl" />
            }
          </div>
          <button onClick={() => document.getElementById("get-started")?.scrollIntoView({ behavior: "smooth", block: "start" })} style={ctaBtnOnDarkStyle}>
            {config.heroPrimaryCtaLabel} &rarr;
          </button>
          <p className="text-[#6B7FA0] text-xs mt-3">No contracts. No surprises. Cancel anytime.</p>
        </div>
      </section>

      {/* 2. RESULTS STRIP — WHITE */}
      <section className="bg-white border-y border-[#0F1E3A]/8 px-6 py-10">
        <div className="max-w-4xl mx-auto">
          <p className="text-center text-[#9BACC0] text-xs uppercase tracking-widest mb-8">Results our clients see in the first 90 days</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {config.resultStats.map((s) => (
              <div key={s.stat}>
                <p className="text-3xl md:text-4xl font-extrabold mb-1" style={{ color: config.colorNavy }}>{s.stat}</p>
                <p className="text-[#6B7FA0] text-xs leading-snug">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. THREE PAINS — LIGHT */}
      <section className="px-6 py-12 md:py-20" style={{ background: config.colorLight }}>
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: config.colorNavy, opacity: 0.6 }}>{config.painSectionLabel}</p>
          <h2 className="text-3xl md:text-4xl font-extrabold mb-4 leading-tight" style={{ color: config.colorNavy }}>{config.painHeadline}</h2>
          <p className="text-[#4A5E7A] text-base md:text-lg mb-12 max-w-2xl mx-auto">{config.painSubheadline}</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {config.painCards.map((card) => (
              <div key={card.problem} className="relative overflow-hidden rounded-2xl p-7 text-left flex flex-col" style={{ background: config.colorNavy }}>
                <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: config.colorPrimary }}>{card.problem}</p>
                <p className="text-white font-bold text-base leading-snug mb-3">{card.headline}</p>
                <p className="text-[#9BACC0] text-sm leading-relaxed mb-5 flex-1" dangerouslySetInnerHTML={{ __html: card.body }} />
                <div className="bg-white/6 border border-white/10 rounded-xl px-4 py-3">
                  <p className="text-white/90 text-xs leading-relaxed">
                    <span className="font-bold" style={{ color: config.colorPrimary }}>How we fix it: </span>
                    {card.fix}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. TESTIMONIALS — NAVY */}
      <section className="px-6 py-12 md:py-20" style={{ background: config.colorNavy }}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: config.colorPrimary }}>What Clients Say</p>
            <h2 className="text-3xl md:text-4xl font-extrabold text-white leading-tight">Real businesses. Real results.</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
            {config.testimonials.map((t) => (
              <div key={t.name} className="bg-white rounded-2xl p-6 flex flex-col">
                <div className="flex gap-0.5 mb-4">
                  {[...Array(5)].map((_, i) => <span key={i} className="text-amber-400 text-sm">★</span>)}
                </div>
                <p className="text-[#4A5E7A] text-sm italic leading-relaxed flex-1">&ldquo;{t.quote}&rdquo;</p>
                <div className="border-t border-[#0F1E3A]/8 pt-4 mt-5 flex items-center gap-3">
                  {t.photoUrl
                    ? <img src={t.photoUrl} alt={t.name} className="w-12 h-12 rounded-full object-cover shrink-0" />
                    : <AvatarPlaceholder initials={t.initials} />
                  }
                  <div>
                    <p className="text-[#0F1E3A] text-xs font-bold">{t.name}</p>
                    <p className="text-[#9BACC0] text-xs">{t.business}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {(config.testimonialProofPhotos ?? []).length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(config.testimonialProofPhotos ?? []).map((p) => (
                <div key={p.src}>
                  <img src={p.src} alt={p.caption} className="w-full rounded-2xl" style={{ display: "block" }} />
                  <p className="text-[#6B7FA0] text-xs text-center mt-2">{p.caption}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 5. WHAT WE DO — LIGHT */}
      <section className="px-6 py-12 md:py-20" style={{ background: config.colorLight }}>
        <div className="max-w-4xl mx-auto">

          <div className="text-center mb-8">
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: config.colorNavy, opacity: 0.6 }}>What We Do</p>
            <h2 className="text-3xl md:text-4xl font-extrabold mb-4 leading-tight" style={{ color: config.colorNavy }}>Everything a local business needs to grow</h2>
            <p className="text-[#4A5E7A] text-base md:text-lg max-w-2xl mx-auto">We handle the digital stuff so you can focus on running your business.</p>
          </div>

          {vapiPublicKey && vapiAssistantId && (
            <div className="mb-12">
              <VapiCallButton publicKey={vapiPublicKey} assistantId={vapiAssistantId} primaryColor={config.colorPrimary} variant="light" />
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {config.services.map((item) => (
              <div key={item.title} className="bg-white rounded-2xl p-6">
                <div className="flex items-start gap-3">
                  <span className="font-bold text-lg shrink-0 mt-0.5" style={{ color: config.colorPrimary }}>&#9632;</span>
                  <div>
                    <p className="font-bold text-base mb-1.5" style={{ color: config.colorNavy }}>{item.title}</p>
                    <p className="text-[#4A5E7A] text-sm leading-relaxed">{item.body}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. SCREENSHOT PROOF — NAVY */}
      <section className="px-6 py-12 md:py-20" style={{ background: config.colorNavy }}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: config.colorPrimary }}>Proof It Works</p>
            <h2 className="text-3xl md:text-4xl font-extrabold text-white leading-tight">Numbers don&rsquo;t lie.</h2>
            <p className="text-[#9BACC0] text-base md:text-lg mt-4 max-w-xl mx-auto">Real dashboards. Real clients. Real growth.</p>
          </div>
          {config.largeProofPhoto ? (
            <div className="mb-6">
              <img src={config.largeProofPhoto} alt="Results dashboard" className="w-full rounded-2xl" style={{ display: "block" }} />
              <p className="text-[#6B7FA0] text-xs text-center mt-3">Reviews, rankings, and visibility — all in one dashboard</p>
            </div>
          ) : (
            <div className="mb-6">
              <PhotoPlaceholder label="Large proof screenshot — e.g. analytics dashboard, lead volume growth, or call tracking report (recommended: 1200×700px)" aspect="aspect-[16/9]" rounded="rounded-2xl" />
              <p className="text-[#6B7FA0] text-xs text-center mt-3">Analytics dashboard showing lead and call growth</p>
            </div>
          )}
          {(config.proofPhotos ?? []).length > 0 && (
            <div className="flex flex-col gap-4">
              {(config.proofPhotos ?? []).map((p) => (
                <div key={p.src}>
                  <img src={p.src} alt={p.caption} className="w-full rounded-2xl" style={{ display: "block" }} />
                  <p className="text-[#6B7FA0] text-xs text-center mt-2">{p.caption}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 7. GETTING STARTED — LIGHT */}
      <section className="px-6 py-12 md:py-20" style={{ background: config.colorLight }}>
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: config.colorNavy, opacity: 0.6 }}>Getting Started</p>
          <h2 className="text-3xl md:text-4xl font-extrabold mb-4 leading-tight" style={{ color: config.colorNavy }}>Up and running in 3 easy steps</h2>
          <p className="text-[#4A5E7A] text-base md:text-lg mb-12">No tech skills needed. We set everything up for you.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {config.steps.map((step) => (
              <div key={step.num} className="relative overflow-hidden rounded-2xl p-7 text-left shadow-lg" style={{ background: config.colorNavy }}>
                <span className="absolute -bottom-5 -right-2 text-[7rem] font-extrabold text-white/[0.06] leading-none select-none pointer-events-none">{step.num}</span>
                <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: config.colorPrimary }}>{step.num}</p>
                <p className="text-white font-bold text-lg mb-2 leading-snug">{step.title}</p>
                <p className="text-[#9BACC0] text-sm leading-relaxed">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 8. FAQ — NAVY */}
      <section className="px-6 py-12 md:py-20" style={{ background: config.colorNavy }}>
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: config.colorPrimary }}>Questions</p>
            <h2 className="text-3xl md:text-4xl font-extrabold text-white leading-tight">Common questions</h2>
          </div>
          <div className="space-y-3">
            {config.faqs.map((faq) => (
              <details key={faq.q} className="group bg-white/6 border border-white/10 rounded-xl overflow-hidden">
                <summary className="flex items-center justify-between px-6 py-4 cursor-pointer list-none">
                  <span className="text-white font-semibold text-sm pr-4">{faq.q}</span>
                  <span className="font-bold text-lg shrink-0 group-open:rotate-45 transition-transform duration-200" style={{ color: config.colorPrimary }}>+</span>
                </summary>
                <div className="px-6 pb-5">
                  <p className="text-[#9BACC0] text-sm leading-relaxed">{faq.a}</p>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* 9. OPT-IN FORM — LIGHT */}
      <section id="get-started" className="px-6 py-16 md:py-24" style={{ background: config.colorLight }}>
        <div className="max-w-lg mx-auto">
          <div className="bg-white rounded-3xl p-8 md:p-10 shadow-xl shadow-black/10">
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-full px-3 py-1 mb-4">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-green-700 text-xs font-semibold">Free. No credit card. No obligation.</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-extrabold mb-2" style={{ color: config.colorNavy }}>{config.formHeadline}</h2>
              <p className="text-[#6B7FA0] text-sm">{config.formSubheadline}</p>
            </div>
            <OptInForm config={config} />
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

      <FomoPopup config={config} />
    </main>
  );
}
