import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("x-admin-key");
  if (auth !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.AUDITSKY_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Not configured" }, { status: 500 });

  // Try AuditSky list endpoint
  try {
    const res = await fetch("https://app.auditsky.ai/api/embed", {
      headers: {
        "x-api-key": apiKey,
        "Origin": "https://geo.heypearl.io",
      },
      cache: "no-store",
    });
    if (res.ok) {
      const data = await res.json();
      return NextResponse.json({ leads: data });
    }
    return NextResponse.json({ error: "AuditSky returned " + res.status, leads: [] });
  } catch (err) {
    return NextResponse.json({ error: String(err), leads: [] });
  }
}
