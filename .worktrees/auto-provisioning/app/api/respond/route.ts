import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../lib/resend";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const email  = searchParams.get("e");
  const seq    = searchParams.get("seq");
  const step   = searchParams.get("step");
  const answer = searchParams.get("a");

  if (email && seq && step && answer) {
    try {
      await supabase.from("geo_responses").insert({
        email: decodeURIComponent(email),
        sequence: seq,
        step: parseInt(step),
        answer,
      });
    } catch { /* non-fatal */ }
  }

  // Redirect to a simple confirmation page
  const url = req.nextUrl.clone();
  url.pathname = "/r";
  url.search = `?a=${encodeURIComponent(answer ?? "")}`;
  return NextResponse.redirect(url);
}
