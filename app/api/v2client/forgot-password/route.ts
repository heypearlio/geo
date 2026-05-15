import { NextResponse } from "next/server";

// Stub — email reset not yet implemented for V2 clients
export async function POST() {
  return NextResponse.json({ success: true });
}
