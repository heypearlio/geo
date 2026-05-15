"use client";

import { useEffect, useState } from "react";

const STATIC_OFFERS = ["geo", "local", "v2"];
const CALENDLY = "https://calendly.com/hey-pearl/meet";

const CTA_BTN = "inline-block bg-[#E8185C] hover:bg-[#c4134d] text-white font-bold text-base md:text-lg px-6 md:px-8 py-3 md:py-4 rounded-xl transition-all duration-200 shadow-lg shadow-[#E8185C]/25 cursor-pointer";
const INPUT_CLASS = "w-full bg-[#F7F8FC] border border-[#0F1E3A]/12 rounded-xl px-4 py-3 text-[#0F1E3A] placeholder-[#9BACC0] focus:outline-none focus:border-[#E8185C] focus:bg-white transition-colors text-[16px]";

const TICKER_ITEMS = [
  "💰 Earn $500/month recurring for every client you refer",
  "⚡ Your branded landing page, funnels, and automations - all built for you",
  "📊 Real-time dashboard to track your clicks, referrals, and commissions",
  "✦ $6,000/year per active client. Recurring. Every single year.",
  "🤝 You bring the client. We fulfill. You get paid monthly.",
  "✓ No selling. No fulfillment. No support. Just your link.",
  "📈 5 referrals = $30,000/year. No experience required.",
  "🎯 After 5 sales, we drive paid traffic directly to your page.",
];

const FAQS = [
  {
    q: "What is the HeyPearl Partner Program?",
    a: "It is a referral program that pays you recurring monthly commission for every local business owner you send our way who becomes an active paying client. You get a custom landing page, a full email funnel, automation systems, and a real-time dashboard. We build everything. You just share your link.",
  },
  {
    q: "How much do I earn per referral?",
    a: "You earn 20% of monthly gross revenue for every active client you referred. One active client earns you $500/month - that is $6,000/year from a single referral. Five clients puts $30,000/year in your pocket. Ten clients is $60,000/year. As long as they stay active, you keep earning.",
  },
  {
    q: "Is the commission one-time or recurring?",
    a: "Recurring. Every month. You make one introduction and get paid every single month that client stays active. And because HeyPearl actually delivers results - their visibility grows, their leads increase, their revenue goes up - clients stay. This is not a churn-heavy service. It is a sticky environment built on real outcomes. The longer they stay, the more you earn without lifting a finger.",
  },
  {
    q: "I have no sales experience. Can I still do this?",
    a: "Yes. You do not sell anything. Your job is to share a link - in a Facebook group, on Instagram, to a friend, in an email. You bring the client to the table. HeyPearl handles every call, every strategy session, every deliverable from there. You just make the introduction.",
  },
  {
    q: "What exactly do I get when I join?",
    a: "You get a fully built branded landing page with your name and photo. A complete email funnel that nurtures and converts your leads automatically. A real-time dashboard showing every click, referral, and dollar earned. And after your fifth sale, HeyPearl starts driving paid traffic directly to your page on your behalf.",
  },
  {
    q: "Do I need to be a HeyPearl client to participate?",
    a: "No. This is a standalone program. You do not need to be a client, have a marketing background, or know anything about AI. If you know local businesses - or can reach them online - you qualify.",
  },
  {
    q: "What happens after I apply?",
    a: "We review every application personally and get back to you within 24 hours. If approved, you book a quick onboarding call. On that call we set up your landing page, activate your funnels, walk you through your dashboard, and get your link live. The whole thing takes about 30 minutes.",
  },
  {
    q: "When and how do I get paid?",
    a: "Payouts go out monthly within 15 days of the billing cycle via Stripe, PayPal, Wise, or another approved method. You can track every dollar in real time inside your dashboard.",
  },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Apply and get approved",
    body: "Fill out the short form below. We review every application personally and get back to you within 24 hours. If it is a fit, we move fast.",
  },
  {
    step: "02",
    title: "We build everything for you",
    body: "On your onboarding call we set up your branded landing page, activate your full email funnel, and turn on your automation system. Your dashboard goes live. You do not touch a single thing - we build it all.",
  },
  {
    step: "03",
    title: "Share your link, let the systems work",
    body: "Post content to attract local businesses. Share your unique link. That is your entire job. Our automated funnels follow up and nurture every lead that comes through your page. When they are ready, they book. You handle zero of it.",
  },
  {
    step: "04",
    title: "Hit 5 sales and we take over growth",
    body: "After your fifth referral closes, HeyPearl turns on paid advertising to your landing page - at our expense. We drive the traffic. You collect the commission. Every month.",
  },
];

