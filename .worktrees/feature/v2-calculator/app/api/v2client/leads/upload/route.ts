import { NextRequest, NextResponse } from "next/server";
import { getV2ClientFromRequest } from "../../../../../lib/v2client";

// Parses a CSV string into an array of lead objects.
// Required column: email. Optional: first_name, last_name, phone, company.
interface ParsedCsv {
  leads: { email: string; first_name?: string; last_name?: string; phone?: string; company?: string; website?: string; city?: string; address?: string; linkedin?: string }[];
  skipped: number;
  missingFirstName: number;
  missingCity: number;
}

function parseCsv(csv: string): ParsedCsv {
  const lines = csv.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return { leads: [], skipped: 0, missingFirstName: 0, missingCity: 0 };

  const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/"/g, "").replace(/\s+/g, "_"));
  const emailIdx    = headers.indexOf("email");
  const firstIdx    = headers.findIndex(h => h === "first_name" || h === "firstname");
  const lastIdx     = headers.findIndex(h => h === "last_name"  || h === "lastname");
  const phoneIdx    = headers.indexOf("phone");
  const companyIdx  = headers.findIndex(h => h === "company" || h === "company_name");
  const websiteIdx  = headers.indexOf("website");
  const cityIdx     = headers.findIndex(h => h === "city");
  const addressIdx  = headers.indexOf("address");
  const linkedInIdx = headers.findIndex(h => h === "linkedin" || h === "linked_in");

  if (emailIdx === -1) return { leads: [], skipped: lines.length - 1, missingFirstName: 0, missingCity: 0 };

  let skipped = 0, missingFirstName = 0, missingCity = 0;
  const leads: ParsedCsv["leads"] = [];

  for (const line of lines.slice(1)) {
    const cols = line.split(",").map(c => c.trim().replace(/"/g, ""));
    const email = (cols[emailIdx] ?? "").trim().toLowerCase();
    if (!email || !email.includes("@")) { skipped++; continue; }
    const first_name = firstIdx >= 0 ? (cols[firstIdx] ?? "").trim() || undefined : undefined;
    const city       = cityIdx  >= 0 ? (cols[cityIdx]  ?? "").trim() || undefined : undefined;
    if (!first_name) missingFirstName++;
    if (!city)       missingCity++;
    leads.push({
      email, first_name,
      last_name:  lastIdx     >= 0 ? (cols[lastIdx]     ?? "").trim() || undefined : undefined,
      phone:      phoneIdx    >= 0 ? (cols[phoneIdx]    ?? "").trim() || undefined : undefined,
      company:    companyIdx  >= 0 ? (cols[companyIdx]  ?? "").trim() || undefined : undefined,
      website:    websiteIdx  >= 0 ? (cols[websiteIdx]  ?? "").trim() || undefined : undefined,
      city,
      address:    addressIdx  >= 0 ? (cols[addressIdx]  ?? "").trim() || undefined : undefined,
      linkedin:   linkedInIdx >= 0 ? (cols[linkedInIdx] ?? "").trim() || undefined : undefined,
    });
  }

  return { leads, skipped, missingFirstName, missingCity };
}

export async function POST(req: NextRequest) {
  const client = await getV2ClientFromRequest(req);
  if (!client) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { csv, campaign_id } = await req.json() as { csv?: string; campaign_id?: string };
  if (!csv?.trim()) return NextResponse.json({ error: "No CSV provided" }, { status: 400 });
  if (!campaign_id) return NextResponse.json({ error: "No campaign selected" }, { status: 400 });

  const { leads, skipped, missingFirstName, missingCity } = parseCsv(csv);
  if (leads.length === 0) {
    return NextResponse.json({ error: "No valid leads found. Make sure your CSV has an 'email' column header." }, { status: 400 });
  }

  const apiKey = process.env.INSTANTLY_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Instantly not configured" }, { status: 500 });

  // Batch into groups of 100 (Instantly limit per request)
  const BATCH = 100;
  let pushed = 0;
  let failed = 0;

  for (let i = 0; i < leads.length; i += BATCH) {
    const batch = leads.slice(i, i + BATCH).map(lead => ({
      email:        lead.email,
      first_name:   lead.first_name ?? "",
      last_name:    lead.last_name  ?? "",
      phone:        lead.phone      ?? "",
      company_name: lead.company    ?? "",
      website:      lead.website    ?? "",
      // Custom variables — used by webhook to route replies to the right client
      custom_variables: {
        client_slug:     client.slug,
        offer:           "v2",
        sender_name:     client.name,
        sender_calendly: client.calendly_url ?? "",
        ...(lead.city     ? { city:    lead.city }              : {}),
        ...(lead.address  ? { address: lead.address }           : {}),
        ...(lead.linkedin ? { linkedIn: lead.linkedin }         : {}),
      },
    }));

    const res = await fetch("https://api.instantly.ai/api/v2/leads", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ campaign_id, leads: batch }),
    });

    if (res.ok) {
      pushed += batch.length;
    } else {
      const err = await res.text();
      console.error(`Instantly upload batch error: ${err}`);
      failed += batch.length;
    }
  }

  return NextResponse.json({ ok: true, pushed, failed, skipped, missingFirstName, missingCity, total: leads.length + skipped });
}
