# Cash Offer Seller Funnel — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a god-template seller lead capture funnel at `/cashoffer/[slug]` — address form on landing, Calendly booking on schedule page, nationwide cash offer angle, no HeyPearl branding visible to sellers.

**Architecture:** Dynamic `[slug]` route loads config from `app/templates/cashoffer/configs/index.ts` by slug key. Two template components (landing + schedule) receive config as prop. Each V2 client gets a custom domain CNAMEd to Vercel — their slug is internal only.

**Tech Stack:** Next.js 16.2 (App Router), TypeScript, Tailwind CSS, Supabase, Vercel

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `app/templates/cashoffer/config.types.ts` | Create | TypeScript interface for all config fields |
| `app/templates/cashoffer/configs/demo.ts` | Create | God demo config (Cash Offers USA) |
| `app/templates/cashoffer/configs/index.ts` | Create | Slug → config lookup map |
| `app/templates/cashoffer/CashOfferLandingPage.tsx` | Create | Full landing page component |
| `app/templates/cashoffer/CashOfferSchedulePage.tsx` | Create | Calendly booking page component |
| `app/cashoffer/[slug]/page.tsx` | Create | Thin route wrapper — landing |
| `app/cashoffer/[slug]/schedule/page.tsx` | Create | Thin route wrapper — schedule |
| `app/api/cashoffer-optin/route.ts` | Create | Save address lead to Supabase |

---

## Task 1: Create cashoffer_leads Table in Supabase

**Files:**
- Supabase migration (via MCP `apply_migration`)

- [ ] **Step 1: Apply the migration**

Use the Supabase MCP `apply_migration` tool with project `jntughoiksxosjapklfo` and this SQL:

```sql
create table if not exists public.cashoffer_leads (
  id uuid primary key default gen_random_uuid(),
  address text not null,
  email text,
  phone text,
  name text,
  slug text not null,
  created_at timestamptz not null default now()
);
```

- [ ] **Step 2: Verify table exists**

Use `execute_sql` to confirm:
```sql
select column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'cashoffer_leads'
order by ordinal_position;
```

Expected: 6 columns (id, address, email, phone, name, slug, created_at).

- [ ] **Step 3: Commit note**

```bash
cd /Users/mistibruton/Desktop/geo-landing
git commit --allow-empty -m "chore: cashoffer_leads table created in Supabase"
```

---

## Task 2: Config Types

**Files:**
- Create: `app/templates/cashoffer/config.types.ts`

- [ ] **Step 1: Create the file**

```typescript
// app/templates/cashoffer/config.types.ts

export interface CashOfferTestimonial {
  name: string;
  location: string;       // e.g. "Austin, TX"
  situation: string;      // tag shown on card: "Relocation" | "Inherited Home" | "Divorce" etc.
  quote: string;
}

export interface CashOfferFomoEntry {
  name: string;
  city: string;
}

export interface CashOfferFunnelConfig {
  // ── Brand ──────────────────────────────────────────────────────────────────
  brandName: string;
  logoUrl?: string;         // shown in nav; falls back to brandName text

  // ── Colors ─────────────────────────────────────────────────────────────────
  colorPrimary: string;     // checkmarks, accent icons, CTA on dark sections
  colorNavy: string;        // dark section backgrounds, heading text
  colorLight: string;       // alternating light section backgrounds
  colorBg: string;          // page / input background
  colorButton?: string;     // CTA button on light/white sections — defaults to colorPrimary

  // ── Tracking ────────────────────────────────────────────────────────────────
  funnelTag: string;        // stored in cashoffer_leads.slug
  metaPixelId?: string;

  // ── Routing ─────────────────────────────────────────────────────────────────
  scheduleRoute: string;    // e.g. "/cashoffer/demo/schedule"
  apiOptinRoute: string;    // e.g. "/api/cashoffer-optin"
  calendlyUrl: string;

  // ── Hero ────────────────────────────────────────────────────────────────────
  heroHeadline: string;
  heroSubheadline: string;

  // ── Trust Strip ─────────────────────────────────────────────────────────────
  trustStats: Array<{ stat: string; label: string }>;

  // ── How It Works ────────────────────────────────────────────────────────────
  steps: Array<{ num: string; title: string; body: string }>;

  // ── Pain Cards ──────────────────────────────────────────────────────────────
  painCards: Array<{ headline: string; body: string }>;

  // ── Testimonials (shown in 2 rounds of 3) ───────────────────────────────────
  testimonials: CashOfferTestimonial[];

  // ── What You Get ────────────────────────────────────────────────────────────
  valueItems: string[];     // checklist items

  // ── FAQ ─────────────────────────────────────────────────────────────────────
  faqs: Array<{ q: string; a: string }>;

  // ── Schedule Page ───────────────────────────────────────────────────────────
  scheduleHeadline: string;
  scheduleSubheadline: string;
  scheduleCallItems: Array<{ icon: string; text: string }>;

  // ── FOMO Popup ──────────────────────────────────────────────────────────────
  fomoEntries: CashOfferFomoEntry[];
  fomoPopupLabel: string;   // e.g. "just requested a cash offer"
}
```

