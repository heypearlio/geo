# /meta-ads-campaign

Deploy a Meta (Facebook/Instagram) ad campaign for GEO by HeyPearl from the terminal.

## What This Skill Does

Runs a 6-phase pipeline:
1. Gather campaign details from you
2. Scan for video files and register them
3. Generate GEO-specific ad copy for each video
4. Build UTM tracking URLs
5. Show a pre-deploy checklist — nothing moves forward until you approve
6. Deploy to Meta via /api/meta-deploy — everything deploys PAUSED

## Prerequisites Check

Before starting, verify:
- `META_ACCESS_TOKEN` is set in `.env.local`
- A row exists in `geo_ad_account` with your `account_id`, `page_id`
- Video files exist as MP4s on disk

If any prerequisite is missing, stop and tell the user exactly what to fix.

## Phase 1: Gather Campaign Details

Ask the user these questions (you can ask all at once):

1. **Campaign name** — e.g. "GEO Leads — Phoenix March 2026"
2. **Target market** — which city, state, or region? (e.g. "Phoenix, AZ" or "all of US")
3. **Daily budget** — in dollars, e.g. "$30/day"
4. **Landing page** — `/audit` (free AI Visibility Score) or `/schedule` (book a call)?
   - Default: `https://geo.heypearl.io/audit`
5. **Video directory** — full path to the folder containing your MP4 files

Once you have answers:
- Generate a slug: `geo-{market-slug}-{month}-{year}-leads` (e.g. `geo-phoenix-march-2026-leads`)
- Convert budget to cents (e.g. $30 → 3000)
- Set objective to `LEAD_GENERATION`

## Phase 2: Scan Videos & Create Campaign Record

1. List all `.mp4` files in the given directory
2. Show the user the list and ask them to confirm which to include
3. For each video, detect format from filename or dimensions:
   - Contains "vertical", "reels", "stories", or "9x16" → `vertical`
   - Contains "feed", "square", or "1x1" → `feed`
   - Contains "landscape", "16x9" → `landscape`
   - If unclear, ask the user
4. Ask for a short title for each video (e.g. "AI Search Hook", "One Agent Per Market", "Score Reveal")

Then insert into Supabase:

```sql
INSERT INTO geo_ad_campaigns (name, slug, objective, status, budget_daily, landing_page, targeting_regions)
VALUES ('{name}', '{slug}', 'LEAD_GENERATION', 'draft', {budget_cents}, '{landing_page}', '{regions_json}')
RETURNING id;
```

For targeting_regions, use the Meta region key lookup API if targeting a specific state/province:
```
GET https://graph.facebook.com/v21.0/search?type=adgeolocation&location_types=region&q={region_name}&access_token={token}
```
Always verify the `country_code` matches. Never guess a region key.

If targeting all of US + Canada, set `targeting_regions` to `[]` (the deploy endpoint defaults to `["US","CA"]`).

Insert each video asset:
```sql
INSERT INTO geo_ad_video_assets (campaign_id, title, file_path, format, status)
VALUES ('{campaign_id}', '{title}', '{file_path}', '{format}', 'pending');
```

## Phase 3: Generate Ad Copy

For each video, generate GEO-specific ad copy. Use this context:

**Product:** GEO by HeyPearl — done-for-you AI visibility system for real estate agents
**Core promise:** When a buyer in your market asks ChatGPT, Perplexity, or Google AI "who's the best real estate agent in [city]", GEO makes YOUR name the answer
**Key angles:**
- One agent per market (exclusivity/urgency)
- AI is replacing Google search — agents who aren't visible to AI are invisible to buyers
- Free AI Visibility Score shows exactly where they stand
- Real agents are already claiming markets

**Ad copy format for each video:**

```
Primary Text (2-3 sentences, conversational, no em dashes):
[Hook tied to the video concept. Pain point or curiosity gap. CTA to get their free score.]

Headline (5-7 words, punchy):
[Action-oriented, benefit-focused]

Description (1 sentence):
[Reinforce the offer]

CTA Type: LEARN_MORE
```

**Example — "AI Search Hook" vertical video:**
```
Primary Text: Buyers are asking ChatGPT who to call. If your name isn't in the answer, you don't exist to them. Get your free AI Visibility Score and see exactly where you stand.
Headline: Is AI Recommending You?
Description: One free report. See your score in minutes.
CTA: LEARN_MORE
```

