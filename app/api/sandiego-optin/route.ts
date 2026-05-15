import { NextRequest, NextResponse } from "next/server";

const SANDIEGO_SEGMENT_ID = "69fcbe995508035983809e94";

const CORS = { "Access-Control-Allow-Origin": "*" };

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      ...CORS,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

export async function POST(req: NextRequest) {
  const { name, email } = (await req.json()) as { name?: string; email?: string };

  if (!email) {
    return NextResponse.json({ error: "Email required" }, { status: 400, headers: CORS });
  }

  const apiKey = process.env.FLODESK_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "FLODESK_API_KEY not set" }, { status: 500, headers: CORS });
  }

  const nameParts = (name ?? "").trim().split(/\s+/);
  const firstName = nameParts[0] ?? "";
  const lastName = nameParts.slice(1).join(" ");

  const credentials = Buffer.from(`${apiKey}:`).toString("base64");
  const authHeader = `Basic ${credentials}`;
  const cleanEmail = email.trim().toLowerCase();

  // Step 1: upsert subscriber — response includes the subscriber's DB id
  const subBody: Record<string, unknown> = { email: cleanEmail };
  if (firstName) subBody.first_name = firstName;
  if (lastName) subBody.last_name = lastName;

  const subRes = await fetch("https://api.flodesk.com/v1/subscribers", {
    method: "POST",
    headers: { Authorization: authHeader, "Content-Type": "application/json" },
    body: JSON.stringify(subBody),
  });

  if (!subRes.ok) {
    const err = await subRes.text();
    return NextResponse.json(
      { error: `Flodesk subscriber error: ${subRes.status} ${err}` },
      { status: 500, headers: CORS }
    );
  }

  const subscriber = (await subRes.json()) as { id?: string };
  const subscriberId = subscriber.id;

  if (!subscriberId) {
    return NextResponse.json(
      { error: "Flodesk returned no subscriber id" },
      { status: 500, headers: CORS }
    );
  }

  // Step 2: add to segment using the subscriber's DB id
  const segRes = await fetch(
    `https://api.flodesk.com/v1/subscribers/${subscriberId}/segments`,
    {
      method: "POST",
      headers: { Authorization: authHeader, "Content-Type": "application/json" },
      body: JSON.stringify({ segment_ids: [SANDIEGO_SEGMENT_ID] }),
    }
  );

  if (!segRes.ok) {
    const err = await segRes.text();
    return NextResponse.json(
      { error: `Flodesk segment error: ${segRes.status} ${err}` },
      { status: 500, headers: CORS }
    );
  }

  return NextResponse.json({ success: true }, { headers: CORS });
}
