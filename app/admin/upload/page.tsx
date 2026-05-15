"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const S = {
  bg: "#F0F2F8", card: "#ffffff", border: "#E2E8F2",
  text: "#0F1E3A", muted: "#8A9AB5", pink: "#E8185C",
  green: "#16a34a", red: "#dc2626", faint: "#B0BDD0",
};

const OFFERS = [
  { value: "v2",        label: "V2 Clients — Seller outreach",       prefix: "v2-",  note: "Campaigns used by V2 clients (v2-cold-outreach)" },
  { value: "geo",       label: "GEO Clients — Agent outreach",       prefix: "geo-", note: "Campaigns used by GEO clients (geo-buyers, geo-sellers)" },
  { value: "local",     label: "Local Clients — Business outreach",  prefix: "local-", note: "Campaigns used by Local clients" },
  { value: "affiliate", label: "Affiliates — Recruiting campaigns",  prefix: "aff-", note: "Campaigns used by affiliates (aff-geo, aff-v2, aff-local)" },
];

interface Campaign {
  id: string;
  name: string;
  status: string;
}

const inputStyle: React.CSSProperties = {
  width: "100%", boxSizing: "border-box",
  background: S.card, border: `1px solid ${S.border}`, borderRadius: 8,
  color: S.text, padding: "10px 14px", fontSize: 14, outline: "none",
};

