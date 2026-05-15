// One-time bulk enrollment script for historical AuditSky leads
// Run: node scripts/enroll-leads.mjs

const RESEND_API_KEY = "re_WZKQSPHF_Kfoatddru9rp6eMCXMHCktvq";
const SUPABASE_URL = "https://jntughoiksxosjapklfo.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpudHVnaG9pa3N4b3NqYXBrbGZvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDA0OTMzMSwiZXhwIjoyMDg1NjI1MzMxfQ.J10-dW5DEHNNlSZpCMj7aLIk_V7P_kIewoqx-Pj6_Dg";
const AUDITSKY_KEY = "sk_3695cc77c20757a33f1249391c07849d374dcfb37686003c1aca181345afc223";
const CRON_SECRET = "geo_cron_2026_heypearl";

// Clean, deduplicated lead list from the export
// FAILED = no scores, send to education page
// COMPLETED = re-run audit to get fresh scores
const LEADS = [
  // COMPLETED - will get fresh audit scores
  { email: "adam.davis@cbrealty.com",          url: "https://adamdavisrealestate.com",         status: "COMPLETED" },
  { email: "risa.corson@cbmoves.com",           url: "https://risacorsonrealtor.com/",           status: "COMPLETED" },
  { email: "kim.erickson@woodsbros.com",        url: "https://lincolnhomefinder.com",            status: "COMPLETED" },
  { email: "nehahomes@gmail.com",               url: "https://m.facebook.com/nehahomes",         status: "COMPLETED" },
  { email: "info@thecarenteam.com",             url: "https://thecarenteam.serhant.com/",        status: "COMPLETED" },
  { email: "angie@angiecody.com",               url: "https://angiecody.com",                    status: "COMPLETED" },
  { email: "ruby@rubyraymond.com",              url: "https://raymondteamre.com",                status: "COMPLETED" },
  { email: "info@maleekasmith.com",             url: "https://www.matchmakerofre.com/",          status: "COMPLETED" },
  { email: "catherineknowlesnj@gmail.com",      url: "http://www.catherineknowlesnj.com",        status: "COMPLETED" },
  { email: "jessica@gridinvestor.com",          url: "https://www.gridinvestor.com",             status: "COMPLETED" },
  { email: "ok@starteamrealestate.com",         url: "https://www.starteamrealestate.com",       status: "COMPLETED" },
  { email: "dj@djpropertyteam.com",             url: "https://djpropertyteam.com",               status: "COMPLETED" },
  { email: "valentin898@aol.com",               url: "https://mydigital22.com",                  status: "COMPLETED" },
  { email: "hilohomeinspection@gmail.com",      url: "https://www.hilohomeinspection.com",       status: "COMPLETED" },
  { email: "tammiem@johnlscott.com",            url: "https://tammiem.johnlscott.com",           status: "COMPLETED" },
  { email: "yourfriendrealtorjen@gmail.com",    url: "https://thelucerorealestategroup.net",     status: "COMPLETED" },
  { email: "brittany@novagernrealty.com",       url: "https://novagenrealty.com",                status: "COMPLETED" },
  { email: "todd@todd-spencer.com",             url: "https://www.todd-spencer.com",             status: "COMPLETED" },
  { email: "wojtachproperties@gmail.com",       url: "https://www.pattywojtach.com",             status: "COMPLETED" },
  { email: "michelle@foxrealestatega.com",      url: "https://foxrealestatega.com",              status: "COMPLETED" },

  // FAILED - no scores, will go to education/failed state page
  { email: "lonnieddaniels@gmail.com",          url: "",   status: "FAILED" },
  { email: "homesandmore@msn.com",              url: "",   status: "FAILED" },
  { email: "courtney@atkinsonteam.ca",          url: "",   status: "FAILED" },
  { email: "tal.dayan@gmail.com",               url: "",   status: "FAILED" },
  { email: "aaron@betterutahliiving.com",       url: "",   status: "FAILED" },
  { email: "andyharrellrealtor@gmail.com",      url: "",   status: "FAILED" },
  { email: "stephanie@stephaniemcswain.com",    url: "",   status: "FAILED" },
  { email: "don.bass@exprealty.com",            url: "",   status: "FAILED" },
  { email: "realestateangi@gmail.com",          url: "",   status: "FAILED" },
  { email: "eric@theknoxfox.com",               url: "",   status: "FAILED" },
];

