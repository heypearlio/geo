import { NextRequest, NextResponse } from "next/server";
import { getV2ClientFromRequest } from "../../../../lib/v2client";
import { supabase } from "../../../../lib/resend";

// POST — manually add a single warm lead directly to this client's leads
export async function POST(req: NextRequest) {
  const client = await getV2ClientFromRequest(req);
  if (!client) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as { name?: string; email?: string; phone?: string; address?: string };
  const name    = body.name?.trim()    || null;
  const email   = body.email?.trim().toLowerCase() || null;
  const phone   = body.phone?.trim()   || null;
  const address = body.address?.trim() || null;

  if (!name && !email && !phone && !address) {
    return NextResponse.json({ error: "At least one field is required" }, { status: 400 });
  }

  // Dedup by email if provided
  if (email) {
    const { data: existing } = await supabase
      .from("cashoffer_leads")
      .select("id")
      .eq("email", email)
      .eq("slug", client.slug)
      .maybeSingle();
    if (existing) return NextResponse.json({ error: "A lead with this email already exists" }, { status: 409 });
  }

  const { error } = await supabase
    .from("cashoffer_leads")
    .insert({ name, email, phone, address: address ?? "(manually added)", slug: client.slug });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

export async function GET(req: NextRequest) {
  const client = await getV2ClientFromRequest(req);
  if (!client) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = req.nextUrl;
  const search = url.searchParams.get("search") ?? "";
  const page = parseInt(url.searchParams.get("page") ?? "1", 10);
  const statusFilter = url.searchParams.get("status") ?? "";
  const sortCol = url.searchParams.get("sort_col") ?? "created_at";
  const sortDir = url.searchParams.get("sort_dir") ?? "desc";
  const ascending = sortDir === "asc";
  const pageSize = 50;
  const offset = (page - 1) * pageSize;

  const validCols = ["created_at", "name", "email", "address"];
  const col = validCols.includes(sortCol) ? sortCol : "created_at";

  let query = supabase
    .from("cashoffer_leads")
    .select("id, email, name, phone, address, created_at", { count: "exact" })
    .eq("slug", client.slug)
    .order(col, { ascending })
    .range(offset, offset + pageSize - 1);

  if (search) {
    query = query.or(`email.ilike.%${search}%,name.ilike.%${search}%,address.ilike.%${search}%`);
  }

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const emails = (data ?? []).map(r => r.email).filter(Boolean);

  const { data: statuses } = emails.length > 0
    ? await supabase
        .from("cashoffer_lead_status")
        .select("email, status, name, phone")
        .eq("client_id", client.id)
        .in("email", emails)
    : { data: [] };

  const statusMap = new Map((statuses ?? []).map(s => [s.email, s]));

  let leads = (data ?? []).map(lead => {
    const s = lead.email ? statusMap.get(lead.email) : undefined;
    return {
      ...lead,
      name: s?.name ?? lead.name,
      phone: s?.phone ?? lead.phone,
      status: s?.status ?? "active",
    };
  });

  if (statusFilter) {
    leads = leads.filter(l => l.status === statusFilter);
  }

  return NextResponse.json({ leads, total: count ?? 0, page, pageSize });
}
