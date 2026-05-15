# Affiliate Business Card Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a public mobile business card at `[slug].heypearl.io` for each affiliate, showing their photo, contact info, calendar link, and offer links — automatically driven by the `affiliates` table.

**Architecture:** Wildcard subdomain routing (`*.heypearl.io`) is caught at the middleware level — any subdomain not in the known list (`geo`, `v2`, `local`, `affiliate`, `www`) is rewritten to `/card/[slug]`. The card page is a Next.js server component that fetches the affiliate by slug from Supabase and renders the card. The admin affiliates page is updated to show the card URL after creation.

**Tech Stack:** Next.js 16.2.0 App Router, TypeScript, Supabase (`lib/resend.ts` client), inline styles (no Tailwind — match existing pattern in this repo), `next/script` for Meta Pixel.

---

## File Map

| Action | File | Responsibility |
|---|---|---|
| Create | `public/heypearl-logo-white.png` | White HeyPearl logo served as static asset |
| Create | `app/card/[slug]/page.tsx` | Server component — DB lookup + card render |
| Create | `app/card/[slug]/MetaPixel.tsx` | Client component — injects Meta Pixel script |
| Modify | `middleware.ts` | Add wildcard catch block after existing subdomain checks |
| Modify | `app/admin/affiliates/page.tsx` | Add card URL to `funnelUrls()` + invite result panel + fix V2 URL |

**Do not touch:** CLAUDE.md, `.claude/rules/`, email system, GEO/V2/Local/Cashoffer offer pages, affiliate dashboard/auth, all other admin pages.

---

## Task 1: Copy Logo to Public Folder

**Files:**
- Create: `public/heypearl-logo-white.png`

- [ ] **Step 1: Copy the logo file**

```bash
cp "/Users/mistibruton/Desktop/Desktop/heypearl.io_logo.png" /Users/mistibruton/Desktop/geo-landing/public/heypearl-logo-white.png
```

- [ ] **Step 2: Verify the file exists**

```bash
ls -lh /Users/mistibruton/Desktop/geo-landing/public/heypearl-logo-white.png
```

Expected: file listed with a size greater than 0 bytes.

- [ ] **Step 3: Commit**

```bash
cd /Users/mistibruton/Desktop/geo-landing
git add public/heypearl-logo-white.png
git commit -m "feat: add white HeyPearl logo for affiliate card"
```

---

## Task 2: Create the Meta Pixel Client Component

**Files:**
- Create: `app/card/[slug]/MetaPixel.tsx`

This is a client component that injects the Meta Pixel script. It uses the same pattern as `app/templates/cashoffer/CashOfferLandingPage.tsx` (lines 10–25).

- [ ] **Step 1: Create the directory and component**

Create `app/card/[slug]/MetaPixel.tsx` with this exact content:

```tsx
"use client";

import { useEffect } from "react";

export function MetaPixel({ id }: { id: string }) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const w = window as Window & { fbq?: (...args: unknown[]) => void; _fbq?: unknown };
    if (w.fbq) { w.fbq("init", id); w.fbq("track", "PageView"); return; }
    const script = document.createElement("script");
    script.async = true;
    script.src = "https://connect.facebook.net/en_US/fbevents.js";
    const n = Object.assign(
      function (...args: unknown[]) { if (n.callMethod) n.callMethod(...args); else n.queue!.push(args); },
      { push: undefined as unknown, loaded: true, version: "2.0", queue: [] as unknown[], callMethod: undefined as unknown }
    );
    n.push = n;
    w.fbq = n; w._fbq = n;
    script.onload = () => { if (w.fbq) { w.fbq("init", id); w.fbq("track", "PageView"); } };
    document.head.appendChild(script);
  }, [id]);
  return null;
}
```

- [ ] **Step 2: Run build to check types**

```bash
cd /Users/mistibruton/Desktop/geo-landing && npm run build 2>&1 | tail -20
```

Expected: no TypeScript errors related to `MetaPixel.tsx`. Other pre-existing errors are not your concern.

- [ ] **Step 3: Commit**

```bash
git add app/card/[slug]/MetaPixel.tsx
git commit -m "feat: add MetaPixel client component for affiliate card"
```

---

## Task 3: Create the Affiliate Card Page

**Files:**
- Create: `app/card/[slug]/page.tsx`

This is an async server component. It fetches the affiliate from Supabase by slug, returns 404 if not found or inactive, and renders the card.

The offer section groups offers by audience:
- Real estate group (`geo`, `v2`): section header "For Real Estate Agents"
- Local group (`local`): section header "For Local Businesses"

