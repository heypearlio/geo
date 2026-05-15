// app/api/admin/provisioning/[id]/retry/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../../../../lib/resend";

function adminAuth(req: NextRequest) {
  const cookieAuth = req.cookies.get("admin_auth")?.value === (process.env.ADMIN_TOKEN ?? "geo-admin-authenticated");
  const keyAuth = req.headers.get("x-admin-key") === process.env.ADMIN_TOKEN;
  return cookieAuth || keyAuth;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!adminAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { error } = await supabase
    .from("provisioning_jobs")
    .update({ status: "pending", error: null, error_count: 0 })
    .eq("id", id)
    .eq("status", "failed"); // Only retry failed jobs

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
