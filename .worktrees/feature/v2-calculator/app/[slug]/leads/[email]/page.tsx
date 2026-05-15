"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

const S = { text: "#0F1E3A", muted: "#8A9AB5", border: "#E2E8F2", card: "#ffffff", pink: "#E8185C", bg: "#F0F2F8", faint: "#4A5E7A" };

// Auto statuses — derived from email activity, not manually settable
const AUTO_STATUSES: Record<string, { label: string; bg: string; color: string; border: string }> = {
  cold:         { label: "Cold",         bg: "#f0f4ff", color: "#6b7280", border: "#d1d5db" },
  warm:         { label: "Warm",         bg: "#fffbeb", color: "#d97706", border: "#fde68a" },
  hot:          { label: "Hot",          bg: "#fff7ed", color: "#f97316", border: "#fed7aa" },
  unsubscribed: { label: "Unsubscribed", bg: "#f8fafc", color: "#8A9AB5", border: "#E2E8F2" },
};
// Manual statuses — affiliate can set these
const MANUAL_STATUS_OPTIONS = [
  { value: "met",      label: "Met",      bg: "#f0fdf4", color: "#16a34a", border: "#bbf7d0" },
  { value: "no_show",  label: "No Show",  bg: "#fef2f2", color: "#dc2626", border: "#fecaca" },
  { value: "client",   label: "Client",   bg: "#fff0f4", color: "#E8185C", border: "#fecdd3" },
];
const ALL_STATUS_STYLES: Record<string, { label: string; bg: string; color: string; border: string }> = {
  ...AUTO_STATUSES,
  ...Object.fromEntries(MANUAL_STATUS_OPTIONS.map(o => [o.value, o])),
};

interface Note { id: string; note: string; created_at: string; }
interface LeadStatus {
  email: string;
  first_name: string | null;
  phone: string | null;
  status: string;
}
interface Submission { id: string; first_name: string | null; business_type: string | null; created_at: string; }

