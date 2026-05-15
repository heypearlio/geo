import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../../lib/resend";

function adminAuth(req: NextRequest) {
  const cookieAuth = req.cookies.get("admin_auth")?.value === (process.env.ADMIN_TOKEN ?? "geo-admin-authenticated");
  const keyAuth = req.headers.get("x-admin-key") === process.env.ADMIN_TOKEN;
  return cookieAuth || keyAuth;
}

export async function GET(req: NextRequest) {
  if (!adminAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const search = req.nextUrl.searchParams.get("search") ?? "";
  const page = parseInt(req.nextUrl.searchParams.get("page") ?? "1", 10);
  const pageSize = 50;
  const offset = (page - 1) * pageSize;

  // Aggregate by email: all tags, latest name, latest submission, count
  let query = supabase
    .from("geo_local_submissions")
    .select("email, first_name, business_type, source_tag, created_at");

  if (search) {
    query = query.or(`email.ilike.%${search}%,first_name.ilike.%${search}%`);
  }

  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Deduplicate in memory: one entry per email with all tags aggregated
  const map = new Map<string, {
    email: string;
    first_name: string | null;
    business_type: string | null;
    tags: string[];
    submissions: number;
    first_at: string;
    last_at: string;
  }>();

  for (const row of data ?? []) {
    const existing = map.get(row.email);
    if (!existing) {
      map.set(row.email, {
        email: row.email,
        first_name: row.first_name,
        business_type: row.business_type,
        tags: [row.source_tag],
        submissions: 1,
        first_at: row.created_at,
        last_at: row.created_at,
      });
    } else {
      if (!existing.tags.includes(row.source_tag)) existing.tags.push(row.source_tag);
      existing.submissions += 1;
      if (row.created_at < existing.first_at) existing.first_at = row.created_at;
      if (row.created_at > existing.last_at) {
        existing.last_at = row.created_at;
        if (row.first_name) existing.first_name = row.first_name;
        if (row.business_type) existing.business_type = row.business_type;
      }
    }
  }

  // Sort by last_at desc, paginate
  const all = [...map.values()].sort((a, b) => b.last_at.localeCompare(a.last_at));
  const total = all.length;
  const leads = all.slice(offset, offset + pageSize);

  return NextResponse.json({ leads, total, page, pageSize });
}