// --- Supabase helpers ---
async function sbGet(table, filters) {
  let url = `${SUPABASE_URL}/rest/v1/${table}?select=id`;
  for (const [k, v] of Object.entries(filters)) {
    url += `&${k}=eq.${encodeURIComponent(v)}`;
  }
  url += "&limit=1";
  const r = await fetch(url, { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } });
  return r.json();
}

async function sbInsert(table, data) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify(data),
  });
  return r.ok;
}

// --- AuditSky ---
async function runAudit(url) {
  const r = await fetch("https://app.auditsky.ai/api/embed", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "https://geo.heypearl.io" },
    body: JSON.stringify({ apiKey: AUDITSKY_KEY, url, keyword: "real estate agent" }),
  });
  if (!r.ok) return null;
  const d = await r.json();
  return d.auditId ?? null;
}

async function pollAudit(auditId, maxMs = 90000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    await new Promise(r => setTimeout(r, 5000));
    const r = await fetch(`https://app.auditsky.ai/api/embed/status/${auditId}`, {
      headers: { "x-api-key": AUDITSKY_KEY, Origin: "https://geo.heypearl.io" },
    });
    const d = await r.json();
    if (d.status === "COMPLETED") return { overall: Math.round(d.overallScore ?? 0), seo: Math.round(d.seoScore ?? 0), ai: Math.round(d.aiScore ?? 0), auditId };
    if (d.status === "FAILED") return { auditId, failed: true };
  }
  return null;
}

// --- Resend ---
async function sendEmail(to, subject, html) {
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: "Misti Bruton <misti@geo.heypearl.io>", to, subject, html }),
  });
  const d = await r.json();
  return d.id ?? null;
}

// --- Main ---
async function main() {
  console.log(`\nStarting enrollment for ${LEADS.length} leads...\n`);

  // Step 1: Fire all COMPLETED audits in parallel
  console.log("Submitting fresh audits for COMPLETED leads...");
  const auditJobs = {};
  for (const lead of LEADS.filter(l => l.status === "COMPLETED")) {
    const auditId = await runAudit(lead.url);
    if (auditId) {
      auditJobs[lead.email] = auditId;
      console.log(`  ${lead.email} → auditId ${auditId}`);
    } else {
      console.log(`  ${lead.email} → audit submit failed, will enroll without scores`);
    }
    await new Promise(r => setTimeout(r, 200)); // small delay between submits
  }

  // Step 2: Poll all audits
  console.log("\nPolling audit results (up to 90s each)...");
  const scores = {};
  await Promise.all(
    Object.entries(auditJobs).map(async ([email, auditId]) => {
      const result = await pollAudit(auditId);
      scores[email] = result;
      console.log(`  ${email} → ${result ? (result.failed ? "FAILED" : `overall:${result.overall} seo:${result.seo} ai:${result.ai}`) : "timeout"}`);
    })
  );

  // Step 3: Enroll all leads via the bulk-enroll endpoint
  console.log("\nEnrolling via bulk-enroll API...");
  const leads = LEADS.map(lead => {
    const score = scores[lead.email];
    return {
      email: lead.email,
      auditId: score?.auditId ?? undefined,
      overall: score?.overall ?? undefined,
      seo: score?.seo ?? undefined,
      ai: score?.ai ?? undefined,
    };
  });

  const r = await fetch("https://geo.heypearl.io/api/admin/bulk-enroll", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-admin-key": CRON_SECRET },
    body: JSON.stringify({ leads }),
  });
  const result = await r.json();

  console.log("\n=== RESULTS ===");
  console.log("Summary:", result.summary);
  console.log("\nPer lead:");
  for (const row of result.results ?? []) {
    console.log(`  ${row.status.padEnd(12)} ${row.email} ${row.reason ? `(${row.reason})` : ""}`);
  }
}

main().catch(console.error);
