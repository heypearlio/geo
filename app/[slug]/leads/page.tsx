"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";

interface Lead {
  id: string;
  email: string;
  first_name: string | null;
  business_type: string | null;
  created_at: string;
  status: string;
  phone: string | null;
}

const S = { text: "#0F1E3A", muted: "#8A9AB5", border: "#E2E8F2", card: "#ffffff", pink: "#E8185C", bg: "#F0F2F8", red: "#dc2626" };

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
  { value: "unsubscribed", label: "Unsub" },
];

const inputStyle: React.CSSProperties = {
  width: "100%", boxSizing: "border-box",
  background: S.card, border: `1px solid ${S.border}`, borderRadius: 8,
  color: S.text, padding: "10px 14px", fontSize: 14, outline: "none",
};

const ENROLL_SEQUENCES = [
  { key: "warm_nurture",      label: "Warm Nurture (10 emails — keeps unbooked leads warm)" },
  { key: "audit_invite",      label: "GEO Audit Invite (3 emails — cold GEO leads)" },
  { key: "v2_cold",           label: "V2 Cold (3 emails — cold V2 seller leads)" },
  { key: "long_term_nurture", label: "Long-Term Nurture (6 emails — slow burn follow-up)" },
];

function extractEmailsFromCsv(csv: string): string[] {
  const lines = csv.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/"/g, "").replace(/\s+/g, "_"));
  const emailIdx = headers.indexOf("email");
  if (emailIdx === -1) return [];
  return lines.slice(1).flatMap(line => {
    const cols = line.split(",").map(c => c.trim().replace(/"/g, ""));
    const email = (cols[emailIdx] ?? "").trim().toLowerCase();
    return email && email.includes("@") ? [email] : [];
  });
}

// ── Unified Enroll Modal ──
function EnrollModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [mode, setMode] = useState<"choose" | "individual" | "csv">("choose");
  // Campaigns (series)
  const [campaigns, setCampaigns] = useState<{ id: string; name: string }[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const [campaignId, setCampaignId] = useState("");
  // Individual
  const [form, setForm] = useState({ email: "", first_name: "", city: "", phone: "" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  // CSV
  const [csv, setCsv] = useState("");
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ pushed: number; failed: number; skipped: number; missingFirstName: number; missingCity: number; total: number } | null>(null);
  const [error, setError] = useState("");
  // Post-upload enrollment confirmation
  const [importedEmails, setImportedEmails] = useState<string[]>([]);
  const [enrollPhase, setEnrollPhase] = useState<"prompt" | "enrolling" | "done">("prompt");
  const [enrollSeq, setEnrollSeq] = useState("warm_nurture");
  const [enrolledCount, setEnrolledCount] = useState(0);

  function enterMode(m: "individual" | "csv") {
    setMode(m);
    if (campaigns.length === 0 && !loadingCampaigns) {
      setLoadingCampaigns(true);
      fetch("/api/affiliate/campaigns")
        .then(r => r.json())
        .then(d => { setCampaigns(d.campaigns ?? []); setLoadingCampaigns(false); })
        .catch(() => setLoadingCampaigns(false));
    }
  }

  async function submitIndividual() {
    if (!form.email.includes("@")) { setMsg("Valid email is required."); return; }
    setSaving(true); setMsg("");
    const res = await fetch("/api/affiliate/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, campaign_id: campaignId || undefined }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setMsg(data.error ?? "Failed to add lead."); return; }
    onSuccess();
    onClose();
  }

  async function submitCsv() {
    if (!campaignId) { setError("Select a series first."); return; }
    if (!csv.trim()) { setError("Add a CSV list first."); return; }
    setUploading(true); setError(""); setResult(null);
    const res = await fetch("/api/affiliate/leads/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csv, campaign_id: campaignId }),
    });
    const data = await res.json();
    setUploading(false);
    if (!res.ok) { setError(data.error ?? "Upload failed."); return; }
    setImportedEmails(extractEmailsFromCsv(csv));
    setEnrollPhase("prompt");
    setResult(data);
    onSuccess();
  }

  async function doEnroll() {
    if (importedEmails.length === 0) return;
    setEnrollPhase("enrolling");
    const res = await fetch("/api/leads/enroll", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emails: importedEmails, sequence: enrollSeq }),
    });
    const data = await res.json();
    setEnrolledCount(data.enrolled ?? 0);
    setEnrollPhase("done");
  }

  const seriesPicker = (required: boolean) => (
    <div style={{ marginBottom: 12 }}>
      <label style={{ color: S.muted, fontSize: 11, textTransform: "uppercase" as const, letterSpacing: "0.06em", display: "block", marginBottom: 4 }}>
        Series{required ? " *" : " (optional)"}
      </label>
      {loadingCampaigns ? (
        <p style={{ color: S.muted, fontSize: 13, margin: 0 }}>Loading...</p>
      ) : (
        <select value={campaignId} onChange={e => setCampaignId(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
          <option value="">{required ? "— Select series —" : "— No outreach (dashboard only) —"}</option>
          {campaigns.map(c => <option key={c.id} value={c.id}>{campaignLabel(c.name)}</option>)}
        </select>
      )}
    </div>
  );

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 }}>
      <div style={{ background: S.card, borderRadius: 14, padding: 28, width: "100%", maxWidth: 480, boxShadow: "0 8px 32px rgba(0,0,0,0.15)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ margin: 0, color: S.text, fontSize: 16, fontWeight: 700 }}>
            {mode === "choose" ? "Add / Upload Leads" : mode === "individual" ? "Add Individual" : "Upload CSV"}
          </h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: S.muted, fontSize: 20, cursor: "pointer", lineHeight: 1 }}>&times;</button>
        </div>

        {mode === "choose" && (
          <div style={{ display: "flex", gap: 12 }}>
            <button onClick={() => enterMode("individual")}
              style={{ flex: 1, background: S.bg, border: `1px solid ${S.border}`, borderRadius: 10, padding: "20px 16px", cursor: "pointer", color: S.text, fontSize: 14, fontWeight: 600, textAlign: "left" as const }}>
              <div style={{ fontSize: 22, marginBottom: 8 }}>+</div>
              Add Individual
              <div style={{ color: S.muted, fontSize: 12, fontWeight: 400, marginTop: 4 }}>Enroll one lead by email</div>
            </button>
            <button onClick={() => enterMode("csv")}
              style={{ flex: 1, background: S.bg, border: `1px solid ${S.border}`, borderRadius: 10, padding: "20px 16px", cursor: "pointer", color: S.text, fontSize: 14, fontWeight: 600, textAlign: "left" as const }}>
              <div style={{ fontSize: 22, marginBottom: 8 }}>↑</div>
              Upload CSV
              <div style={{ color: S.muted, fontSize: 12, fontWeight: 400, marginTop: 4 }}>Paste or upload a file</div>
            </button>
          </div>
        )}

        {mode === "individual" && (
          <div>
            <button onClick={() => { setMode("choose"); setMsg(""); }} style={{ background: "none", border: "none", color: S.muted, fontSize: 12, cursor: "pointer", marginBottom: 16, padding: 0 }}>← Back</button>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 12 }}>
              <input placeholder="Email address *" value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))} style={inputStyle} />
              <input placeholder="First name" value={form.first_name}
                onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} style={inputStyle} />
              <input placeholder="City / Market" value={form.city}
                onChange={e => setForm(f => ({ ...f, city: e.target.value }))} style={inputStyle} />
              <input placeholder="Phone number" value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} style={inputStyle} />
            </div>
            {seriesPicker(false)}
            {msg && <p style={{ color: S.red, fontSize: 13, margin: "0 0 10px" }}>{msg}</p>}
            <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
              <button onClick={onClose} style={{ flex: 1, background: S.bg, border: `1px solid ${S.border}`, color: S.muted, borderRadius: 8, padding: "10px", fontSize: 14, cursor: "pointer" }}>
                Cancel
              </button>
              <button onClick={submitIndividual} disabled={saving}
                style={{ flex: 2, background: S.pink, border: "none", color: "#fff", borderRadius: 8, padding: "10px", fontSize: 14, fontWeight: 700, cursor: "pointer", opacity: saving ? 0.7 : 1 }}>
                {saving ? "Adding..." : "Enroll"}
              </button>
            </div>
          </div>
        )}

        {mode === "csv" && !result && (
          <div>
            <button onClick={() => { setMode("choose"); setError(""); }} style={{ background: "none", border: "none", color: S.muted, fontSize: 12, cursor: "pointer", marginBottom: 16, padding: 0 }}>← Back</button>
            <p style={{ color: S.muted, fontSize: 13, marginTop: 0, marginBottom: 14 }}>
              Paste a CSV or upload a file. Required: <strong>email</strong>. Optional: first_name, last_name, city, phone, company, website, linkedin.
            </p>
            {seriesPicker(true)}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span style={{ color: S.muted, fontSize: 11, textTransform: "uppercase" as const, letterSpacing: "0.06em" }}>CSV Data</span>
              <label style={{ background: S.bg, border: `1px solid ${S.border}`, borderRadius: 6, padding: "4px 10px", fontSize: 12, color: S.text, cursor: "pointer", fontWeight: 600 }}>
                Choose File
                <input type="file" accept=".csv,text/csv" style={{ display: "none" }} onChange={e => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = ev => setCsv(ev.target?.result as string ?? "");
                  reader.readAsText(file);
                  e.target.value = "";
                }} />
              </label>
            </div>
            <textarea
              placeholder={"email,first_name,last_name,city,phone,website,linkedin\njohn@example.com,John,Smith,Austin,,,\njane@example.com,Jane,Doe,Dallas,,,"}
              value={csv}
              onChange={e => setCsv(e.target.value)}
              rows={9}
              style={{ ...inputStyle, resize: "vertical", fontFamily: "monospace", fontSize: 12 }}
            />
            {error && <p style={{ color: S.red, fontSize: 13, marginTop: 8 }}>{error}</p>}
            <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
              <button onClick={onClose} style={{ flex: 1, background: S.bg, border: `1px solid ${S.border}`, color: S.muted, borderRadius: 8, padding: "10px", fontSize: 14, cursor: "pointer" }}>
                Cancel
              </button>
              <button onClick={submitCsv} disabled={uploading || loadingCampaigns}
                style={{ flex: 2, background: S.pink, border: "none", color: "#fff", borderRadius: 8, padding: "10px", fontSize: 14, fontWeight: 700, cursor: "pointer", opacity: (uploading || loadingCampaigns) ? 0.7 : 1 }}>
                {uploading ? "Uploading..." : "Upload"}
              </button>
            </div>
          </div>
        )}

        {mode === "csv" && result && enrollPhase === "prompt" && (
          <div style={{ padding: "8px 0" }}>
            <p style={{ color: S.text, fontWeight: 700, fontSize: 15, margin: "0 0 8px" }}>
              {result.pushed} of {result.total} leads imported
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
              {result.skipped > 0 && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "8px 12px", fontSize: 13, color: S.red }}>{result.skipped} row{result.skipped !== 1 ? "s" : ""} skipped — no valid email</div>}
              {result.failed > 0 && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "8px 12px", fontSize: 13, color: S.red }}>{result.failed} row{result.failed !== 1 ? "s" : ""} rejected by Instantly</div>}
              {result.missingFirstName > 0 && <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, padding: "8px 12px", fontSize: 13, color: "#92400e" }}>{result.missingFirstName} lead{result.missingFirstName !== 1 ? "s" : ""} missing first name — will use "there" in emails</div>}
              {result.missingCity > 0 && <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, padding: "8px 12px", fontSize: 13, color: "#92400e" }}>{result.missingCity} lead{result.missingCity !== 1 ? "s" : ""} missing city — will use "your market" in emails</div>}
              {result.pushed > 0 && result.skipped === 0 && result.failed === 0 && result.missingFirstName === 0 && result.missingCity === 0 && <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "8px 12px", fontSize: 13, color: "#16a34a" }}>All leads imported cleanly</div>}
            </div>

            <div style={{ background: "#fffbeb", border: "1px solid #f59e0b", borderRadius: 10, padding: "14px 16px", marginBottom: 16 }}>
              <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 8 }}>
                <span style={{ fontSize: 18, lineHeight: 1 }}>&#9888;</span>
                <p style={{ margin: 0, color: "#78350f", fontSize: 13, fontWeight: 700 }}>These leads have NOT been enrolled in any email sequence yet.</p>
              </div>
              <p style={{ margin: "0 0 12px", color: "#92400e", fontSize: 13 }}>
                To start sending HeyPearl emails, click Enroll below. This will queue emails for all {importedEmails.length} newly imported leads. This cannot be undone.
              </p>
              <div style={{ marginBottom: 8 }}>
                <select value={enrollSeq} onChange={e => setEnrollSeq(e.target.value)}
                  style={{ width: "100%", boxSizing: "border-box" as const, background: "#fff", border: "1px solid #f59e0b", borderRadius: 8, color: "#78350f", padding: "8px 12px", fontSize: 13, outline: "none", cursor: "pointer" }}>
                  {ENROLL_SEQUENCES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={onClose}
                style={{ flex: 1, background: S.bg, border: `1px solid ${S.border}`, color: S.muted, borderRadius: 8, padding: "10px", fontSize: 13, cursor: "pointer" }}>
                Skip — I will enroll manually
              </button>
              <button onClick={doEnroll}
                style={{ flex: 2, background: S.pink, border: "none", color: "#fff", borderRadius: 8, padding: "10px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                Enroll {importedEmails.length} leads in sequence
              </button>
            </div>
          </div>
        )}

        {mode === "csv" && result && enrollPhase === "enrolling" && (
          <div style={{ padding: "8px 0", textAlign: "center" as const }}>
            <p style={{ color: S.muted, fontSize: 14 }}>Enrolling leads...</p>
          </div>
        )}

        {mode === "csv" && result && enrollPhase === "done" && (
          <div style={{ padding: "8px 0" }}>
            <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, padding: "14px 16px", marginBottom: 16 }}>
              <p style={{ margin: 0, color: "#15803d", fontWeight: 700, fontSize: 14 }}>
                {enrolledCount} leads enrolled. First email sends at next queue cycle.
              </p>
            </div>
            <button onClick={onClose} style={{ background: S.pink, border: "none", color: "#fff", borderRadius: 8, padding: "10px 28px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Done</button>
          </div>
        )}
      </div>
    </div>
  );
}

