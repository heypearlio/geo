// lib/v2client.ts
import { NextRequest } from "next/server";
import { supabase } from "./resend";

export interface V2ClientSession {
  id: string;
  slug: string;
  name: string;
  calendly_url: string | null;
  is_affiliate?: boolean;
}

export async function getV2ClientFromRequest(
  req: NextRequest
): Promise<V2ClientSession | null> {
  const cookie = req.cookies.get("v2client_auth")?.value;
  if (!cookie) return null;

  const colonIdx = cookie.indexOf(":");
  if (colonIdx === -1) return null;

  const slug = cookie.slice(0, colonIdx);
  const sessionToken = cookie.slice(colonIdx + 1);
  if (!slug || !sessionToken) return null;

  const { data, error } = await supabase
    .from("v2_clients")
    .select("id, slug, name, calendly_url")
    .eq("slug", slug)
    .eq("session_token", sessionToken)
    .eq("active", true)
    .maybeSingle();

  if (error || !data) return null;
  return data as V2ClientSession;
}

// Accepts BOTH pure V2 clients (v2client_auth cookie) AND affiliates with cashoffer_client=true (affiliate_auth cookie).
// Always try pure V2 client first — existing clients are completely unaffected.
export async function getV2AccessFromRequest(
  req: NextRequest
): Promise<V2ClientSession | null> {
  // Path 1: existing pure V2 client — unchanged behavior
  const v2session = await getV2ClientFromRequest(req);
  if (v2session) return v2session;

  // Path 2: affiliate with cashoffer_client = true
  const affilCookie = req.cookies.get("affiliate_auth")?.value;
  if (!affilCookie) return null;

  const colonIdx = affilCookie.indexOf(":");
  if (colonIdx === -1) return null;

  const slug = affilCookie.slice(0, colonIdx);
  const sessionToken = affilCookie.slice(colonIdx + 1);
  if (!slug || !sessionToken) return null;

  // Verify affiliate session + cashoffer access
  const { data: aff } = await supabase
    .from("affiliates")
    .select("id, slug, name, calendly_url, cashoffer_client")
    .eq("slug", slug)
    .eq("session_token", sessionToken)
    .eq("active", true)
    .eq("cashoffer_client", true)
    .maybeSingle();

  if (!aff) return null;

  // Look up the shell v2_clients record (created when access was granted).
  // Its id is used for cashoffer_lead_status FK — do not use affiliate id.
  const { data: v2client } = await supabase
    .from("v2_clients")
    .select("id")
    .eq("slug", aff.slug)
    .maybeSingle();

  if (!v2client) return null;

  return {
    id: v2client.id,
    slug: aff.slug,
    name: aff.name,
    calendly_url: aff.calendly_url,
    is_affiliate: true,
  };
}
