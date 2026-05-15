import { NextRequest, NextResponse } from "next/server";
import { getV2ClientFromRequest } from "../../../../lib/v2client";

// Returns Instantly campaigns prefixed with "v2-" for v2 clients to pick from
export async function GET(req: NextRequest) {
  const client = await getV2ClientFromRequest(req);
  if (!client) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const apiKey = process.env.INSTANTLY_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Instantly not configured" }, { status: 500 });

  const res = await fetch("https://api.instantly.ai/api/v2/campaigns?limit=100", {
    headers: { "Authorization": `Bearer ${apiKey}` },
  });

  if (!res.ok) return NextResponse.json({ error: "Failed to fetch campaigns" }, { status: 500 });

  const data = await res.json();
  const campaigns = (data.items ?? data.campaigns ?? [])
    .map((c: Record<string, unknown>) => ({ id: c.id, name: c.name, status: c.status ?? "active" }))
    .filter((c: { name: string }) => c.name.toLowerCase().startsWith("v2"));

  return NextResponse.json({ campaigns });
}