// Affiliates see aff- campaigns only. v2-, geo-, local- are for paying clients.
const CAMPAIGN_FRIENDLY_NAMES: Record<string, string> = {
  "aff-v2":    "V2 Seller Leads",
  "aff-geo":   "GEO AI Visibility Leads",
  "aff-local": "Local Business Leads",
};

function campaignLabel(name: string) {
  const key = name.toLowerCase().trim();
  if (CAMPAIGN_FRIENDLY_NAMES[key]) return CAMPAIGN_FRIENDLY_NAMES[key];
  const stripped = name.replace(/^[a-z]+-/, "").replace(/-/g, " ");
  return stripped.replace(/\b\w/g, c => c.toUpperCase());
}

// ── Main Page ──
export default function LeadsPage() {
  const { slug } = useParams() as { slug: string };
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [sortCol, setSortCol] = useState<"first_name" | "email" | "business_type" | "status" | "created_at">("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [showEnroll, setShowEnroll] = useState(false);
  const [showBulkEnroll, setShowBulkEnroll] = useState(false);
  const [bulkSeq, setBulkSeq] = useState("warm_nurture");
  const [bulkEnrolling, setBulkEnrolling] = useState(false);
  const [bulkResult, setBulkResult] = useState<{ enrolled: number } | null>(null);

  const [showSettings, setShowSettings]   = useState(false);
  const [settingsName, setSettingsName]   = useState("");
  const [settingsEmail, setSettingsEmail] = useState("");
  const [settingsPhone, setSettingsPhone] = useState("");
  const [settingsCalendly, setSettingsCalendly]     = useState("");
  const [settingsPixel, setSettingsPixel]           = useState("");
  const [settingsInstagram, setSettingsInstagram]   = useState("");
  const [settingsFacebook, setSettingsFacebook]     = useState("");
  const [settingsLinkedin, setSettingsLinkedin]     = useState("");
  const [settingsTiktok, setSettingsTiktok]         = useState("");
  const [settingsYoutube, setSettingsYoutube]       = useState("");
  const [settingsSaving, setSettingsSaving]         = useState(false);
  const [settingsSaved, setSettingsSaved]           = useState(false);
  const [settingsError, setSettingsError]           = useState("");

  useEffect(() => {
    fetch("/api/affiliate/me")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        setSettingsName(data.name ?? "");
        setSettingsEmail(data.email ?? "");
        setSettingsPhone(data.phone ?? "");
        setSettingsCalendly(data.calendlyUrl ?? "");
        setSettingsPixel(data.metaPixelId ?? "");
        setSettingsInstagram(data.instagramUrl ?? "");
        setSettingsFacebook(data.facebookUrl ?? "");
        setSettingsLinkedin(data.linkedinUrl ?? "");
        setSettingsTiktok(data.tiktokUrl ?? "");
        setSettingsYoutube(data.youtubeUrl ?? "");
      })
      .catch(() => {});
  }, []);

  async function handleSaveSettings() {
    setSettingsSaving(true);
    setSettingsSaved(false);
    setSettingsError("");
    const res = await fetch("/api/affiliate/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: settingsName || undefined,
        email: settingsEmail || undefined,
        phone: settingsPhone || undefined,
        calendlyUrl: settingsCalendly || undefined,
        metaPixelId: settingsPixel || undefined,
        instagramUrl: settingsInstagram,
        facebookUrl:  settingsFacebook,
        linkedinUrl:  settingsLinkedin,
        tiktokUrl:    settingsTiktok,
        youtubeUrl:   settingsYoutube,
      }),
    });
    setSettingsSaving(false);
    if (res.ok) {
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 3000);
    } else {
      setSettingsError("Failed to save. Please try again.");
    }
  }

  function toggleSort(col: typeof sortCol) {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
    setPage(1);
  }

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), search, status: statusFilter, sort_col: sortCol, sort_dir: sortDir });
    const res = await fetch(`/api/affiliate/leads?${params}`);
    if (!res.ok) { setLoading(false); return; }
    const data = await res.json();
    setLeads(data.leads);
    setTotal(data.total);
    setLoading(false);
  }, [page, search, statusFilter, sortCol, sortDir]);

  useEffect(() => { load(); }, [load]);

  const pageSize = 50;
  const totalPages = Math.ceil(total / pageSize);

  async function handleBulkEnroll() {
    const emails = leads.map(l => l.email);
    if (emails.length === 0) return;
    setBulkEnrolling(true); setBulkResult(null);
    const res = await fetch("/api/leads/enroll", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emails, sequence: bulkSeq }),
    });
    const data = await res.json();
    setBulkEnrolling(false);
    setBulkResult({ enrolled: data.enrolled ?? 0 });
  }

  return (
    <div style={{ padding: "20px 16px", maxWidth: 1000, margin: "0 auto" }}>
      {showEnroll && <EnrollModal onClose={() => setShowEnroll(false)} onSuccess={load} />}

      {showBulkEnroll && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 }}>
          <div style={{ background: S.card, borderRadius: 14, padding: 28, width: "100%", maxWidth: 440, boxShadow: "0 8px 32px rgba(0,0,0,0.15)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ margin: 0, color: S.text, fontSize: 16, fontWeight: 700 }}>Bulk Enroll in Sequence</h2>
              <button onClick={() => { setShowBulkEnroll(false); setBulkResult(null); }} style={{ background: "none", border: "none", color: S.muted, fontSize: 20, cursor: "pointer", lineHeight: 1 }}>&times;</button>
            </div>
            {!bulkResult ? (
              <>
                <p style={{ color: S.muted, fontSize: 13, marginTop: 0, marginBottom: 16 }}>
                  Enroll the {leads.length} leads currently visible in this list into a HeyPearl email sequence. Leads already suppressed will be skipped automatically.
                </p>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ color: S.muted, fontSize: 11, textTransform: "uppercase" as const, letterSpacing: "0.06em", display: "block", marginBottom: 6 }}>Sequence</label>
                  <select value={bulkSeq} onChange={e => setBulkSeq(e.target.value)}
                    style={{ width: "100%", boxSizing: "border-box" as const, background: S.bg, border: `1px solid ${S.border}`, borderRadius: 8, color: S.text, padding: "9px 12px", fontSize: 13, outline: "none", cursor: "pointer" }}>
                    {ENROLL_SEQUENCES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                  </select>
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={() => setShowBulkEnroll(false)}
                    style={{ flex: 1, background: S.bg, border: `1px solid ${S.border}`, color: S.muted, borderRadius: 8, padding: "10px", fontSize: 13, cursor: "pointer" }}>
                    Cancel
                  </button>
                  <button onClick={handleBulkEnroll} disabled={bulkEnrolling || leads.length === 0}
                    style={{ flex: 2, background: S.pink, border: "none", color: "#fff", borderRadius: 8, padding: "10px", fontSize: 13, fontWeight: 700, cursor: "pointer", opacity: bulkEnrolling ? 0.7 : 1 }}>
                    {bulkEnrolling ? "Enrolling..." : `Enroll ${leads.length} leads`}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, padding: "14px 16px", marginBottom: 16 }}>
                  <p style={{ margin: 0, color: "#15803d", fontWeight: 700, fontSize: 14 }}>
                    {bulkResult.enrolled} leads enrolled. First email sends at next queue cycle.
                  </p>
                </div>
                <button onClick={() => { setShowBulkEnroll(false); setBulkResult(null); }}
                  style={{ background: S.pink, border: "none", color: "#fff", borderRadius: 8, padding: "10px 28px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                  Done
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {showSettings && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,30,58,0.55)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: S.card, borderRadius: 16, padding: 28, width: "100%", maxWidth: 480, maxHeight: "90vh", overflowY: "auto", position: "relative" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ color: S.text, fontSize: 17, fontWeight: 800, margin: 0 }}>Settings</h2>
              <button onClick={() => setShowSettings(false)} style={{ background: "none", border: "none", color: S.muted, fontSize: 20, cursor: "pointer", lineHeight: 1 }}>&times;</button>
            </div>

            {/* Profile */}
            <p style={{ color: S.muted, fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, marginBottom: 10 }}>Profile</p>
            {[
              { label: "Name",         value: settingsName,     setter: setSettingsName },
              { label: "Email",        value: settingsEmail,    setter: setSettingsEmail },
              { label: "Phone",        value: settingsPhone,    setter: setSettingsPhone },
              { label: "Calendly URL", value: settingsCalendly, setter: setSettingsCalendly },
              { label: "Meta Pixel ID",value: settingsPixel,    setter: setSettingsPixel },
            ].map(({ label, value, setter }) => (
              <div key={label} style={{ marginBottom: 12 }}>
                <label style={{ color: S.muted, fontSize: 12, display: "block", marginBottom: 4 }}>{label}</label>
                <input value={value} onChange={e => setter(e.target.value)}
                  style={{ width: "100%", boxSizing: "border-box", background: S.bg, border: `1px solid ${S.border}`, borderRadius: 8, color: S.text, padding: "8px 12px", fontSize: 13, outline: "none" }} />
              </div>
            ))}

            {/* Social Channels */}
            <p style={{ color: S.muted, fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, margin: "20px 0 10px" }}>Social Channels</p>
            {[
              { label: "Instagram URL", value: settingsInstagram, setter: setSettingsInstagram, placeholder: "https://instagram.com/yourhandle" },
              { label: "Facebook URL",  value: settingsFacebook,  setter: setSettingsFacebook,  placeholder: "https://facebook.com/yourpage" },
              { label: "LinkedIn URL",  value: settingsLinkedin,  setter: setSettingsLinkedin,  placeholder: "https://linkedin.com/in/yourname" },
              { label: "TikTok URL",    value: settingsTiktok,    setter: setSettingsTiktok,    placeholder: "https://tiktok.com/@yourhandle" },
              { label: "YouTube URL",   value: settingsYoutube,   setter: setSettingsYoutube,   placeholder: "https://youtube.com/@yourchannel" },
            ].map(({ label, value, setter, placeholder }) => (
              <div key={label} style={{ marginBottom: 12 }}>
                <label style={{ color: S.muted, fontSize: 12, display: "block", marginBottom: 4 }}>{label}</label>
                <input value={value} onChange={e => setter(e.target.value)} placeholder={placeholder}
                  style={{ width: "100%", boxSizing: "border-box", background: S.bg, border: `1px solid ${S.border}`, borderRadius: 8, color: S.text, padding: "8px 12px", fontSize: 13, outline: "none" }} />
              </div>
            ))}

            {/* Save */}
            <div style={{ marginTop: 20 }}>
              <button onClick={handleSaveSettings} disabled={settingsSaving}
                style={{ background: S.pink, border: "none", color: "#fff", borderRadius: 8, padding: "10px 24px", fontSize: 14, fontWeight: 700, cursor: "pointer", opacity: settingsSaving ? 0.7 : 1 }}>
                {settingsSaving ? "Saving..." : settingsSaved ? "Saved!" : "Save Settings"}
              </button>
              {settingsError && <p style={{ color: "#E8185C", fontSize: 13, marginTop: 8 }}>{settingsError}</p>}
            </div>

          </div>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <h1 style={{ color: S.text, fontSize: 20, fontWeight: 800, margin: 0 }}>Leads</h1>
          <span style={{ color: S.muted, fontSize: 13 }}>{total} total</span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setShowSettings(true)}
            style={{ background: S.card, border: `1px solid ${S.border}`, color: S.text, borderRadius: 8, padding: "7px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
            Settings
          </button>
          {leads.length > 0 && (
            <button onClick={() => { setShowBulkEnroll(true); setBulkResult(null); }}
              style={{ background: S.card, border: `1px solid ${S.border}`, color: S.text, borderRadius: 8, padding: "7px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
              Bulk Enroll
            </button>
          )}
          <button onClick={() => setShowEnroll(true)}
            style={{ background: S.pink, border: "none", color: "#fff", borderRadius: 8, padding: "7px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
            + Upload
          </button>
        </div>
      </div>

      {/* Status filters */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14, overflowX: "auto", paddingBottom: 2 }}>
        {STATUS_FILTERS.map(f => (
          <button key={f.value} onClick={() => { setStatusFilter(f.value); setPage(1); }}
            style={{
              background: statusFilter === f.value ? S.text : S.card,
              color: statusFilter === f.value ? "#fff" : S.muted,
              border: `1px solid ${statusFilter === f.value ? S.text : S.border}`,
              borderRadius: 20, padding: "5px 12px", fontSize: 12, fontWeight: 600,
              cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
            }}>
            {f.label}
          </button>
        ))}
      </div>

      <input
        placeholder="Search by email or name…"
        value={search}
        onChange={e => { setSearch(e.target.value); setPage(1); }}
        style={{ ...inputStyle, marginBottom: 14 }}
      />

      {loading ? (
        <p style={{ color: S.muted }}>Loading…</p>
      ) : leads.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 0", color: S.muted }}>
          <p style={{ fontSize: 15, marginBottom: 6 }}>No leads yet.</p>
          <p style={{ fontSize: 13 }}>Upload a cold list or add a lead manually to get started.</p>
        </div>
      ) : (
        <>
          {/* Sort bar */}
          <div style={{ display: "flex", gap: 6, marginBottom: 10, overflowX: "auto", paddingBottom: 2 }}>
            {([ ["first_name", "Name"], ["email", "Email"], ["business_type", "Business"], ["status", "Status"], ["created_at", "Date"] ] as [typeof sortCol, string][]).map(([col, label]) => (
              <button key={col} onClick={() => toggleSort(col)}
                style={{
                  background: sortCol === col ? "#0F1E3A" : S.card,
                  color: sortCol === col ? "#fff" : S.muted,
                  border: `1px solid ${sortCol === col ? "#0F1E3A" : S.border}`,
                  borderRadius: 8, padding: "4px 10px", fontSize: 11, fontWeight: 600,
                  cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
                }}>
                {label} {sortCol === col ? (sortDir === "asc" ? "↑" : "↓") : ""}
              </button>
            ))}
          </div>

          {/* Lead cards */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {leads.map(lead => {
              const st = STATUS_STYLES[lead.status] ?? STATUS_STYLES.active;
              return (
                <div key={lead.id}
                  onClick={() => router.push(`/${slug}/leads/${encodeURIComponent(lead.email)}`)}
                  style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 12, padding: "14px 16px", cursor: "pointer" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <span style={{ color: S.text, fontWeight: 700, fontSize: 14 }}>{lead.first_name ?? "—"}</span>
                    <span style={{ background: st.bg, color: st.color, borderRadius: 6, padding: "3px 8px", fontSize: 11, fontWeight: 700 }}>{st.label}</span>
                  </div>
                  <div style={{ color: S.muted, fontSize: 12, marginBottom: 6, wordBreak: "break-all" }}>{lead.email}</div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ color: S.muted, fontSize: 11 }}>{lead.business_type ?? "—"}</span>
                    <span style={{ color: S.muted, fontSize: 11 }}>{new Date(lead.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {totalPages > 1 && (
        <div style={{ display: "flex", gap: 8, marginTop: 20, justifyContent: "center" }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            style={{ background: S.card, border: `1px solid ${S.border}`, color: S.muted, borderRadius: 6, padding: "6px 14px", cursor: "pointer", fontSize: 13 }}>
            Previous
          </button>
          <span style={{ color: S.muted, fontSize: 13, lineHeight: "32px" }}>Page {page} of {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            style={{ background: S.card, border: `1px solid ${S.border}`, color: S.muted, borderRadius: 6, padding: "6px 14px", cursor: "pointer", fontSize: 13 }}>
            Next
          </button>
        </div>
      )}

    </div>
  );
}
