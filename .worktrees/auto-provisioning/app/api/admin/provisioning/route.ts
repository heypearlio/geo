// app/api/admin/provisioning/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../../lib/resend";
import { createProvisioningJob, ProvisioningInput } from "../../../../lib/provisioning";

function adminAuth(req: NextRequest) {
  const cookieAuth = req.cookies.get("admin_auth")?.value === (process.env.ADMIN_TOKEN ?? "geo-admin-authenticated");
  const keyAuth = req.headers.get("x-admin-key") === process.env.ADMIN_TOKEN;
  return cookieAuth || keyAuth;
}

export async function GET(req: NextRequest) {
  if (!adminAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("provisioning_jobs")
    .select("id,user_type,slug,first_name,last_name,email,status,db_done,dns_done,invite_done,error,error_count,created_at,completed_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ jobs: data ?? [] });
}

export async function POST(req: NextRequest) {
  if (!adminAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as ProvisioningInput;
  if (!body.user_type || !body.first_name || !body.email) {
    return NextResponse.json({ error: "user_type, first_name, email required" }, { status: 400 });
  }

  const id = await createProvisioningJob(body);
  return NextResponse.json({ id });
}
