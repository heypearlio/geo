import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** Same fallback as `lib/resend.ts` — not a real key; inserts will fail. */
const BUILD_PLACEHOLDER_SERVICE_ROLE = "build_placeholder_service_role";

export type SupabaseAdminResult =
  | { client: SupabaseClient; configError: null }
  | { client: null; configError: string };

/**
 * Server-only Supabase client with the service role. Do not import from client components.
 */
export function getSupabaseAdmin(): SupabaseAdminResult {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url) return { client: null, configError: "Missing NEXT_PUBLIC_SUPABASE_URL" };
  if (!key) return { client: null, configError: "Missing SUPABASE_SERVICE_ROLE_KEY" };
  if (key === BUILD_PLACEHOLDER_SERVICE_ROLE) {
    return { client: null, configError: "SUPABASE_SERVICE_ROLE_KEY is not set (using build placeholder)" };
  }
  return { client: createClient(url, key), configError: null };
}
