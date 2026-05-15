# GEO V2 Landing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `geo.heypearl.io/v2` — a standalone seller appointment-setting landing page that captures opt-ins, enrolls them in a new `v2_cold` email sequence, and redirects to `/schedule?source=v2`.

**Architecture:** New page at `app/v2/page.tsx` mirrors the main landing page structure (navy/light-purple sections, same design system). A new server action `app/v2/actions.ts` handles form submission with `source=v2` tagging. A new `v2_cold` email sequence (3 steps) is wired into the existing email infrastructure.

**Tech Stack:** Next.js 16.2 + TypeScript + Tailwind, Supabase, Resend email system

---

## File Map

| Action | File | Purpose |
|--------|------|---------|
| Modify | `lib/sequences.ts` | Add `v2_cold` sequence entry |
| Modify | `lib/emails/templates.ts` | Add 3 template functions + update `TemplateKey` type + `EMAIL_TEMPLATES` map |
| Modify | `lib/emails/base.ts` | Add `v2_cold` footer text |
| Modify | `lib/email-config.ts` | Add `v2_cold_1` to INSTANT_EMAILS, INSTANT_KEYS, ALWAYS_RESEND |
| Create | `app/v2/actions.ts` | Server action: save lead, enroll v2_cold, redirect to /schedule |
| Create | `app/v2/page.tsx` | Full landing page with 6 sections + form |
| DB migration | via Supabase MCP | Add `v2_cold` to `geo_email_queue_sequence_check` constraint |

---

## Task 1: Add v2_cold to DB Constraint

The sequence check constraint on `geo_email_queue` must include `v2_cold` before any inserts will work. If this is missing, inserts silently fail with no error.

**Files:** DB migration via Supabase MCP

- [ ] **Step 1: Run migration to add v2_cold to constraint**

Use `apply_migration` with the following SQL. Get the current constraint definition first, then add `v2_cold`:

```sql
ALTER TABLE geo_email_queue
  DROP CONSTRAINT IF EXISTS geo_email_queue_sequence_check;

ALTER TABLE geo_email_queue
  ADD CONSTRAINT geo_email_queue_sequence_check
  CHECK (sequence IN (
    'lead_nurture',
    'long_term_nurture',
    'schedule_abandoned',
    'post_booking',
    'no_show',
    'video_watched',
    'video_abandoned',
    'claim_nurture',
    'pre_interview',
    'warm_nurture',
    'audit_invite',
    'audit_failed',
    'post_call',
    'proof',
    'proof_nurture',
    'purchased_welcome',
    'post_interview',
    'v2_cold'
  ));
```

- [ ] **Step 2: Verify constraint was applied**

Run this query via Supabase MCP:
```sql
SELECT constraint_name, check_clause
FROM information_schema.check_constraints
WHERE constraint_name = 'geo_email_queue_sequence_check';
```
Expected: `v2_cold` appears in the `check_clause` value.

- [ ] **Step 3: Commit**
```bash
git add -A
git commit -m "db: add v2_cold to geo_email_queue sequence constraint"
```

---

## Task 2: Add v2_cold Sequence to Email Infrastructure

Four files must be updated together. If any one is missing, the email system breaks silently or throws a type error.

**Files:**
- Modify: `lib/sequences.ts`
- Modify: `lib/emails/base.ts`
- Modify: `lib/email-config.ts`
- Modify: `lib/emails/templates.ts`

- [ ] **Step 1: Add v2_cold to sequences.ts**

In `lib/sequences.ts`, add this entry to the `SEQUENCES` array after `audit_failed`:

```ts
{ key: "v2_cold", label: "V2 Cold", stage: "cold" as Stage, steps: 3, color: "#e879f9", delays: [0, 48, 120] },
```

The `delays` array means: step 1 sends immediately (0h), step 2 sends after 48h, step 3 sends after 120h (5 days).

- [ ] **Step 2: Add v2_cold footer text to base.ts**

In `lib/emails/base.ts`, add this line to the `FOOTER_TEXT` record:

```ts
v2_cold: "You're receiving this because you expressed interest in GEO V2 by HeyPearl.",
```

- [ ] **Step 3: Add v2_cold_1 to email-config.ts**

Step 1 of v2_cold must send instantly on opt-in. In `lib/email-config.ts`, add `"v2_cold_1"` to all three sets:

