// lib/v2client.ts
import { NextRequest } from "next/server";
import { supabase } from "./resend";

export interface V2ClientSession {
  id: string;
  slug: string;
  name: string;
  calendly_url: string | null;
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
