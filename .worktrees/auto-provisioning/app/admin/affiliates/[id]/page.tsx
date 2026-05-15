"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  active:       { bg: "#eff6ff", color: "#2563eb",  label: "Active"        },
  met:          { bg: "#f0fdf4", color: "#16a34a",  label: "Met"           },
  no_show:      { bg: "#fef2f2", color: "#dc2626",  label: "No Show"       },
  client:       { bg: "#fff0f4", color: "#E8185C",  label: "Client"        },
  unsubscribed: { bg: "#f8fafc", color: "#8A9AB5",  label: "Unsubscribed"  },
};

interface LocalLead {
  id: string; email: string; first_name: string | null;
  business_type: string | null; created_at: string; status: string;
}

const S = {
  bg: "#F0F2F8", card: "#ffffff", border: "#E2E8F2",
  text: "#0F1E3A", muted: "#8A9AB5", faint: "#4A5E7A",
  pink: "#E8185C", green: "#16a34a",
};

interface AffiliateDetail {
  id: string;
  name: string;
  slug: string;
  tag: string;
  email: string | null;
  phone: string | null;
  headshot_url: string | null;
  calendly_url: string | null;
  meta_pixel_id: string | null;
  invite_used: boolean;
  active: boolean;
  offers: string[];
  created_at: string;
  last_login: string | null;
  leadCount: number;
  lastLeadAt: string | null;
}

