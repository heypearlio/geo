The `docs/superpowers/plans/` directory already exists. Now let me write the full plan.

---

# God Page Affiliate System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make all GEO, v2, and local affiliate landing pages automatically inherit from their god pages, with offer routing driven by a single registry file.

**Architecture:** A new `lib/offer-registry.ts` becomes the single source of truth for valid offers. `LandingPage` and a new standalone `V2Form` component accept optional `AffiliateOverrides` props so the god pages work unchanged while affiliate routes inject their own tag and schedule route. `[slug]/page.tsx` and `[slug]/schedule/page.tsx` drop the `isLocal` guard and route to the right component based on subdomain + affiliate offers. A new `GeoSchedulePage` component is extracted from `app/schedule/page.tsx` so both the god schedule page and geo/v2 affiliate schedule pages share the same Calendly embed UI.

**Tech Stack:** Next.js 16.2.0 (Turbopack), TypeScript, Supabase, Tailwind CSS. No new npm packages. Build verification: `npm run build`. Deploy: `/opt/homebrew/bin/vercel --prod`.

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `lib/offer-registry.ts` | Single source of truth for valid offer slugs and display names |
| Create | `app/components/GeoSchedulePage.tsx` | Reusable Calendly schedule page for GEO and v2 affiliates |
| Create | `app/components/V2Form.tsx` | Standalone V2 opt-in form extracted from `app/v2/page.tsx` |
| Modify | `app/components/LandingPage.tsx` | Accept `AffiliateOverrides` props; thread tag + route through `ClaimForm` |
| Modify | `app/claim/actions.ts` | Read `affiliateTag` from formData; use as `source` when present |
| Modify | `app/v2/actions.ts` | Read `affiliateTag` from formData; use as `source` when present |
| Modify | `app/v2/page.tsx` | Import and use standalone `V2Form` (no behavior change) |
| Modify | `app/schedule/page.tsx` | Import and delegate to `GeoSchedulePage` |
| Modify | `app/[slug]/page.tsx` | Remove `isLocal` guard; route to correct component per offer |
| Modify | `app/[slug]/schedule/page.tsx` | Remove `isLocal` guard; route to `GeoSchedulePage` for geo/v2 |
| Modify | `app/admin/affiliates/page.tsx` | Replace hardcoded offer array with `OFFERS` from registry |
| Modify | `app/api/admin/affiliates/route.ts` | Replace hardcoded validation array with `OFFERS` from registry |

---

## Task 1: Create `lib/offer-registry.ts`

**Files:**
- Create: `lib/offer-registry.ts`

- [ ] **Step 1: Create the offer registry**

Create `/Users/mistibruton/Desktop/geo-landing/lib/offer-registry.ts` with the following content:

```ts
export const OFFERS = [
  { slug: "local", name: "HeyLocal — Local Business Marketing" },
  { slug: "geo",   name: "GEO by HeyPearl — Real Estate" },
  { slug: "v2",    name: "GEO v2 — Listing Machine" },
] as const;

export type OfferSlug = typeof OFFERS[number]["slug"];
```

- [ ] **Step 2: Run build to verify the new file compiles cleanly**

```bash
cd /Users/mistibruton/Desktop/geo-landing && npm run build
```

Expected: build completes with no TypeScript errors. The file is only types and data — no runtime risk.

- [ ] **Step 3: Commit**

```bash
cd /Users/mistibruton/Desktop/geo-landing && git add lib/offer-registry.ts && git commit -m "feat: add offer registry as single source of truth for valid offer slugs"
```

---

## Task 2: Update `app/claim/actions.ts` — make `source` affiliate-aware

**Files:**
- Modify: `app/claim/actions.ts:93`

The current line 93 hardcodes `source: "claim"` inside the `enqueueSequence` call. We need to read an optional `affiliateTag` from `formData` and use it as the source when present.

- [ ] **Step 1: Edit `app/claim/actions.ts`**

Replace the function body. The only lines that change are: add one `affiliateTag` extraction after the existing field extractions, and change line 93 from `source: "claim"` to `source: affiliateTag ?? "claim"`. The full function after the edit:

