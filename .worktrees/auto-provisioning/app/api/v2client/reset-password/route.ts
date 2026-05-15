import { NextResponse } from "next/server";

// Stub — email reset not yet implemented for V2 clients
export async function POST() {
  return NextResponse.json({ error: "Not yet implemented" }, { status: 400 });
}
