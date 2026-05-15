import { NextRequest, NextResponse } from "next/server";
import { getV2AccessFromRequest } from "../../../../lib/v2client";
import { supabase } from "../../../../lib/resend";

export async function POST(req: NextRequest) {
  const client = await getV2AccessFromRequest(req);
  if (!client) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { email, status, name, phone } = await req.json() as {
    email?: string;
    status?: string;
    name?: string;
    phone?: string;
  };

  if (!email || !status) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const validStatuses = ["active", "met", "no_show", "client", "unsubscribed"];
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const { error } = await supabase
    .from("cashoffer_lead_status")
    .upsert(
      { client_id: client.id, email, status, name: name ?? null, phone: phone ?? null },
      { onConflict: "client_id,email" }
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
