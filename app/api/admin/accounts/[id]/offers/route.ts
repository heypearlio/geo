import { NextRequest, NextResponse } from "next/server";
import { grantOffer, revokeOffer } from "../../../../../../lib/account";

function adminAuth(req: NextRequest): boolean {
  const cookieAuth = req.cookies.get("admin_auth")?.value === (process.env.ADMIN_TOKEN ?? "geo-admin-authenticated");
  const keyAuth = req.headers.get("x-admin-key") === process.env.ADMIN_TOKEN;
  return cookieAuth || keyAuth;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!adminAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json() as { offer?: string; slug?: string; meta?: Record<string, unknown> };
  if (!body.offer) return NextResponse.json({ error: "offer required" }, { status: 400 });

  const result = await grantOffer(id, body.offer, body.slug, body.meta);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!adminAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json() as { offer?: string };
  if (!body.offer) return NextResponse.json({ error: "offer required" }, { status: 400 });

  const result = await revokeOffer(id, body.offer);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 500 });
  return NextResponse.json({ ok: true });
}
