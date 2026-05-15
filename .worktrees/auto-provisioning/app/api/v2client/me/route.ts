import { NextRequest, NextResponse } from "next/server";
import { getV2ClientFromRequest } from "../../../../lib/v2client";

export async function GET(req: NextRequest) {
  const client = await getV2ClientFromRequest(req);
  if (!client) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  return NextResponse.json({
    slug: client.slug,
    name: client.name,
    calendlyUrl: client.calendly_url ?? null,
  });
}