const WHAT_YOU_GET = [
  {
    title: "Your own branded landing page",
    body: "Built with your name, your photo, and your unique tracking link. Looks completely professional. Live within 24 hours of approval. You do not write a word of it.",
  },
  {
    title: "A full email funnel that converts",
    body: "Automated email sequences follow up with every single lead who comes through your page. Multiple touchpoints, proven copy, timed perfectly. You never have to follow up manually. Ever.",
  },
  {
    title: "Complete automation, set and forget",
    body: "Lead fills out your form, automation takes over. Emails go out, calls get booked, leads get nurtured. Our system works 24/7 in the background. You could be on vacation and still be earning.",
  },
  {
    title: "Real-time earnings dashboard",
    body: "See every click, every referral, every conversion, and every commission dollar in one place. Know exactly what you are earning and when your next payout lands.",
  },
  {
    title: "We drive traffic after 5 sales",
    body: "Hit five closed referrals and HeyPearl activates paid advertising to your landing page on your behalf - at no cost to you. We spend money to grow your income. That is how much we believe in this.",
  },
  {
    title: "Personal onboarding. 30 minutes, done.",
    body: "One call. We handle the entire setup. You answer a few questions and walk away with a fully operational referral business. Most partners are live and sharing their link the same day.",
  },
];

const PROOF = [
  {
    quote: "I posted in three local Facebook groups for local businesses in my area. By the end of the week I had two leads in my funnel. One closed the following month. I did not make a single sales call.",
    name: "Danielle R.",
    detail: "Stay at home mom, Texas",
    earning: "$500/mo from 1 referral",
  },
  {
    quote: "I am a realtor. I started sharing my link with agents in my office and at networking events. I just tell them about the AI visibility thing and send them to my page. HeyPearl handles the rest. I have four active clients now.",
    name: "Marcus T.",
    detail: "Real estate agent, Florida",
    earning: "$2,000/mo recurring",
  },
  {
    quote: "I work full time and do this on the side. I post once or twice a week on Instagram targeting local businesses. I spend maybe two hours a month on this. I will earn over $40,000 this year from commissions alone.",
    name: "Priya S.",
    detail: "Full-time professional, California",
    earning: "$3,500/mo and growing",
  },
];

function Ticker() {
  return (
    <div className="bg-[#E8185C] py-2.5 overflow-hidden">
      <div className="flex whitespace-nowrap" style={{ animation: "ticker 28s linear infinite" }}>
        {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
          <span key={i} className="text-white text-xs font-semibold mx-10 shrink-0">{item}</span>
        ))}
      </div>
    </div>
  );
}

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-white rounded-xl overflow-hidden shadow-sm">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-6 py-5 text-left cursor-pointer">
        <span className="font-semibold text-[#0F1E3A] pr-4">{q}</span>
        <span className="text-[#0F1E3A] text-xl font-bold shrink-0">{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div className="px-6 pb-5 border-t border-[#0F1E3A]/6">
          <p className="text-[#4A5E7A] leading-relaxed pt-4">{a}</p>
        </div>
      )}
    </div>
  );
}