Show each ad's copy to the user and ask: **Approve? (y/n/rewrite)**
Nothing is saved until approved.

Update approved ads in Supabase:
```sql
UPDATE geo_ad_video_assets
SET ad_copy_primary = '...', ad_copy_headline = '...', ad_copy_description = '...', cta_type = 'LEARN_MORE', status = 'approved'
WHERE id = '{asset_id}';
```

## Phase 4: Generate UTMs

For each approved video, build the UTM content tag:
```
v1-{funnel_stage}-{descriptive-slug}
```
- All new campaigns start at top of funnel: `tof`
- Descriptive slug: lowercase, hyphen-separated version of the video title
- Example: `v1-tof-ai-search-hook`, `v1-tof-one-agent-per-market`

Full tracking URL:
```
{landing_page}?utm_source=meta&utm_medium=paid_social&utm_campaign={slug}&utm_content={utm_content}
```

Show each URL to the user for review, then update:
```sql
UPDATE geo_ad_video_assets SET utm_content = '{utm_content}' WHERE id = '{asset_id}';
```

## Phase 5: Pre-Deploy Checklist

Show this checklist. Get explicit approval before continuing:

```
Pre-Deploy Checklist — {campaign_name}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[ ] All video files exist at their file paths
[ ] All ad copy reviewed and approved
[ ] UTM content tags set for all ads
[ ] Landing page is live: {landing_page}
[ ] Geographic targeting confirmed: {targeting}
[ ] Daily budget confirmed: ${budget}/day
[ ] META_ACCESS_TOKEN is set
[ ] geo_ad_account has account_id and page_id
[ ] Campaign status is 'draft' (ready to deploy)
[ ] No special ad category issues (not housing/credit/employment)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

NOTE: Real estate ads may require a Special Ad Category.
If targeting by location in a way that could be considered housing-related,
Meta may require setting special_ad_categories: ["HOUSING"].
Ask the user to confirm before proceeding.

Type DEPLOY to proceed, or tell me what needs to change.
```

If user types DEPLOY, update campaign status to 'ready':
```sql
UPDATE geo_ad_campaigns SET status = 'ready' WHERE id = '{campaign_id}';
```

## Phase 6: Deploy

Call the deploy endpoint:
```
POST /api/meta-deploy
Headers: x-admin-key: {ADMIN_SECRET from .env.local}
Body: { "campaignId": "{campaign_id}" }
```

Stream the response and show the user what's happening:
```
Uploading video 1/3: AI Search Hook (vertical)... done
Uploading video 2/3: One Agent Per Market (vertical)... done
Uploading video 3/3: Score Reveal (vertical)... done
Creating campaign... PAUSED
Discovering pixel... [found/not found]
Creating ad set... done
Creating ad 1/3... done
Creating ad 2/3... done
Creating ad 3/3... done

✅ {N} ads deployed. Campaign is PAUSED.
Open Meta Ads Manager to review, then activate when ready.
```

If any errors occur, show them clearly and tell the user:
- Which ads succeeded (they won't be re-deployed on retry)
- Which ads failed and why
- How to retry: just run `/meta-ads-campaign` again with the same campaign ID

After a successful deploy, show:
```
Campaign Summary
━━━━━━━━━━━━━━━━━━━━━━
Name:        {name}
Meta ID:     {meta_campaign_id}
Ad Set ID:   {meta_adset_id}
Ads:         {N} created
Budget:      ${budget}/day
Landing:     {landing_page}
Status:      PAUSED — review in Ads Manager before activating
━━━━━━━━━━━━━━━━━━━━━━
```

## Resume a Campaign

If the user passes a campaign ID instead of starting fresh:
```
/meta-ads-campaign resume {campaign_id}
```
Load the existing campaign from Supabase and jump to the appropriate phase based on its current status.

## Verify After Deploy

Run these SQL checks and show results:
```sql
-- Check all Meta IDs are populated
SELECT title, meta_video_id, meta_ad_id, status
FROM geo_ad_video_assets
WHERE campaign_id = '{campaign_id}';

-- Check deploy log for errors
SELECT action, status, error_message
FROM geo_ad_deploy_log
WHERE campaign_id = '{campaign_id}'
ORDER BY created_at;
```

If any `meta_ad_id` is null or any log row shows `status = 'failed'`, flag it clearly.
