/**
 * Email hygiene utilities — validate and detect disposable/fake addresses.
 */

// Top disposable/throwaway email domains
const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com","guerrillamail.com","tempmail.com","throwaway.email",
  "yopmail.com","10minutemail.com","sharklasers.com","guerrillamailblock.com",
  "grr.la","guerrillamail.info","guerrillamail.biz","guerrillamail.de",
  "guerrillamail.net","guerrillamail.org","spam4.me","trashmail.com",
  "trashmail.at","trashmail.io","trashmail.me","trashmail.net",
  "dispostable.com","maildrop.cc","getairmail.com","fakeinbox.com",
  "mailnull.com","spamgourmet.com","tempr.email","discard.email",
  "mailboxy.fun","getnada.com","spamex.com","mailtemp.info",
  "anonbox.net","fakemailgenerator.com","tempinbox.com","throwam.com",
  "tempmail.org","mailnesia.com","nada.email","spamfree24.org",
  "mohmal.com","mytemp.email","emailondeck.com","mintemail.com",
  "tempemail.net","temp-mail.org","temp-mail.io","spamgmail.com",
  "trashmail.org","trashmail.ws","mailscrap.com","spammotel.com",
]);

export function isValidEmailFormat(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

export function isDisposableEmail(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) return true;
  return DISPOSABLE_DOMAINS.has(domain);
}

export type HygieneResult =
  | { ok: true }
  | { ok: false; reason: "invalid_format" | "disposable" | "role_address" };

// Role addresses that are system-only — never have a real person reading them
const ROLE_PREFIXES = ["noreply","no-reply","postmaster","mailer-daemon","abuse","spam","webmaster","hostmaster","null","nobody","test","bounce"];

export async function validateEmailForEnroll(email: string): Promise<HygieneResult> {
  const trimmed = email.trim().toLowerCase();

  if (!isValidEmailFormat(trimmed)) {
    return { ok: false, reason: "invalid_format" };
  }

  if (isDisposableEmail(trimmed)) {
    return { ok: false, reason: "disposable" };
  }

  const localPart = trimmed.split("@")[0];
  if (ROLE_PREFIXES.includes(localPart)) {
    return { ok: false, reason: "role_address" };
  }

  return { ok: true };
}
