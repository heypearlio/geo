import { NextRequest, NextResponse } from "next/server";
import { getV2AccessFromRequest } from "../../../../lib/v2client";

export async function GET(req: NextRequest) {
  const client = await getV2AccessFromRequest(req);
  if (!client) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  return NextResponse.json({
    slug: client.slug,
    name: client.name,
    calendlyUrl: client.calendly_url ?? null,
    isAffiliate: client.is_affiliate ?? false,
  });
}
