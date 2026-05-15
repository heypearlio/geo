import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const auditId = req.nextUrl.searchParams.get("id");
  if (!auditId) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const apiKey = process.env.AUDITSKY_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  const res = await fetch(
    `https://app.auditsky.ai/api/embed/status/${auditId}`,
    {
      headers: {
        "x-api-key": apiKey,
        "Origin": "https://geo.heypearl.io",
      },
      cache: "no-store",
    }
  );

  if (!res.ok) {
    return NextResponse.json({ status: "FAILED" });
  }

  const data = await res.json();
  return NextResponse.json(data);
}
