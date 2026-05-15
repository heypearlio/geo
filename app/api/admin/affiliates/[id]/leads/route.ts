import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../../../../lib/resend";

function adminAuth(req: NextRequest) {
  const cookieAuth = req.cookies.get("admin_auth")?.value === (process.env.ADMIN_TOKEN ?? "geo-admin-authenticated");
  const keyAuth = req.headers.get("x-admin-key") === process.env.ADMIN_TOKEN;
  return cookieAuth || keyAuth;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!adminAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const search = req.nextUrl.searchParams.get("search") ?? "";
  const page = parseInt(req.nextUrl.searchParams.get("page") ?? "1", 10);
  const pageSize = 50;
  const offset = (page - 1) * pageSize;

  const { data: affiliate } = await supabase
    .from("affiliates")
    .select("tag")
    .eq("id", id)
    .maybeSingle();

  if (!affiliate) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // geo_lead_tags is universal source for ALL offers (geo, v2, local, etc.)
  let query = supabase
    .from("geo_lead_tags")
    .select("id, email, created_at", { count: "exact" })
    .eq("tag", affiliate.tag)
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (search) query = query.ilike("email", `%${search}%`);

  const { data: taggedLeads, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const emails = (taggedLeads ?? []).map(r => r.email);
  if (emails.length === 0) {
    return NextResponse.json({ leads: [], total: count ?? 0 });
  }

  // Enrich: name, business_type, status
  const [{ data: nameRows }, { data: localRows }, { data: statuses }] = await Promise.all([
    supabase
      .from("geo_email_queue")
      .select("email, first_name")
      .in("email", emails)
      .not("first_name", "is", null),
    supabase
      .from("geo_local_submissions")
      .select("email, business_type")
      .in("email", emails),
    supabase
      .from("local_lead_status")
      .select("email, status, first_name, phone")
      .eq("affiliate_id", id)
      .in("email", emails),
  ]);

  const nameMap = new Map<string, string>();
  for (const r of nameRows ?? []) {
    if (!nameMap.has(r.email) && r.first_name) nameMap.set(r.email, r.first_name);
  }
  const localMap = new Map((localRows ?? []).map(r => [r.email, r.business_type as string | null]));
  const statusMap = new Map((statuses ?? []).map(s => [s.email, s]));

  const leads = (taggedLeads ?? []).map(r => {
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

  return NextResponse.json({ leads, total: count ?? 0 });
}
