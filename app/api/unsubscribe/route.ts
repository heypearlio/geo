import { NextRequest, NextResponse } from "next/server";
import { suppressEmail } from "../../../lib/resend";

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: "No email" }, { status: 400 });

  try {
    await suppressEmail(email, "unsubscribed");
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Unsubscribe error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
