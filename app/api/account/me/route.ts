import { NextRequest, NextResponse } from "next/server";
import { getAccountFromRequest } from "../../../../lib/account";

export async function GET(req: NextRequest) {
  const account = await getAccountFromRequest(req);
  if (!account) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  return NextResponse.json(account);
}