Each section only renders if the affiliate has at least one offer in that group.

- [ ] **Step 1: Create `app/card/[slug]/page.tsx`**

```tsx
import { notFound } from "next/navigation";
import { supabase } from "@/lib/resend";
import { MetaPixel } from "./MetaPixel";

interface Affiliate {
  name: string;
  slug: string;
  email: string | null;
  phone: string | null;
  headshot_url: string | null;
  calendly_url: string | null;
  meta_pixel_id: string | null;
  offers: string[];
  active: boolean;
}

const OFFER_CONFIG: Record<string, { label: string; section: string; url: (slug: string) => string }> = {
  geo: {
    label: "AI Visibility Score",
    section: "For Real Estate Agents",
    url: (slug) => `https://geo.heypearl.io/${slug}`,
  },
  v2: {
    label: "Cash Offer System",
    section: "For Real Estate Agents",
    url: (slug) => `https://v2.heypearl.io/v2/${slug}`,
  },
  local: {
    label: "Local Business Growth",
    section: "For Local Businesses",
    url: (slug) => `https://local.heypearl.io/${slug}`,
  },
};

const RE_OFFERS = ["geo", "v2"];
const LOCAL_OFFERS = ["local"];

export async function generateMetadata({ params }: { params: { slug: string } }) {
  return { title: `HeyPearl — ${params.slug}` };
}

export default async function AffiliatCardPage({ params }: { params: { slug: string } }) {
  const { slug } = params;

  const { data: affiliate } = await supabase
    .from("affiliates")
    .select("name, slug, email, phone, headshot_url, calendly_url, meta_pixel_id, offers, active")
    .eq("slug", slug)
    .maybeSingle();

  if (!affiliate || !affiliate.active) notFound();

  const reOffers = (affiliate.offers ?? []).filter((o: string) => RE_OFFERS.includes(o));
  const localOffers = (affiliate.offers ?? []).filter((o: string) => LOCAL_OFFERS.includes(o));

  return (
    <>
      {affiliate.meta_pixel_id && <MetaPixel id={affiliate.meta_pixel_id} />}
      <main style={{
        minHeight: "100dvh",
        background: "#0F1E3A",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "0 0 40px",
      }}>

        {/* Logo bar */}
        <div style={{ paddingTop: 24, marginBottom: 4 }}>
          <div style={{
            background: "rgba(255,255,255,0.06)",
            borderRadius: 8,
            padding: "6px 14px",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
          }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/heypearl-logo-white.png"
              alt="HeyPearl"
              style={{ height: 22, width: "auto", display: "block" }}
            />
          </div>
        </div>

        {/* Card body */}
        <div style={{ width: "100%", maxWidth: 400, padding: "0 20px" }}>

          {/* Photo + name */}
          <div style={{ textAlign: "center", padding: "24px 0 20px" }}>
            {affiliate.headshot_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={affiliate.headshot_url}
                alt={affiliate.name}
                style={{
                  width: 100,
                  height: 100,
                  borderRadius: "50%",
                  objectFit: "cover",
                  border: "3px solid #F5C842",
                  margin: "0 auto 14px",
                  display: "block",
                }}
              />
            )}
            <div style={{ color: "white", fontWeight: 700, fontSize: 20, letterSpacing: "-0.3px" }}>
              {affiliate.name}
            </div>
            <div style={{ display: "flex", justifyContent: "center", gap: 16, marginTop: 8, flexWrap: "wrap" }}>
              {affiliate.phone && (
                <a
                  href={`tel:${affiliate.phone}`}
                  style={{ color: "#6B8BAD", fontSize: 13, textDecoration: "none" }}
                >
                  {affiliate.phone}
                </a>
              )}
              {affiliate.email && (
                <a
                  href={`mailto:${affiliate.email}`}
                  style={{ color: "#6B8BAD", fontSize: 13, textDecoration: "none" }}
                >
                  {affiliate.email}
                </a>
              )}
            </div>
          </div>

          {/* Book a Call */}
          {affiliate.calendly_url && (
            <a
              href={affiliate.calendly_url}
              target="_blank"
              rel="noreferrer"
              style={{
                display: "block",
                background: "#F5C842",
                color: "#0F1E3A",
                textAlign: "center",
                padding: 15,
                borderRadius: 14,
                fontWeight: 800,
                fontSize: 15,
                textDecoration: "none",
                marginBottom: 20,
              }}
            >
              Book a Call
            </a>
          )}

          {/* Real estate offers */}
          {reOffers.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{
                fontSize: 10,
                color: "#3D5A7A",
                textTransform: "uppercase",
                letterSpacing: "1.5px",
                fontWeight: 600,
                textAlign: "center",
                marginBottom: 10,
              }}>
                For Real Estate Agents
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                {reOffers.map((offer: string) => {
                  const cfg = OFFER_CONFIG[offer];
                  if (!cfg) return null;
                  return (
                    <a
                      key={offer}
                      href={cfg.url(slug)}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        background: "rgba(255,255,255,0.07)",
                        color: "white",
                        padding: "14px 16px",
                        borderRadius: 12,
                        fontWeight: 600,
                        fontSize: 13,
                        textDecoration: "none",
                        border: "1px solid rgba(255,255,255,0.10)",
                      }}
                    >
                      <span>{cfg.label}</span>
                      <span style={{ color: "#6B8BAD", fontSize: 16 }}>›</span>
                    </a>
                  );
                })}
              </div>
            </div>
          )}

          {/* Local offers */}
          {localOffers.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{
                fontSize: 10,
                color: "#3D5A7A",
                textTransform: "uppercase",
                letterSpacing: "1.5px",
                fontWeight: 600,
                textAlign: "center",
                marginBottom: 10,
              }}>
                For Local Businesses
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                {localOffers.map((offer: string) => {
                  const cfg = OFFER_CONFIG[offer];
                  if (!cfg) return null;
                  return (
                    <a
                      key={offer}
                      href={cfg.url(slug)}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        background: "rgba(255,255,255,0.07)",
                        color: "white",
                        padding: "14px 16px",
                        borderRadius: 12,
                        fontWeight: 600,
                        fontSize: 13,
                        textDecoration: "none",
                        border: "1px solid rgba(255,255,255,0.10)",
                      }}
                    >
                      <span>{cfg.label}</span>
                      <span style={{ color: "#6B8BAD", fontSize: 16 }}>›</span>
                    </a>
                  );
                })}
              </div>
            </div>
          )}

          {/* Footer */}
          <div style={{ textAlign: "center", paddingTop: 16 }}>
            <div style={{ width: 40, height: 1, background: "rgba(255,255,255,0.10)", margin: "0 auto 16px" }} />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/heypearl-logo-white.png"
                alt="HeyPearl"
                style={{ height: 18, width: "auto", opacity: 0.85 }}
              />
            </div>
            <div style={{ color: "#3D5A7A", fontSize: 11, fontStyle: "italic", lineHeight: 1.5 }}>
              AI-powered growth for local businesses.
            </div>
          </div>

        </div>
      </main>
    </>
  );
}
```

- [ ] **Step 2: Run build to check types**

```bash
cd /Users/mistibruton/Desktop/geo-landing && npm run build 2>&1 | tail -30
```

Expected: no TypeScript errors in `app/card/`. If you see `Type error: Property 'slug' does not exist on type...` it means params needs `await` — wrap with `const { slug } = await params;` and change the function signature accordingly (Next.js 16 may require this).

- [ ] **Step 3: Test locally — navigate to the card page directly**

Start the dev server if not running:
```bash
cd /Users/mistibruton/Desktop/geo-landing && npm run dev
```

Open: `http://localhost:3000/card/christina` (use any real affiliate slug from the DB).