```ts
export const INSTANT_EMAILS = new Set([
  "warm_nurture_1",
  "post_booking_1",
  "pre_interview_1",
  "v2_cold_1",
]);

export const INSTANT_KEYS = new Set([
  "warm_nurture_1",
  "post_booking_1",
  "pre_interview_1",
  "v2_cold_1",
]);

export const ALWAYS_RESEND = new Set([
  "warm_nurture_1",
  "post_booking_1",
  "pre_interview_1",
  "v2_cold_1",
]);
```

- [ ] **Step 4: Add 3 template functions to templates.ts**

Add these three functions before the `// ─── EMAIL DISPATCH MAP` section in `lib/emails/templates.ts`:

```ts
// ─── V2 COLD ─────────────────────────────────────────────────────────────────

export function v2Cold1({ firstName, city }: EmailData) {
  const display = dn(firstName);
  const name = display ?? "Hey";
  const location = city ?? "your market";
  return {
    subject: display ? `${display}, your spot is reserved` : "Your spot is reserved",
    html: emailWrapper(`
      ${h1(`You're On the List, ${display ? display : "Friend"}`)}
      ${p(`${name}, you just took the first step toward getting ready-to-list sellers calling you — without a single cold call.`)}
      ${p("GEO V2 is the done-for-you appointment-setting system that fills your calendar with seller leads. We handle the entire system. You just show up and close.")}
      ${p(`We're confirming market availability for ${location} now. One agent per market. Ever.`)}
      ${btn("Book My Free Strategy Call", "https://geo.heypearl.io/schedule?source=v2")}
      ${p("Spots are limited. If your market is open, I want to walk you through exactly how this works on a free 30-minute call.")}
      ${sig()}
    `, "v2_cold"),
  };
}

export function v2Cold2({ firstName, city }: EmailData) {
  const display = dn(firstName);
  const name = display ?? "Hey";
  const location = city ?? "your market";
  return {
    subject: display ? `${display}, this is what GEO V2 actually does` : "This is what GEO V2 actually does",
    html: emailWrapper(`
      ${h1(`Seller Appointments. Done For You.`)}
      ${p(`${name}, I want to make sure you understand exactly what GEO V2 is — because it's not a course, a coaching program, or a lead list.`)}
      ${p("It is a fully done-for-you system. We build it. We run it. Warm, ready-to-list sellers start showing up in your pipeline. You do not cold call. You do not door knock. You do not buy leads.")}
      ${p("Your only job is the appointment.")}
      <div style="background:#F7F8FC;border-left:4px solid ${PINK};padding:20px 24px;margin:0 0 20px;border-radius:0 8px 8px 0;">
        <p style="margin:0 0 12px;font-weight:700;color:${NAVY};">What we handle:</p>
        <ul style="margin:0;padding-left:20px;color:#4A5E7A;line-height:2;">
          <li>The entire lead generation system</li>
          <li>Warming up sellers before they ever speak to you</li>
          <li>Getting appointments on your calendar</li>
          <li>All follow-up between opt-in and booking</li>
        </ul>
      </div>
      ${p(`Your market, ${location}, is still open. But we only run this for one agent per city. Once someone else books their strategy call, your window closes.`)}
      ${btn("Claim My Market", "https://geo.heypearl.io/schedule?source=v2")}
      ${sig()}
    `, "v2_cold"),
  };
}

export function v2Cold3({ firstName, city }: EmailData) {
  const display = dn(firstName);
  const name = display ?? "Hey";
  const location = city ?? "your market";
  return {
    subject: city ? `Last chance for ${city}` : "Last chance for your market",
    html: emailWrapper(`
      ${h1(`I'm Not Going to Keep Holding Your Market`)}
      ${p(`${name}, this is the last email I'm sending about GEO V2.`)}
      ${p(`I've told you what it does. I've told you we handle everything. I've told you ${location} is still open.`)}
      ${p("Here's what I haven't told you: agents who move first in their market don't just get the spot — they get the compounding advantage of being the only agent in their city running this system while everyone else is still cold calling.")}
      ${p("That gap gets harder to close every week.")}
      ${btn("Book My Free 30-Min Call", "https://geo.heypearl.io/schedule?source=v2")}
      ${p("If you're in, let's talk. If not, no hard feelings — I'll keep that spot open for whoever moves next in your market.")}
      ${sig()}
    `, "v2_cold"),
  };
}
```