- [ ] **Step 2: Commit**

```bash
git add app/templates/cashoffer/config.types.ts
git commit -m "feat: cashoffer funnel config types"
```

---

## Task 3: Demo Config + Index

**Files:**
- Create: `app/templates/cashoffer/configs/demo.ts`
- Create: `app/templates/cashoffer/configs/index.ts`

- [ ] **Step 1: Create demo config**

```typescript
// app/templates/cashoffer/configs/demo.ts
import type { CashOfferFunnelConfig } from "../config.types";

const config: CashOfferFunnelConfig = {
  brandName: "Cash Offers USA",

  colorPrimary: "#10B981",     // emerald green — neutral, works nationwide
  colorNavy: "#0F1E3A",
  colorLight: "#F0FDF4",
  colorBg: "#F8FAFC",

  funnelTag: "demo",
  scheduleRoute: "/cashoffer/demo/schedule",
  apiOptinRoute: "/api/cashoffer-optin",
  calendlyUrl: "https://calendly.com/hey-pearl/meet",

  heroHeadline: "Get a Cash Offer on Your Home — in 24 Hours.",
  heroSubheadline: "No repairs. No agent fees. No open houses. Close in as few as 7 days.",

  trustStats: [
    { stat: "2,400+", label: "Homes purchased" },
    { stat: "9 days", label: "Avg. days to close" },
    { stat: "48 states", label: "We buy nationwide" },
    { stat: "No obligation", label: "Ever. Seriously." },
  ],

  steps: [
    { num: "01", title: "Enter your address", body: "Takes 30 seconds. No account needed. No junk mail." },
    { num: "02", title: "Receive your offer", body: "We review your property and send a fair cash offer within 24 hours." },
    { num: "03", title: "Close on your timeline", body: "You pick the date. We can close in as few as 7 days or wait until you're ready." },
  ],

  painCards: [
    { headline: "5–6% in agent commissions", body: "On a $400,000 home, that's up to $24,000 gone before you even move. We charge zero commissions and pay all closing costs." },
    { headline: "Months sitting on market", body: "The average home takes 60–90 days to sell traditionally. We make an offer in 24 hours and close when you're ready." },
    { headline: "Buyers demanding repairs", body: "Inspections lead to repair requests. Most sellers end up spending thousands fixing issues before closing. We buy as-is — no repairs, ever." },
    { headline: "Deals falling through", body: "30% of traditional sales fall apart at the last minute due to financing issues. Cash buyers don't need bank approval. Your deal is done." },
    { headline: "Endless showings", body: "Strangers walking through your home at all hours. Keeping it spotless for weeks. We skip all of that — one quick walkthrough, if that." },
  ],

  testimonials: [
    {
      name: "Sandra K.",
      location: "Denver, CO",
      situation: "Relocation",
      quote: "My company transferred me across the country with 3 weeks notice. I had no time to list traditionally. Cash Offers USA gave me a fair number in 24 hours and we closed before I left. Absolutely saved me.",
    },
    {
      name: "Robert M.",
      location: "Tampa, FL",
      situation: "Inherited Home",
      quote: "After my mother passed, we inherited her home two states away. It needed work and we weren't up for managing a renovation from a distance. We got an offer, signed the papers, and it was done. Huge weight off.",
    },
    {
      name: "Carla & James T.",
      location: "Phoenix, AZ",
      situation: "Divorce",
      quote: "We needed a clean break, fast. The last thing either of us wanted was months of showings and negotiations with agents. This was straightforward, fair, and over in 11 days.",
    },
    {
      name: "Bill H.",
      location: "Charlotte, NC",
      situation: "Too Many Repairs",
      quote: "The roof needed replacing, the HVAC was shot, and the kitchen was from 1987. An agent quoted me $40,000 in updates before listing. These guys bought it exactly as it was.",
    },
    {
      name: "Yolanda F.",
      location: "Houston, TX",
      situation: "Downsizing",
      quote: "My kids are grown and I just wanted something smaller. I didn't want the hassle of staging and open houses at my age. Called on a Tuesday, had an offer Thursday, closed in 10 days.",
    },
    {
      name: "Marcus & Diana L.",
      location: "Atlanta, GA",
      situation: "Fast Close Needed",
      quote: "We found our dream home but needed to sell first. Our agent said it would take months. We called here, closed in 8 days, and made our offer with cash in hand. It worked out perfectly.",
    },
  ],

  valueItems: [
    "No repairs or cleaning required — we buy as-is",
    "Zero agent commissions or hidden fees",
    "No open houses or strangers walking through your home",
    "You pick the closing date — fast or relaxed",
    "Cash wired directly to you at close",
    "No financing contingencies — the deal doesn't fall through",
  ],

  faqs: [
    {
      q: "Is the offer a fair price?",
      a: "We make competitive offers based on current market data and the condition of your home. Our offer reflects a fair price for a fast, certain, hassle-free sale — which has real value compared to months of uncertainty with a traditional listing.",
    },
    {
      q: "What types of homes do you buy?",
      a: "Single-family homes, condos, townhomes, multi-family properties, and inherited or distressed homes. We buy in any condition — no repairs needed.",
    },
    {
      q: "What if I still owe money on my mortgage?",
      a: "That's no problem. We pay off your mortgage at closing out of the sale proceeds, and you receive the difference.",
    },
    {
      q: "How fast can you actually close?",
      a: "As fast as 7 days if needed. Most clients close in 10–14 days. But if you need more time, we can wait — you set the date.",
    },
    {
      q: "Is there any obligation after I submit my address?",
      a: "None at all. Getting an offer is completely free. You're under zero obligation to accept, and there's no pressure from our side.",
    },
  ],

  scheduleHeadline: "We have buyers active in your area right now.",
  scheduleSubheadline: "Book a free 15-minute call. We'll confirm your property details and walk you through your cash offer.",
  scheduleCallItems: [
    { icon: "🏡", text: "We confirm your property details and answer any questions about the process" },
    { icon: "💵", text: "We walk through your cash offer range based on your home and location" },
    { icon: "📅", text: "If you want to move forward, we set a closing date that works for your timeline" },
  ],

  fomoPopupLabel: "just requested a cash offer",
  fomoEntries: [
    { name: "Sandra K.", city: "Denver, CO" },
    { name: "Marcus T.", city: "Austin, TX" },
    { name: "Denise H.", city: "Tampa, FL" },
    { name: "Carlos M.", city: "Phoenix, AZ" },
    { name: "Jasmine R.", city: "Nashville, TN" },
    { name: "Brett L.", city: "Charlotte, NC" },
    { name: "Tony V.", city: "Houston, TX" },
    { name: "Sandra K.", city: "San Diego, CA" },
    { name: "Derek W.", city: "Atlanta, GA" },
    { name: "Priya S.", city: "Portland, OR" },
    { name: "James F.", city: "Chicago, IL" },
    { name: "Lena B.", city: "Miami, FL" },
    { name: "Kevin O.", city: "Columbus, OH" },
    { name: "Rachel P.", city: "Seattle, WA" },
    { name: "Mike D.", city: "Las Vegas, NV" },
  ],
};

export default config;
```

