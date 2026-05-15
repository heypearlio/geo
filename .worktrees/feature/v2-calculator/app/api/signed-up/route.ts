import { NextRequest, NextResponse } from "next/server";

// Alias for /api/client — kept for backwards compatibility with any external triggers.
export async function POST(req: NextRequest) {
  const body = await req.json();
  const response = await fetch(new URL("/api/client", req.url), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return NextResponse.json(await response.json());
}
