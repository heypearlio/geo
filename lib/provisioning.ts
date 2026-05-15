// lib/provisioning.ts
import { supabase } from "./resend";

/**
 * Generate a unique first.last slug.
 * Checks both affiliates and v2_clients tables.
 * Falls back to first.last2, first.last3, etc.
 */
export async function generateSlug(firstName: string, lastName: string | null): Promise<string> {
  const clean = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const first = clean(firstName);
  const last = lastName ? clean(lastName) : "";
  const base = last ? `${first}.${last}` : first || "user";

  let candidate = base;
  let suffix = 2;

  while (true) {
    const [{ data: aff }, { data: v2 }] = await Promise.all([
      supabase.from("affiliates").select("id").eq("slug", candidate).maybeSingle(),
      supabase.from("v2_clients").select("id").eq("slug", candidate).maybeSingle(),
    ]);
    if (!aff && !v2) return candidate;
    candidate = `${base}${suffix}`;
    suffix++;
  }
}

export interface ProvisioningInput {
  user_type: "affiliate" | "geo_client" | "local_client" | "v2_client";
  first_name: string;
  last_name?: string | null;
  email: string;
  offers?: string[];
  stripe_session_id?: string;
}

/**
 * Insert a new provisioning job. Returns the job ID.
 */
export async function createProvisioningJob(input: ProvisioningInput): Promise<string> {
  const { data, error } = await supabase
    .from("provisioning_jobs")
    .insert({
      user_type: input.user_type,
      first_name: input.first_name,
      last_name: input.last_name ?? null,
      email: input.email.toLowerCase(),
      offers: input.offers ?? null,
      stripe_session_id: input.stripe_session_id ?? null,
    })
    .select("id")
    .single();

  if (error || !data) throw new Error(`Failed to create provisioning job: ${error?.message}`);
  return data.id as string;
}
