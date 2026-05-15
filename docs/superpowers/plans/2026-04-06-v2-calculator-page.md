# V2 Calculator Landing Page — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a seller-facing landing page at `v2.heypearl.io/calculator` that embeds the SellerHQ property wizard as its primary CTA, captures the seller lead in geo-landing's database, and routes to `/schedule` after the wizard completes.

**Architecture:** SellerHQ deploys as a standalone Vercel app and is embedded via `<iframe>` in the geo-landing calculator page. When the seller completes Step 7 (Contact), SellerHQ emits a `postMessage` with contact data; geo-landing captures the lead then waits. When the seller clicks "Talk to an Expert" on Step 8 (Results), a second `postMessage` triggers the parent to navigate to `/schedule`.

**Tech Stack:** Next.js 16.2 (App Router) + TypeScript + Tailwind CSS; Supabase for lead storage; Vercel for hosting both apps; `window.postMessage` for iframe-to-parent communication.

---

## File Map

### SellerHQ (`/Users/mistibruton/Desktop/sellerhq`)
| Action | File | Change |
|--------|------|--------|
| Modify | `components/wizard/steps/Step7LeadCapture.tsx` | Emit postMessage after successful lead save |
| Modify | `components/wizard/steps/Step8Results.tsx` | Add "Talk to an Expert" CTA that emits postMessage |

### geo-landing (`/Users/mistibruton/Desktop/geo-landing`)
| Action | File | Change |
|--------|------|--------|
| Create | `app/calculator/page.tsx` | Server component — metadata + renders CalculatorLandingPage |
| Create | `app/calculator/CalculatorLandingPage.tsx` | Client component — full landing page + iframe + postMessage listener |
| Create | `app/api/calculator-optin/route.ts` | POST endpoint — captures seller lead in `cashoffer_leads` |
| Modify | `.claude/rules/url-architecture.md` | Add `v2.heypearl.io/calculator` to valid URL table |

---

## Phase 1 — Deploy SellerHQ

### Task 1: Add SellerHQ Supabase service role key

SellerHQ's `.env.local` has `SUPABASE_SERVICE_ROLE_KEY=PASTE_FROM_SUPABASE_DASHBOARD`. It needs the real value before deploy.

**Files:** `/Users/mistibruton/Desktop/sellerhq/.env.local`