```ts
"use server";

import {
  enqueueSequence,
  addToResendAudience,
  cancelQueuedEmails,
  isSuppressed,
  supabase,
} from "../../lib/resend";

export async function submitClaimForm(formData: FormData) {
  const firstName = (formData.get("firstName") as string)?.trim();
  const lastName = (formData.get("lastName") as string)?.trim() ?? "";
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const city = (formData.get("city") as string)?.trim() ?? "";
  const rawWebsite = (formData.get("website") as string)?.trim() ?? "";
  const affiliateTag = (formData.get("affiliateTag") as string)?.trim() || null;

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
    });
  } catch {} // non-fatal — never block the form

  // Never re-enroll a suppressed contact (clients, unsubscribes)
  if (await isSuppressed(email)) return { success: true };

  try {
    // Check if already past nurture (booked or no-showed)
    const { data: advancedQueue } = await supabase
      .from("geo_email_queue")
      .select("id")
      .eq("email", email)
      .in("sequence", ["post_booking", "no_show"])
      .is("sent_at", null)
      .is("cancelled_at", null)
      .limit(1);

    const { data: advancedSent } = await supabase
      .from("geo_email_events")
      .select("id")
      .eq("email", email)
      .in("sequence", ["post_booking", "no_show"])
      .eq("event_type", "sent")
      .limit(1);

    if ((advancedQueue?.length ?? 0) > 0 || (advancedSent?.length ?? 0) > 0) {
      return { success: true };
    }

    // If website provided, trigger AuditSky audit (AI email will follow)
    let auditId: string | null = null;
    if (rawWebsite) {
      let website = rawWebsite.trim().toLowerCase();
      // Strip any protocol duplication (https://https://, http://https://, etc.)
      website = website.replace(/^(https?:\/\/)+/i, "");
      // Strip leading www. to normalize, then rebuild clean URL
      const bare = website.replace(/^www\./i, "");
      website = "https://" + bare;

      const auditskyKey = process.env.AUDITSKY_API_KEY;
      if (auditskyKey) {
        try {
          const auditRes = await fetch("https://app.auditsky.ai/api/embed", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Origin: "https://geo.heypearl.io",
            },
            body: JSON.stringify({ apiKey: auditskyKey, url: website, keyword: "real estate agent" }),
          });
          if (auditRes.ok) {
            const data = await auditRes.json();
            auditId = data.auditId ?? null;
          }
        } catch {}
      }
    }

    await cancelQueuedEmails(email); // cancel ALL pending sequences before enrolling

    await addToResendAudience(email, firstName);

    // Claim form → warm_nurture (merged sequence). Step 1 sends immediately (ALWAYS_RESEND).
    await enqueueSequence("warm_nurture", email, firstName, { city, source: affiliateTag ?? "claim" });

    return { success: true };
  } catch (err) {
    console.error("submitClaimForm error:", err);
    return { success: false, error: "Something went wrong. Please try again." };
  }
}
```

- [ ] **Step 2: Run build**

```bash
cd /Users/mistibruton/Desktop/geo-landing && npm run build
```

Expected: build passes. No new type errors — `affiliateTag` is `string | null`, same type as `"claim"`.

- [ ] **Step 3: Commit**

```bash
cd /Users/mistibruton/Desktop/geo-landing && git add app/claim/actions.ts && git commit -m "feat: make submitClaimForm source-aware via optional affiliateTag field"
```

---

## Task 3: Update `app/v2/actions.ts` — make `source` affiliate-aware

**Files:**
- Modify: `app/v2/actions.ts:34`

Same pattern as Task 2. Read `affiliateTag` from formData; fall back to `"v2"`.

