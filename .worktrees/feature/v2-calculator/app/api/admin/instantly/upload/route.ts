import { NextRequest, NextResponse } from "next/server";
import { buildImportTag } from "../../../../../lib/source";
import { HEYPEARL_SOCIALS, extractInstagramHandle } from "../../../../../lib/social-config";

function adminAuth(req: NextRequest) {
  const cookieAuth = req.cookies.get("admin_auth")?.value === (process.env.ADMIN_TOKEN ?? "geo-admin-authenticated");
  const keyAuth = req.headers.get("x-admin-key") === process.env.ADMIN_TOKEN;
  return cookieAuth || keyAuth;
}

interface ParsedCsv {
  leads: {
    email: string; first_name?: string; last_name?: string; phone?: string;
    company_name?: string; website?: string; city?: string; address?: string; linkedin?: string;
  }[];
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
  const leads = lines.slice(1).flatMap(line => {
    const cols = line.split(",").map(c => c.trim().replace(/"/g, ""));
    const email = (cols[emailIdx] ?? "").trim().toLowerCase();
    if (!email || !email.includes("@")) { skipped++; return []; }
    const first_name   = firstIdx    >= 0 ? cols[firstIdx]    || undefined : undefined;
    const city         = cityIdx     >= 0 ? cols[cityIdx]     || undefined : undefined;
    if (!first_name) missingFirstName++;
    if (!city)       missingCity++;
    return [{
      email, first_name,
      last_name:    lastIdx     >= 0 ? cols[lastIdx]     || undefined : undefined,
      phone:        phoneIdx    >= 0 ? cols[phoneIdx]    || undefined : undefined,
      company_name: companyIdx  >= 0 ? cols[companyIdx]  || undefined : undefined,
      website:      websiteIdx  >= 0 ? cols[websiteIdx]  || undefined : undefined,
      city,
      address:      addressIdx  >= 0 ? cols[addressIdx]  || undefined : undefined,
      linkedin:     linkedInIdx >= 0 ? cols[linkedInIdx] || undefined : undefined,
    }];
  });
  return { leads, skipped, missingFirstName, missingCity };
}

export async function POST(req: NextRequest) {
  if (!adminAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { csv, campaign_id, offer, campaign_name } = await req.json() as {
    csv?: string;
    campaign_id?: string;
    offer?: string;
    campaign_name?: string;
  };

  const import_tag = campaign_name ? buildImportTag(campaign_name) : `import_${offer ?? "unknown"}`;
  console.log(`[upload] import_tag=${import_tag} campaign=${campaign_id}`);

  if (!csv?.trim())      return NextResponse.json({ error: "No CSV provided" }, { status: 400 });
  if (!campaign_id)      return NextResponse.json({ error: "No campaign selected" }, { status: 400 });
  if (!offer)            return NextResponse.json({ error: "No offer selected" }, { status: 400 });

  const { leads, skipped, missingFirstName, missingCity } = parseCsv(csv);
  if (leads.length === 0) {
    return NextResponse.json({ error: "No valid leads found. Make sure your CSV has an 'email' column." }, { status: 400 });
  }

  const apiKey = process.env.INSTANTLY_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Instantly not configured" }, { status: 500 });

  const BATCH = 100;
  let pushed = 0, failed = 0;

  for (let i = 0; i < leads.length; i += BATCH) {
    const batch = leads.slice(i, i + BATCH).map(({ city, address, linkedin, ...lead }) => ({
      ...lead,
      // client_slug=super-admin routes replies back to the super admin view
      custom_variables: {
        client_slug: "super-admin",
        offer,
        sender_name:      "Misti",
        sender_email:     process.env.ADMIN_SENDER_EMAIL    ?? "misti@heypearl.io",
        sender_phone:     process.env.ADMIN_SENDER_PHONE    ?? "",
        sender_calendly:  process.env.NEXT_PUBLIC_GEO_CALENDLY_URL ?? "",
        sender_instagram: extractInstagramHandle(HEYPEARL_SOCIALS.instagram ?? ""),
        ...(city     ? { city }     : {}),
        ...(address  ? { address }  : {}),
        ...(linkedin ? { linkedIn: linkedin } : {}),
      },
    }));

    const res = await fetch("https://api.instantly.ai/api/v2/leads", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ campaign_id, leads: batch }),
    });

    if (res.ok) pushed += batch.length;
    else { console.error("Instantly admin upload error:", await res.text()); failed += batch.length; }
  }

  return NextResponse.json({ ok: true, pushed, failed, skipped, missingFirstName, missingCity, total: leads.length + skipped });
}
