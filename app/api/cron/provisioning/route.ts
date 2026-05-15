// app/api/cron/provisioning/route.ts
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { supabase } from "../../../../lib/resend";
import { generateSlug } from "../../../../lib/provisioning";
import { addCnameRecord, addVercelDomain, appendVercelTxtRecord, checkDomainVerified } from "../../../../lib/dns";
import {
  sendAffiliateInvite,
  sendGeoClientInvite,
  sendLocalClientInvite,
  sendV2ClientInvite,
} from "../../../../lib/emails/provisioning-emails";

export const maxDuration = 60;

type Job = {
  id: string;
  user_type: string;
  slug: string | null;
  first_name: string;
  last_name: string | null;
  email: string;
  offers: string[] | null;
  invite_token: string | null;
  db_done: boolean;
  dns_done: boolean;
  invite_done: boolean;
  error_count: number;
};

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: jobs, error } = await supabase
    .from("provisioning_jobs")
    .select("id,user_type,slug,first_name,last_name,email,offers,invite_token,db_done,dns_done,invite_done,error_count")
    .not("status", "in", '("complete","failed")')
    .not("job_type", "like", "pearlos_%")
    .lt("error_count", 10)
    .order("created_at", { ascending: true })
    .limit(10);

  if (error) {
    console.error("Provisioning cron fetch error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const results: Array<{ id: string; result?: string; error?: string }> = [];

  for (const job of (jobs ?? []) as Job[]) {
    try {
      const result = await processJob(job);
      results.push({ id: job.id, result });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`Provisioning job ${job.id} error:`, msg);
      await supabase
        .from("provisioning_jobs")
        .update({ status: "failed", error: msg, error_count: (job.error_count ?? 0) + 1 })
        .eq("id", job.id);
      results.push({ id: job.id, error: msg });
    }
  }

  return NextResponse.json({ processed: results.length, results });
}

async function processJob(job: Job): Promise<string> {
  // ── Step 1: Create DB record ──────────────────────────────────────────────
  if (!job.db_done) {
    const slug = await generateSlug(job.first_name, job.last_name);
    const inviteToken = randomUUID();

    if (job.user_type === "v2_addon") {
      // Add V2 to an existing GEO affiliate account — don't create new record
      const { data: existing } = await supabase
        .from("affiliates")
        .select("id, offers")
        .eq("email", job.email)
        .maybeSingle();
      if (existing) {
        const current = (existing.offers as string[]) ?? [];
        if (!current.includes("v2")) {
          await supabase.from("affiliates").update({ offers: [...current, "v2"] }).eq("id", existing.id);
        }
        // Job is done — no DNS, no invite needed (they already have an account)
        await supabase.from("provisioning_jobs").update({ db_done: true, invite_done: true, status: "complete", completed_at: new Date().toISOString() }).eq("id", job.id);
        return "v2_addon_applied";
      }
      // No existing account — fall through and create a standalone v2_client
    }

    if (job.user_type === "v2_client" || job.user_type === "v2_addon") {
      const { error } = await supabase.from("v2_clients").insert({
        name: [job.first_name, job.last_name].filter(Boolean).join(" "),
        slug,
        email: job.email,
        invite_token: inviteToken,
        active: true,
      });
      if (error) throw new Error(`v2_clients insert failed: ${error.message}`);
    } else {
      const defaultOffers =
        job.user_type === "affiliate" ? ["geo", "v2", "local"] :
        job.user_type === "geo_client" ? ["geo"] : ["local"];
      const offers = job.offers ?? defaultOffers;
      const { error } = await supabase.from("affiliates").insert({
        name: [job.first_name, job.last_name].filter(Boolean).join(" "),
        slug,
        tag: slug,
        email: job.email,
        offers,
        user_type: job.user_type,
        invite_token: inviteToken,
        invite_used: false,
        active: true,
      });
      if (error) throw new Error(`affiliates insert failed: ${error.message}`);
    }

    await supabase
      .from("provisioning_jobs")
      .update({ db_done: true, slug, invite_token: inviteToken, status: "db_created" })
      .eq("id", job.id);

    // Update local reference for subsequent steps in this same cron run
    job.db_done = true;
    job.slug = slug;
    job.invite_token = inviteToken;
  }

  // ── Step 2: DNS (affiliates only) ─────────────────────────────────────────
  if (job.user_type === "affiliate" && !job.dns_done) {
    await addCnameRecord(job.slug!);
    const txtValue = await addVercelDomain(job.slug!);
    await appendVercelTxtRecord(txtValue);

    await supabase
      .from("provisioning_jobs")
      .update({ dns_done: true, vercel_done: true, status: "dns_added" })
      .eq("id", job.id);

    job.dns_done = true;
    // Domain verification takes time — let next cron run check it
    return "dns_added";
  }

  // ── Step 3: Verify domain (affiliates only) ───────────────────────────────
  if (job.user_type === "affiliate" && job.dns_done && !job.invite_done) {
    const verified = await checkDomainVerified(job.slug!);
    if (!verified) return "domain_pending";
    // Domain is verified — fall through to send invite
  }

  // ── Step 4: Send invite email ─────────────────────────────────────────────
  if (!job.invite_done) {
    const params = {
      email: job.email,
      firstName: job.first_name,
      slug: job.slug!,
      inviteToken: job.invite_token!,
    };

    if (job.user_type === "affiliate") await sendAffiliateInvite(params);
    else if (job.user_type === "geo_client") await sendGeoClientInvite(params);
    else if (job.user_type === "local_client") await sendLocalClientInvite(params);
    else await sendV2ClientInvite(params);

    await supabase
      .from("provisioning_jobs")
      .update({ invite_done: true, status: "complete", completed_at: new Date().toISOString() })
      .eq("id", job.id);

    return "complete";
  }

  return "nothing_to_do";
}
