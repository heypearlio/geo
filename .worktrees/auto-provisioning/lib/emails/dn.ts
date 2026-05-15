/**
 * Extracts and normalizes a display first name from any stored value.
 * - Strips last name (takes first word only)
 * - Properly capitalizes
 * - Returns null if nothing usable — callers should use `dn(x) ?? "Hey"`
 *
 * This is the SINGLE source of truth for name display logic across all email
 * systems (templates.ts, generate-audit-email, and any future email paths).
 */
export function dn(firstName?: string): string | null {
  if (!firstName?.trim()) return null;
  const first = firstName.trim().split(/\s+/)[0];
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
}
