# Local Services Funnel Template

Three-page funnel for local service businesses: landing page, booking page, and pricing page (sales-call-only).

## How to spin up a new client

### Step 1 — Create a config file

Copy `configs/heylocal.ts` and rename it to your client's brand:

```
configs/heylocal.ts  →  configs/[clientname].ts
```

Open the new file and update every value:
- `brandName` — client's brand name
- `brandTagline` — short tagline shown in hero badge
- `calendlyUrl` — their Calendly booking URL (e.g. `https://calendly.com/their-account/meet`)
- `apiOptinRoute` — their opt-in API route (see Step 3)
- `scheduleRoute` — their schedule page path (e.g. `/[clientname]schedule`)
- `pricingTiers` — update prices, features, and Stripe links when ready
- All copy: headlines, pain cards, testimonials, FAQs, founder info, etc.
- `fomoEntries` — the popup array (can reuse or customize industries for their niche)

### Step 2 — Create the 3 route pages

Create 3 folders under `app/`:

```
app/[clientname]/page.tsx
app/[clientname]schedule/page.tsx
app/[clientname]pricing/page.tsx
```

Each file is just 4 lines — paste and update the import path:

**`app/[clientname]/page.tsx`**
```tsx
import LocalLandingPage from "@/app/templates/local-services/LocalLandingPage";
import config from "@/app/templates/local-services/configs/[clientname]";

export default function Page() {
  return <LocalLandingPage config={config} />;
}
```

**`app/[clientname]schedule/page.tsx`**
```tsx
import LocalSchedulePage from "@/app/templates/local-services/LocalSchedulePage";
import config from "@/app/templates/local-services/configs/[clientname]";

export default function Page() {
  return <LocalSchedulePage config={config} />;
}
```

**`app/[clientname]pricing/page.tsx`**
```tsx
import LocalPricingPage from "@/app/templates/local-services/LocalPricingPage";
import config from "@/app/templates/local-services/configs/[clientname]";

export default function Page() {
  return <LocalPricingPage config={config} />;
}
```

### Step 3 — Create the opt-in API route

Copy `app/api/local-optin/route.ts` to `app/api/[clientname]-optin/route.ts`.

Update the Supabase table name inside to match the client's leads table.

Then update `apiOptinRoute` in the config to `/api/[clientname]-optin`.

### Step 4 — Create the Supabase leads table

Run this in Supabase SQL editor (replace table name):

```sql
create table [clientname]_leads (
  id uuid default gen_random_uuid() primary key,
  first_name text,
  email text not null,
  business_type text,
  created_at timestamp with time zone default now()
);
```

### Step 5 — Build and deploy

```bash
npm run build
/opt/homebrew/bin/vercel --prod
```

That's it. New funnel is live.

---

## Live instances

| Brand | Routes | Config |
|-------|--------|--------|
| HeyLocal | `/local`, `/localschedule`, `/localpricing` | `configs/heylocal.ts` |

---

## What lives in the template vs the config

**Template files (shared, don't edit for new clients):**
- `LocalLandingPage.tsx` — all page layout and components
- `LocalSchedulePage.tsx` — booking page with Calendly embed
- `LocalPricingPage.tsx` — pricing page with comparison table
- `config.types.ts` — TypeScript types for the config object

**Config files (one per client):**
- `configs/[clientname].ts` — every word of copy, every price, every setting

If you need to add a new section or change the layout, edit the template files and every client gets the update automatically.
