import { NextRequest, NextResponse } from "next/server";
import { getAccountFromRequest } from "../../../../lib/account";
import { supabase } from "../../../../lib/resend";

export async function PATCH(req: NextRequest) {
  const account = await getAccountFromRequest(req);
  if (!account) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await req.json() as {
    first_name?: string;
    last_name?: string;
    phone?: string;
    headshot_url?: string;
  };

  const update: Record<string, string> = {};
  if (body.first_name !== undefined) update.first_name = body.first_name.trim();
  if (body.last_name  !== undefined) update.last_name  = body.last_name.trim();
  if (body.phone      !== undefined) update.phone      = body.phone.trim();
  if (body.headshot_url !== undefined) update.headshot_url = body.headshot_url;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("accounts")
    .update(update)
    .eq("id", account.id)
    .select("id, email, first_name, last_name, phone, headshot_url")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
