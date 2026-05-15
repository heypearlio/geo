import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { resend } from "../../../lib/resend";

const FORWARD_TO = "misti@heypearl.io";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();

    const secret = process.env.RESEND_INBOUND_WEBHOOK_SECRET;
    if (secret) {
      const signature = req.headers.get("svix-signature") ?? "";
      const msgId = req.headers.get("svix-id") ?? "";
      const msgTimestamp = req.headers.get("svix-timestamp") ?? "";
      const toSign = `${msgId}.${msgTimestamp}.${rawBody}`;
      const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
      const computed = createHmac("sha256", key).update(toSign).digest("base64");
      const passedSigs = signature.split(" ").map(s => s.replace(/^v1,/, ""));
      if (!passedSigs.includes(computed)) {
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
    }

    const body = JSON.parse(rawBody);

    if (body.type !== "email.received") {
      return NextResponse.json({ ok: true });
    }

    const { from, subject, text, html } = body.data ?? {};

    await resend.emails.send({
      from: process.env.EMAIL_FROM ?? "GEO Inbound <misti@geo.heypearl.io>",
      to: FORWARD_TO,
      subject: `Reply: ${subject ?? "(no subject)"}`,
      replyTo: from,
      html: html ?? `<p>${text ?? "(no content)"}</p>`,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("email-inbound error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