- [ ] **Step 2: Create the index (slug → config map)**

```typescript
// app/templates/cashoffer/configs/index.ts
import type { CashOfferFunnelConfig } from "../config.types";
import demo from "./demo";

export const cashOfferConfigs: Record<string, CashOfferFunnelConfig> = {
  demo,
};
```

- [ ] **Step 3: Commit**

```bash
git add app/templates/cashoffer/configs/
git commit -m "feat: cashoffer demo config and slug index"
```

---

## Task 4: API Route

**Files:**
- Create: `app/api/cashoffer-optin/route.ts`

- [ ] **Step 1: Create the route**

```typescript
// app/api/cashoffer-optin/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const body = await req.json();
  const address = (body.address ?? "").trim();
  const slug = (body.slug ?? "").trim();

  if (!address || !slug) {
    return NextResponse.json({ ok: false, error: "Missing fields" }, { status: 400 });
  }

  await supabase.from("cashoffer_leads").insert({ address, slug });

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Verify build**

```bash
cd /Users/mistibruton/Desktop/geo-landing && npm run build 2>&1 | tail -20
```

Expected: no TypeScript errors in `app/api/cashoffer-optin/`.

- [ ] **Step 3: Commit**

```bash
git add app/api/cashoffer-optin/route.ts
git commit -m "feat: cashoffer-optin API route"
```

---

## Task 5: CashOfferLandingPage Component

**Files:**
- Create: `app/templates/cashoffer/CashOfferLandingPage.tsx`

- [ ] **Step 1: Create the component**

```tsx
// app/templates/cashoffer/CashOfferLandingPage.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { CashOfferFunnelConfig } from "./config.types";

