import { NextRequest, NextResponse } from "next/server";
import { getAffiliateFromRequest } from "../../../../lib/affiliate";
import { supabase, tagLead } from "../../../../lib/resend";

// POST — manually add a single lead to this affiliate's dashboard
export async function POST(req: NextRequest) {
  const affiliate = await getAffiliateFromRequest(req);
  if (!affiliate) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as { email?: string; first_name?: string; phone?: string };
  const email      = body.email?.trim().toLowerCase() ?? "";
  const firstName  = body.first_name?.trim() ?? "";
  const phone      = body.phone?.trim() ?? "";

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
  }

  // Tag the lead — this is all that's needed for them to appear in /leads
  await tagLead(email, affiliate.tag);

  // Store name + phone in local_lead_status so they show up in the enriched lead list
  if (firstName || phone) {
    await supabase.from("local_lead_status").upsert(
      { affiliate_id: affiliate.id, email, first_name: firstName || null, phone: phone || null, status: "active" },
      { onConflict: "affiliate_id,email" }
    );
  }

  return NextResponse.json({ ok: true });
}

export async function GET(req: NextRequest) {
  const affiliate = await getAffiliateFromRequest(req);
  if (!affiliate) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = req.nextUrl;
  const search = url.searchParams.get("search") ?? "";
  const page = parseInt(url.searchParams.get("page") ?? "1", 10);
  const statusFilter = url.searchParams.get("status") ?? "";
  const sortCol = url.searchParams.get("sort_col") ?? "created_at";
  const sortDir = url.searchParams.get("sort_dir") ?? "desc";
  const ascending = sortDir === "asc";
  const pageSize = 50;
  const offset = (page - 1) * pageSize;

  // Only these columns exist on geo_lead_tags and can be sorted server-side.
  // first_name, business_type, status come from enrichment queries — they sort within-page only.
  const dbSortCol = ["created_at", "email"].includes(sortCol) ? sortCol : "created_at";

  // geo_lead_tags is the universal source for ALL offers (geo, v2, local, etc.)
  let query = supabase
    .from("geo_lead_tags")
    .select("id, email, created_at", { count: "exact" })
    .eq("tag", affiliate.tag)
    .order(dbSortCol, { ascending })
    .range(offset, offset + pageSize - 1);

  if (search) {
    query = query.ilike("email", `%${search}%`);
  }

  const { data: taggedLeads, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const emails = (taggedLeads ?? []).map(r => r.email);
  if (emails.length === 0) {
    return NextResponse.json({ leads: [], total: count ?? 0, page, pageSize });
  }

  // Enrich: pull name, business type, and status in parallel
  const [{ data: nameRows }, { data: localRows }, { data: statusRows }] = await Promise.all([
    // first_name from email queue — one per email, first non-null found
    supabase
      .from("geo_email_queue")
      .select("email, first_name")
      .in("email", emails)
      .not("first_name", "is", null),

    // business_type from local submissions — only exists for local offer leads
    supabase
      .from("geo_local_submissions")
      .select("email, business_type")
      .in("email", emails),

    // manual status overrides (met, no_show, client, etc.) — affiliate-specific
    supabase
      .from("local_lead_status")
      .select("email, status, first_name, phone")
      .eq("affiliate_id", affiliate.id)
      .in("email", emails),
  ]);

  // Build lookup maps
  const nameMap = new Map<string, string>();
  for (const r of nameRows ?? []) {
    if (!nameMap.has(r.email) && r.first_name) nameMap.set(r.email, r.first_name);
  }
  const localMap = new Map((localRows ?? []).map(r => [r.email, r.business_type as string | null]));
  const statusMap = new Map((statusRows ?? []).map(r => [r.email, r]));

  let leads = (taggedLeads ?? []).map(r => {
    const s = statusMap.get(r.email);
    return {
      id: r.id,
      email: r.email,
      created_at: r.created_at,
      first_name: s?.first_name ?? nameMap.get(r.email) ?? null,
      business_type: localMap.get(r.email) ?? null,
      phone: s?.phone ?? null,
      status: s?.status ?? "active",
    };
  });

  // Apply status filter after enrichment (status lives in enrichment layer, not geo_lead_tags)
  if (statusFilter) {
    leads = leads.filter(l => l.status === statusFilter);
  }

  return NextResponse.json({ leads, total: count ?? 0, page, pageSize });
}