Expected: card renders with that affiliate's data — photo, name, contact info, offer buttons grouped by audience, footer logo.

Open: `http://localhost:3000/card/nonexistent-slug`

Expected: Next.js 404 page.

- [ ] **Step 4: Commit**

```bash
git add app/card/[slug]/page.tsx
git commit -m "feat: add affiliate business card page at /card/[slug]"
```

---

## Task 4: Update Middleware for Wildcard Subdomain Routing

**Files:**
- Modify: `middleware.ts`

Add a wildcard catch block **at the end**, just before the `/admin` protection block. Known subdomains (`geo`, `v2`, `local`, `affiliate`, `www`) are skipped — any other `*.heypearl.io` subdomain gets routed to `/card/[slug]`.

- [ ] **Step 1: Read the current middleware**

Read `middleware.ts` in full before editing. The new block goes immediately before this line:
```typescript
// Only protect /admin routes
if (!pathname.startsWith("/admin")) return NextResponse.next();
```

- [ ] **Step 2: Add the wildcard catch block**

Insert this block immediately before the `// Only protect /admin routes` comment:

```typescript
  // Wildcard affiliate card routing: [slug].heypearl.io → /card/[slug]
  // Must be last subdomain check — skips known subdomains
  const KNOWN_SUBDOMAINS = ["geo", "v2", "local", "affiliate", "www"];
  const hostParts = hostname.split(".");
  if (
    hostParts.length === 3 &&
    hostname.endsWith(".heypearl.io") &&
    !KNOWN_SUBDOMAINS.includes(hostParts[0]) &&
    !pathname.startsWith("/api") &&
    !pathname.startsWith("/_next") &&
    !pathname.startsWith("/favicon")
  ) {
    const affiliateSlug = hostParts[0];
    const url = req.nextUrl.clone();
    url.pathname = `/card/${affiliateSlug}`;
    return NextResponse.rewrite(url);
  }
```

