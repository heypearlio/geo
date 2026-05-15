// lib/dns.ts
// GoDaddy and Vercel API helpers for affiliate subdomain provisioning.
// Only called for user_type === "affiliate" — other user types skip DNS.

const GODADDY_BASE = "https://api.godaddy.com/v1";
const VERCEL_BASE = "https://api.vercel.com";
const DOMAIN = "heypearl.io";

function godaddyHeaders() {
  return {
    Authorization: `sso-key ${process.env.GODADDY_API_KEY}:${process.env.GODADDY_API_SECRET}`,
    "Content-Type": "application/json",
  };
}

function vercelHeaders() {
  return {
    Authorization: `Bearer ${process.env.VERCEL_API_TOKEN}`,
    "Content-Type": "application/json",
  };
}

/** Add CNAME record: [slug] -> cname.vercel-dns.com */
export async function addCnameRecord(slug: string): Promise<void> {
  const res = await fetch(
    `${GODADDY_BASE}/domains/${DOMAIN}/records/CNAME/${slug}`,
    {
      method: "PUT",
      headers: godaddyHeaders(),
      body: JSON.stringify([{ data: "cname.vercel-dns.com", ttl: 600 }]),
    }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GoDaddy CNAME failed (${res.status}): ${text}`);
  }
}

/**
 * Add domain to Vercel project.
 * Returns the TXT verification value to add to GoDaddy _vercel record.
 */
export async function addVercelDomain(slug: string): Promise<string> {
  const teamId = process.env.VERCEL_TEAM_ID;
  const projectId = process.env.VERCEL_PROJECT_ID;
  const params = teamId ? `?teamId=${teamId}` : "";

  const res = await fetch(
    `${VERCEL_BASE}/v10/projects/${projectId}/domains${params}`,
    {
      method: "POST",
      headers: vercelHeaders(),
      body: JSON.stringify({ name: `${slug}.${DOMAIN}` }),
    }
  );

  // 409 = domain already added — that's fine, fetch it to get the verification value
  if (res.status === 409) {
    return await getVercelDomainTxtValue(slug);
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Vercel domain add failed (${res.status}): ${text}`);
  }

  const data = await res.json() as { verification?: Array<{ type: string; value: string }> };
  const txtEntry = data.verification?.find((v) => v.type === "TXT");
  if (!txtEntry?.value) return await getVercelDomainTxtValue(slug);
  return txtEntry.value;
}

async function getVercelDomainTxtValue(slug: string): Promise<string> {
  const teamId = process.env.VERCEL_TEAM_ID;
  const projectId = process.env.VERCEL_PROJECT_ID;
  const params = teamId ? `?teamId=${teamId}` : "";

  const res = await fetch(
    `${VERCEL_BASE}/v9/projects/${projectId}/domains/${slug}.${DOMAIN}${params}`,
    { headers: vercelHeaders() }
  );
  const data = await res.json() as { verification?: Array<{ type: string; value: string }> };
  const txtEntry = data.verification?.find((v) => v.type === "TXT");
  if (!txtEntry?.value) throw new Error(`Could not get Vercel TXT value for ${slug}`);
  return txtEntry.value;
}

/**
 * Append a _vercel TXT record to GoDaddy.
 * Reads existing values first and appends — never overwrites other affiliates' entries.
 */
export async function appendVercelTxtRecord(verificationValue: string): Promise<void> {
  // 1. Fetch existing _vercel TXT records
  const getRes = await fetch(
    `${GODADDY_BASE}/domains/${DOMAIN}/records/TXT/_vercel`,
    { headers: godaddyHeaders() }
  );

  let existing: Array<{ data: string; ttl: number }> = [];
  if (getRes.ok) {
    const parsed = await getRes.json() as typeof existing;
    existing = Array.isArray(parsed) ? parsed : [];
  }

  // 2. Dedup — skip if already present
  if (existing.some((r) => r.data === verificationValue)) return;

  // 3. PUT the full array with new value appended
  const putRes = await fetch(
    `${GODADDY_BASE}/domains/${DOMAIN}/records/TXT/_vercel`,
    {
      method: "PUT",
      headers: godaddyHeaders(),
      body: JSON.stringify([...existing, { data: verificationValue, ttl: 600 }]),
    }
  );

  if (!putRes.ok) {
    const text = await putRes.text();
    throw new Error(`GoDaddy TXT append failed (${putRes.status}): ${text}`);
  }
}

/** Check if Vercel has verified the domain. Returns true when live. */
export async function checkDomainVerified(slug: string): Promise<boolean> {
  const teamId = process.env.VERCEL_TEAM_ID;
  const projectId = process.env.VERCEL_PROJECT_ID;
  const params = teamId ? `?teamId=${teamId}` : "";

  const res = await fetch(
    `${VERCEL_BASE}/v9/projects/${projectId}/domains/${slug}.${DOMAIN}${params}`,
    { headers: vercelHeaders() }
  );

  if (!res.ok) return false;
  const data = await res.json() as { verified?: boolean };
  return data.verified === true;
}