// ─── Meta Pixel ───────────────────────────────────────────────────────────────

function MetaPixelScript({ id }: { id: string }) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const w = window as Window & { fbq?: (...args: unknown[]) => void; _fbq?: unknown };
    if (w.fbq) { w.fbq("init", id); w.fbq("track", "PageView"); return; }
    const script = document.createElement("script");
    script.async = true;
    script.src = "https://connect.facebook.net/en_US/fbevents.js";
    const n: ((...args: unknown[]) => void) & { callMethod?: (...args: unknown[]) => void; queue?: unknown[]; push?: unknown; loaded?: boolean; version?: string } = function (...args: unknown[]) {
      if (n.callMethod) n.callMethod(...args); else n.queue!.push(args);
    };
    n.push = n; n.loaded = true; n.version = "2.0"; n.queue = [];
    w.fbq = n; w._fbq = n;
    script.onload = () => { if (w.fbq) { w.fbq("init", id); w.fbq("track", "PageView"); } };
    document.head.appendChild(script);
  }, [id]);
  return null;
}

// ─── FOMO Popup ───────────────────────────────────────────────────────────────

function FomoPopup({ config }: { config: CashOfferFunnelConfig }) {
  const [current, setCurrent] = useState<number | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const show = (index: number) => {
      setCurrent(index);
      setVisible(true);
      setTimeout(() => setVisible(false), 4500);
    };
    const first = setTimeout(() => show(Math.floor(Math.random() * config.fomoEntries.length)), 6000);
    let idx = 1;
    const interval = setInterval(() => { show((idx++) % config.fomoEntries.length); }, 13000);
    return () => { clearTimeout(first); clearInterval(interval); };
  }, [config.fomoEntries.length]);

  if (current === null) return null;
  const n = config.fomoEntries[current];

  return (
    <div
      className={`fixed bottom-6 left-6 z-50 transition-all duration-500 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"}`}
      style={{ maxWidth: "calc(100vw - 48px)" }}
    >
      <div className="bg-white rounded-xl shadow-xl border border-[#0F1E3A]/10 px-4 py-3 flex items-center gap-3 w-[300px]">
        <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: config.colorPrimary }}>
          <span className="text-white text-[10px] font-bold">{n.name.split(" ").map((w: string) => w[0]).join("")}</span>
        </div>
        <div>
          <p className="text-[#0F1E3A] text-xs font-semibold leading-tight">{n.name} · <span className="font-bold">{n.city}</span></p>
          <p className="text-[#6B7FA0] text-[11px] leading-tight mt-0.5">{config.fomoPopupLabel}</p>
        </div>
      </div>
    </div>
  );
}

// ─── FAQ Item ─────────────────────────────────────────────────────────────────