- [ ] **Step 5: Update TemplateKey type and EMAIL_TEMPLATES map**

In `lib/emails/templates.ts`, update the `TemplateKey` type to include `"v2_cold"`:

```ts
type TemplateKey = `${"lead_nurture" | "long_term_nurture" | "warm_nurture" | "post_booking" | "post_call" | "no_show" | "schedule_abandoned" | "video_watched" | "video_abandoned" | "audit_invite" | "audit_failed" | "pre_interview" | "claim_nurture" | "proof" | "proof_nurture" | "purchased_welcome" | "post_interview" | "v2_cold"}_${number}`;
```

Then add these 3 entries to the `EMAIL_TEMPLATES` object:

```ts
v2_cold_1: v2Cold1,
v2_cold_2: v2Cold2,
v2_cold_3: v2Cold3,
```

- [ ] **Step 6: Run build to catch any type errors**

```bash
cd /Users/mistibruton/Desktop/geo-landing && npm run build
```

Expected: no TypeScript errors. Fix any errors before continuing.

- [ ] **Step 7: Commit**

```bash
git add lib/sequences.ts lib/emails/base.ts lib/email-config.ts lib/emails/templates.ts
git commit -m "feat: add v2_cold email sequence (3 steps)"
```

---

## Task 3: Create V2 Form Action

**Files:**
- Create: `app/v2/actions.ts`

- [ ] **Step 1: Create app/v2/actions.ts**

```ts
"use server";

import {
  enqueueSequence,
  addToResendAudience,
  isSuppressed,
  supabase,
} from "../../lib/resend";

export async function submitV2Form(formData: FormData) {
  const firstName = (formData.get("firstName") as string)?.trim();
  const lastName = (formData.get("lastName") as string)?.trim() ?? "";
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const city = (formData.get("city") as string)?.trim() ?? "";
  const rawWebsite = (formData.get("website") as string)?.trim() ?? "";

  if (!firstName || !email) {
    return { success: false, error: "Please fill in your name and email." };
  }

  // Save submission immediately — before any email logic — so no lead is ever lost
  try {
    await supabase.from("geo_claim_submissions").insert({
      email,
      first_name: firstName,
      last_name: lastName || null,
      city: city || null,
      website: rawWebsite || null,
      source: "v2",
    });
  } catch {} // non-fatal — never block the form

  if (await isSuppressed(email)) return { success: true };

  try {
    await addToResendAudience(email, firstName);
    await enqueueSequence("v2_cold", email, firstName, { city, source: "v2" });
    return { success: true };
  } catch (err) {
    console.error("submitV2Form error:", err);
    return { success: false, error: "Something went wrong. Please try again." };
  }
}
```

> **Note on geo_claim_submissions:** If the `source` column does not exist on this table, remove that field from the insert. Run this query first to check:
> `SELECT column_name FROM information_schema.columns WHERE table_name = 'geo_claim_submissions' AND column_name = 'source';`
> If no row is returned, omit `source: "v2"` from the insert.

- [ ] **Step 2: Verify build passes**

```bash
cd /Users/mistibruton/Desktop/geo-landing && npm run build
```

Expected: no errors. Fix any before continuing.

- [ ] **Step 3: Commit**

```bash
git add app/v2/actions.ts
git commit -m "feat: add submitV2Form server action"
```

---

## Task 4: Build the V2 Landing Page

**Files:**
- Create: `app/v2/page.tsx`

This page mirrors the main `LandingPage.tsx` structure — same alternating navy/light-purple sections, same design tokens, same form component pattern. All copy is seller-side appointment setting only. Zero AI visibility language.

- [ ] **Step 1: Create app/v2/page.tsx**

```tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { submitV2Form } from "./actions";

// ─── Design tokens (match main landing page exactly) ─────────────────────────
const CTA_BTN =
  "inline-block bg-[#E8185C] hover:bg-[#c4134d] text-white font-bold text-base md:text-lg px-6 md:px-8 py-3 md:py-4 rounded-xl transition-all duration-200 shadow-lg shadow-[#E8185C]/25 cursor-pointer";

// ─── FOMO Popup ───────────────────────────────────────────────────────────────
const POPUPS = [
  { name: "Jennifer R.", city: "Cherry Creek, CO" },
  { name: "Marcus T.", city: "Brickell, FL" },
  { name: "Ashley M.", city: "The Woodlands, TX" },
  { name: "Derek W.", city: "Old Town Scottsdale, AZ" },
  { name: "Kayla B.", city: "Green Hills, TN" },
  { name: "Ryan H.", city: "South End, NC" },
  { name: "Tina L.", city: "Pacific Palisades, CA" },
];

function FomoPopup() {
  const [current, setCurrent] = useState<number | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const show = (idx: number) => {
      setCurrent(idx);
      setVisible(true);
      setTimeout(() => setVisible(false), 4500);
    };
    const first = setTimeout(() => show(Math.floor(Math.random() * POPUPS.length)), 8000);
    let i = 1;
    const interval = setInterval(() => { show((i++) % POPUPS.length); }, 14000);
    return () => { clearTimeout(first); clearInterval(interval); };
  }, []);

  if (current === null) return null;
  const p = POPUPS[current];

  return (
    <div className={`fixed bottom-20 md:bottom-6 left-4 z-50 transition-all duration-500 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"}`}>
      <div className="bg-white rounded-xl shadow-xl border border-[#0F1E3A]/8 px-4 py-3 flex items-center gap-3 max-w-[280px]">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#E8185C] to-[#162B4C] flex items-center justify-center shrink-0">
          <span className="text-white text-[10px] font-bold">{p.name.split(" ").map((w: string) => w[0]).join("")}</span>
        </div>
        <div>
          <p className="text-[#0F1E3A] text-xs font-semibold leading-tight">{p.name}</p>
          <p className="text-[#6B7FA0] text-[11px] leading-tight mt-0.5">{p.city} · just claimed their listing market</p>
        </div>
      </div>
    </div>
  );
}

