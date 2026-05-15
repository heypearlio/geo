import { NextRequest } from "next/server";
import { supabase } from "./resend";

export interface AffiliateSession {
  id: string;
  slug: string;
  tag: string;
  name: string;
  email: string | null;
  phone: string | null;
  calendly_url: string | null;
}

export async function getAffiliateFromRequest(
  req: NextRequest
): Promise<AffiliateSession | null> {
  const cookie = req.cookies.get("affiliate_auth")?.value;
  if (!cookie) return null;

  const colonIdx = cookie.indexOf(":");
  if (colonIdx === -1) return null;

  const slug = cookie.slice(0, colonIdx);
  const sessionToken = cookie.slice(colonIdx + 1);
  if (!slug || !sessionToken) return null;

  const { data, error } = await supabase
    .from("affiliates")
    .select("id, slug, tag, name, email, phone, calendly_url")
    .eq("slug", slug)
    .eq("session_token", sessionToken)
    .eq("active", true)
    .maybeSingle();

  if (error || !data) return null;
  return data as AffiliateSession;
}
