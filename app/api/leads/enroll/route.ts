import { NextRequest, NextResponse } from "next/server";
import { getAffiliateFromRequest } from "../../../../lib/affiliate";
import { getV2AccessFromRequest } from "../../../../lib/v2client";
import { enqueueSequence } from "../../../../lib/resend";
import { SEQUENCES, SequenceKey } from "../../../../lib/sequences";

const VALID_SEQUENCES = new Set(SEQUENCES.map(s => s.key));

export async function POST(req: NextRequest) {
  const affiliate = await getAffiliateFromRequest(req);
  const client = affiliate ? null : await getV2AccessFromRequest(req);

  if (!affiliate && !client) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { emails, sequence } = await req.json() as { emails?: unknown; sequence?: unknown };

  if (!Array.isArray(emails) || emails.length === 0) {
    return NextResponse.json({ error: "No emails provided" }, { status: 400 });
  }
  if (typeof sequence !== "string" || !VALID_SEQUENCES.has(sequence as SequenceKey)) {
    return NextResponse.json({ error: "Invalid sequence" }, { status: 400 });
  }

  let enrolled = 0;
  for (const rawEmail of emails) {
    if (typeof rawEmail !== "string") continue;
    const email = rawEmail.trim().toLowerCase();
    if (!email || !email.includes("@")) continue;
    await enqueueSequence(sequence as SequenceKey, email);
    enrolled++;
  }

  return NextResponse.json({ ok: true, enrolled });
}
