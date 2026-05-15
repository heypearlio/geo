import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const to = req.nextUrl.searchParams.get("to") ?? "/";
  return NextResponse.redirect(new URL(to, req.nextUrl.origin));
}