- [ ] **Step 1: Get the key**

  Go to [supabase.com](https://supabase.com) → project `zuhegryxgjtocwilimfv` → Project Settings → API → copy the `service_role` secret key.

- [ ] **Step 2: Update .env.local**

  Open `/Users/mistibruton/Desktop/sellerhq/.env.local` and replace `PASTE_FROM_SUPABASE_DASHBOARD` with the copied key. Also update `NEXT_PUBLIC_APP_URL` — leave as `http://localhost:3001` for now; you will update it in Vercel after deploy.

- [ ] **Step 3: Verify dev server still works**

  ```bash
  cd /Users/mistibruton/Desktop/sellerhq && npm run dev
  ```
  Open `http://localhost:3001/demo/app` — wizard should load without console errors.

---

### Task 2: Push SellerHQ to GitHub

- [ ] **Step 1: Create the GitHub repo**

  Go to github.com → New repository → name it `sellerhq` → private → do NOT initialize with README. Copy the SSH or HTTPS URL shown.

- [ ] **Step 2: Add .gitignore entry for .env.local**

  Check that `/Users/mistibruton/Desktop/sellerhq/.gitignore` contains `.env.local`. If not, add it:
  ```
  .env.local
  ```

- [ ] **Step 3: Push**

  ```bash
  cd /Users/mistibruton/Desktop/sellerhq
  git init
  git add .
  git commit -m "Initial SellerHQ commit"
  git branch -M main
  git remote add origin <YOUR_REPO_URL>
  git push -u origin main
  ```

---

### Task 3: Deploy SellerHQ to Vercel

- [ ] **Step 1: Create Vercel project**

  ```bash
  cd /Users/mistibruton/Desktop/sellerhq
  /opt/homebrew/bin/vercel
  ```
  When prompted: link to the `heypearlio` GitHub org, create a new project named `sellerhq`. Accept all defaults. Copy the preview URL shown (e.g. `sellerhq.vercel.app`).

- [ ] **Step 2: Add env vars to Vercel**

  Run each line separately (use `printf`, never `echo`):
  ```bash
  printf 'https://zuhegryxgjtocwilimfv.supabase.co' | /opt/homebrew/bin/vercel env add NEXT_PUBLIC_SUPABASE_URL production
  printf 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1aGVncnl4Z2p0b2N3aWxpbWZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyMzE3OTQsImV4cCI6MjA5MDgwNzc5NH0.vq4psGMUDPDHcejMoucMZ4d-LAuSF62SrW8XHIq-nrM' | /opt/homebrew/bin/vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
  printf '<YOUR_SERVICE_ROLE_KEY>' | /opt/homebrew/bin/vercel env add SUPABASE_SERVICE_ROLE_KEY production
  printf '<YOUR_OPENAI_KEY>' | /opt/homebrew/bin/vercel env add OPENAI_API_KEY production
  printf 'c3ce2d981d0c53670a4b4fab66cd5c69' | /opt/homebrew/bin/vercel env add ATTOM_API_KEY production
  ```
  Then set the app URL (replace `sellerhq.vercel.app` with your actual Vercel URL):
  ```bash
  printf 'https://sellerhq.vercel.app' | /opt/homebrew/bin/vercel env add NEXT_PUBLIC_APP_URL production
  ```

- [ ] **Step 3: Deploy to production**

  ```bash
  cd /Users/mistibruton/Desktop/sellerhq
  /opt/homebrew/bin/vercel --prod
  ```
  Expected output: `✅ Production: https://sellerhq.vercel.app`

- [ ] **Step 4: Smoke test**

  Open `https://sellerhq.vercel.app/demo/app` in the browser. The wizard should load at Step 1 (Address). Click through to Step 7 — confirm the form renders. You do not need to submit.

- [ ] **Step 5: Commit the Vercel project link**

  ```bash
  cd /Users/mistibruton/Desktop/sellerhq
  git add .vercel
  git commit -m "Link Vercel project"
  git push
  ```

---

## Phase 2 — Wire SellerHQ postMessage Events

### Task 4: Emit postMessage from Step 7 after lead capture

After a seller's contact info is saved, SellerHQ needs to tell the parent geo-landing page so it can capture the lead there too.

**Files:** `components/wizard/steps/Step7LeadCapture.tsx`

- [ ] **Step 1: Add postMessage call after `nextStep()`**

  In the `handleSubmit` function, after `nextStep()` is called (inside the `if (data.session_id)` block), add:

  ```typescript
  // Notify parent frame (geo-landing calculator page) that lead was captured
  if (window.parent !== window) {
    window.parent.postMessage(
      {
        type: 'sellerhq:lead-captured',
        email: form.email,
        name: form.name,
        phone: form.phone,
      },
      '*'
    )
  }
  ```

  The full updated block looks like:
  ```typescript
  if (data.session_id) {
    setSessionId(data.session_id)
    setLeadData(form)
    // Notify parent frame
    if (window.parent !== window) {
      window.parent.postMessage(
        { type: 'sellerhq:lead-captured', email: form.email, name: form.name, phone: form.phone },
        '*'
      )
    }
    nextStep()
  }
  ```

- [ ] **Step 2: Commit**

  ```bash
  cd /Users/mistibruton/Desktop/sellerhq
  git add components/wizard/steps/Step7LeadCapture.tsx
  git commit -m "Emit postMessage to parent on lead capture"
  git push
  ```

---

### Task 5: Add "Talk to an Expert" CTA to Step 8 Results

After the seller sees their results, give them a clear path to book a call.

**Files:** `components/wizard/steps/Step8Results.tsx`

- [ ] **Step 1: Add the CTA section before the back button**

  Find the `<div className="pb-6">` block near the bottom of `Step8Results.tsx` (line ~327) and insert the following immediately before it:

  ```tsx
  {/* Book a call CTA */}
  <div className="p-6 bg-[#0F1E3A] rounded-2xl text-center">
    <p className="text-white font-bold text-lg mb-1">Want to Talk Through Your Numbers?</p>
    <p className="text-[#9BACC0] text-sm mb-4">A quick strategy call can confirm which path is right for your situation.</p>
    <button
      onClick={() => {
        if (window.parent !== window) {
          window.parent.postMessage({ type: 'sellerhq:book-call' }, '*')
        }
      }}
      className="w-full py-3 bg-[#16A34A] text-white font-bold text-base rounded-xl hover:bg-[#15803d] transition-colors"
    >
      Talk to an Expert About My Results
    </button>
    <p className="text-[#6B7FA0] text-xs mt-2">Free strategy call. No obligation.</p>
  </div>
  ```

- [ ] **Step 2: Commit and deploy SellerHQ**

  ```bash
  cd /Users/mistibruton/Desktop/sellerhq
  git add components/wizard/steps/Step8Results.tsx
  git commit -m "Add book-a-call CTA to Step 8 Results"
  git push
  /opt/homebrew/bin/vercel --prod
  ```

---

## Phase 3 — Build the geo-landing Calculator Page

### Task 6: Add SELLERHQ env var to geo-landing

**Files:** `/Users/mistibruton/Desktop/geo-landing/.env.local`, Vercel

- [ ] **Step 1: Add to .env.local**

  Add this line to `/Users/mistibruton/Desktop/geo-landing/.env.local`:
  ```
  NEXT_PUBLIC_SELLERHQ_URL=https://sellerhq.vercel.app
  ```

- [ ] **Step 2: Add to Vercel**

  ```bash
  cd /Users/mistibruton/Desktop/geo-landing
  printf 'https://sellerhq.vercel.app' | /opt/homebrew/bin/vercel env add NEXT_PUBLIC_SELLERHQ_URL production
  ```

---

### Task 7: Check cashoffer_leads columns + migrate if needed

The calculator opt-in needs to save `email`, `name`, and `phone`. The existing `cashoffer_leads` table only has `address` and `slug`. We need to verify and add missing columns.

**Files:** Supabase migration via MCP

- [ ] **Step 1: Check existing columns**

  Run this SQL via Supabase MCP or dashboard:
  ```sql
  SELECT column_name, data_type
  FROM information_schema.columns
  WHERE table_name = 'cashoffer_leads'
  ORDER BY ordinal_position;
  ```

- [ ] **Step 2: Add missing columns**

  If `email`, `name`, `phone`, or `source_tag` are absent, run:
  ```sql
  ALTER TABLE cashoffer_leads
    ADD COLUMN IF NOT EXISTS email TEXT,
    ADD COLUMN IF NOT EXISTS name TEXT,
    ADD COLUMN IF NOT EXISTS phone TEXT,
    ADD COLUMN IF NOT EXISTS source_tag TEXT;
  ```

---

### Task 8: Create the calculator opt-in API route

**Files:** `app/api/calculator-optin/route.ts`

- [ ] **Step 1: Create the file**

  Create `/Users/mistibruton/Desktop/geo-landing/app/api/calculator-optin/route.ts`:

  ```typescript
  import { NextRequest, NextResponse } from "next/server";
  import { createClient } from "@supabase/supabase-js";
  import { buildLeadSource } from "../../../lib/source";

  export async function POST(req: NextRequest) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const body = await req.json();
    const email = (body.email ?? "").trim().toLowerCase();
    const name = (body.name ?? "").trim();
    const phone = (body.phone ?? "").trim();

    if (!email && !name && !phone) {
      return NextResponse.json({ ok: false, error: "No contact data" }, { status: 400 });
    }

    const { source_tag, source_url } = buildLeadSource(req, null);

    try {
      await supabase.from("cashoffer_leads").insert({
        email: email || null,
        name: name || null,
        phone: phone || null,
        slug: "v2-calculator",
        source_tag,
        source_url,
      });
    } catch {
      // Non-blocking — user flow continues regardless
    }

    return NextResponse.json({ ok: true });
  }
  ```

- [ ] **Step 2: Commit**

  ```bash
  cd /Users/mistibruton/Desktop/geo-landing
  git add app/api/calculator-optin/route.ts
  git commit -m "Add calculator opt-in API route"
  ```

---

### Task 9: Create CalculatorLandingPage component

This is the full seller landing page. Navy/light alternating sections. SellerHQ wizard in an iframe. postMessage listeners for lead capture and schedule routing.

**Files:** `app/calculator/CalculatorLandingPage.tsx`

- [ ] **Step 1: Create the file**

  Create `/Users/mistibruton/Desktop/geo-landing/app/calculator/CalculatorLandingPage.tsx`:

  ```tsx
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
        // Only accept messages from the SellerHQ domain
        const sellerhqOrigin = new URL(SELLERHQ_URL).origin;
        if (event.origin !== sellerhqOrigin) return;

        if (event.data?.type === "sellerhq:lead-captured" && !capturedRef.current) {
          capturedRef.current = true;
          const { email, name, phone } = event.data;
          // Fire-and-forget — capture lead in geo-landing DB
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

        {/* ── 1. HERO — NAVY ─────────────────────────────────────────────── */}
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

            <a href="#calculator" className={CTA_BTN}>See What I&apos;d Walk Away With →</a>
            <p className="text-[#6B7FA0] text-xs mt-3">Free. No commitment. Takes 90 seconds.</p>

          </div>
        </section>

        {/* ── 2. PROBLEM — LIGHT ─────────────────────────────────────────── */}
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
                  <span className="text-red-400 font-bold shrink-0 mt-0.5">✕</span>
                  <span className="text-[#4A5E7A] text-sm">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 3. HOW IT WORKS — NAVY ─────────────────────────────────────── */}
        <section className="bg-[#0F1E3A] px-6 py-12 md:py-20">
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-[#16A34A] text-xs font-bold uppercase tracking-widest mb-3">How It Works</p>
            <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-12 leading-tight">
              Three Steps. Your Real Number.
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  num: "01",
                  title: "Tell us about your home",
                  body: "Address, condition, your goal, and any repairs needed.",
                },
                {
                  num: "02",
                  title: "See all three scenarios",
                  body: "Cash offer, traditional sale, and as-is — net proceeds side by side.",
                },
                {
                  num: "03",
                  title: "Get your results",
                  body: "Enter your contact info and unlock your personalized breakdown.",
                },
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

        {/* ── 4. CALCULATOR — LIGHT ──────────────────────────────────────── */}
        <section id="calculator" className="bg-[#F7F8FC] px-6 py-12 md:py-20">
          <div className="max-w-3xl mx-auto">
            <div className="bg-white rounded-3xl p-6 md:p-10 shadow-xl shadow-black/8 border border-[#E5E7EB]">
              <div className="mb-6 text-center">
                <div className="inline-flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-full px-3 py-1 mb-4">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-green-700 text-xs font-semibold">Free. No credit card. No commitment.</span>
                </div>
                <h2 className="text-[#0F1E3A] text-2xl md:text-3xl font-extrabold mb-2">
                  Run Your Numbers
                </h2>
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

        {/* ── 5. PROOF — NAVY ────────────────────────────────────────────── */}
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

        {/* ── FOOTER ─────────────────────────────────────────────────────── */}
        <footer className="bg-[#080F1E] px-6 py-8 text-center">
          <SocialIconRow urls={socialUrls} />
          <p className="text-[#4A5E7A] text-xs">
            © {new Date().getFullYear()} HeyPearl · V2 Calculator ·{" "}
            <a href="/privacy" className="underline hover:text-[#9BACC0]">Privacy Policy</a>
          </p>
        </footer>

      </main>
    );
  }
  ```

- [ ] **Step 2: Commit**

  ```bash
  cd /Users/mistibruton/Desktop/geo-landing
  git add app/calculator/CalculatorLandingPage.tsx
  git commit -m "Add CalculatorLandingPage component"
  ```

---

### Task 10: Create the calculator page entry point

**Files:** `app/calculator/page.tsx`

- [ ] **Step 1: Create the file**

  Create `/Users/mistibruton/Desktop/geo-landing/app/calculator/page.tsx`:

  ```tsx
  import type { Metadata } from "next";
  import CalculatorLandingPage from "./CalculatorLandingPage";
  import { HEYPEARL_SOCIALS } from "../../lib/social-config";

  export const metadata: Metadata = {
    title: "Seller Net Proceeds Calculator — V2 by HeyPearl",
    description:
      "As a seller, you have options. Run every scenario — cash offer, traditional sale, as-is — and see your real net proceeds before you commit to anything.",
    openGraph: {
      title: "Seller Net Proceeds Calculator",
      description: "See what you'd walk away with across every selling scenario.",
      url: "https://v2.heypearl.io/calculator",
      siteName: "V2 by HeyPearl",
      type: "website",
    },
  };

  export default function CalculatorPage() {
    return <CalculatorLandingPage socialUrls={HEYPEARL_SOCIALS} />;
  }
  ```

- [ ] **Step 2: Commit**

  ```bash
  cd /Users/mistibruton/Desktop/geo-landing
  git add app/calculator/page.tsx
  git commit -m "Add calculator page entry point"
  ```

---

### Task 11: Update URL architecture rules

**Files:** `.claude/rules/url-architecture.md`

- [ ] **Step 1: Add the new URL to the valid patterns table**

  In `/Users/mistibruton/Desktop/geo-landing/.claude/rules/url-architecture.md`, find the Valid URL Patterns table and add one row:

  ```
  | `v2.heypearl.io/calculator` | Seller net proceeds calculator landing page |
  ```

- [ ] **Step 2: Commit**

  ```bash
  cd /Users/mistibruton/Desktop/geo-landing
  git add .claude/rules/url-architecture.md
  git commit -m "Add /calculator to valid URL patterns"
  ```

---

## Phase 4 — Build, Test, Deploy

### Task 12: Build and deploy geo-landing

- [ ] **Step 1: Run the build**

  ```bash
  cd /Users/mistibruton/Desktop/geo-landing
  npm run build
  ```
  Fix any TypeScript errors before continuing. Common issue: `useRouter` in a component that isn't marked `"use client"` — `CalculatorLandingPage.tsx` already has that directive.

- [ ] **Step 2: Commit any fixes and deploy**

  ```bash
  cd /Users/mistibruton/Desktop/geo-landing
  git add .
  git commit -m "V2 calculator landing page"
  git push
  /opt/homebrew/bin/vercel --prod
  ```

---

### Task 13: End-to-end smoke test

- [ ] **Step 1: Verify the page loads**

  Open `https://v2.heypearl.io/calculator` — confirm all 5 sections render, green/navy colors, no pricing anywhere.

- [ ] **Step 2: Verify the iframe loads**

  Scroll to Section 4 — the SellerHQ wizard should render inside the iframe. Step 1 (Address) should be visible.

- [ ] **Step 3: Test the full flow**

  Walk through all 8 steps using a real address. On Step 7, fill in name/email/phone and click "Get Your Results" (or the existing "See My Full Results" button). Confirm:
  - Wizard advances to Step 8 (Results)
  - Check Supabase `cashoffer_leads` table — a new row should appear with the email, name, phone, and `slug = "v2-calculator"`

- [ ] **Step 4: Test the schedule route**

  On Step 8 Results, click "Talk to an Expert About My Results." Confirm the parent page navigates to `v2.heypearl.io/schedule`.

- [ ] **Step 5: Verify no pricing on cashoffer pages**

  Open `https://v2.heypearl.io/cashoffer` — confirm there are no pricing links or CTAs visible. If any exist, remove them from `app/templates/cashoffer/CashOfferLandingPage.tsx` and redeploy.