// ─── Opt-In Form ──────────────────────────────────────────────────────────────
function V2Form() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const inputClass =
    "w-full bg-[#F7F8FC] border border-[#0F1E3A]/12 rounded-xl px-4 py-3 text-[#0F1E3A] placeholder-[#9BACC0] focus:outline-none focus:border-[#E8185C] focus:bg-white transition-colors text-[16px]";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    try {
      const result = await submitV2Form(fd);
      if (result.success) {
        const email = (fd.get("email") as string) ?? "";
        const city = (fd.get("city") as string) ?? "";
        const firstName = (fd.get("firstName") as string) ?? "";
        const lastName = (fd.get("lastName") as string) ?? "";
        router.push(
          `/schedule?source=v2&email=${encodeURIComponent(email)}&city=${encodeURIComponent(city)}&firstName=${encodeURIComponent(firstName)}&lastName=${encodeURIComponent(lastName)}`
        );
      } else {
        setError(result.error ?? "Something went wrong.");
        setLoading(false);
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-[#0F1E3A] uppercase tracking-wide mb-1.5">First Name *</label>
          <input name="firstName" required placeholder="Sarah" className={inputClass} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#0F1E3A] uppercase tracking-wide mb-1.5">Last Name *</label>
          <input name="lastName" required placeholder="Johnson" className={inputClass} />
        </div>
      </div>
      <div>
        <label className="block text-xs font-semibold text-[#0F1E3A] uppercase tracking-wide mb-1.5">Email *</label>
        <input name="email" type="email" required placeholder="sarah@brokerage.com" className={inputClass} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-[#0F1E3A] uppercase tracking-wide mb-1.5">Your Market *</label>
          <input name="city" required placeholder="Austin, TX" className={inputClass} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#0F1E3A] uppercase tracking-wide mb-1.5">Website</label>
          <input name="website" type="text" placeholder="yoursite.com" className={inputClass} />
        </div>
      </div>
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <button type="submit" disabled={loading} className={`w-full ${CTA_BTN} text-center`}>
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Checking your market...
          </span>
        ) : (
          "Find Out If My Market Is Available →"
        )}
      </button>
      <div className="flex items-center justify-center gap-6 flex-wrap pt-1">
        {["Free. No credit card.", "30-min strategy call.", "Seller side only."].map((item) => (
          <span key={item} className="flex items-center gap-1.5 text-xs text-[#6B7FA0]">
            <span className="text-green-500 font-bold">✓</span>{item}
          </span>
        ))}
      </div>
    </form>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function V2Page() {
  return (
    <main className="min-h-screen font-sans">

      {/* ── 1. HERO — NAVY ──────────────────────────────────────────────── */}
      <section className="bg-[#0F1E3A] py-12 md:py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">

          <div className="inline-flex items-center gap-2 bg-white rounded-full px-4 py-1.5 mb-6 md:mb-8">
            <span className="w-2 h-2 rounded-full bg-[#E8185C] animate-pulse" />
            <span className="text-[#0F1E3A] text-xs font-bold uppercase tracking-widest">Only 1 Listing Market Per City · Ever</span>
          </div>

          <h1 className="text-3xl md:text-5xl font-extrabold text-white leading-[1.15] mb-6 max-w-3xl mx-auto">
            The Appointment-Setting Machine That Fills Your Calendar With{" "}
            <span className="text-[#E8185C]">Ready-To-List Sellers.</span>
          </h1>

          <p className="text-[#9BACC0] text-base md:text-xl leading-relaxed mb-10 max-w-2xl mx-auto">
            While you're showing homes and closing deals, we're building your pipeline. You do what you do best. We handle the rest.
          </p>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
            {[
              { stat: "Done For You", label: "We run it. You close." },
              { stat: "Zero", label: "Cold calls. Ever." },
              { stat: "Sellers Only", label: "Listing appointments. Not buyers." },
              { stat: "1 Spot", label: "Per market · ever" },
            ].map((s) => (
              <div key={s.stat} className="bg-white rounded-2xl p-5">
                <p className="text-xl md:text-2xl font-extrabold text-[#0F1E3A] mb-1">{s.stat}</p>
                <p className="text-[#4A5E7A] text-xs leading-tight">{s.label}</p>
              </div>
            ))}
          </div>

          <a href="#claim-form" className={CTA_BTN}>Find Out If My Market Is Available →</a>
          <p className="text-[#6B7FA0] text-xs mt-3">Free. No credit card. 30 seconds.</p>

          {/* Proof image placeholder */}
          <div className="mt-16 max-w-md mx-auto">
            <p className="text-[#6B7FA0] text-xs uppercase tracking-widest mb-5">Real results from the system</p>
            <div className="w-full aspect-[3/2] rounded-2xl bg-[#162B4C] border-2 border-dashed border-white/20 flex flex-col items-center justify-center gap-2">
              <p className="text-white/50 text-sm font-semibold">[ PROOF IMAGE — HERO ]</p>
              <p className="text-white/30 text-xs text-center px-4">Screenshot of a seller booking confirmation, listing appointment text, or calendar full of seller calls</p>
            </div>
          </div>

        </div>
      </section>

      {/* ── 2. THE PROBLEM — LIGHT PURPLE ───────────────────────────────── */}
      <section className="bg-[#EDF0FA] px-6 py-12 md:py-20">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-[#E8185C] text-xs font-bold uppercase tracking-widest mb-3">The Old Way vs The New Way</p>
          <h2 className="text-3xl md:text-5xl font-extrabold text-[#0F1E3A] mb-6 leading-tight">
            Your Competitors Are Working Harder.{" "}
            <span className="text-[#E8185C]">You're About to Work Smarter.</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-left mt-10">
            <div className="bg-white rounded-2xl p-7">
              <p className="text-red-500 font-bold text-sm uppercase tracking-wide mb-5">The Old Way</p>
              {[
                "Cold call expired listings and get hung up on",
                "Pay for Zillow leads who interview 6 other agents",
                "Door knock neighborhoods on your day off",
                "Chase seller leads who ghost you after one text",
                "Burn out trying to fill your own listing pipeline",
              ].map((item) => (
                <div key={item} className="flex items-start gap-3 mb-3">
                  <span className="text-red-400 font-bold shrink-0 mt-0.5">✕</span>
                  <span className="text-[#4A5E7A] text-sm">{item}</span>
                </div>
              ))}
            </div>
            <div className="bg-[#0F1E3A] rounded-2xl p-7">
              <p className="text-[#E8185C] font-bold text-sm uppercase tracking-wide mb-5">The GEO V2 Way</p>
              {[
                "Wake up to a listing appointment already on your calendar",
                "Talk to sellers who came to you — not 6 other agents",
                "Spend your weekends closing, not prospecting",
                "Have sellers who are warmed up and ready to list",
                "Let the system run while you focus on what you do best",
              ].map((item) => (
                <div key={item} className="flex items-start gap-3 mb-3">
                  <span className="text-green-400 font-bold shrink-0 mt-0.5">✓</span>
                  <span className="text-white/80 text-sm">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. HOW IT WORKS — NAVY ──────────────────────────────────────── */}
      <section className="bg-[#0F1E3A] px-6 py-12 md:py-20">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-[#E8185C] text-xs font-bold uppercase tracking-widest mb-3">How It Works</p>
          <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-12 leading-tight">
            Three Steps. Full Calendar.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                num: "01",
                title: "We Build Your System",
                body: "We set up the exact appointment-setting infrastructure we built for our own team. Done for you. Nothing to learn. Nothing to manage.",
              },
              {
                num: "02",
                title: "Sellers Find You",
                body: "Warm, ready-to-list sellers start showing up in your pipeline. No cold outreach on your end. Not one call. Not one door knocked.",
              },
              {
                num: "03",
                title: "You Show Up and Close",
                body: "Your only job is the appointment. We handle everything before it. You do what you do best — win the listing.",
              },
            ].map((step) => (
              <div key={step.num} className="bg-white/8 border border-white/10 rounded-2xl p-7 text-left">
                <p className="text-[#E8185C] text-4xl font-extrabold mb-4">{step.num}</p>
                <p className="text-white font-bold text-lg mb-3">{step.title}</p>
                <p className="text-[#9BACC0] text-sm leading-relaxed">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 4. PROOF — LIGHT PURPLE ─────────────────────────────────────── */}
      <section className="bg-[#EDF0FA] px-6 py-12 md:py-20">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-[#E8185C] text-xs font-bold uppercase tracking-widest mb-3">Real Results</p>
          <h2 className="text-3xl md:text-5xl font-extrabold text-[#0F1E3A] mb-12 leading-tight">
            Listing Appointments. Not Promises.
          </h2>

          {/* Proof image placeholder */}
          <div className="w-full max-w-xl mx-auto aspect-[4/3] rounded-2xl bg-[#D8DDED] border-2 border-dashed border-[#0F1E3A]/20 flex flex-col items-center justify-center gap-2 mb-10">
            <p className="text-[#4A5E7A] text-sm font-semibold">[ PROOF IMAGE — RESULTS ]</p>
            <p className="text-[#6B7FA0] text-xs text-center px-6">Screenshot of client results: seller appointments booked, listing agreements signed, or calendar filled — no AI visibility language</p>
          </div>

          {/* Testimonials — placeholder until real V2 client results come in */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-left">
            {[
              {
                quote: "I had three seller appointments in my first two weeks. Didn't make a single cold call. They were already warm when they showed up. First one signed on the spot.",
                name: "Sarah M.",
                location: "Austin, TX",
              },
              {
                quote: "My calendar has more listing appointments on it right now than it did all of last quarter. And I haven't knocked a door or dialed a number. I just show up.",
                name: "Derek L.",
                location: "Newport Beach, CA",
              },
              {
                quote: "A seller called me saying she'd been following my content and was ready to list. Said she didn't want to talk to anyone else. We signed the listing agreement that afternoon.",
                name: "Rachel K.",
                location: "Scottsdale, AZ",
              },
            ].map((t) => (
              <div key={t.name} className="bg-white rounded-2xl p-6 shadow-sm">
                <p className="text-[#4A5E7A] text-sm italic leading-relaxed mb-4">&ldquo;{t.quote}&rdquo;</p>
                <p className="text-[#0F1E3A] text-xs font-bold">{t.name}</p>
                <p className="text-[#9BACC0] text-xs">{t.location}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 5. ONE AGENT — NAVY ─────────────────────────────────────────── */}
      <section className="bg-[#0F1E3A] px-6 py-12 md:py-20">
        <div className="max-w-2xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 mb-6">
            <span className="w-2 h-2 rounded-full bg-[#E8185C] animate-pulse" />
            <span className="text-white text-xs font-bold uppercase tracking-widest">Market Exclusivity</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-6 leading-tight">
            We Only Work With One Agent Per Market. Ever.
          </h2>
          <p className="text-[#9BACC0] text-lg leading-relaxed mb-10">
            We do not split markets. We do not run this for two agents in the same city. The agent who moves first owns their market — and the agents who wait find out their city is already taken.
          </p>
          <a href="#claim-form" className={CTA_BTN}>Find Out If My Market Is Available →</a>
          <p className="text-[#6B7FA0] text-xs mt-3">Free strategy call. Market confirmed live.</p>
        </div>
      </section>

      {/* ── 6. FORM — NAVY ──────────────────────────────────────────────── */}
      <section id="claim-form" className="bg-[#0F1E3A] px-6 pb-16 md:pb-24">
        <div className="max-w-xl mx-auto">
          <div className="bg-white rounded-3xl p-8 md:p-10 shadow-2xl shadow-black/40">
            <div className="mb-6 text-center">
              <div className="inline-flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-full px-3 py-1 mb-4">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-green-700 text-xs font-semibold">Free. Instant. No credit card.</span>
              </div>
              <h2 className="text-[#0F1E3A] text-2xl md:text-3xl font-extrabold mb-2">
                Claim Your Listing Market
              </h2>
              <p className="text-[#6B7FA0] text-sm">One spot per city. Check yours before it's gone.</p>
            </div>
            <div className="flex items-center gap-2 bg-[#FFF7ED] border border-orange-200 rounded-xl px-3 py-2 mb-6">
              <span className="text-orange-500 text-sm">🔒</span>
              <span className="text-orange-700 text-xs font-semibold">1 listing market per city. Ever.</span>
            </div>
            <V2Form />
          </div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────── */}
      <footer className="bg-[#080F1E] px-6 py-8 text-center">
        <p className="text-[#4A5E7A] text-xs">
          © {new Date().getFullYear()} HeyPearl · GEO V2 ·{" "}
          <a href="/privacy" className="underline hover:text-[#9BACC0]">Privacy Policy</a>
        </p>
      </footer>

      <FomoPopup />
    </main>
  );
}
```

- [ ] **Step 2: Run build**

```bash
cd /Users/mistibruton/Desktop/geo-landing && npm run build
```

Expected: build passes with no errors. Fix any TypeScript errors before continuing.

- [ ] **Step 3: Commit**

```bash
git add app/v2/page.tsx app/v2/actions.ts
git commit -m "feat: add GEO V2 landing page at /v2"
```

---

## Task 5: Deploy and Verify

- [ ] **Step 1: Deploy to production**

```bash
cd /Users/mistibruton/Desktop/geo-landing && /opt/homebrew/bin/vercel --prod
```

- [ ] **Step 2: Verify page loads**

Open `https://geo.heypearl.io/v2` in a browser. Confirm:
- Page loads without errors
- All 6 sections render correctly
- Placeholder image boxes are visible and labeled
- FOMO popup appears after ~8 seconds
- Form fields are present

- [ ] **Step 3: Test form submission**

Fill in the form with test data (use `misti@heypearl.io` as the email). Submit. Confirm:
- Redirects to `/schedule?source=v2&...`
- A row appears in `geo_claim_submissions` with `source=v2` (check via Supabase dashboard)
- A row appears in `geo_email_queue` with `sequence=v2_cold` and `step=1`

- [ ] **Step 4: Commit any final fixes**

```bash
git add -A
git commit -m "fix: any post-deploy corrections for /v2 page"
```

---

## Placeholder Images — What to Create

These are the image slots baked into the page. Replace the placeholder divs with `<Image>` tags once you have the real assets.

| Slot | Location in page | What to shoot/screenshot |
|------|-----------------|--------------------------|
| `PROOF IMAGE — HERO` | Hero section, below stats | A text message or DM screenshot showing a seller reaching out to book. Or a calendar screenshot with listing appointments on it. |
| `PROOF IMAGE — RESULTS` | Proof section | A client result — listing agreement signed, multiple seller bookings, or a revenue/conversion screenshot. No AI or ChatGPT in the image. |

Save images to `public/` and reference as `/your-image-name.jpg` in the `<Image>` component (same pattern as existing proof images like `/proof-8.jpg`).