export default function AffiliateDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const [aff, setAff] = useState<AffiliateDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", email: "", phone: "", calendlyUrl: "", metaPixelId: "" });
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [toast, setToast] = useState("");
  const [leads, setLeads] = useState<LocalLead[]>([]);
  const [leadsTotal, setLeadsTotal] = useState(0);
  const [leadSearch, setLeadSearch] = useState("");
  const [leadsLoading, setLeadsLoading] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/affiliates/${id}`);
    if (res.status === 401) { router.push("/admin/login"); return; }
    if (!res.ok) { router.push("/admin/affiliates"); return; }
    setAff(await res.json());
    setLoading(false);
  }, [id, router]);

  const loadLeads = useCallback(async () => {
    setLeadsLoading(true);
    const params = new URLSearchParams({ search: leadSearch, page: "1" });
    const res = await fetch(`/api/admin/affiliates/${id}/leads?${params}`);
    if (res.ok) {
      const data = await res.json();
      setLeads(data.leads ?? []);
      setLeadsTotal(data.total ?? 0);
    }
    setLeadsLoading(false);
  }, [id, leadSearch]);

  useEffect(() => { loadLeads(); }, [loadLeads]);

  useEffect(() => { load(); }, [load]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  async function patch(body: Record<string, unknown>) {
    setSaving(true);
    const res = await fetch(`/api/admin/affiliates/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setSaving(false);
    if (res.ok) {
      if (data.inviteLink) setInviteLink(data.inviteLink);
      await load();
      showToast("Saved");
    }
    return data;
  }

  function startEdit() {
    if (!aff) return;
    setEditForm({
      name: aff.name,
      email: aff.email ?? "",
      phone: aff.phone ?? "",
      calendlyUrl: aff.calendly_url ?? "",
      metaPixelId: aff.meta_pixel_id ?? "",
    });
    setEditing(true);
  }

  async function saveEdit() {
    await patch({
      name: editForm.name || undefined,
      email: editForm.email || undefined,
      phone: editForm.phone || undefined,
      calendlyUrl: editForm.calendlyUrl || undefined,
      metaPixelId: editForm.metaPixelId || undefined,
    });
    setEditing(false);
  }

  async function toggleOffer(offer: string) {
    if (!aff) return;
    const current = aff.offers ?? [];
    const next = current.includes(offer)
      ? current.filter(o => o !== offer)
      : [...current, offer];
    if (next.length === 0) return;
    await patch({ offers: next });
  }

  async function handlePhotoUpload(file: File) {
    if (!aff) return;
    setUploading(true);
    setUploadError("");
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`/api/affiliate/upload-headshot?slug=${aff.slug}`, {
      method: "POST",
      body: fd,
    });
    const data = await res.json();
    setUploading(false);
    if (!res.ok) { setUploadError(data.error ?? "Upload failed"); return; }
    await fetch(`/api/admin/affiliates/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ headshotUrl: data.url }),
    });
    await load();
    showToast("Photo updated");
  }

  if (loading) return (
    <div style={{ background: S.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ color: S.muted }}>Loading…</p>
    </div>
  );

  if (!aff) return null;

  const checklist = [
    { label: "Invite sent", done: true },
    { label: "Setup completed", done: aff.invite_used },
    { label: "Calendly URL set", done: !!aff.calendly_url },
    { label: "Meta Pixel added", done: !!aff.meta_pixel_id },
    { label: "Photo uploaded", done: !!aff.headshot_url },
  ];

  return (
    <div style={{ background: S.bg, minHeight: "100vh", fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      {toast && (
        <div style={{
          position: "fixed", top: 16, right: 16, background: "#0F1E3A", color: "#F7F8FC",
          borderRadius: 8, padding: "10px 18px", fontSize: 13, fontWeight: 600, zIndex: 100,
        }}>
          {toast}
        </div>
      )}

      <div style={{ padding: "32px 24px", maxWidth: 960, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 32 }}>
          <Link href="/admin/affiliates" style={{ color: S.muted, fontSize: 13, textDecoration: "none" }}>
            ← Affiliates
          </Link>
          <h1 style={{ color: S.text, fontSize: 22, fontWeight: 800, margin: 0 }}>{aff.name}</h1>
          <span style={{
            background: aff.active ? "#f0fdf4" : "#fef2f2",
            color: aff.active ? S.green : "#dc2626",
            borderRadius: 6, padding: "3px 10px", fontSize: 12, fontWeight: 600,
          }}>
            {aff.active ? "Active" : "Inactive"}
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

          {/* Identity */}
          <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 12, padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ color: S.text, fontSize: 15, fontWeight: 700, margin: 0 }}>Identity</h2>
              {!editing ? (
                <button onClick={startEdit} style={{ background: S.bg, border: `1px solid ${S.border}`, color: S.faint, borderRadius: 6, padding: "5px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                  Edit
                </button>
              ) : (
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={saveEdit} disabled={saving} style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", color: S.green, borderRadius: 6, padding: "5px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                    {saving ? "Saving…" : "Save"}
                  </button>
                  <button onClick={() => setEditing(false)} style={{ background: S.bg, border: `1px solid ${S.border}`, color: S.muted, borderRadius: 6, padding: "5px 12px", fontSize: 12, cursor: "pointer" }}>
                    Cancel
                  </button>
                </div>
              )}
            </div>

            {/* Photo */}
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
              <div style={{
                width: 64, height: 64, borderRadius: "50%",
                background: aff.headshot_url ? "transparent" : "#E2E8F2",
                overflow: "hidden", flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {aff.headshot_url
                  ? <img src={aff.headshot_url} alt={aff.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : <span style={{ color: S.muted, fontSize: 22, fontWeight: 700 }}>{aff.name.charAt(0)}</span>
                }
              </div>
              <div>
                <label style={{ display: "block", cursor: "pointer" }}>
                  <span style={{
                    background: S.bg, border: `1px solid ${S.border}`, borderRadius: 6,
                    padding: "5px 12px", fontSize: 12, color: S.faint, cursor: "pointer",
                  }}>
                    {uploading ? "Uploading…" : "Change photo"}
                  </span>
                  <input type="file" accept="image/*" style={{ display: "none" }}
                    onChange={e => { const f = e.target.files?.[0]; if (f) handlePhotoUpload(f); }} />
                </label>
                {uploadError && <p style={{ color: "#dc2626", fontSize: 11, margin: "4px 0 0" }}>{uploadError}</p>}
              </div>
            </div>

            {/* Read-only fields: slug, tag, joined */}
            {[
              { label: "Slug", value: `/${aff.slug}` },
              { label: "Tag", value: aff.tag },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${S.border}` }}>
                <span style={{ color: S.muted, fontSize: 13 }}>{label}</span>
                <span style={{ color: S.text, fontSize: 13, fontWeight: 500 }}>{value}</span>
              </div>
            ))}

            {/* Editable fields */}
            {editing ? (
              <div style={{ paddingTop: 8 }}>
                {[
                  { label: "Name", key: "name" as const },
                  { label: "Email", key: "email" as const },
                  { label: "Phone", key: "phone" as const },
                  { label: "Calendly URL", key: "calendlyUrl" as const },
                  { label: "Meta Pixel ID", key: "metaPixelId" as const },
                ].map(({ label, key }) => (
                  <div key={key} style={{ marginBottom: 10 }}>
                    <label style={{ color: S.muted, fontSize: 12, display: "block", marginBottom: 4 }}>{label}</label>
                    <input
                      value={editForm[key]}
                      onChange={e => setEditForm(f => ({ ...f, [key]: e.target.value }))}
                      style={{ width: "100%", boxSizing: "border-box", background: S.bg, border: `1px solid ${S.border}`, borderRadius: 6, color: S.text, padding: "7px 10px", fontSize: 13, outline: "none" }}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <>
                {[
                  { label: "Name", value: aff.name },
                  { label: "Email", value: aff.email ?? "—" },
                  { label: "Phone", value: aff.phone ?? "—" },
                  { label: "Calendly", value: aff.calendly_url ?? "—" },
                  { label: "Meta Pixel", value: aff.meta_pixel_id ?? "—" },
                ].map(({ label, value }) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${S.border}` }}>
                    <span style={{ color: S.muted, fontSize: 13 }}>{label}</span>
                    <span style={{ color: S.text, fontSize: 13, fontWeight: 500, textAlign: "right", maxWidth: "60%", wordBreak: "break-all" }}>{value}</span>
                  </div>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0" }}>
                  <span style={{ color: S.muted, fontSize: 13 }}>Joined</span>
                  <span style={{ color: S.text, fontSize: 13 }}>{new Date(aff.created_at).toLocaleDateString()}</span>
                </div>
              </>
            )}
          </div>

          {/* Right column */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            {/* Activity */}
            <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 12, padding: 24 }}>
              <h2 style={{ color: S.text, fontSize: 15, fontWeight: 700, marginBottom: 16, marginTop: 0 }}>Activity</h2>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                <div style={{ background: S.bg, borderRadius: 10, padding: "14px 16px" }}>
                  <p style={{ color: S.pink, fontSize: 28, fontWeight: 800, margin: 0 }}>{aff.leadCount}</p>
                  <p style={{ color: S.muted, fontSize: 12, margin: "2px 0 0" }}>Total Leads</p>
                </div>
                <div style={{ background: S.bg, borderRadius: 10, padding: "14px 16px" }}>
                  <p style={{ color: S.text, fontSize: 13, fontWeight: 700, margin: 0 }}>
                    {aff.last_login ? new Date(aff.last_login).toLocaleDateString() : "Never"}
                  </p>
                  <p style={{ color: S.muted, fontSize: 12, margin: "2px 0 0" }}>Last Login</p>
                  {aff.last_login && (
                    <p style={{ color: S.muted, fontSize: 11, margin: "1px 0 0" }}>
                      {new Date(aff.last_login).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  )}
                </div>
              </div>
              {aff.lastLeadAt && (
                <p style={{ color: S.muted, fontSize: 12, margin: 0 }}>
                  Last lead: {new Date(aff.lastLeadAt).toLocaleDateString()}
                </p>
              )}
            </div>

            {/* Setup checklist */}
            <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 12, padding: 24 }}>
              <h2 style={{ color: S.text, fontSize: 15, fontWeight: 700, marginBottom: 16, marginTop: 0 }}>Setup Checklist</h2>
              {checklist.map(({ label, done }) => (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0" }}>
                  <span style={{
                    width: 18, height: 18, borderRadius: "50%", flexShrink: 0,
                    background: done ? "#f0fdf4" : "#fef2f2",
                    border: `2px solid ${done ? "#bbf7d0" : "#fecaca"}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 10,
                  }}>
                    {done ? "✓" : ""}
                  </span>
                  <span style={{ color: done ? S.text : S.muted, fontSize: 13 }}>{label}</span>
                </div>
              ))}
            </div>

            {/* Offers */}
            <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 12, padding: 24 }}>
              <h2 style={{ color: S.text, fontSize: 15, fontWeight: 700, marginBottom: 16, marginTop: 0 }}>Offers</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {(["local", "geo", "v2"] as const).map(offer => {
                  const enabled = (aff.offers ?? []).includes(offer);
                  return (
                    <div key={offer} style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "12px 14px", background: S.bg, borderRadius: 8,
                    }}>
                      <div>
                        <span style={{ color: S.text, fontSize: 14, fontWeight: 600 }}>{offer}</span>
                        <span style={{ color: S.muted, fontSize: 12, marginLeft: 8 }}>
                          {offer === "local" ? "local.heypearl.io" : offer === "geo" ? "geo.heypearl.io" : "geo.heypearl.io (v2)"}
                        </span>
                      </div>
                      <button
                        onClick={() => toggleOffer(offer)}
                        disabled={saving || (enabled && (aff.offers ?? []).length === 1)}
                        style={{
                          background: enabled ? "#f0fdf4" : "#fef2f2",
                          color: enabled ? S.green : "#dc2626",
                          border: `1px solid ${enabled ? "#bbf7d0" : "#fecaca"}`,
                          borderRadius: 6, padding: "4px 12px", fontSize: 12,
                          fontWeight: 600, cursor: "pointer",
                        }}
                      >
                        {enabled ? "Active" : "Inactive"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Actions */}
            <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 12, padding: 24 }}>
              <h2 style={{ color: S.text, fontSize: 15, fontWeight: 700, marginBottom: 16, marginTop: 0 }}>Actions</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <button
                  onClick={() => patch({ active: !aff.active })}
                  disabled={saving}
                  style={{
                    background: aff.active ? "#fef2f2" : "#f0fdf4",
                    color: aff.active ? "#dc2626" : S.green,
                    border: `1px solid ${aff.active ? "#fecaca" : "#bbf7d0"}`,
                    borderRadius: 8, padding: "10px 16px", fontSize: 13,
                    fontWeight: 600, cursor: "pointer", textAlign: "left",
                  }}
                >
                  {aff.active ? "Deactivate account" : "Activate account"}
                </button>
                <button
                  onClick={() => patch({ regenerateInvite: true })}
                  disabled={saving}
                  style={{
                    background: "#eff6ff", color: "#2563eb",
                    border: "1px solid #bfdbfe",
                    borderRadius: 8, padding: "10px 16px", fontSize: 13,
                    fontWeight: 600, cursor: "pointer", textAlign: "left",
                  }}
                >
                  Generate new invite link
                </button>
              </div>

              {inviteLink && (
                <div style={{ marginTop: 16, background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: 14 }}>
                  <p style={{ color: S.green, fontSize: 12, fontWeight: 600, marginBottom: 6 }}>New invite link:</p>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <code style={{ color: "#15803d", fontSize: 11, wordBreak: "break-all", flex: 1 }}>{inviteLink}</code>
                    <button
                      onClick={() => navigator.clipboard.writeText(inviteLink)}
                      style={{ background: "#dcfce7", color: S.green, border: "1px solid #bbf7d0", borderRadius: 6, padding: "4px 10px", fontSize: 11, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}
                    >
                      Copy
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Leads section */}
        <div style={{ marginTop: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ color: S.text, fontSize: 16, fontWeight: 700, margin: 0 }}>
              Leads <span style={{ color: S.muted, fontWeight: 400, fontSize: 14 }}>({leadsTotal})</span>
            </h2>
            <input
              placeholder="Search…"
              value={leadSearch}
              onChange={e => setLeadSearch(e.target.value)}
              style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 8, color: S.text, padding: "7px 12px", fontSize: 13, outline: "none", width: 220 }}
            />
          </div>

          {leadsLoading ? (
            <p style={{ color: S.muted, fontSize: 13 }}>Loading…</p>
          ) : leads.length === 0 ? (
            <p style={{ color: S.muted, fontSize: 13 }}>No leads yet.</p>
          ) : (
            <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 12, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${S.border}` }}>
                    {["Name", "Email", "Business", "Status", "Date"].map(h => (
                      <th key={h} style={{ color: S.muted, fontWeight: 600, padding: "11px 16px", textAlign: "left" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead, i) => {
                    const st = STATUS_STYLES[lead.status] ?? STATUS_STYLES.active;
                    return (
                      <tr key={lead.id} style={{ borderBottom: i < leads.length - 1 ? `1px solid ${S.border}` : "none" }}>
                        <td style={{ color: S.text, padding: "11px 16px", fontWeight: 600 }}>{lead.first_name ?? "—"}</td>
                        <td style={{ color: S.muted, padding: "11px 16px" }}>{lead.email}</td>
                        <td style={{ color: S.muted, padding: "11px 16px" }}>{lead.business_type ?? "—"}</td>
                        <td style={{ padding: "11px 16px" }}>
                          <span style={{ background: st.bg, color: st.color, borderRadius: 6, padding: "3px 8px", fontSize: 11, fontWeight: 700 }}>
                            {st.label}
                          </span>
                        </td>
                        <td style={{ color: S.muted, padding: "11px 16px" }}>{new Date(lead.created_at).toLocaleDateString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