export default function AffiliateLandingPage() {
  const [offers, setOffers] = useState<string[]>(STATIC_OFFERS);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    selectedOffers: [] as string[],
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/offers")
      .then((r) => r.json())
      .then((data) => {
        const custom: string[] = (data.offers ?? [])
          .filter((o: { active: boolean }) => o.active)
          .map((o: { slug: string }) => o.slug);
        setOffers([...STATIC_OFFERS, ...custom]);
      })
      .catch(() => {});
  }, []);

  function toggleOffer(slug: string) {
    setForm((f) => ({
      ...f,
      selectedOffers: f.selectedOffers.includes(slug)
        ? f.selectedOffers.filter((s) => s !== slug)
        : [...f.selectedOffers, slug],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    const res = await fetch("/api/affiliate-apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        offers: form.selectedOffers,
      }),
    });
    setSubmitting(false);
    if (!res.ok) {
      setError("Something went wrong. Please try again.");
      return;
    }
    setSubmitted(true);
  }

  return (
    <main className="min-h-screen font-sans">
      <style>{`@keyframes ticker { from { transform: translateX(0) } to { transform: translateX(-50%) } }`}</style>

      <Ticker />

      {/* ── HERO - NAVY ─────────────────────────────────────────────────────── */}
      <section className="bg-[#0F1E3A] py-16 md:py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white rounded-full px-4 py-1.5 mb-6 md:mb-8">
            <span className="w-2 h-2 rounded-full bg-[#E8185C] animate-pulse" />
            <span className="text-[#0F1E3A] text-xs font-bold uppercase tracking-widest">Partner Program. Now Open.</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-white leading-[1.05] tracking-tight mb-6">
            Earn{" "}
            <span className="text-[#E8185C]">$500/month</span>
            <br />for every client you refer.
          </h1>
          <p className="text-lg md:text-xl text-[#8A9AB5] leading-relaxed max-w-2xl mx-auto mb-10">
            Refer local businesses to HeyPearl and earn 20% recurring commission for every active client. You bring the client. We fulfill the service. You get paid every month - for as long as they stay.
          </p>
          <a href="#apply" className={CTA_BTN}>
            Apply to become a partner →
          </a>
          <div className="flex items-center justify-center gap-6 flex-wrap mt-6">
            {["Free to join.", "No selling required.", "Recurring commissions."].map((item) => (
              <span key={item} className="flex items-center gap-1.5 text-xs text-[#6B7FA0]">
                <span className="text-green-400 font-bold">✓</span>{item}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHAT YOU'RE SELLING - LIGHT ─────────────────────────────────────── */}
      <section className="bg-[#F0F2FA] py-16 md:py-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-black text-[#0F1E3A] mb-3">What your clients actually get</h2>
          <p className="text-[#4A5E7A] mb-12 max-w-xl mx-auto">You are not pitching software. You are introducing local businesses to something that actually grows their revenue. We fulfill everything. They get real results. They stay. You get paid.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-12">
            {[
              { label: "AI Visibility", body: "Their business shows up when customers search on ChatGPT, Google AI, and every major AI platform. We build and manage that presence for them." },
              { label: "Automation", body: "Lead follow-up, nurture sequences, and client communication all run on autopilot. Their business keeps working even when they are not." },
              { label: "Organic Growth", body: "We create the content strategy that puts their business in front of the right local customers - without paid ads, without guesswork." },
              { label: "Hyper-Local Market Authority", body: "We position them as the go-to business in their area. When someone searches locally, they show up first - in AI results, maps, and organic search." },
            ].map((item) => (
              <div key={item.label} className="bg-white rounded-2xl p-6 shadow-sm border border-[#0F1E3A]/6 text-left">
                <div className="text-[#E8185C] text-xs font-black uppercase tracking-widest mb-2">{item.label}</div>
                <p className="text-[#4A5E7A] text-sm leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>
          <div className="bg-[#0F1E3A] rounded-2xl px-8 py-8 text-center">
            <p className="text-white font-bold text-lg md:text-xl leading-snug mb-3">You bring the client. We do the rest. You get paid every month.</p>
            <p className="text-[#8A9AB5] text-sm leading-relaxed max-w-lg mx-auto mb-5">We onboard, fulfill, and deliver every result. Every strategy call, every campaign, every report - handled by HeyPearl from day one. Completely done for you.</p>
            <div className="border-t border-white/10 pt-5">
              <p className="text-[#E8185C] font-bold text-sm uppercase tracking-widest mb-2">Why clients stay for years</p>
              <p className="text-[#8A9AB5] text-sm leading-relaxed max-w-lg mx-auto">Our clients see their business grow. Their AI visibility climbs. Their phone rings. Their revenue goes up. When a service actually works, people do not cancel - they refer their friends. That is a loyal, long-term client. And every month they stay active, your commission keeps coming in.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── THE MATH - LIGHT ────────────────────────────────────────────────── */}
      <section className="bg-[#F0F2FA] py-16 md:py-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-black text-[#0F1E3A] mb-3">The math is simple. The income is predictable.</h2>
          <p className="text-[#4A5E7A] mb-12 max-w-lg mx-auto">20% recurring commission. Every month. For every active client you referred. Here is what that looks like in real life.</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {[
              { refs: "1 referral", earn: "$6,000/yr", note: "$500/month as long as they stay active" },
              { refs: "5 referrals", earn: "$30,000/yr", note: "That is a part-time salary - passive" },
              { refs: "20 referrals", earn: "$120,000/yr", note: "Top partners hit this in under 18 months" },
            ].map((r) => (
              <div key={r.refs} className="bg-white rounded-2xl p-6 shadow-sm border border-[#0F1E3A]/6">
                <div className="text-sm font-semibold text-[#4A5E7A] mb-2">{r.refs}</div>
                <div className="text-3xl font-black text-[#E8185C] mb-1">{r.earn}</div>
                <div className="text-xs text-[#9BACC0]">{r.note}</div>
              </div>
            ))}
          </div>
          <p className="text-[#9BACC0] text-xs mt-8">Based on $2,500/month per client at 20% commission. Commissions are recurring for as long as the client remains active.</p>
        </div>
      </section>

      {/* ── WHAT YOU GET - NAVY ─────────────────────────────────────────────── */}
      <section className="bg-[#0F1E3A] py-16 md:py-20 px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-black text-white text-center mb-3">Everything is built for you</h2>
          <p className="text-[#8A9AB5] text-center mb-12 max-w-xl mx-auto">You do not build a thing. We hand you a fully operational referral business - landing page, funnels, automations, traffic - and you walk away with your link.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {WHAT_YOU_GET.map((item) => (
              <div key={item.title} className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[#E8185C] font-black text-lg">✓</span>
                  <h3 className="font-bold text-white text-base">{item.title}</h3>
                </div>
                <p className="text-[#8A9AB5] text-sm leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PROOF - LIGHT ───────────────────────────────────────────────────── */}
      <section className="bg-[#F0F2FA] py-16 md:py-20 px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-black text-[#0F1E3A] text-center mb-3">Real people. Real results.</h2>
          <p className="text-[#4A5E7A] text-center mb-12 max-w-lg mx-auto">You do not need a big audience, a sales background, or any experience. You just need to know local businesses - or be able to reach them online.</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {PROOF.map((p) => (
              <div key={p.name} className="bg-white rounded-2xl p-6 shadow-sm border border-[#0F1E3A]/6 flex flex-col">
                <p className="text-[#4A5E7A] text-sm leading-relaxed flex-1 mb-5 italic">&ldquo;{p.quote}&rdquo;</p>
                <div className="border-t border-[#0F1E3A]/6 pt-4">
                  <p className="text-[#0F1E3A] font-bold text-sm">{p.name}</p>
                  <p className="text-[#9BACC0] text-xs mb-2">{p.detail}</p>
                  <span className="inline-block bg-[#FFF0F4] text-[#E8185C] text-xs font-bold px-3 py-1 rounded-full">{p.earning}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS - NAVY ─────────────────────────────────────────────── */}
      <section className="bg-[#0F1E3A] py-16 md:py-20 px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-black text-white text-center mb-3">How it works</h2>
          <p className="text-[#8A9AB5] text-center mb-12 max-w-lg mx-auto">Four steps. Thirty minutes of your time. A fully automated income stream running in the background.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {HOW_IT_WORKS.map((s) => (
              <div key={s.step} className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <div className="text-[#E8185C] text-sm font-black uppercase tracking-widest mb-3">{s.step}</div>
                <h3 className="font-bold text-white text-lg mb-2">{s.title}</h3>
                <p className="text-[#8A9AB5] text-sm leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ - LIGHT ─────────────────────────────────────────────────────── */}
      <section className="bg-[#F0F2FA] py-16 md:py-20 px-6">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-black text-[#0F1E3A] text-center mb-3">Frequently asked questions</h2>
          <p className="text-[#4A5E7A] text-center mb-10">Everything you need to know before applying.</p>
          <div className="space-y-3">
            {FAQS.map((f) => <FAQItem key={f.q} q={f.q} a={f.a} />)}
          </div>
        </div>
      </section>

      {/* ── APPLY FORM - NAVY ───────────────────────────────────────────────── */}
      <section id="apply" className="bg-[#0F1E3A] py-16 md:py-20 px-6">
        <div className="max-w-lg mx-auto">
          {submitted ? (
            <div className="bg-white rounded-2xl p-10 text-center">
              <div className="text-5xl mb-5">🎉</div>
              <h2 className="text-2xl font-black text-[#0F1E3A] mb-3">Application received!</h2>
              <p className="text-[#4A5E7A] leading-relaxed mb-8">
                Book a quick onboarding call so we can walk you through the program and get your personal link live.
              </p>
              <a
                href={CALENDLY}
                target="_blank"
                rel="noopener noreferrer"
                className={`${CTA_BTN} w-full block text-center`}
              >
                Book your onboarding call →
              </a>
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-8 md:p-10">
              <h2 className="text-2xl font-black text-[#0F1E3A] text-center mb-2">Apply to become a partner</h2>
              <p className="text-[#4A5E7A] text-center text-sm mb-8">Takes 60 seconds. We review every application personally.</p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#0F1E3A] uppercase tracking-wide mb-1.5">First Name *</label>
                    <input
                      placeholder="Sarah"
                      value={form.firstName}
                      onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                      required
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#0F1E3A] uppercase tracking-wide mb-1.5">Last Name</label>
                    <input
                      placeholder="Johnson"
                      value={form.lastName}
                      onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                      className={INPUT_CLASS}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0F1E3A] uppercase tracking-wide mb-1.5">Email *</label>
                  <input
                    type="email"
                    placeholder="sarah@example.com"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    required
                    className={INPUT_CLASS}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0F1E3A] uppercase tracking-wide mb-2">
                    Which offer(s) interest you?{" "}
                    <span className="normal-case font-normal text-[#9BACC0]">(optional)</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {offers.map((slug) => {
                      const selected = form.selectedOffers.includes(slug);
                      return (
                        <button
                          key={slug}
                          type="button"
                          onClick={() => toggleOffer(slug)}
                          className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition-all duration-150 cursor-pointer ${
                            selected
                              ? "bg-[#E8185C] border-[#E8185C] text-white"
                              : "bg-white border-[#0F1E3A]/15 text-[#4A5E7A] hover:border-[#E8185C] hover:text-[#E8185C]"
                          }`}
                        >
                          {slug}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {error && <p className="text-red-500 text-sm">{error}</p>}

                <button
                  type="submit"
                  disabled={submitting}
                  className={`w-full ${CTA_BTN} text-center mt-2`}
                  style={{ opacity: submitting ? 0.7 : 1 }}
                >
                  {submitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Submitting...
                    </span>
                  ) : (
                    "Submit application →"
                  )}
                </button>

                <div className="flex items-center justify-center gap-6 flex-wrap pt-1">
                  {["Free to join.", "No credit card.", "We reply within 24h."].map((item) => (
                    <span key={item} className="flex items-center gap-1.5 text-xs text-[#9BACC0]">
                      <span className="text-green-500 font-bold">✓</span>{item}
                    </span>
                  ))}
                </div>
              </form>
            </div>
          )}
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────────── */}
      <footer className="bg-[#0A1628] py-8 px-6 text-center">
        <p className="text-[#4A5E7A] text-sm">© {new Date().getFullYear()} HeyPearl. All rights reserved.</p>
      </footer>

    </main>
  );
}
