import { NextRequest, NextResponse } from "next/server";
import { loginAccount } from "../../../../lib/account";

export async function POST(req: NextRequest) {
  const body = await req.json() as { email?: string; password?: string };
  const { email, password } = body;

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });
  }

  const result = await loginAccount(email, password);
  if (!result) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true, offers: result.account.offers });
  res.cookies.set("pearlos_auth", `${result.account.id}:${result.sessionToken}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    domain: ".pearlos.ai",
  });
  return res;
}