function FaqItem({ q, a, colorNavy, colorPrimary }: { q: string; a: string; colorNavy: string; colorPrimary: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-[#0F1E3A]/10 last:border-0">
      <button className="w-full flex items-center justify-between py-4 text-left gap-4" onClick={() => setOpen(!open)}>
        <span className="font-semibold text-sm leading-snug" style={{ color: colorNavy }}>{q}</span>
        <span className="text-xl font-light shrink-0" style={{ color: colorPrimary }}>{open ? "−" : "+"}</span>
      </button>
      {open && <p className="text-[#4A5E7A] text-sm pb-4 leading-relaxed">{a}</p>}
    </div>
  );
}

// ─── Address Form ─────────────────────────────────────────────────────────────

function AddressForm({
  address,
  setAddress,
  loading,
  onSubmit,
  ctaBtnStyle,
  placeholder = "Enter your home address...",
  label = "Get My Cash Offer →",
}: {
  address: string;
  setAddress: (v: string) => void;
  loading: boolean;
  onSubmit: (e: React.FormEvent) => void;
  ctaBtnStyle: React.CSSProperties;
  placeholder?: string;
  label?: string;
}) {
  return (
    <form onSubmit={onSubmit} className="flex flex-col sm:flex-row gap-3 w-full max-w-xl">
      <input
        type="text"
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        placeholder={placeholder}
        required
        className="flex-1 px-4 py-4 rounded-xl border border-[#0F1E3A]/20 text-[#0F1E3A] text-sm focus:outline-none focus:ring-2 focus:ring-[#0F1E3A]/30"
        style={{ background: "#fff" }}
      />
      <button type="submit" style={{ ...ctaBtnStyle, whiteSpace: "nowrap" }} disabled={loading}>
        {loading ? "One moment..." : label}
      </button>
    </form>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CashOfferLandingPage({ config }: { config: CashOfferFunnelConfig }) {
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const ctaBtnStyle: React.CSSProperties = {
    background: config.colorButton ?? config.colorPrimary,
    color: "#0F1E3A",
    fontWeight: "bold",
    fontSize: "1rem",
    padding: "1rem 2rem",
    borderRadius: "0.75rem",
    cursor: loading ? "not-allowed" : "pointer",
    opacity: loading ? 0.7 : 1,
    border: "none",
    transition: "opacity 0.2s",
  };

  // On dark navy sections, always use colorPrimary — never colorButton (risk of navy-on-navy)
  const ctaBtnOnDarkStyle: React.CSSProperties = {
    ...ctaBtnStyle,
    background: config.colorPrimary,
    opacity: loading ? 0.7 : 1,
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!address.trim()) return;
    setLoading(true);
    try {
      await fetch(config.apiOptinRoute, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: address.trim(), slug: config.funnelTag }),
      });
    } catch { /* non-blocking — always redirect */ }
    router.push(`${config.scheduleRoute}?address=${encodeURIComponent(address.trim())}`);
  }

  const [round1, round2] = [config.testimonials.slice(0, 3), config.testimonials.slice(3, 6)];

  return (
    <main className="min-h-screen text-[#0F1E3A] font-sans" style={{ background: config.colorBg }}>
      {config.metaPixelId && <MetaPixelScript id={config.metaPixelId} />}

      {/* NAV */}
      <nav className="flex items-center justify-center py-5 px-6 border-b border-white/10" style={{ background: config.colorNavy }}>
        {config.logoUrl
          ? <img src={config.logoUrl} alt={config.brandName} className="h-10 w-auto" />
          : <span className="text-white text-xl font-extrabold tracking-tight">{config.brandName}</span>
        }
      </nav>

      {/* HERO */}
      <section className="py-20 px-6" style={{ background: config.colorNavy }}>
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-6 border border-white/20 bg-white/10">
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: config.colorPrimary }} />
            <span className="text-white/80 text-sm font-medium">Free offer. No obligation. No agent needed.</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">{config.heroHeadline}</h1>
          <p className="text-white/70 text-lg mb-10 leading-relaxed">{config.heroSubheadline}</p>
          <div className="flex justify-center">
            <AddressForm
              address={address}
              setAddress={setAddress}
              loading={loading}
              onSubmit={handleSubmit}
              ctaBtnStyle={ctaBtnOnDarkStyle}
            />
          </div>
          <p className="text-white/40 text-xs mt-4">Takes 30 seconds. No account. No pressure.</p>
        </div>
      </section>

      {/* TRUST STRIP */}
      <section className="py-10 px-6 border-b" style={{ background: config.colorLight, borderColor: config.colorNavy + "14" }}>
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {config.trustStats.map((s, i) => (
            <div key={i}>
              <p className="text-2xl font-bold" style={{ color: config.colorNavy }}>{s.stat}</p>
              <p className="text-[#6B7FA0] text-sm mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <p className="text-xs font-bold uppercase tracking-widest text-center mb-2" style={{ color: config.colorPrimary }}>Simple Process</p>
          <h2 className="text-3xl font-bold text-center mb-12" style={{ color: config.colorNavy }}>Three steps to sold.</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {config.steps.map((step, i) => (
              <div key={i} className="text-center">
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm mx-auto mb-4 shadow" style={{ background: config.colorPrimary }}>
                  {step.num}
                </div>
                <h3 className="font-bold text-lg mb-2" style={{ color: config.colorNavy }}>{step.title}</h3>
                <p className="text-[#4A5E7A] text-sm leading-relaxed">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PAIN SECTION */}
      <section className="py-16 px-6" style={{ background: config.colorNavy }}>
        <div className="max-w-4xl mx-auto">
          <p className="text-xs font-bold uppercase tracking-widest mb-2 text-center" style={{ color: config.colorPrimary }}>Why Cash</p>
          <h2 className="text-3xl font-bold text-white text-center mb-4">Why more homeowners are skipping the traditional process</h2>
          <p className="text-white/60 text-center mb-12 max-w-xl mx-auto">Listing with an agent works — sometimes. But it comes with costs most sellers don't see coming.</p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {config.painCards.map((card, i) => (
              <div key={i} className="rounded-xl p-5 border border-white/10 bg-white/5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: config.colorPrimary }}>
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="#0F1E3A" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-white font-bold text-sm">{card.headline}</p>
                </div>
                <p className="text-white/50 text-xs leading-relaxed">{card.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS ROUND 1 */}
      <section className="py-16 px-6" style={{ background: config.colorLight }}>
        <div className="max-w-4xl mx-auto">
          <p className="text-xs font-bold uppercase tracking-widest mb-2 text-center" style={{ color: config.colorPrimary }}>Real Stories</p>
          <h2 className="text-3xl font-bold text-center mb-12" style={{ color: config.colorNavy }}>Homeowners like you, done and closed.</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {round1.map((t, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-[#0F1E3A]/8">
                <div className="inline-block rounded-full px-3 py-1 text-xs font-bold mb-4" style={{ background: config.colorPrimary + "22", color: config.colorNavy }}>{t.situation}</div>
                <p className="text-[#4A5E7A] text-sm leading-relaxed mb-4">&ldquo;{t.quote}&rdquo;</p>
                <div className="flex items-center gap-3 border-t border-[#0F1E3A]/8 pt-4">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ background: config.colorNavy }}>
                    {t.name.split(" ").map((w: string) => w[0]).join("")}
                  </div>
                  <div>
                    <p className="text-[#0F1E3A] text-xs font-semibold">{t.name}</p>
                    <p className="text-[#6B7FA0] text-xs">{t.location}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHAT YOU GET */}
      <section className="py-16 px-6">
        <div className="max-w-3xl mx-auto">
          <p className="text-xs font-bold uppercase tracking-widest mb-2 text-center" style={{ color: config.colorPrimary }}>What You Get</p>
          <h2 className="text-3xl font-bold text-center mb-12" style={{ color: config.colorNavy }}>Everything included. Nothing hidden.</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {config.valueItems.map((item, i) => (
              <div key={i} className="flex items-start gap-3 rounded-xl p-4 border" style={{ background: config.colorLight, borderColor: config.colorNavy + "14" }}>
                <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: config.colorPrimary }}>
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="#0F1E3A" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-sm font-medium" style={{ color: config.colorNavy }}>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS ROUND 2 */}
      <section className="py-16 px-6" style={{ background: config.colorNavy }}>
        <div className="max-w-4xl mx-auto">
          <p className="text-xs font-bold uppercase tracking-widest mb-2 text-center" style={{ color: config.colorPrimary }}>More Stories</p>
          <h2 className="text-3xl font-bold text-white text-center mb-12">From all kinds of situations.</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {round2.map((t, i) => (
              <div key={i} className="rounded-2xl p-6 border border-white/10 bg-white/5">
                <div className="inline-block rounded-full px-3 py-1 text-xs font-bold mb-4" style={{ background: config.colorPrimary + "33", color: config.colorPrimary }}>{t.situation}</div>
                <p className="text-white/70 text-sm leading-relaxed mb-4">&ldquo;{t.quote}&rdquo;</p>
                <div className="flex items-center gap-3 border-t border-white/10 pt-4">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-[#0F1E3A] text-xs font-bold shrink-0" style={{ background: config.colorPrimary }}>
                    {t.name.split(" ").map((w: string) => w[0]).join("")}
                  </div>
                  <div>
                    <p className="text-white text-xs font-semibold">{t.name}</p>
                    <p className="text-white/50 text-xs">{t.location}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 px-6" style={{ background: config.colorBg }}>
        <div className="max-w-2xl mx-auto">
          <p className="text-xs font-bold uppercase tracking-widest mb-2 text-center" style={{ color: config.colorPrimary }}>Questions</p>
          <h2 className="text-3xl font-bold text-center mb-10" style={{ color: config.colorNavy }}>Everything you want to know.</h2>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#0F1E3A]/8">
            {config.faqs.map((faq, i) => (
              <FaqItem key={i} q={faq.q} a={faq.a} colorNavy={config.colorNavy} colorPrimary={config.colorPrimary} />
            ))}
          </div>
        </div>
      </section>

      {/* BOTTOM CTA */}
      <section className="py-20 px-6" style={{ background: config.colorLight }}>
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4" style={{ color: config.colorNavy }}>Still thinking? Get your number.</h2>
          <p className="text-[#4A5E7A] mb-8">Free. No obligation. You can always say no.</p>
          <div className="flex justify-center">
            <AddressForm
              address={address}
              setAddress={setAddress}
              loading={loading}
              onSubmit={handleSubmit}
              ctaBtnStyle={ctaBtnStyle}
              label="Get My No-Obligation Offer →"
            />
          </div>
          <p className="text-[#9BACC0] text-xs mt-4">No contracts. No pressure. We buy homes — that's it.</p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="px-6 py-8 text-center border-t border-[#0F1E3A]/8">
        <p className="text-[#9BACC0] text-sm">&copy; {new Date().getFullYear()} {config.brandName} &middot; All rights reserved.</p>
      </footer>

      <FomoPopup config={config} />
    </main>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
cd /Users/mistibruton/Desktop/geo-landing && npm run build 2>&1 | tail -20
```

Expected: no TypeScript errors in `app/templates/cashoffer/CashOfferLandingPage.tsx`.

- [ ] **Step 3: Commit**

```bash
git add app/templates/cashoffer/CashOfferLandingPage.tsx
git commit -m "feat: CashOfferLandingPage template component"
```

---

## Task 6: CashOfferSchedulePage Component

**Files:**
- Create: `app/templates/cashoffer/CashOfferSchedulePage.tsx`

- [ ] **Step 1: Create the component**

```tsx
// app/templates/cashoffer/CashOfferSchedulePage.tsx
"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { CashOfferFunnelConfig } from "./config.types";

function MetaPixelScript({ id }: { id: string }) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const w = window as Window & { fbq?: (...args: unknown[]) => void; _fbq?: unknown };
    if (w.fbq) { w.fbq("init", id); w.fbq("track", "PageView"); return; }
    const script = document.createElement("script");
    script.async = true;
    script.src = "https://connect.facebook.net/en_US/fbevents.js";
    const n: ((...args: unknown[]) => void) & { callMethod?: (...args: unknown[]) => void; queue?: unknown[]; push?: unknown; loaded?: boolean; version?: string } = function (...args: unknown[]) {
      if (n.callMethod) n.callMethod(...args); else n.queue!.push(args);
    };
    n.push = n; n.loaded = true; n.version = "2.0"; n.queue = [];
    w.fbq = n; w._fbq = n;
    script.onload = () => { if (w.fbq) { w.fbq("init", id); w.fbq("track", "PageView"); } };
    document.head.appendChild(script);
  }, [id]);
  return null;
}

function ScheduleContent({ config }: { config: CashOfferFunnelConfig }) {
  const searchParams = useSearchParams();
  const address = searchParams.get("address") ?? "";
  const [booked, setBooked] = useState(false);
  const calendlyLoaded = useRef(false);

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
        setBooked(true);
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  // Derive landing page href from scheduleRoute (strip /schedule suffix)
  const landingHref = config.scheduleRoute.replace(/\/schedule$/, "");

  const calendlyDataUrl = `${config.calendlyUrl}?hide_gdpr_banner=1&hide_event_type_details=1&hide_landing_page_details=1&background_color=ffffff&text_color=${config.colorNavy.replace("#", "")}&primary_color=${config.colorNavy.replace("#", "")}`;

  if (booked) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center" style={{ background: config.colorBg }}>
        <div className="w-16 h-16 rounded-full flex items-center justify-center mb-6 shadow-lg" style={{ background: config.colorPrimary }}>
          <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="#0F1E3A" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold mb-4" style={{ color: config.colorNavy }}>You&rsquo;re booked.</h1>
        <p className="text-[#4A5E7A] text-lg max-w-md">Check your email for confirmation details. We look forward to talking through your offer.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen text-[#0F1E3A] font-sans" style={{ background: config.colorBg }}>
      {config.metaPixelId && <MetaPixelScript id={config.metaPixelId} />}

      {/* NAV */}
      <nav className="flex items-center justify-center py-5 px-6 border-b border-white/10" style={{ background: config.colorNavy }}>
        <Link href={landingHref}>
          {config.logoUrl
            ? <img src={config.logoUrl} alt={config.brandName} className="h-10 w-auto" />
            : <span className="text-white text-xl font-extrabold tracking-tight">{config.brandName}</span>
          }
        </Link>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-12">

        {/* HEADER */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-6 border" style={{ background: config.colorPrimary + "1A", borderColor: config.colorPrimary + "40" }}>
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: config.colorPrimary }} />
            <span className="text-sm font-medium" style={{ color: config.colorNavy }}>Free call. No obligation.</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: config.colorNavy }}>{config.scheduleHeadline}</h1>
          <p className="text-[#4A5E7A] text-lg leading-relaxed">{config.scheduleSubheadline}</p>
        </div>

        {/* ADDRESS CONFIRMATION */}
        {address && (
          <div className="rounded-xl px-4 py-3 mb-6 border flex items-center gap-3" style={{ background: config.colorLight, borderColor: config.colorNavy + "14" }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: config.colorPrimary }}>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="#0F1E3A" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-[#6B7FA0]">Your property</p>
              <p className="text-sm font-semibold" style={{ color: config.colorNavy }}>{address}</p>
            </div>
          </div>
        )}

        {/* CALENDLY */}
        <div id="calendar" className="rounded-2xl overflow-hidden mb-8 shadow-lg" style={{ border: `2px solid ${config.colorNavy}`, scrollMarginTop: "16px" }}>
          <div className="flex items-center justify-between px-5 py-4" style={{ background: config.colorNavy }}>
            <div>
              <p className="text-white font-bold text-sm">Pick a time for your offer call</p>
              <p className="text-[#9BACC0] text-xs mt-0.5">15 min · Free · No obligation</p>
            </div>
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: config.colorPrimary }}>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke={config.colorNavy} strokeWidth={2.5}>
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18" />
              </svg>
            </div>
          </div>
          <div className="calendly-inline-widget" data-url={calendlyDataUrl} style={{ minWidth: "320px", height: "600px" }} />
        </div>

        {/* WHAT HAPPENS ON THE CALL */}
        <div className="bg-white border border-[#0F1E3A]/8 rounded-2xl p-6 mb-8 shadow-sm">
          <h3 className="font-bold text-base mb-4" style={{ color: config.colorNavy }}>What happens on the call</h3>
          <ul className="space-y-3">
            {config.scheduleCallItems.map((item, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="text-lg shrink-0">{item.icon}</span>
                <span className="text-[#4A5E7A] text-sm leading-relaxed">{item.text}</span>
              </li>
            ))}
          </ul>
        </div>

      </div>

      <footer className="px-6 py-8 text-center border-t border-[#0F1E3A]/8">
        <p className="text-[#9BACC0] text-sm">&copy; {new Date().getFullYear()} {config.brandName} &middot; All rights reserved.</p>
      </footer>
    </main>
  );
}

export default function CashOfferSchedulePage({ config }: { config: CashOfferFunnelConfig }) {
  return (
    <Suspense>
      <ScheduleContent config={config} />
    </Suspense>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
cd /Users/mistibruton/Desktop/geo-landing && npm run build 2>&1 | tail -20
```

Expected: no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add app/templates/cashoffer/CashOfferSchedulePage.tsx
git commit -m "feat: CashOfferSchedulePage template component"
```

---

## Task 7: Dynamic Route Wrappers

**Files:**
- Create: `app/cashoffer/[slug]/page.tsx`
- Create: `app/cashoffer/[slug]/schedule/page.tsx`

- [ ] **Step 1: Create landing route wrapper**

```tsx
// app/cashoffer/[slug]/page.tsx
import { notFound } from "next/navigation";
import CashOfferLandingPage from "@/app/templates/cashoffer/CashOfferLandingPage";
import { cashOfferConfigs } from "@/app/templates/cashoffer/configs/index";

export default async function CashOfferPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const config = cashOfferConfigs[slug];
  if (!config) notFound();
  return <CashOfferLandingPage config={config} />;
}
```

- [ ] **Step 2: Create schedule route wrapper**

```tsx
// app/cashoffer/[slug]/schedule/page.tsx
import { notFound } from "next/navigation";
import CashOfferSchedulePage from "@/app/templates/cashoffer/CashOfferSchedulePage";
import { cashOfferConfigs } from "@/app/templates/cashoffer/configs/index";

export default async function CashOfferScheduleRoute({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const config = cashOfferConfigs[slug];
  if (!config) notFound();
  return <CashOfferSchedulePage config={config} />;
}
```

- [ ] **Step 3: Verify build**

```bash
cd /Users/mistibruton/Desktop/geo-landing && npm run build 2>&1 | tail -30
```

Expected: build succeeds. Both routes appear in the build output.

- [ ] **Step 4: Commit**

```bash
git add app/cashoffer/
git commit -m "feat: cashoffer dynamic route wrappers"
```

---

## Task 8: Deploy and Verify

- [ ] **Step 1: Final build check**

```bash
cd /Users/mistibruton/Desktop/geo-landing && npm run build 2>&1 | grep -E "(error|Error|warning|Warning)" | head -20
```

Expected: no errors. Warnings are acceptable.

- [ ] **Step 2: Deploy to production**

```bash
/opt/homebrew/bin/vercel --prod
```

- [ ] **Step 3: Verify god demo page loads**

Open browser (or use Playwright MCP) and navigate to `https://geo.heypearl.io/cashoffer/demo`.

Expected:
- Navy nav with "Cash Offers USA" text
- Hero with address input form
- Trust strip with 4 stats
- All sections render

- [ ] **Step 4: Verify address submission flow**

Enter a test address in the hero form and submit.

Expected:
- Redirect to `https://geo.heypearl.io/cashoffer/demo/schedule?address=[encoded address]`
- Address confirmation card shows the entered address
- Calendly embed loads

- [ ] **Step 5: Verify 404 on unknown slug**

Navigate to `https://geo.heypearl.io/cashoffer/doesnotexist`.

Expected: Next.js 404 page (not an error crash).

- [ ] **Step 6: Commit final state**

```bash
git add -A && git commit -m "feat: cashoffer funnel live at geo.heypearl.io/cashoffer/demo

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```