export default function AdminUploadPage() {
  const router = useRouter();
  const [offer, setOffer] = useState("");
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [campaignId, setCampaignId] = useState("");
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const [csv, setCsv] = useState("");
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ pushed: number; failed: number; skipped: number; missingFirstName: number; missingCity: number; total: number } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!offer) { setCampaigns([]); setCampaignId(""); return; }
    setLoadingCampaigns(true);
    setCampaignId("");
    fetch(`/api/admin/instantly/campaigns?offer=${offer}`)
      .then(r => {
        if (r.status === 401) { router.push("/admin/login"); return null; }
        return r.json();
      })
      .then(d => {
        if (!d) return;
        setCampaigns(d.campaigns ?? []);
        setLoadingCampaigns(false);
      })
      .catch(() => setLoadingCampaigns(false));
  }, [offer, router]);

  async function upload() {
    setError(""); setResult(null);
    if (!offer)      { setError("Select an offer."); return; }
    if (!campaignId) { setError("Select a campaign."); return; }
    if (!csv.trim()) { setError("Paste your CSV list."); return; }

    setUploading(true);
    const res = await fetch("/api/admin/instantly/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csv, campaign_id: campaignId, offer, campaign_name: campaigns.find(c => c.id === campaignId)?.name ?? "" }),
    });
    const data = await res.json();
    setUploading(false);
    if (!res.ok) { setError(data.error ?? "Upload failed."); return; }
    setResult(data);
    setCsv("");
  }

  const selectedOffer = OFFERS.find(o => o.value === offer);
  const noCampaigns = !loadingCampaigns && offer && campaigns.length === 0;

  return (
    <div style={{ background: S.bg, minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "40px 24px" }}>

        <h1 style={{ color: S.text, fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Child Campaign Upload</h1>
        <p style={{ color: S.muted, fontSize: 13, marginBottom: 32 }}>
          Upload on behalf of V2 clients (<code>v2-</code>) or affiliates (<code>aff-</code>).
          For your own GEO sales outreach, use the Enroll button on the Leads page.
        </p>

        <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 14, padding: 28, display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Step 1 — Offer */}
          <div>
            <label style={{ color: S.text, fontWeight: 700, fontSize: 13, display: "block", marginBottom: 8 }}>
              1. Which offer are you targeting?
            </label>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {OFFERS.map(o => (
                <label key={o.value} style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer", padding: "12px 14px", borderRadius: 8, border: `1px solid ${offer === o.value ? S.pink : S.border}`, background: offer === o.value ? "#fff0f4" : S.card }}>
                  <input type="radio" name="offer" value={o.value} checked={offer === o.value}
                    onChange={() => setOffer(o.value)} style={{ marginTop: 2 }} />
                  <div>
                    <div style={{ color: S.text, fontWeight: 600, fontSize: 14 }}>{o.label}</div>
                    <div style={{ color: S.muted, fontSize: 12, marginTop: 2 }}>{o.note}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Step 2 — Campaign */}
          {offer && (
            <div>
              <label style={{ color: S.text, fontWeight: 700, fontSize: 13, display: "block", marginBottom: 8 }}>
                2. Select campaign
                <span style={{ color: S.muted, fontWeight: 400, marginLeft: 8 }}>
                  (campaigns starting with <code>{selectedOffer?.prefix}</code>)
                </span>
              </label>
              {loadingCampaigns ? (
                <p style={{ color: S.muted, fontSize: 13 }}>Loading campaigns from Instantly...</p>
              ) : noCampaigns ? (
                <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "12px 16px", fontSize: 13, color: S.red }}>
                  No <strong>{selectedOffer?.prefix}</strong> campaigns found in Instantly.
                  Create one named <strong>{selectedOffer?.prefix}your-campaign-name</strong> in Instantly first.
                </div>
              ) : (
                <select value={campaignId} onChange={e => setCampaignId(e.target.value)}
                  style={{ ...inputStyle, cursor: "pointer" }}>
                  <option value="">— Choose a campaign —</option>
                  {campaigns.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.status})</option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Step 3 — CSV */}
          {campaignId && (
            <div>
              <label style={{ color: S.text, fontWeight: 700, fontSize: 13, display: "block", marginBottom: 8 }}>
                3. Paste CSV list
                <span style={{ color: S.muted, fontWeight: 400, marginLeft: 8 }}>
                  Required: <code>email</code> — Optional: first_name, last_name, city, address, phone, company, website, linkedin
                </span>
              </label>
              <textarea
                placeholder={"email,first_name,last_name,city,address,phone,website,linkedin\njohn@example.com,John,Smith,Austin,,,,\njane@example.com,Jane,Doe,Dallas,,,,"}
                value={csv}
                onChange={e => setCsv(e.target.value)}
                rows={12}
                style={{ ...inputStyle, resize: "vertical", fontFamily: "monospace", fontSize: 12 }}
              />
            </div>
          )}

          {error && <p style={{ color: S.red, fontSize: 13, margin: 0 }}>{error}</p>}

          {result && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <p style={{ color: S.text, fontWeight: 700, fontSize: 15, margin: 0 }}>
                {result.pushed} of {result.total} leads sent to Instantly
              </p>
              {result.skipped > 0 && (
                <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "8px 12px", fontSize: 13, color: S.red }}>
                  {result.skipped} row{result.skipped !== 1 ? "s" : ""} skipped — no valid email
                </div>
              )}
              {result.failed > 0 && (
                <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "8px 12px", fontSize: 13, color: S.red }}>
                  {result.failed} row{result.failed !== 1 ? "s" : ""} rejected by Instantly
                </div>
              )}
              {result.missingFirstName > 0 && (
                <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, padding: "8px 12px", fontSize: 13, color: "#92400e" }}>
                  {result.missingFirstName} lead{result.missingFirstName !== 1 ? "s" : ""} missing first name — will use "there" in emails
                </div>
              )}
              {result.missingCity > 0 && (
                <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, padding: "8px 12px", fontSize: 13, color: "#92400e" }}>
                  {result.missingCity} lead{result.missingCity !== 1 ? "s" : ""} missing city — will use "your market" in emails
                </div>
              )}
              {result.pushed > 0 && result.skipped === 0 && result.failed === 0 && result.missingFirstName === 0 && result.missingCity === 0 && (
                <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "8px 12px", fontSize: 13, color: S.green }}>
                  All leads imported cleanly
                </div>
              )}
              <p style={{ color: S.muted, fontSize: 12, margin: "4px 0 0" }}>
                Leads appear in the correct /leads view once they reply.
              </p>
            </div>
          )}

          <button
            onClick={upload}
            disabled={uploading || !offer || !campaignId || !csv.trim()}
            style={{
              background: S.pink, color: "#fff", border: "none", borderRadius: 8,
              padding: "12px 24px", fontSize: 14, fontWeight: 700, cursor: "pointer",
              opacity: (uploading || !offer || !campaignId || !csv.trim()) ? 0.5 : 1,
            }}>
            {uploading ? "Uploading..." : "Upload to Instantly"}
          </button>
        </div>
      </div>
    </div>
  );
}