- [ ] **Step 3: Run build to check types**

```bash
cd /Users/mistibruton/Desktop/geo-landing && npm run build 2>&1 | tail -20
```

Expected: no TypeScript errors in `middleware.ts`.

- [ ] **Step 4: Verify existing subdomain routing is untouched**

Open these URLs in the dev server and confirm they still work (they should — the new block only activates for unknown subdomains, and in local dev the hostname is `localhost` not `*.heypearl.io`):
- `http://localhost:3000/` — GEO funnel
- `http://localhost:3000/affiliate` — affiliate page
- Admin routes still protected

- [ ] **Step 5: Commit**

```bash
git add middleware.ts
git commit -m "feat: add wildcard subdomain routing for affiliate card pages"
```

---

## Task 5: Update Admin Affiliates Page

**Files:**
- Modify: `app/admin/affiliates/page.tsx`

Two changes:
1. Fix `funnelUrls()` — V2 URL currently points to `geo.heypearl.io/v2/[slug]` (wrong), should be `v2.heypearl.io/v2/[slug]`. Also add the card URL `[slug].heypearl.io`.
2. Add card URL display in the invite result panel after affiliate creation.

- [ ] **Step 1: Fix `funnelUrls()` and add card URL**

Find the `funnelUrls` function (around line 68 in `app/admin/affiliates/page.tsx`):

```typescript
function funnelUrls(slug: string, offers: string[]): string[] {
  const geoHost = "geo.heypearl.io";
  const localHost = "local.heypearl.io";
  const urls: string[] = [];
  if (offers.includes("geo"))   urls.push(`https://${geoHost}/${slug}`);
  if (offers.includes("v2"))    urls.push(`https://${geoHost}/v2/${slug}`);
  if (offers.includes("local")) urls.push(`https://${localHost}/${slug}`);
  return urls;
}
```

Replace it with:

```typescript
function funnelUrls(slug: string, offers: string[]): string[] {
  const urls: string[] = [];
  if (offers.includes("geo"))   urls.push(`https://geo.heypearl.io/${slug}`);
  if (offers.includes("v2"))    urls.push(`https://v2.heypearl.io/v2/${slug}`);
  if (offers.includes("local")) urls.push(`https://local.heypearl.io/${slug}`);
  return urls;
}

function cardUrl(slug: string): string {
  return `https://${slug}.heypearl.io`;
}
```

- [ ] **Step 2: Add card URL to invite result panel**

Find the invite result panel section. It currently shows the invite link and funnel URLs. After the `<p style={{ color: S.muted, fontSize: 12, marginBottom: 6 }}>Funnel URLs:</p>` block and its URLs, add the card URL block.

Find this block in the invite result panel (around line 259–266):

```tsx
          <div style={{ marginTop: 12 }}>
            <p style={{ color: S.muted, fontSize: 12, marginBottom: 6 }}>Funnel URLs:</p>
            {funnelUrls(inviteResult.slug, inviteResult.offers).map(url => (
              <div key={url} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                <a href={url} target="_blank" rel="noreferrer" style={{ color: "#15803d", fontSize: 12, wordBreak: "break-all" }}>{url}</a>
                <button onClick={() => navigator.clipboard.writeText(url)} style={{ background: "#dcfce7", color: S.green, border: "1px solid #bbf7d0", borderRadius: 4, padding: "2px 8px", fontSize: 11, cursor: "pointer", whiteSpace: "nowrap" }}>Copy</button>
              </div>
            ))}
          </div>
