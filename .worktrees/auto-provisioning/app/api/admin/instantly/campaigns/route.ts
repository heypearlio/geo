import { NextRequest, NextResponse } from "next/server";

function adminAuth(req: NextRequest) {
  const cookieAuth = req.cookies.get("admin_auth")?.value === (process.env.ADMIN_TOKEN ?? "geo-admin-authenticated");
  const keyAuth = req.headers.get("x-admin-key") === process.env.ADMIN_TOKEN;
  return cookieAuth || keyAuth;
}

const OFFER_PREFIXES: Record<string, string> = {
  v2:        "v2",
  geo:       "geo",
  affiliate: "aff",
};

export async function GET(req: NextRequest) {
  if (!adminAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const offer = req.nextUrl.searchParams.get("offer") ?? "";
  const apiKey = process.env.INSTANTLY_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Instantly not configured" }, { status: 500 });

  const res = await fetch("https://api.instantly.ai/api/v2/campaigns?limit=100", {
    headers: { "Authorization": `Bearer ${apiKey}` },
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("Instantly campaigns fetch error:", err);
    return NextResponse.json({ error: "Failed to fetch campaigns from Instantly" }, { status: 500 });
  }

  const data = await res.json();
  let campaigns: { id: string; name: string; status: string }[] = (data.items ?? data.campaigns ?? []).map((c: Record<string, unknown>) => ({
    id:     c.id as string,
    name:   c.name as string,
    status: (c.status as string) ?? "active",
  }));

  // Filter by offer prefix if specified (e.g. "v2-", "geo-", "aff-")
  if (offer && OFFER_PREFIXES[offer]) {
    const prefix = OFFER_PREFIXES[offer].toLowerCase();
    campaigns = campaigns.filter(c => c.name.toLowerCase().startsWith(prefix));
  }

  return NextResponse.json({ campaigns });
}
