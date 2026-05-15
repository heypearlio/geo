import { NextRequest, NextResponse } from "next/server";
import { supabase, resend, pickFrom } from "../../../lib/resend";
import { buildLeadSource } from "../../../lib/source";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { firstName, email, phone, city, yearsInRE } = body as {
    firstName?: string;
    email?: string;
    phone?: string;
    city?: string;
    yearsInRE?: string;
  };

  if (!email) {
    return NextResponse.json({ error: "Email required" }, { status: 400 });
  }

  const { source_url } = buildLeadSource(req, null);

  await supabase.from("challenge_registrations").insert({
    first_name: firstName ?? null,
    email: email.toLowerCase().trim(),
    phone: phone ?? null,
    city: city ?? null,
    years_in_re: yearsInRE ?? null,
    source_url,
  });

  const name = firstName ? `, ${firstName}` : "";
  await resend.emails.send({
    from: pickFrom(email),
    to: email,
    subject: `You're in${name}. Watch your inbox.`,
    text: [
      `${firstName ? `${firstName},` : "Hey,"}`,
      "",
      "You grabbed one of the last spots for the AI Agent Takeover.",
      "",
      "I'll be in touch very soon with everything you need — dates, access, and what to expect each day.",
      "",
      "One thing: we only let one agent per city into this training. If yours is still open, you're already ahead of every other agent in your market who's waiting to see what happens.",
      "",
      "Don't wait. Your city is claimed.",
      "",
      "Talk soon,",
      "Misti",
      "",
      "---",
      "Misti Bruton | AI Marketing For Realtors",
      "geo.heypearl.io",
    ].join("\n"),
  });

  return NextResponse.json({ success: true });
}
