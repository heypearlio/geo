import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../../lib/resend";

function isAuthed(req: NextRequest) {
  return req.cookies.get("admin_auth")?.value === (process.env.ADMIN_TOKEN ?? "geo-admin-authenticated");
}

// Core funnel tags that always appear regardless of whether any lead has used them
const CORE_TAGS = ["audit", "claim", "v2", "affiliate_application", "manual", "import"];

// Returns all tags for the filter dropdown:
//   1. Core funnel tags (always shown)
//   2. Any funnel_tag from geo_offers (auto-expands when new offer is created)
//   3. Any tags actually present in geo_lead_tags that aren't already covered
export async function GET(req: NextRequest) {
  if (!isAuthed(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [{ data: offerRows }, { data: tagRows }] = await Promise.all([
    supabase.from("geo_offers").select("funnel_tag").not("funnel_tag", "is", null),
    supabase.from("geo_lead_tags").select("tag"),
  ]);

  const offerTags = (offerRows ?? []).map((r: { funnel_tag: string }) => r.funnel_tag).filter(Boolean);
  const existingTags = [...new Set((tagRows ?? []).map((r: { tag: string }) => r.tag))];

  const all = [...new Set([...CORE_TAGS, ...offerTags, ...existingTags])].sort();

  return NextResponse.json({ tags: all });
}
