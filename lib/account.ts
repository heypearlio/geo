// lib/account.ts
import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { supabase } from "./resend";

export interface AccountOffer {
  offer: string;
  slug: string | null;
  meta: Record<string, unknown>;
}

export interface AccountSession {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  headshot_url: string | null;
  phone: string | null;
  offers: AccountOffer[];
}

export async function getAccountFromRequest(
  req: NextRequest
): Promise<AccountSession | null> {
  const cookie = req.cookies.get("pearlos_auth")?.value;
  if (!cookie) return null;

  const colonIdx = cookie.indexOf(":");
  if (colonIdx === -1) return null;

  const accountId = cookie.slice(0, colonIdx);
  const sessionToken = cookie.slice(colonIdx + 1);
  if (!accountId || !sessionToken) return null;

  const { data: account } = await supabase
    .from("accounts")
    .select("id, email, first_name, last_name, headshot_url, phone")
    .eq("id", accountId)
    .eq("session_token", sessionToken)
    .eq("active", true)
    .maybeSingle();

  if (!account) return null;

  const { data: offers } = await supabase
    .from("account_offers")
    .select("offer, slug, meta")
    .eq("account_id", account.id);

  return { ...account, offers: (offers ?? []) as AccountOffer[] };
}

export async function loginAccount(
  email: string,
  password: string
): Promise<{ sessionToken: string; account: AccountSession } | null> {
  const { data: account } = await supabase
    .from("accounts")
    .select("id, email, password_hash, first_name, last_name, headshot_url, phone")
    .eq("email", email.toLowerCase().trim())
    .maybeSingle();

  if (!account) return null;

  const valid = await bcrypt.compare(password, account.password_hash);
  if (!valid) return null;

  const sessionToken = crypto.randomBytes(32).toString("hex");
  const { error: updateErr } = await supabase
    .from("accounts")
    .update({ session_token: sessionToken })
    .eq("id", account.id);

  if (updateErr) return null;

  const { data: offers } = await supabase
    .from("account_offers")
    .select("offer, slug, meta")
    .eq("account_id", account.id);

  const { password_hash: _, ...rest } = account;

  return {
    sessionToken,
    account: { ...rest, offers: (offers ?? []) as AccountOffer[] },
  };
}

export async function createAccount(params: {
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  headshot_url?: string;
}): Promise<{ id: string } | { error: string }> {
  const passwordHash = await bcrypt.hash(params.password, 10);

  const { data, error } = await supabase
    .from("accounts")
    .insert({
      email: params.email.toLowerCase().trim(),
      password_hash: passwordHash,
      first_name: params.first_name ?? null,
      last_name: params.last_name ?? null,
      phone: params.phone ?? null,
      headshot_url: params.headshot_url ?? null,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  return { id: data.id };
}

export async function grantOffer(
  accountId: string,
  offer: string,
  slug?: string,
  meta?: Record<string, unknown>
): Promise<{ ok: true } | { error: string }> {
  const { error } = await supabase.from("account_offers").upsert(
    { account_id: accountId, offer, slug: slug ?? null, meta: meta ?? {} },
    { onConflict: "account_id,offer" }
  );
  if (error) return { error: error.message };
  return { ok: true };
}

export async function revokeOffer(
  accountId: string,
  offer: string
): Promise<{ ok: true } | { error: string }> {
  const { error } = await supabase
    .from("account_offers")
    .delete()
    .eq("account_id", accountId)
    .eq("offer", offer);
  if (error) return { error: error.message };
  return { ok: true };
}