export default function LeadDetailPage() {
  const { slug, email: rawEmail } = useParams() as { slug: string; email: string };
  const email = decodeURIComponent(rawEmail);
  const router = useRouter();

  const [leadStatus, setLeadStatus] = useState<LeadStatus>({ email, first_name: null, phone: null, status: "active" });
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ first_name: "", phone: "" });
  const [toast, setToast] = useState("");

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  const load = useCallback(async () => {
    const [statusRes, submissionsRes, notesRes] = await Promise.all([
      fetch(`/api/affiliate/lead-status?email=${encodeURIComponent(email)}`),
      fetch(`/api/affiliate/leads?search=${encodeURIComponent(email)}&page=1`),
      fetch(`/api/affiliate/notes?email=${encodeURIComponent(email)}`),
    ]);

    if (statusRes.status === 401) { router.push(`/${slug}/login`); return; }

    const [statusData, submissionsData, notesData] = await Promise.all([
      statusRes.json(), submissionsRes.json(), notesRes.json(),
    ]);

    const s = statusData.status;
    const sub = (submissionsData.leads ?? []).find((l: { email: string }) => l.email === email);
    const resolved: LeadStatus = {
      email,
      first_name: s?.first_name ?? sub?.first_name ?? null,
      phone: s?.phone ?? null,
      status: s?.status ?? "active",
    };
    setLeadStatus(resolved);
    setEditForm({ first_name: resolved.first_name ?? "", phone: resolved.phone ?? "" });
    setSubmissions(submissionsData.leads?.filter((l: { email: string }) => l.email === email) ?? []);
    setNotes(notesData.notes ?? []);
    setLoading(false);
  }, [email, slug, router]);

  useEffect(() => { load(); }, [load]);

  async function updateStatus(status: string) {
    setSaving(true);
    await fetch("/api/affiliate/lead-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, status }),
    });
    setSaving(false);
    setLeadStatus(s => ({ ...s, status }));
    showToast("Status updated");
  }

  async function saveEdit() {
    setSaving(true);
    await fetch("/api/affiliate/lead-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, first_name: editForm.first_name || null, phone: editForm.phone || null }),
    });
    setSaving(false);
    setLeadStatus(s => ({ ...s, first_name: editForm.first_name || null, phone: editForm.phone || null }));
    setEditing(false);
    showToast("Saved");
  }

  async function addNote() {
    if (!draft.trim()) return;
    setSaving(true);
    const res = await fetch("/api/affiliate/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, note: draft }),
    });
    const data = await res.json();
    setSaving(false);
    if (res.ok) { setNotes(n => [...n, data.note]); setDraft(""); }
  }

  async function deleteNote(id: string) {
    await fetch(`/api/affiliate/notes?id=${id}`, { method: "DELETE" });
    setNotes(n => n.filter(note => note.id !== id));
  }

  const currentStatusStyle = ALL_STATUS_STYLES[leadStatus.status] ?? ALL_STATUS_STYLES["cold"];

  if (loading) return (
    <div style={{ background: S.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ color: S.muted }}>Loading…</p>
    </div>
  );

  return (
    <div style={{ background: S.bg, minHeight: "100vh", fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      {toast && (
        <div style={{ position: "fixed", top: 16, right: 16, background: S.text, color: "#F7F8FC", borderRadius: 8, padding: "10px 18px", fontSize: 13, fontWeight: 600, zIndex: 100 }}>
          {toast}
        </div>
      )}

      <div style={{ padding: "32px 24px", maxWidth: 860, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 28 }}>
          <Link href={`/${slug}/leads`} style={{ color: S.muted, fontSize: 13, textDecoration: "none" }}>← Leads</Link>
          <div style={{ flex: 1 }}>
            <h1 style={{ color: S.text, fontSize: 20, fontWeight: 800, margin: 0 }}>
              {leadStatus.first_name ?? email}
            </h1>
            {leadStatus.first_name && <p style={{ color: S.muted, fontSize: 13, margin: "2px 0 0" }}>{email}</p>}
          </div>
          <span style={{ background: currentStatusStyle.bg, color: currentStatusStyle.color, border: `1px solid ${currentStatusStyle.border}`, borderRadius: 6, padding: "4px 12px", fontSize: 12, fontWeight: 700 }}>
            {currentStatusStyle.label}
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

          {/* Left column */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            {/* Contact info */}
            <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 12, padding: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h2 style={{ color: S.text, fontSize: 15, fontWeight: 700, margin: 0 }}>Contact</h2>
                {!editing && (
                  <button onClick={() => setEditing(true)} style={{ background: "none", border: `1px solid ${S.border}`, color: S.faint, borderRadius: 6, padding: "4px 12px", fontSize: 12, cursor: "pointer" }}>
                    Edit
                  </button>
                )}
              </div>

              {editing ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div>
                    <label style={{ color: S.muted, fontSize: 12, display: "block", marginBottom: 4 }}>Name</label>
                    <input value={editForm.first_name} onChange={e => setEditForm(f => ({ ...f, first_name: e.target.value }))}
                      style={{ width: "100%", boxSizing: "border-box", background: S.bg, border: `1px solid ${S.border}`, borderRadius: 8, color: S.text, padding: "8px 12px", fontSize: 13, outline: "none" }} />
                  </div>
                  <div>
                    <label style={{ color: S.muted, fontSize: 12, display: "block", marginBottom: 4 }}>Phone</label>
                    <input value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))}
                      style={{ width: "100%", boxSizing: "border-box", background: S.bg, border: `1px solid ${S.border}`, borderRadius: 8, color: S.text, padding: "8px 12px", fontSize: 13, outline: "none" }} />
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={saveEdit} disabled={saving} style={{ background: S.pink, color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer", flex: 1 }}>Save</button>
                    <button onClick={() => setEditing(false)} style={{ background: S.bg, color: S.muted, border: `1px solid ${S.border}`, borderRadius: 8, padding: "8px 16px", fontSize: 13, cursor: "pointer" }}>Cancel</button>
                  </div>
                </div>
              ) : (
                [
                  { label: "Email", value: email },
                  { label: "Name", value: leadStatus.first_name ?? "—" },
                  { label: "Phone", value: leadStatus.phone ?? "—" },
                ].map(({ label, value }) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${S.border}` }}>
                    <span style={{ color: S.muted, fontSize: 13 }}>{label}</span>
                    <span style={{ color: S.text, fontSize: 13, fontWeight: 500 }}>{value}</span>
                  </div>
                ))
              )}

              {submissions[0] && !editing && (
                <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0" }}>
                  <span style={{ color: S.muted, fontSize: 13 }}>Opted in</span>
                  <span style={{ color: S.text, fontSize: 13 }}>{new Date(submissions[0].created_at).toLocaleDateString()}</span>
                </div>
              )}
            </div>

            {/* Status */}
            <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 12, padding: 24 }}>
              <h2 style={{ color: S.text, fontSize: 15, fontWeight: 700, marginBottom: 16, marginTop: 0 }}>Status</h2>

              {/* Auto status — read-only */}
              {AUTO_STATUSES[leadStatus.status] && (
                <div style={{ marginBottom: 16 }}>
                  <p style={{ color: S.muted, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 8px" }}>Email Activity</p>
                  <span style={{
                    background: AUTO_STATUSES[leadStatus.status].bg,
                    color: AUTO_STATUSES[leadStatus.status].color,
                    border: `1px solid ${AUTO_STATUSES[leadStatus.status].border}`,
                    borderRadius: 8, padding: "8px 14px", fontSize: 13, fontWeight: 700,
                    display: "inline-flex", alignItems: "center", gap: 6,
                  }}>
                    <span style={{ fontSize: 10 }}>●</span>
                    {AUTO_STATUSES[leadStatus.status].label}
                  </span>
                  <p style={{ color: S.muted, fontSize: 11, margin: "6px 0 0" }}>Derived automatically from email engagement.</p>
                </div>
              )}

              {/* Manual status — affiliate can set */}
              <div>
                <p style={{ color: S.muted, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 8px" }}>Mark as</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {MANUAL_STATUS_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => updateStatus(opt.value)}
                      disabled={saving}
                      style={{
                        background: leadStatus.status === opt.value ? opt.bg : "transparent",
                        color: leadStatus.status === opt.value ? opt.color : S.muted,
                        border: `1px solid ${leadStatus.status === opt.value ? opt.border : S.border}`,
                        borderRadius: 8, padding: "10px 16px", fontSize: 13,
                        fontWeight: leadStatus.status === opt.value ? 700 : 400,
                        cursor: "pointer", textAlign: "left",
                        display: "flex", alignItems: "center", gap: 8,
                      }}
                    >
                      {leadStatus.status === opt.value && <span style={{ fontSize: 10 }}>●</span>}
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

          </div>

          {/* Right column */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            {/* Email series */}
            <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 12, padding: 24 }}>
              <h2 style={{ color: S.text, fontSize: 15, fontWeight: 700, marginBottom: 8, marginTop: 0 }}>Email Series</h2>
              <div style={{ background: S.bg, borderRadius: 8, padding: "20px 16px", textAlign: "center" }}>
                <p style={{ color: S.muted, fontSize: 13, margin: 0 }}>Email series coming soon.</p>
                <p style={{ color: S.faint, fontSize: 12, margin: "4px 0 0" }}>You'll be able to start, pause, and change campaigns here.</p>
              </div>
            </div>

            {/* Notes */}
            <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 12, padding: 24 }}>
              <h2 style={{ color: S.text, fontSize: 15, fontWeight: 700, marginBottom: 16, marginTop: 0 }}>Notes</h2>

              {notes.length === 0 ? (
                <p style={{ color: S.muted, fontSize: 13, marginBottom: 12 }}>No notes yet.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
                  {notes.map(note => (
                    <div key={note.id} style={{ background: S.bg, border: `1px solid ${S.border}`, borderRadius: 8, padding: "10px 12px", display: "flex", justifyContent: "space-between", gap: 12 }}>
                      <div style={{ flex: 1 }}>
                        <p style={{ color: S.text, fontSize: 13, margin: 0, whiteSpace: "pre-wrap" }}>{note.note}</p>
                        <p style={{ color: S.muted, fontSize: 11, margin: "4px 0 0" }}>
                          {new Date(note.created_at).toLocaleDateString()} {new Date(note.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                      <button onClick={() => deleteNote(note.id)} style={{ background: "none", border: "none", color: S.muted, cursor: "pointer", fontSize: 16, flexShrink: 0 }}>&times;</button>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <textarea
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  placeholder="Add a note…"
                  rows={3}
                  onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) addNote(); }}
                  style={{ background: S.bg, border: `1px solid ${S.border}`, borderRadius: 8, color: S.text, padding: "8px 12px", fontSize: 13, resize: "none", outline: "none", fontFamily: "inherit", width: "100%", boxSizing: "border-box" }}
                />
                <button
                  onClick={addNote}
                  disabled={saving || !draft.trim()}
                  style={{ background: S.pink, color: "#fff", border: "none", borderRadius: 8, padding: "9px", fontSize: 13, fontWeight: 700, cursor: "pointer", opacity: saving || !draft.trim() ? 0.6 : 1 }}
                >
                  Add Note
                </button>
                <p style={{ color: S.muted, fontSize: 11, margin: 0 }}>Only you can see these notes.</p>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
