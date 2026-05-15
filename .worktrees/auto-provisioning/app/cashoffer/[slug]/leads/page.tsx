"use client";

import { useState, useEffect, useCallback } from "react";

interface Lead {
  id: string;
  email: string | null;
  name: string | null;
  phone: string | null;
  address: string;
  created_at: string;
  status: string;
}

const S = { text: "#0F1E3A", muted: "#8A9AB5", border: "#E2E8F2", card: "#ffffff", green: "#16A34A", bg: "#F0F2F8", red: "#dc2626" };

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  active:       { bg: "#eff6ff", color: "#2563eb", label: "Active" },
  met:          { bg: "#f0fdf4", color: "#16a34a", label: "Met" },
  no_show:      { bg: "#fef2f2", color: "#dc2626", label: "No Show" },
  client:       { bg: "#fff0f4", color: "#E8185C", label: "Client" },
  unsubscribed: { bg: "#f8fafc", color: "#8A9AB5", label: "Unsub" },
};

const STATUS_FILTERS = [
  { value: "", label: "All" },
  { value: "active", label: "Active" },
  { value: "met", label: "Met" },
  { value: "no_show", label: "No Show" },
  { value: "client", label: "Client" },
  { value: "unsubscribed", label: "Unsubscribed" },
];

const inputStyle: React.CSSProperties = {
  width: "100%", boxSizing: "border-box",
  background: S.card, border: `1px solid ${S.border}`, borderRadius: 8,
  color: S.text, padding: "10px 14px", fontSize: 14, outline: "none",
};

// ── Add Individual Lead Modal ──
function AddLeadModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", address: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    if (!form.name && !form.email && !form.phone && !form.address) {
      setError("Fill in at least one field."); return;
    }
    setSaving(true); setError("");
    const res = await fetch("/api/v2client/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setError(data.error ?? "Failed to add lead."); return; }
    onSuccess();
    onClose();
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 }}>
      <div style={{ background: S.card, borderRadius: 14, padding: 28, width: "100%", maxWidth: 440, boxShadow: "0 8px 32px rgba(0,0,0,0.15)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ margin: 0, color: S.text, fontSize: 16, fontWeight: 700 }}>Add Lead</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: S.muted, fontSize: 20, cursor: "pointer", lineHeight: 1 }}>&times;</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            { key: "name",    placeholder: "Full name" },
            { key: "email",   placeholder: "Email address" },
            { key: "phone",   placeholder: "Phone number" },
            { key: "address", placeholder: "Property address" },
          ].map(({ key, placeholder }) => (
            <input key={key} placeholder={placeholder} value={(form as Record<string, string>)[key]}
              onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
              style={inputStyle} />
          ))}
        </div>
        {error && <p style={{ color: S.red, fontSize: 13, marginTop: 10 }}>{error}</p>}
        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <button onClick={onClose} style={{ flex: 1, background: S.bg, border: `1px solid ${S.border}`, color: S.muted, borderRadius: 8, padding: "10px", fontSize: 14, cursor: "pointer" }}>
            Cancel
          </button>
          <button onClick={submit} disabled={saving}
            style={{ flex: 2, background: S.green, border: "none", color: "#fff", borderRadius: 8, padding: "10px", fontSize: 14, fontWeight: 700, cursor: "pointer", opacity: saving ? 0.7 : 1 }}>
            {saving ? "Adding..." : "Add Lead"}
          </button>
        </div>
      </div>
    </div>
  );
}

const CAMPAIGN_FRIENDLY_NAMES: Record<string, string> = {
  "v2-expired-listings":  "Expired Sellers",
  "v2-pre-foreclosures":  "Pre-Foreclosure Sellers",
  "v2-probate":           "Probate Sellers",
};

function campaignLabel(name: string) {
  const key = name.toLowerCase().trim();
  if (CAMPAIGN_FRIENDLY_NAMES[key]) return CAMPAIGN_FRIENDLY_NAMES[key];
  const stripped = name.replace(/^[a-z]+-/, "").replace(/-/g, " ");
  return stripped.replace(/\b\w/g, c => c.toUpperCase());
}

