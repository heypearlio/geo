import { NextRequest, NextResponse } from "next/server";
import { supabase, enqueueSequence, cancelQueuedEmails, suppressEmail } from "../../../../lib/resend";

function adminAuth(req: NextRequest) {
  const cookieAuth = req.cookies.get("admin_auth")?.value === (process.env.ADMIN_TOKEN ?? "geo-admin-authenticated");
  const keyAuth = req.headers.get("x-admin-key") === process.env.ADMIN_TOKEN;
  return cookieAuth || keyAuth;
}

// GET /api/admin/calls — list calls awaiting outcome selection
export async function GET(req: NextRequest) {
  if (!adminAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("geo_scheduled_calls")
    .select("id, email, first_name, meeting_time, outcome, created_at")
    .lt("meeting_time", new Date().toISOString())
    .order("meeting_time", { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ calls: data ?? [] });
}

// POST /api/admin/calls — set outcome for a call
export async function POST(req: NextRequest) {
  if (!adminAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { callId, email, firstName, outcome, packageNumber } = body as {
    callId: string;
    email: string;
    firstName?: string;
    outcome: "purchased" | "post_call" | "proof" | "no_show";
    packageNumber?: 1 | 2 | 3;
  };

  const PRICE_LABELS: Record<number, string> = { 1: "$1,500/mo", 2: "$2,500/mo", 3: "$3,500/mo" };
  const PRICE_INT: Record<number, number>    = { 1: 1500, 2: 2500, 3: 3500 };
  const STRIPE_LINKS: Record<number, string> = {
    1: "https://buy.stripe.com/00w8wQ7OkftIfsCdON5Ne0c",
    2: "https://buy.stripe.com/fZu7sMecIgxM1BMaCB5Ne0i",
    3: "https://buy.stripe.com/5kQ28s1pW0yO1BM6ml5Ne0q",
  };

  if (!callId || !email || !outcome) {
    return NextResponse.json({ error: "callId, email, and outcome required" }, { status: 400 });
  }

  // Cancel all pending sequences
  await cancelQueuedEmails(email);

  // Enroll in the correct sequence
  if (outcome === "purchased") {
    const pkg = packageNumber ?? 1;
    const enrollMeta = {
      stripe_link: STRIPE_LINKS[pkg],
      package: String(pkg),
      package_price: String(PRICE_INT[pkg]),
    };
    // Enqueue purchased_welcome BEFORE suppressing so isSuppressed check passes
    await enqueueSequence("purchased_welcome", email, firstName, enrollMeta);
    // Enqueue hot_proof follow-up sequence (cancelled automatically when Stripe payment received)
    await enqueueSequence("hot_proof", email, firstName, enrollMeta);
    // Suppress after enqueue — prevents any future nurture re-enrollment
    await suppressEmail(email, "client");
  } else if (outcome === "post_call") {
    const pkg = packageNumber ?? 1;
    const enrollMeta: Record<string, string> = packageNumber ? {
      stripe_link: STRIPE_LINKS[pkg],
      package: String(pkg),
      package_price: String(PRICE_INT[pkg]),
    } : {};
    await enqueueSequence("post_call", email, firstName, enrollMeta);
  } else if (outcome === "proof") {
    await enqueueSequence("proof", email, firstName);
  } else if (outcome === "no_show") {
    await enqueueSequence("no_show", email, firstName);
  }

  // Record outcome on the call record
  const callUpdate: Record<string, unknown> = { outcome, processed_at: new Date().toISOString() };
  if (packageNumber) {
    callUpdate.package_price = PRICE_INT[packageNumber];
  }
  await supabase
    .from("geo_scheduled_calls")
    .update(callUpdate)
    .eq("id", callId);

  return NextResponse.json({ ok: true, outcome, email });
}