- [ ] **Step 1: Edit `app/v2/actions.ts`**

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
  const affiliateTag = (formData.get("affiliateTag") as string)?.trim() || null;

  if (!firstName || !email || !email.includes("@")) {
    return { success: false, error: "Please fill in your name and email." };
  }

  // Save submission immediately — before any email logic — so no lead is ever lost
  try {
    await supabase.from("geo_claim_submissions").insert({
      email,
      first_name: firstName,
      last_name: lastName || null,
      city: city || null,
    });
  } catch {} // non-fatal — never block the form

  if (await isSuppressed(email)) return { success: true };

  try {
    await addToResendAudience(email, firstName);
    await enqueueSequence("v2_cold", email, firstName, { city, source: affiliateTag ?? "v2" });
    return { success: true };
  } catch (err) {
    console.error("submitV2Form error:", err);
    return { success: false, error: "Something went wrong. Please try again." };
  }
}
```

- [ ] **Step 2: Run build**

```bash
cd /Users/mistibruton/Desktop/geo-landing && npm run build
```

Expected: passes.

- [ ] **Step 3: Commit**

```bash
cd /Users/mistibruton/Desktop/geo-landing && git add app/v2/actions.ts && git commit -m "feat: make submitV2Form source-aware via optional affiliateTag field"
```

---

## Task 4: Make `LandingPage` configurable with `AffiliateOverrides`

**Files:**
- Modify: `app/components/LandingPage.tsx`

`LandingPage` currently has a zero-argument `ClaimForm` inner function and a zero-prop `LandingPage` export. We need to:
1. Add an `AffiliateOverrides` interface at the top of the file.
2. Give `LandingPage` an optional `overrides` prop.
3. Pass `scheduleRoute` and `affiliateTag` down to `ClaimForm`.
4. Inside `ClaimForm`, add the hidden `affiliateTag` input and swap the hardcoded `/schedule` route.

The file is large (~400+ lines). Only the `ClaimForm` function signature, its `handleSubmit` body, its `<form>` JSX, and the `LandingPage` export signature change. Everything else is untouched.

- [ ] **Step 1: Add the `AffiliateOverrides` interface and update `LandingPage` signature**

Find the line `export default function LandingPage() {` (currently around line 256) and replace it with:

```tsx
interface AffiliateOverrides {
  funnelTag?: string;
  scheduleRoute?: string;
}

export default function LandingPage({ overrides }: { overrides?: AffiliateOverrides } = {}) {
```

Note: the `= {}` default makes the prop truly optional — `<LandingPage />` with no props still works because `overrides` defaults to `{}`, and `overrides?.funnelTag` is `undefined`.

- [ ] **Step 2: Pass overrides into `ClaimForm`**

Inside the `LandingPage` function body, every place `<ClaimForm />` is rendered (search for all occurrences in the file), replace with:

```tsx
<ClaimForm
  scheduleRoute={overrides?.scheduleRoute}
  affiliateTag={overrides?.funnelTag}
/>
```

- [ ] **Step 3: Update the `ClaimForm` function signature**

Find `function ClaimForm() {` (currently around line 160) and replace it with:

```tsx
function ClaimForm({
  scheduleRoute,
  affiliateTag,
}: {
  scheduleRoute?: string;
  affiliateTag?: string;
}) {
```

- [ ] **Step 4: Update `router.push` in `handleSubmit` to use `scheduleRoute`**

Inside `ClaimForm`'s `handleSubmit`, find:

```tsx
router.push(`/schedule?source=claim&email=${encodeURIComponent(email)}&city=${encodeURIComponent(city)}&firstName=${encodeURIComponent(firstName)}&lastName=${encodeURIComponent(lastName)}`);
```

Replace with:

```tsx
const dest = scheduleRoute ?? "/schedule";
router.push(`${dest}?source=claim&email=${encodeURIComponent(email)}&city=${encodeURIComponent(city)}&firstName=${encodeURIComponent(firstName)}&lastName=${encodeURIComponent(lastName)}`);
```

- [ ] **Step 5: Add hidden `affiliateTag` input to the form**

Inside the `<form onSubmit={handleSubmit} ...>` JSX in `ClaimForm`, add this hidden input as the first child (before the first name/last name grid):

```tsx
<input type="hidden" name="affiliateTag" value={affiliateTag ?? ""} />
```

- [ ] **Step 6: Run build**

```bash
cd /Users/mistibruton/Desktop/geo-landing && npm run build
```

Expected: passes. `app/page.tsx` calls `<LandingPage />` with no props — the `= {}` default ensures this still type-checks and runs identically to before.

- [ ] **Step 7: Commit**

```bash
cd /Users/mistibruton/Desktop/geo-landing && git add app/components/LandingPage.tsx && git commit -m "feat: make LandingPage configurable with AffiliateOverrides for affiliate funnels"
```

---

## Task 5: Create `app/components/V2Form.tsx`

**Files:**
- Create: `app/components/V2Form.tsx`

Extract the `V2Form` inner function from `app/v2/page.tsx` into a standalone component. It must accept `{ scheduleRoute?: string; affiliateTag?: string }` props. The god page at `app/v2/page.tsx` will import and use it with no props (identical behavior). Affiliate slug routes will pass their own values.

- [ ] **Step 1: Create `app/components/V2Form.tsx`**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { submitV2Form } from "@/app/v2/actions";

const CTA_BTN =
  "inline-block bg-[#E8185C] hover:bg-[#c4134d] text-white font-bold text-base md:text-lg px-6 md:px-8 py-3 md:py-4 rounded-xl transition-all duration-200 shadow-lg shadow-[#E8185C]/25 cursor-pointer";

export default function V2Form({
  scheduleRoute,
  affiliateTag,
}: {
  scheduleRoute?: string;
  affiliateTag?: string;
} = {}) {
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
        const dest = scheduleRoute ?? "/v2schedule";
        router.push(
          `${dest}?email=${encodeURIComponent(email)}&city=${encodeURIComponent(city)}&firstName=${encodeURIComponent(firstName)}&lastName=${encodeURIComponent(lastName)}`
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
      <input type="hidden" name="affiliateTag" value={affiliateTag ?? ""} />
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
      <div>
        <label className="block text-xs font-semibold text-[#0F1E3A] uppercase tracking-wide mb-1.5">Your Market *</label>
        <input name="city" required placeholder="Austin, TX" className={inputClass} />
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
```

- [ ] **Step 2: Run build**

```bash
cd /Users/mistibruton/Desktop/geo-landing && npm run build
```

Expected: passes. `V2Form` is not yet imported anywhere — just ensuring the file itself compiles.

- [ ] **Step 3: Commit**

```bash
cd /Users/mistibruton/Desktop/geo-landing && git add app/components/V2Form.tsx && git commit -m "feat: extract V2Form into standalone component with affiliate override props"
```

---

## Task 6: Update `app/v2/page.tsx` to use standalone `V2Form`

**Files:**
- Modify: `app/v2/page.tsx`

Remove the inline `V2Form` function and replace it with the imported standalone component. The rest of the page (hero section, all other sections) is unchanged.

- [ ] **Step 1: Add import and remove inline function**

At the top of `app/v2/page.tsx`, find:

```tsx
import { submitV2Form } from "./actions";
```

Replace with:

```tsx
import V2FormComponent from "@/app/components/V2Form";
```

Then delete the entire `function V2Form() { ... }` block (from `function V2Form()` through its closing `}`).

- [ ] **Step 2: Replace usage of inline `V2Form` with `V2FormComponent`**

Find all places in `app/v2/page.tsx` where `<V2Form />` or `<V2Form>` appears and replace with `<V2FormComponent />`. (There should be one or two occurrences, in the hero and/or the form section at the bottom.)

- [ ] **Step 3: Run build**

```bash
cd /Users/mistibruton/Desktop/geo-landing && npm run build
```

Expected: passes. The v2 god page behavior is identical — `V2FormComponent` with no props falls back to `/v2schedule`.

- [ ] **Step 4: Commit**

```bash
cd /Users/mistibruton/Desktop/geo-landing && git add app/v2/page.tsx && git commit -m "refactor: v2/page.tsx uses standalone V2Form component"
```

---

## Task 7: Create `app/components/GeoSchedulePage.tsx`

**Files:**
- Create: `app/components/GeoSchedulePage.tsx`

Extract the schedule page UI from `app/schedule/page.tsx` into a reusable component that accepts `calendlyUrl: string` as a required prop. The god page and affiliate slug schedule pages both use it.

The existing `app/schedule/page.tsx` is a large client component. The extraction strategy: copy the entire file, rename the top-level component to `GeoSchedulePageContent`, accept a `calendlyUrl` prop, and replace the two hardcoded `https://calendly.com/hey-pearl/meet` strings with the prop value.

- [ ] **Step 1: Create `app/components/GeoSchedulePage.tsx`**

```tsx
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
          <p className="text-[#6B7FA0] text-[11px] leading-tight mt-0.5">
            just booked a strategy call for <span className="font-semibold text-[#0F1E3A]">{n.neighborhood}</span>
          </p>
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
    if (email && source !== "claim") {
      fetch("/api/tag", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, segment: "schedule", firstName }) }).catch(() => {});
    }
  }, [email, firstName, source]);

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

            if (state === YTStates.PLAYING && !videoStartedRef.current) {
              videoStartedRef.current = true;
              tag("video_started");
            }

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

    const progressInterval = setInterval(() => {
      if (!ytPlayer.current || videoWatchedFiredRef.current) return;
      const duration = ytPlayer.current?.getDuration?.() ?? 0;
      const current = ytPlayer.current?.getCurrentTime?.() ?? 0;
      if (duration > 0 && current / duration >= 0.5) {
        videoWatchedFiredRef.current = true;
        videoAbandonedFiredRef.current = true;
        tag("video_watched");
      }
    }, 5000);

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
```

- [ ] **Step 2: Run build**

```bash
cd /Users/mistibruton/Desktop/geo-landing && npm run build
```

Expected: passes.

- [ ] **Step 3: Commit**

```bash
cd /Users/mistibruton/Desktop/geo-landing && git add app/components/GeoSchedulePage.tsx && git commit -m "feat: extract GeoSchedulePage component with configurable calendlyUrl prop"
```

---

## Task 8: Update `app/schedule/page.tsx` to delegate to `GeoSchedulePage`

**Files:**
- Modify: `app/schedule/page.tsx`

Replace the entire file content. The god page now imports and delegates to the extracted component, passing the hardcoded Calendly URL. All existing behavior (YouTube tracking, social proof popup, Calendly booking handler) is preserved inside the component.

- [ ] **Step 1: Replace `app/schedule/page.tsx`**

```tsx
import GeoSchedulePage from "@/app/components/GeoSchedulePage";

export default function SchedulePage() {
  return <GeoSchedulePage calendlyUrl="https://calendly.com/hey-pearl/meet" />;
}
```

- [ ] **Step 2: Run build**

```bash
cd /Users/mistibruton/Desktop/geo-landing && npm run build
```

Expected: passes. The god schedule page at `/schedule` renders identically to before.

- [ ] **Step 3: Commit**

```bash
cd /Users/mistibruton/Desktop/geo-landing && git add app/schedule/page.tsx && git commit -m "refactor: /schedule delegates to GeoSchedulePage component"
```

---

## Task 9: Update `app/[slug]/page.tsx` — multi-offer routing

**Files:**
- Modify: `app/[slug]/page.tsx`

Remove the `isLocal` guard. Add offer-aware routing: detect subdomain, look up the affiliate, and render the right component. The local offer path is byte-for-byte identical to what it is today.

- [ ] **Step 1: Replace `app/[slug]/page.tsx`**

```tsx
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { supabase } from "@/lib/resend";
import heylocal from "@/app/templates/local-services/configs/heylocal";
import LocalLandingPage from "@/app/templates/local-services/LocalLandingPage";
import LandingPage from "@/app/components/LandingPage";
import V2FormComponent from "@/app/components/V2Form";
import type { LocalServicesFunnelConfig } from "@/app/templates/local-services/config.types";

export default async function AffiliateLandingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const host = (await headers()).get("host") ?? "";

  const { data: affiliate } = await supabase
    .from("affiliates")
    .select("id, name, slug, tag, calendly_url, headshot_url, offers, active")
    .eq("slug", slug)
    .single();

  if (!affiliate || !affiliate.active) notFound();
  if (!Array.isArray(affiliate.offers) || affiliate.offers.length === 0) notFound();

  // ── LOCAL offer ────────────────────────────────────────────────────────────
  if (host.includes("local.") && affiliate.offers.includes("local")) {
    const initials = affiliate.name
      .split(" ")
      .map((w: string) => w[0]?.toUpperCase() ?? "")
      .join("")
      .slice(0, 2);

    const affiliateConfig: LocalServicesFunnelConfig = {
      ...heylocal,
      funnelTag: affiliate.tag,
      calendlyUrl: affiliate.calendly_url ?? heylocal.calendlyUrl,
      scheduleRoute: `/${slug}/schedule`,
      pricingRoute: `/${slug}/pricing`,
      apiOptinRoute: "/api/local-optin",
      founder: {
        ...heylocal.founder,
        name: affiliate.name,
        initials,
        ...(affiliate.headshot_url ? { photoUrl: affiliate.headshot_url } : {}),
      },
    };

    return <LocalLandingPage config={affiliateConfig} />;
  }

  // ── GEO offer ──────────────────────────────────────────────────────────────
  if (host.includes("geo.") && affiliate.offers.includes("geo")) {
    return (
      <Suspense>
        <LandingPage
          overrides={{
            funnelTag: affiliate.tag,
            scheduleRoute: `/${slug}/schedule`,
          }}
        />
      </Suspense>
    );
  }

  // ── V2 offer ───────────────────────────────────────────────────────────────
  if (host.includes("geo.") && affiliate.offers.includes("v2")) {
    return (
      <Suspense>
        <V2FormComponent
          scheduleRoute={`/${slug}/schedule`}
          affiliateTag={affiliate.tag}
        />
      </Suspense>
    );
  }

  notFound();
}
```

- [ ] **Step 2: Run build**

```bash
cd /Users/mistibruton/Desktop/geo-landing && npm run build
```

Expected: passes. TypeScript will confirm `LandingPage` accepts `overrides` (added in Task 4) and `V2FormComponent` accepts both props (added in Task 5).

- [ ] **Step 3: Commit**

```bash
cd /Users/mistibruton/Desktop/geo-landing && git add app/\[slug\]/page.tsx && git commit -m "feat: [slug]/page.tsx supports geo and v2 affiliate routing"
```

---

## Task 10: Update `app/[slug]/schedule/page.tsx` — multi-offer routing

**Files:**
- Modify: `app/[slug]/schedule/page.tsx`

Remove the `isLocal` guard. Local path is unchanged. Geo and v2 affiliates get `GeoSchedulePage` with the affiliate's own Calendly URL.

- [ ] **Step 1: Replace `app/[slug]/schedule/page.tsx`**

```tsx
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { supabase } from "@/lib/resend";
import heylocal from "@/app/templates/local-services/configs/heylocal";
import LocalSchedulePage from "@/app/templates/local-services/LocalSchedulePage";
import GeoSchedulePage from "@/app/components/GeoSchedulePage";
import type { LocalServicesFunnelConfig } from "@/app/templates/local-services/config.types";

const DEFAULT_GEO_CALENDLY = "https://calendly.com/hey-pearl/meet";

export default async function AffiliateSchedulePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const host = (await headers()).get("host") ?? "";

  const { data: affiliate } = await supabase
    .from("affiliates")
    .select("id, name, slug, tag, calendly_url, headshot_url, offers, active")
    .eq("slug", slug)
    .single();

  if (!affiliate || !affiliate.active) notFound();
  if (!Array.isArray(affiliate.offers) || affiliate.offers.length === 0) notFound();

  // ── LOCAL offer ────────────────────────────────────────────────────────────
  if (host.includes("local.") && affiliate.offers.includes("local")) {
    const initials = affiliate.name
      .split(" ")
      .map((w: string) => w[0]?.toUpperCase() ?? "")
      .join("")
      .slice(0, 2);

    const affiliateConfig: LocalServicesFunnelConfig = {
      ...heylocal,
      funnelTag: affiliate.tag,
      calendlyUrl: affiliate.calendly_url ?? heylocal.calendlyUrl,
      scheduleRoute: `/${slug}/schedule`,
      pricingRoute: `/${slug}/pricing`,
      apiOptinRoute: "/api/local-optin",
      founder: {
        ...heylocal.founder,
        name: affiliate.name,
        initials,
        ...(affiliate.headshot_url ? { photoUrl: affiliate.headshot_url } : {}),
      },
    };

    return (
      <>
        <LocalSchedulePage config={affiliateConfig} />
        <div style={{ background: "#0F1E3A", textAlign: "center", padding: "16px 24px" }}>
          <a
            href={`/${slug}/pricing`}
            style={{ color: "#4A5E7A", fontSize: 12, textDecoration: "none" }}
          >
            View pricing
          </a>
        </div>
      </>
    );
  }

  // ── GEO or V2 offer ────────────────────────────────────────────────────────
  const hasGeoOrV2 =
    host.includes("geo.") &&
    (affiliate.offers.includes("geo") || affiliate.offers.includes("v2"));

  if (hasGeoOrV2) {
    return (
      <GeoSchedulePage
        calendlyUrl={affiliate.calendly_url ?? DEFAULT_GEO_CALENDLY}
      />
    );
  }

  notFound();
}
```

- [ ] **Step 2: Run build**

```bash
cd /Users/mistibruton/Desktop/geo-landing && npm run build
```

Expected: passes.

- [ ] **Step 3: Commit**

```bash
cd /Users/mistibruton/Desktop/geo-landing && git add "app/[slug]/schedule/page.tsx" && git commit -m "feat: [slug]/schedule/page.tsx supports geo and v2 affiliate routing"
```

---

## Task 11: Update admin UI to use offer registry

**Files:**
- Modify: `app/admin/affiliates/page.tsx:128`

Replace the hardcoded `(["local", "geo", "v2"] as const)` array in the checkbox renderer with `OFFERS.map(o => o.slug)`.

- [ ] **Step 1: Add import at top of `app/admin/affiliates/page.tsx`**

After the existing imports at the top of the file, add:

```tsx
import { OFFERS } from "@/lib/offer-registry";
```

- [ ] **Step 2: Replace hardcoded offer array in the checkbox section**

Find the line (around line 128):

```tsx
{(["local", "geo", "v2"] as const).map(offer => (
```

Replace with:

```tsx
{OFFERS.map(o => o.slug).map(offer => (
```

Everything inside the `.map` callback is unchanged.

- [ ] **Step 3: Run build**

```bash
cd /Users/mistibruton/Desktop/geo-landing && npm run build
```

Expected: passes.

- [ ] **Step 4: Commit**

```bash
cd /Users/mistibruton/Desktop/geo-landing && git add app/admin/affiliates/page.tsx && git commit -m "feat: admin affiliates UI reads offer list from registry"
```

---

## Task 12: Update admin API to use offer registry

**Files:**
- Modify: `app/api/admin/affiliates/route.ts:65`

Replace the hardcoded `validOfferValues` array with values derived from `OFFERS`.

- [ ] **Step 1: Add import at top of `app/api/admin/affiliates/route.ts`**

After the existing imports, add:

```ts
import { OFFERS } from "@/lib/offer-registry";
```

- [ ] **Step 2: Replace hardcoded validation array**

Find the line (around line 65):

```ts
const validOfferValues = ["local", "geo", "v2"];
```

Replace with:

```ts
const validOfferValues = OFFERS.map(o => o.slug);
```

Everything else in the POST handler remains unchanged. The error message string that reads `"Must be one of: local, geo, v2"` will now be stale if the registry changes — update that line too while you're there:

```ts
return NextResponse.json({ error: `Invalid offer value: "${invalid}". Must be one of: ${validOfferValues.join(", ")}` }, { status: 400 });
```

- [ ] **Step 3: Run build**

```bash
cd /Users/mistibruton/Desktop/geo-landing && npm run build
```

Expected: passes.

- [ ] **Step 4: Commit**

```bash
cd /Users/mistibruton/Desktop/geo-landing && git add app/api/admin/affiliates/route.ts && git commit -m "feat: admin affiliates API validates offers against registry"
```

---

## Task 13: Final build verification and deploy

- [ ] **Step 1: Run a clean build**

```bash
cd /Users/mistibruton/Desktop/geo-landing && npm run build
```

Expected: 0 errors, 0 TypeScript warnings. If any errors appear, fix them before proceeding.

- [ ] **Step 2: Smoke-check routing logic mentally**

Verify these paths in your head against the final code:

| URL | Host | Affiliate offers | Expected render |
|-----|------|-----------------|-----------------|
| `/todd` | `geo.heypearl.io` | `["geo"]` | `LandingPage` with `funnelTag: "todd"`, `scheduleRoute: "/todd/schedule"` |
| `/todd/schedule` | `geo.heypearl.io` | `["geo"]` | `GeoSchedulePage` with affiliate's calendly_url or default |
| `/lisa` | `geo.heypearl.io` | `["v2"]` | `V2FormComponent` with `affiliateTag: "lisa"`, `scheduleRoute: "/lisa/schedule"` |
| `/lisa/schedule` | `geo.heypearl.io` | `["v2"]` | `GeoSchedulePage` with affiliate's calendly_url |
| `/christina` | `local.heypearl.io` | `["local"]` | `LocalLandingPage` (unchanged) |
| `/christina/schedule` | `local.heypearl.io` | `["local"]` | `LocalSchedulePage` + pricing link (unchanged) |
| `/` | `geo.heypearl.io` | N/A | `LandingPage` with no props (unchanged god page) |
| `/v2` | `geo.heypearl.io` | N/A | `V2Page` → `V2FormComponent` with no props (unchanged god page) |
| `/schedule` | `geo.heypearl.io` | N/A | `GeoSchedulePage` with hardcoded Calendly URL (unchanged) |

- [ ] **Step 3: Deploy to production**

```bash
/opt/homebrew/bin/vercel --prod
```

Expected: deployment succeeds. Monitor the Vercel build log for any server-side errors that the local build might not catch (env var issues, etc.).

---

## Self-Review

**Spec coverage check:**

1. Offer registry (`lib/offer-registry.ts`) — Task 1. Covered.
2. `LandingPage` configurable with `AffiliateOverrides` — Task 4. Covered. `app/page.tsx` still calls `<LandingPage />` with no props; the `= {}` default handles this.
3. `submitClaimForm` source-aware — Task 2. Covered. `source: affiliateTag ?? "claim"`.
4. Extract `V2Form` — Task 5. Covered. `app/v2/page.tsx` updated in Task 6.
5. `submitV2Form` source-aware — Task 3. Covered. `source: affiliateTag ?? "v2"`.
6. Extract `GeoSchedulePage` — Task 7. Covered. `app/schedule/page.tsx` updated in Task 8.
7. `[slug]/page.tsx` multi-offer routing — Task 9. Covered. `isLocal` guard removed. All three offer branches implemented.
8. `[slug]/schedule/page.tsx` multi-offer routing — Task 10. Covered.
9. Admin UI uses registry — Task 11. Covered.
10. Admin API uses registry — Task 12. Covered.
11. Local offer unchanged — confirmed in Tasks 9 and 10: the `host.includes("local.")` branch is byte-for-byte identical to the original.
12. God pages unchanged — `app/page.tsx` (Task 4 default), `app/v2/page.tsx` (Task 6, no props), `app/schedule/page.tsx` (Task 8, same Calendly URL).

**Placeholder scan:** No TBDs, no "implement later", no vague instructions. Every step has exact code.

**Type consistency check:**
- `AffiliateOverrides.funnelTag` → used as `overrides?.funnelTag` in `LandingPage`, passed as `affiliateTag` to `ClaimForm` prop, written to hidden input `name="affiliateTag"`, read in `submitClaimForm` as `formData.get("affiliateTag")`. Consistent end-to-end.
- `V2Form` props: `{ scheduleRoute?: string; affiliateTag?: string }` — defined in Task 5, consumed in Task 9.
- `GeoSchedulePage` prop: `{ calendlyUrl: string }` — defined in Task 7, used in Tasks 8, 10. Required (not optional) — callers always pass a value or the string fallback constant.
- `OFFERS` imported in Tasks 11 and 12 using the same path `@/lib/offer-registry`.

---

## Critical Files for Implementation

- `/Users/mistibruton/Desktop/geo-landing/lib/offer-registry.ts`
- `/Users/mistibruton/Desktop/geo-landing/app/components/LandingPage.tsx`
- `/Users/mistibruton/Desktop/geo-landing/app/[slug]/page.tsx`
- `/Users/mistibruton/Desktop/geo-landing/app/components/GeoSchedulePage.tsx`
- `/Users/mistibruton/Desktop/geo-landing/app/components/V2Form.tsx`

---

Plan complete. It needs to be saved to `docs/superpowers/plans/2026-04-01-affiliate-god-pages.md` — since this is a read-only planning session, the implementer will need to write the file before executing. The content above is the complete plan.

**Two execution options:**

**1. Subagent-Driven (recommended)** — dispatch a fresh subagent per task, review between tasks, fast iteration using `superpowers:subagent-driven-development`

**2. Inline Execution** — execute tasks in this session using `superpowers:executing-plans`, batch execution with checkpoints

**Which approach?**