// Internal/test emails to exclude from all stats calculations.
// Never delete raw events — only exclude from aggregated display.
export const TEST_EMAILS: string[] = [
  "misti@mistibruton.com",
  "misti@heypearl.io",
  "misti@misti.com",
  "brutonmisti@gmail.com",
  "mistiteam5@gmail.com",
  "test@test.com",
  "test@testlead.com",
  "misti@test.com",
];

// Supabase .not("email", "in", `(${TEST_EMAILS.map(e => `"${e}"`).join(",")})`)
// Use this helper to get the formatted tuple for Supabase .not() calls
export function testEmailFilter() {
  return `(${TEST_EMAILS.map(e => `"${e}"`).join(",")})`;
}