// ── Upload List Modal ──
function UploadModal({ onClose }: { onClose: () => void }) {
  const [campaigns, setCampaigns] = useState<{ id: string; name: string; status: string }[]>([]);
  const [campaignId, setCampaignId] = useState("");
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);
  const [csv, setCsv] = useState("");
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ pushed: number; failed: number; skipped: number; missingFirstName: number; missingCity: number; total: number } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/v2client/campaigns")
      .then(r => r.json())
      .then(d => { setCampaigns(d.campaigns ?? []); setLoadingCampaigns(false); })
      .catch(() => setLoadingCampaigns(false));
  }, []);

  async function submit() {
    if (!campaignId) { setError("Select a campaign first."); return; }
    if (!csv.trim()) { setError("Paste your CSV list first."); return; }
    setUploading(true); setError(""); setResult(null);
    const res = await fetch("/api/v2client/leads/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csv, campaign_id: campaignId }),
    });
    const data = await res.json();
    setUploading(false);
    if (!res.ok) { setError(data.error ?? "Upload failed."); return; }
    setResult(data);
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 }}>
      <div style={{ background: S.card, borderRadius: 14, padding: 28, width: "100%", maxWidth: 540, boxShadow: "0 8px 32px rgba(0,0,0,0.15)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <h2 style={{ margin: 0, color: S.text, fontSize: 16, fontWeight: 700 }}>Upload Cold List</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: S.muted, fontSize: 20, cursor: "pointer", lineHeight: 1 }}>&times;</button>
        </div>
        <p style={{ color: S.muted, fontSize: 13, marginTop: 0, marginBottom: 14 }}>
          Paste a CSV with an <strong>email</strong> column. Optional: first_name, last_name, city, address, phone, company, website, linkedin.
          These leads go directly into your outreach campaign -- they will appear here once they reply.
        </p>
        {!result ? (
          <>
            {loadingCampaigns ? (
              <p style={{ color: S.muted, fontSize: 13, margin: "0 0 12px" }}>Loading campaigns...</p>
            ) : campaigns.length === 0 ? (
              <p style={{ color: S.red, fontSize: 13, margin: "0 0 12px" }}>No v2- campaigns found in Instantly. Create one named v2-your-campaign-name first.</p>
            ) : (
              <select value={campaignId} onChange={e => setCampaignId(e.target.value)}
                style={{ ...inputStyle, marginBottom: 12, cursor: "pointer" }}>
                <option value="">— Select campaign —</option>
                {campaigns.map(c => (
                  <option key={c.id} value={c.id}>{campaignLabel(c.name)}</option>
                ))}
              </select>
            )}
            <textarea
              placeholder={"email,first_name,last_name,city,address,phone,website,linkedin\njohn@example.com,John,Smith,Austin,,,,\njane@example.com,Jane,Doe,Dallas,,,,"}
              value={csv}
              onChange={e => setCsv(e.target.value)}
              rows={10}
              style={{ ...inputStyle, resize: "vertical", fontFamily: "monospace", fontSize: 12 }}
            />
            {error && <p style={{ color: S.red, fontSize: 13, marginTop: 8 }}>{error}</p>}
            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button onClick={onClose} style={{ flex: 1, background: S.bg, border: `1px solid ${S.border}`, color: S.muted, borderRadius: 8, padding: "10px", fontSize: 14, cursor: "pointer" }}>
                Cancel
              </button>
              <button onClick={submit} disabled={uploading || loadingCampaigns}
                style={{ flex: 2, background: S.green, border: "none", color: "#fff", borderRadius: 8, padding: "10px", fontSize: 14, fontWeight: 700, cursor: "pointer", opacity: (uploading || loadingCampaigns) ? 0.7 : 1 }}>
                {uploading ? "Uploading..." : "Upload to Campaign"}
              </button>
            </div>
          </>
        ) : (
          <div style={{ padding: "8px 0" }}>
            <p style={{ color: S.text, fontWeight: 700, fontSize: 15, margin: "0 0 12px" }}>
              {result.pushed} of {result.total} leads sent to campaign
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
              {result.skipped > 0 && (
                <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "8px 12px", fontSize: 13, color: "#dc2626" }}>
                  {result.skipped} row{result.skipped !== 1 ? "s" : ""} skipped — no valid email
                </div>
              )}
              {result.failed > 0 && (
                <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "8px 12px", fontSize: 13, color: "#dc2626" }}>
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
                <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "8px 12px", fontSize: 13, color: "#16a34a" }}>
                  All leads imported cleanly
                </div>
              )}
            </div>
            <p style={{ color: S.muted, fontSize: 12, margin: "0 0 16px" }}>Leads appear here once they reply to your campaign.</p>
            <button onClick={onClose}
              style={{ background: S.green, border: "none", color: "#fff", borderRadius: 8, padding: "10px 28px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Page ──
export default function V2ClientLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [sortCol, setSortCol] = useState<"name" | "email" | "address" | "status" | "created_at">("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);

  function toggleSort(col: typeof sortCol) {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
    setPage(1);
  }

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), search, status: statusFilter, sort_col: sortCol, sort_dir: sortDir });
    const res = await fetch(`/api/v2client/leads?${params}`);
    if (!res.ok) { setLoading(false); return; }
    const data = await res.json();
    setLeads(data.leads);
    setTotal(data.total);
    setLoading(false);
  }, [page, search, statusFilter, sortCol, sortDir]);

  useEffect(() => { load(); }, [load]);

  const pageSize = 50;
  const totalPages = Math.ceil(total / pageSize);

  const COLS: { label: string; col: typeof sortCol }[] = [
    { label: "Name",    col: "name" },
    { label: "Address", col: "address" },
    { label: "Email",   col: "email" },
    { label: "Status",  col: "status" },
    { label: "Date",    col: "created_at" },
  ];

  return (
    <div style={{ padding: "32px 24px", maxWidth: 1100, margin: "0 auto" }}>
      {showAddModal    && <AddLeadModal    onClose={() => setShowAddModal(false)}    onSuccess={load} />}
      {showUploadModal && <UploadModal     onClose={() => setShowUploadModal(false)} />}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <h1 style={{ color: S.text, fontSize: 22, fontWeight: 800, margin: 0 }}>Leads</h1>
          <span style={{ color: S.muted, fontSize: 14 }}>{total} total</span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setShowAddModal(true)}
            style={{ background: S.card, border: `1px solid ${S.border}`, color: S.text, borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            + Add Lead
          </button>
          <button onClick={() => setShowUploadModal(true)}
            style={{ background: S.green, border: "none", color: "#fff", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            Upload List
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        {STATUS_FILTERS.map(f => (
          <button key={f.value} onClick={() => { setStatusFilter(f.value); setPage(1); }}
            style={{
              background: statusFilter === f.value ? S.text : S.card,
              color: statusFilter === f.value ? "#fff" : S.muted,
              border: `1px solid ${statusFilter === f.value ? S.text : S.border}`,
              borderRadius: 20, padding: "5px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer",
            }}>
            {f.label}
          </button>
        ))}
      </div>

      <input
        placeholder="Search by name, email, or address..."
        value={search}
        onChange={e => { setSearch(e.target.value); setPage(1); }}
        style={{ ...inputStyle, marginBottom: 16 }}
      />

      {loading ? (
        <p style={{ color: S.muted }}>Loading...</p>
      ) : leads.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: S.muted }}>
          <p style={{ fontSize: 15, marginBottom: 8 }}>No leads yet.</p>
          <p style={{ fontSize: 13 }}>Upload a cold list or add a lead manually to get started.</p>
        </div>
      ) : (
        <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 12, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${S.border}` }}>
                {COLS.map(({ label, col }) => (
                  <th key={col} onClick={() => toggleSort(col)}
                    style={{ color: sortCol === col ? S.text : S.muted, fontWeight: 600, padding: "12px 16px", textAlign: "left", cursor: "pointer", userSelect: "none", whiteSpace: "nowrap" }}>
                    {label}
                    <span style={{ marginLeft: 4, opacity: sortCol === col ? 1 : 0.3, fontSize: 11 }}>
                      {sortCol === col ? (sortDir === "asc" ? "↑" : "↓") : "↕"}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {leads.map((lead, i) => {
                const st = STATUS_STYLES[lead.status] ?? STATUS_STYLES.active;
                return (
                  <tr key={lead.id}
                    style={{ borderBottom: i < leads.length - 1 ? `1px solid ${S.border}` : "none", cursor: "default" }}
                    onMouseEnter={e => (e.currentTarget.style.background = S.bg)}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    <td style={{ color: S.text, padding: "12px 16px", fontWeight: 600 }}>{lead.name ?? "—"}</td>
                    <td style={{ color: S.muted, padding: "12px 16px" }}>{lead.address}</td>
                    <td style={{ color: S.muted, padding: "12px 16px" }}>{lead.email ?? "—"}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ background: st.bg, color: st.color, borderRadius: 6, padding: "3px 8px", fontSize: 11, fontWeight: 700 }}>
                        {st.label}
                      </span>
                    </td>
                    <td style={{ color: S.muted, padding: "12px 16px" }}>
                      {new Date(lead.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div style={{ display: "flex", gap: 8, marginTop: 20, justifyContent: "center" }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            style={{ background: S.card, border: `1px solid ${S.border}`, color: S.muted, borderRadius: 6, padding: "6px 14px", cursor: "pointer" }}>
            Previous
          </button>
          <span style={{ color: S.muted, fontSize: 14, lineHeight: "32px" }}>Page {page} of {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            style={{ background: S.card, border: `1px solid ${S.border}`, color: S.muted, borderRadius: 6, padding: "6px 14px", cursor: "pointer" }}>
            Next
          </button>
        </div>
      )}
    </div>
  );
}
