import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../lib/resend";
import fs from "fs";

const META_VERSION = "v21.0";
const BASE = `https://graph.facebook.com/${META_VERSION}`;
const TOKEN = process.env.META_ACCESS_TOKEN ?? "";

function adminAuth(req: NextRequest) {
  const key = req.headers.get("x-admin-key") ?? req.nextUrl.searchParams.get("key");
  return key === process.env.ADMIN_TOKEN;
}

async function metaPost(path: string, body: Record<string, unknown>) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...body, access_token: TOKEN }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message ?? JSON.stringify(data.error));
  return data;
}

async function metaGet(path: string, params: Record<string, string> = {}) {
  const qs = new URLSearchParams({ ...params, access_token: TOKEN }).toString();
  const res = await fetch(`${BASE}${path}?${qs}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error.message ?? JSON.stringify(data.error));
  return data;
}

async function log(
  campaignId: string,
  action: string,
  status: "started" | "success" | "failed" | "skipped",
  extra: { request?: unknown; response?: unknown; error?: string } = {}
) {
  await supabase.from("geo_ad_deploy_log").insert({
    campaign_id: campaignId,
    action,
    status,
    request_data: extra.request ?? null,
    response_data: extra.response ?? null,
    error_message: extra.error ?? null,
  });
}

// ── Upload a video file to Meta and return the Meta video ID ──────────────────
async function uploadVideo(accountId: string, filePath: string, title: string): Promise<string> {
  if (!fs.existsSync(filePath)) throw new Error(`File not found: ${filePath}`);

  const fileSize = fs.statSync(filePath).size;
  const fileName = filePath.split("/").pop()!;

  // Step 1: Start upload session
  const session = await metaPost(`/${accountId}/advideos`, {
    title,
    file_size: fileSize,
    upload_phase: "start",
  });
  const uploadSessionId = session.upload_session_id;
  const videoId = session.video_id; // Meta returns video_id in the start phase
  const startOffset = parseInt(session.start_offset);
  const endOffset = parseInt(session.end_offset);

  // Step 2: Transfer the video chunk using native FormData
  const fileBuffer = fs.readFileSync(filePath);
  const chunk = fileBuffer.slice(startOffset, endOffset + 1);
  const form = new FormData();
  form.append("access_token", TOKEN);
  form.append("upload_phase", "transfer");
  form.append("upload_session_id", uploadSessionId);
  form.append("start_offset", String(startOffset));
  form.append("video_file_chunk", new Blob([chunk], { type: "video/mp4" }), fileName);
  const transferRes = await fetch(`${BASE}/${accountId}/advideos`, {
    method: "POST",
    body: form,
  });
  const transferData = await transferRes.json();
  if (transferData.error) throw new Error(transferData.error.message);

  // Step 3: Finish upload
  await metaPost(`/${accountId}/advideos`, {
    upload_phase: "finish",
    upload_session_id: uploadSessionId,
  });

  return videoId;
}

// ── Discover pixel on the ad account ─────────────────────────────────────────
async function discoverPixel(accountId: string): Promise<string | null> {
  try {
    const data = await metaGet(`/${accountId}/adspixels`, { fields: "id,name" });
    return data.data?.[0]?.id ?? null;
  } catch {
    return null;
  }
}

// ── Main deploy handler ───────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  if (!adminAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!TOKEN) return NextResponse.json({ error: "META_ACCESS_TOKEN not set" }, { status: 500 });

  const body = await req.json();
  const { campaignId } = body as { campaignId: string };
  if (!campaignId) return NextResponse.json({ error: "campaignId required" }, { status: 400 });

  // Load campaign
  const { data: campaign, error: campErr } = await supabase
    .from("geo_ad_campaigns")
    .select("*")
    .eq("id", campaignId)
    .single();
  if (campErr || !campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

  // Load account config
  const { data: accountRow } = await supabase.from("geo_ad_account").select("*").limit(1).single();
  if (!accountRow) return NextResponse.json({ error: "No ad account configured. Insert a row into geo_ad_account first." }, { status: 500 });

  const accountId = accountRow.account_id;
  const pageId = accountRow.page_id;

  // Load video assets
  const { data: assets } = await supabase
    .from("geo_ad_video_assets")
    .select("*")
    .eq("campaign_id", campaignId)
    .eq("status", "approved");

  if (!assets || assets.length === 0) {
    return NextResponse.json({ error: "No approved video assets found for this campaign." }, { status: 400 });
  }

  await supabase.from("geo_ad_campaigns").update({ status: "deploying" }).eq("id", campaignId);

  const results = { uploaded: 0, skipped: 0, ads_created: 0, errors: [] as string[] };

  try {
    // ── Phase 1: Upload videos ──────────────────────────────────────────────
    for (const asset of assets) {
      if (asset.meta_video_id) {
        await log(campaignId, `upload_video:${asset.title}`, "skipped", { response: { meta_video_id: asset.meta_video_id } });
        results.skipped++;
        continue;
      }

      await log(campaignId, `upload_video:${asset.title}`, "started");
      try {
        const videoId = await uploadVideo(accountId, asset.file_path, asset.title);
        await supabase.from("geo_ad_video_assets").update({ meta_video_id: videoId, status: "uploaded" }).eq("id", asset.id);
        await log(campaignId, `upload_video:${asset.title}`, "success", { response: { meta_video_id: videoId } });
        asset.meta_video_id = videoId;
        results.uploaded++;
      } catch (err) {
        const msg = String(err);
        await log(campaignId, `upload_video:${asset.title}`, "failed", { error: msg });
        results.errors.push(`Upload failed for ${asset.title}: ${msg}`);
      }
    }

    // ── Phase 2: Create campaign on Meta ───────────────────────────────────
    let metaCampaignId = campaign.meta_campaign_id;
    if (!metaCampaignId) {
      await log(campaignId, "create_campaign", "started");
      const metaCampaign = await metaPost(`/${accountId}/campaigns`, {
        name: campaign.name,
        objective: campaign.objective,
        status: "PAUSED",
        special_ad_categories: [],
        is_adset_budget_sharing_enabled: false,
      });
      metaCampaignId = metaCampaign.id;
      await supabase.from("geo_ad_campaigns").update({ meta_campaign_id: metaCampaignId }).eq("id", campaignId);
      await log(campaignId, "create_campaign", "success", { response: { meta_campaign_id: metaCampaignId } });
    } else {
      await log(campaignId, "create_campaign", "skipped", { response: { meta_campaign_id: metaCampaignId } });
    }

    // ── Phase 3: Discover pixel ─────────────────────────────────────────────
    let pixelId = accountRow.pixel_id;
    if (!pixelId) {
      pixelId = await discoverPixel(accountId);
      if (pixelId) await supabase.from("geo_ad_account").update({ pixel_id: pixelId }).eq("id", accountRow.id);
    }
    await log(campaignId, "discover_pixel", pixelId ? "success" : "skipped", { response: { pixel_id: pixelId } });

    // ── Phase 4: Create ad set ──────────────────────────────────────────────
    let metaAdsetId = campaign.meta_adset_id;
    if (!metaAdsetId) {
      await log(campaignId, "create_adset", "started");

      const targeting: Record<string, unknown> = {
        age_min: campaign.targeting_age_min ?? 25,
        age_max: campaign.targeting_age_max ?? 65,
        targeting_automation: { advantage_audience: 1 },
      };

      const regions = campaign.targeting_regions as { key: string }[];
      if (regions && regions.length > 0) {
        targeting.geo_locations = { regions };
      } else {
        targeting.geo_locations = { countries: ["US", "CA"] };
      }

      const adsetBody: Record<string, unknown> = {
        name: `${campaign.name} — Ad Set`,
        campaign_id: metaCampaignId,
        daily_budget: campaign.budget_daily,
        billing_event: "IMPRESSIONS",
        optimization_goal: pixelId ? "LEAD_GENERATION" : "LINK_CLICKS",
        bid_strategy: "LOWEST_COST_WITHOUT_CAP",
        targeting,
        status: "PAUSED",
      };

      if (pixelId) {
        adsetBody.promoted_object = { pixel_id: pixelId, custom_event_type: "LEAD" };
      }

      const metaAdset = await metaPost(`/${accountId}/adsets`, adsetBody);
      metaAdsetId = metaAdset.id;
      await supabase.from("geo_ad_campaigns").update({ meta_adset_id: metaAdsetId }).eq("id", campaignId);
      await log(campaignId, "create_adset", "success", { response: { meta_adset_id: metaAdsetId } });
    } else {
      await log(campaignId, "create_adset", "skipped", { response: { meta_adset_id: metaAdsetId } });
    }

    // ── Phase 5: Create ads ─────────────────────────────────────────────────
    const utmBase = `utm_source=meta&utm_medium=paid_social&utm_campaign=${campaign.slug}`;

    for (const asset of assets) {
      if (!asset.meta_video_id) continue;
      if (asset.meta_ad_id) {
        await log(campaignId, `create_ad:${asset.title}`, "skipped", { response: { meta_ad_id: asset.meta_ad_id } });
        continue;
      }

      await log(campaignId, `create_ad:${asset.title}`, "started");
      try {
        const trackingUrl = `${campaign.landing_page}?${utmBase}&utm_content=${asset.utm_content ?? asset.title.toLowerCase().replace(/\s+/g, "-")}`;

        // Create ad creative
        const creative = await metaPost(`/${accountId}/adcreatives`, {
          name: `${asset.title} — Creative`,
          object_story_spec: {
            page_id: pageId,
            video_data: {
              video_id: asset.meta_video_id,
              message: asset.ad_copy_primary,
              call_to_action: {
                type: asset.cta_type ?? "LEARN_MORE",
                value: { link: trackingUrl },
              },
              title: asset.ad_copy_headline,
            },
          },
        });

        // Create ad
        const metaAd = await metaPost(`/${accountId}/ads`, {
          name: asset.title,
          adset_id: metaAdsetId,
          creative: { creative_id: creative.id },
          status: "PAUSED",
        });

        await supabase.from("geo_ad_video_assets").update({ meta_ad_id: metaAd.id, status: "live" }).eq("id", asset.id);
        await log(campaignId, `create_ad:${asset.title}`, "success", { response: { meta_ad_id: metaAd.id, creative_id: creative.id } });
        results.ads_created++;
      } catch (err) {
        const msg = String(err);
        await log(campaignId, `create_ad:${asset.title}`, "failed", { error: msg });
        results.errors.push(`Ad creation failed for ${asset.title}: ${msg}`);
      }
    }

    // ── Phase 6: Mark campaign status ──────────────────────────────────────
    const finalStatus = results.errors.length > 0 ? "error" : "live";
    const deployError = results.errors.length > 0 ? results.errors.join("; ") : null;
    await supabase.from("geo_ad_campaigns").update({ status: finalStatus, deploy_error: deployError }).eq("id", campaignId);

    return NextResponse.json({
      ok: true,
      campaign_id: campaignId,
      meta_campaign_id: metaCampaignId,
      meta_adset_id: metaAdsetId,
      ...results,
    });

  } catch (err) {
    const msg = String(err);
    await supabase.from("geo_ad_campaigns").update({ status: "error", deploy_error: msg }).eq("id", campaignId);
    await log(campaignId, "deploy", "failed", { error: msg });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
