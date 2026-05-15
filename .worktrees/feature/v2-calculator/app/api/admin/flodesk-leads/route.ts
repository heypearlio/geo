import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("x-admin-key");
  if (auth !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.FLODESK_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "FLODESK_API_KEY not set" }, { status: 500 });

  const credentials = Buffer.from(`${apiKey}:`).toString("base64");
  const allSubscribers: { email: string; first_name?: string; status: string }[] = [];

  let page = 1;
  let lastPage = 1;

  try {
    do {
      const res = await fetch(`https://api.flodesk.com/v1/subscribers?per_page=100&page=${page}`, {
        headers: {
          "Authorization": `Basic ${credentials}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      });

      if (!res.ok) {
        const err = await res.text();
        return NextResponse.json({ error: `Flodesk API error: ${res.status} ${err}` }, { status: 500 });
      }

      const data = await res.json();
      const subscribers = data.data ?? [];
      lastPage = data.meta?.last_page ?? 1;

      for (const s of subscribers) {
        // Only import active/subscribed contacts
        if (s.status === "active" || s.status === "subscribed") {
          allSubscribers.push({
            email: s.email,
            first_name: s.first_name ?? undefined,
            status: s.status,
          });
        }
      }

      page++;
    } while (page <= lastPage);

    return NextResponse.json({ subscribers: allSubscribers, total: allSubscribers.length });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