```

Replace it with:

```tsx
          <div style={{ marginTop: 12 }}>
            <p style={{ color: S.muted, fontSize: 12, marginBottom: 6 }}>Business Card:</p>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
              <a href={cardUrl(inviteResult.slug)} target="_blank" rel="noreferrer" style={{ color: "#15803d", fontSize: 12, wordBreak: "break-all" }}>{cardUrl(inviteResult.slug)}</a>
              <button onClick={() => navigator.clipboard.writeText(cardUrl(inviteResult.slug))} style={{ background: "#dcfce7", color: S.green, border: "1px solid #bbf7d0", borderRadius: 4, padding: "2px 8px", fontSize: 11, cursor: "pointer", whiteSpace: "nowrap" }}>Copy</button>
            </div>
            <p style={{ color: S.muted, fontSize: 12, marginBottom: 6 }}>Funnel URLs:</p>
            {funnelUrls(inviteResult.slug, inviteResult.offers).map(url => (
              <div key={url} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                <a href={url} target="_blank" rel="noreferrer" style={{ color: "#15803d", fontSize: 12, wordBreak: "break-all" }}>{url}</a>
                <button onClick={() => navigator.clipboard.writeText(url)} style={{ background: "#dcfce7", color: S.green, border: "1px solid #bbf7d0", borderRadius: 4, padding: "2px 8px", fontSize: 11, cursor: "pointer", whiteSpace: "nowrap" }}>Copy</button>
              </div>
            ))}
          </div>
```

- [ ] **Step 3: Add card URL to the existing affiliates table row**

Find the slug cell in the affiliates table (the block that renders `funnelUrls(a.slug, a.offers ?? []).map(url => ...)` around line 327). After those funnel URL links, add the card URL link:

Find:
```tsx
                    {funnelUrls(a.slug, a.offers ?? []).map(url => (
                      <a key={url} href={url} target="_blank" rel="noreferrer" style={{ color: S.pink, fontSize: 11, display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 220 }}>{url.replace("https://", "")}</a>
                    ))}
```

Replace with:
```tsx
                    {funnelUrls(a.slug, a.offers ?? []).map(url => (
                      <a key={url} href={url} target="_blank" rel="noreferrer" style={{ color: S.pink, fontSize: 11, display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 220 }}>{url.replace("https://", "")}</a>
                    ))}
                    <a href={cardUrl(a.slug)} target="_blank" rel="noreferrer" style={{ color: "#F5A623", fontSize: 11, display: "block", fontWeight: 600 }}>
                      {a.slug}.heypearl.io ↗
                    </a>
```

- [ ] **Step 4: Run build**

```bash
cd /Users/mistibruton/Desktop/geo-landing && npm run build 2>&1 | tail -20
```

Expected: no TypeScript errors.

- [ ] **Step 5: Test locally**

Navigate to `http://localhost:3000/admin/affiliates` (log in if prompted).

Expected:
- Each affiliate row shows their card URL (`[slug].heypearl.io`) in gold/orange below the funnel URLs
- V2 funnel URL now correctly shows `v2.heypearl.io/v2/[slug]` not `geo.heypearl.io/v2/[slug]`
- Create a test affiliate → invite panel shows "Business Card" URL at the top

- [ ] **Step 6: Commit**

```bash
git add app/admin/affiliates/page.tsx
git commit -m "feat: show affiliate card URL in admin, fix V2 funnel URL"
```

---

## Task 6: Deploy + DNS Setup

- [ ] **Step 1: Run final build**

```bash
cd /Users/mistibruton/Desktop/geo-landing && npm run build 2>&1 | tail -30
```

Expected: clean build, zero errors.

- [ ] **Step 2: Deploy to Vercel**

```bash
cd /Users/mistibruton/Desktop/geo-landing && /opt/homebrew/bin/vercel --prod
```

- [ ] **Step 3: Add wildcard domain in Vercel**

1. Go to Vercel → geo-landing project → Settings → Domains
2. Add domain: `*.heypearl.io`
3. Vercel will show a TXT record value for `_vercel` — copy it

- [ ] **Step 4: Add DNS records in GoDaddy**

In GoDaddy DNS for `heypearl.io`, add:

| Type | Name | Value |
|---|---|---|
| CNAME | `*` | `cname.vercel-dns.com` |
| TXT | `_vercel` | (value Vercel gave you in Step 3) |

Wait 1–5 minutes for DNS to propagate.

- [ ] **Step 5: Verify in production**

Open `https://[any-real-affiliate-slug].heypearl.io` in a browser.

Expected: affiliate card renders with their photo, name, contact info, offer buttons grouped by audience, footer with HeyPearl logo and tagline.

Open `https://nonexistent.heypearl.io`.

Expected: 404 page.

- [ ] **Step 6: Verify existing subdomains still work**

- `https://geo.heypearl.io` — GEO funnel loads normally
- `https://v2.heypearl.io` — V2 page loads normally
- `https://affiliate.heypearl.io` — affiliate portal loads normally

---

## Done

Every affiliate now automatically gets a card at `[slug].heypearl.io`. Offer toggles in the admin (`geo`, `v2`, `local`) update the card in real time — no additional wiring needed. New affiliates created in admin show their card URL in the invite panel.
