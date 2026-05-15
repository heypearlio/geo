import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { supabase, cancelQueuedEmails } from "../../../lib/resend";
import { createProvisioningJob } from "../../../lib/provisioning";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", { apiVersion: "2026-03-25.dahlia" });

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !secret) {
    return NextResponse.json({ error: "Missing signature or secret" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const body = await req.text();
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed" || event.type === "payment_intent.succeeded") {
    let email: string | null = null;

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      email = session.customer_details?.email ?? session.customer_email ?? null;
    } else {
      const intent = event.data.object as Stripe.PaymentIntent;
      if (intent.receipt_email) {
        email = intent.receipt_email;
      } else if (intent.customer) {
        // Look up customer email from Stripe
        try {
          const customer = await stripe.customers.retrieve(String(intent.customer));
          if (!("deleted" in customer)) email = customer.email ?? null;
        } catch { /* non-fatal */ }
      }
    }

    if (email) {
      const now = new Date().toISOString();

      // Mark the call as paid
      await supabase
        .from("geo_scheduled_calls")
        .update({ paid_at: now })
        .eq("email", email.toLowerCase())
        .is("paid_at", null);

      // Cancel all pending hot_proof emails — they've paid, no more follow-ups needed
      await cancelQueuedEmails(email.toLowerCase(), ["hot_proof"]);

      console.log(`Payment confirmed for ${email} — hot_proof sequence cancelled`);
    }

    // Auto-provision if this is a new offer purchase
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const meta = session.metadata ?? {};
      const userType = meta.user_type as string | undefined;
      const offersRaw = meta.offers as string | undefined;
      const name = session.customer_details?.name ?? "";
      const [firstName, ...rest] = name.trim().split(" ");
      const lastName = rest.join(" ") || null;

      if (userType && email && firstName) {
        // Dedup: skip if this Stripe session already created a job
        const { data: existing } = await supabase
          .from("provisioning_jobs")
          .select("id")
          .eq("stripe_session_id", session.id)
          .maybeSingle();

        if (!existing) {
          const offers = offersRaw ? offersRaw.split(",").map((s) => s.trim()) : undefined;
          await createProvisioningJob({
            user_type: userType as "affiliate" | "geo_client" | "local_client" | "v2_client",
            first_name: firstName,
            last_name: lastName,
            email: email.toLowerCase(),
            offers,
            stripe_session_id: session.id,
          });
          console.log(`Provisioning job created for ${email} (${userType})`);
        }
      }
    }
  }

  return NextResponse.json({ received: true });
}
