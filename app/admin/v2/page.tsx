"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

function isValidSlug(slug: string): boolean {
  // Valid: todd.smith, todd.smith2, todd.spencer.jr
  // Must contain at least one dot, only lowercase letters/numbers/dots
  return /^[a-z0-9]+(\.[a-z0-9]+)+$/.test(slug.toLowerCase());
}

function slugHint(slug: string): string | null {
  if (!slug) return null;
  if (!slug.includes(".")) return "Use first.last format (e.g. todd.smith)";
  if (!/^[a-z0-9.]+$/.test(slug.toLowerCase())) return "Only letters, numbers, and dots allowed";
  return null;
}

const S = {
  bg: "#F0F2F8", card: "#ffffff", border: "#E2E8F2",
  text: "#0F1E3A", muted: "#8A9AB5", faint: "#4A5E7A",
  green: "#16a34a",
};

interface V2Client {
  id: string;
  name: string;
  slug: string;
  calendly_url: string | null;
  meta_pixel_id: string | null;
  domain: string | null;
  invite_used: boolean;
  active: boolean;
  leadCount: number;
}

const inputStyle: React.CSSProperties = {
  background: "#ffffff", border: "1px solid #E2E8F2", borderRadius: 8,
  color: "#0F1E3A", padding: "10px 14px", fontSize: 14, outline: "none", flex: 1, minWidth: 180,
};

const smallBtnStyle: React.CSSProperties = {
  background: "#F0F2F8", color: "#8A9AB5", border: "1px solid #E2E8F2",
  borderRadius: 6, padding: "5px 10px", fontSize: 12, fontWeight: 600, cursor: "pointer",
};

export default function AdminV2Page() {
  const router = useRouter();
  const [clients, setClients] = useState<V2Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", slug: "", email: "" });
  const [creating, setCreating] = useState(false);
  const [provJobId, setProvJobId] = useState<string | null>(null);
  const [provStatus, setProvStatus] = useState<string>("");
  const [inviteResult, setInviteResult] = useState<{ name: string; link: string; slug: string } | null>(null);
  const [calendlyEdit, setCalendlyEdit] = useState<{ id: string; value: string } | null>(null);
  const [pixelEdit, setPixelEdit] = useState<{ id: string; value: string } | null>(null);
  const [domainEdit, setDomainEdit] = useState<{ id: string; value: string } | null>(null);
  const [pwEdit, setPwEdit] = useState<{ id: string; value: string } | null>(null);
  const [pwSaving, setPwSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/v2clients");
    if (res.status === 401) { router.push("/admin/login"); return; }
    const data = await res.json();
    setClients(data.clients ?? []);
    setLoading(false);
  }, [router]);

  useEffect(() => { load(); }, [load]);

  function autoSlug(name: string) {
    return name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  }

  async function handleCreate() {
    setCreating(true);
    setError("");
    setProvJobId(null);
    setProvStatus("");

    // Parse first/last from full name
    const parts = form.name.trim().split(" ");
    const firstName = parts[0] ?? form.name.trim();
    const lastName = parts.slice(1).join(" ") || null;

    try {
      const res = await fetch("/api/admin/provisioning", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_type: "v2_client",
          first_name: firstName,
          last_name: lastName,
          email: form.email || "",
        }),
      });
      if (!res.ok) {
        const d = await res.json() as { error?: string };
        setError(d.error ?? "Failed to create");
        return;
      }
      const { id } = await res.json() as { id: string };
      setProvJobId(id);
      setProvStatus("pending");
      pollV2JobStatus(id);
    } finally {
      setCreating(false);
    }
  }

  function pollV2JobStatus(jobId: string) {
    const interval = setInterval(async () => {
      const res = await fetch(`/api/admin/provisioning/${jobId}`);
      if (!res.ok) return;
      const { job } = await res.json() as { job: { status: string; slug?: string } };
      setProvStatus(job.status);
      if (job.status === "complete" || job.status === "failed") {
        clearInterval(interval);
        if (job.status === "complete") load();
      }
    }, 5000);
  }

  async function toggleActive(id: string, current: boolean) {
    await fetch(`/api/admin/v2clients/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !current }),
    });
    load();
  }

  async function saveCalendly(id: string, value: string) {
    await fetch(`/api/admin/v2clients/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ calendlyUrl: value }),
    });
    setCalendlyEdit(null);
    load();
  }

  async function savePixel(id: string, value: string) {
    await fetch(`/api/admin/v2clients/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ metaPixelId: value }),
    });
    setPixelEdit(null);
    load();
  }

  async function saveDomain(id: string, value: string) {
    await fetch(`/api/admin/v2clients/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domain: value }),
    });
    setDomainEdit(null);
    load();
  }

  async function savePassword(id: string, password: string) {
    if (password.length < 6) return;
    setPwSaving(true);
    await fetch(`/api/admin/v2clients/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newPassword: password }),
    });
    setPwSaving(false);
    setPwEdit(null);
  }

  async function regenerateInvite(id: string, name: string) {
    const res = await fetch(`/api/admin/v2clients/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ regenerateInvite: true }),
    });
    const data = await res.json();
    if (data.inviteLink) {
      const c = clients.find(c => c.id === id);
      setInviteResult({ name, link: data.inviteLink, slug: c?.slug ?? "" });
    }
  }

  const host = "v2.heypearl.io";

  return (
    <div style={{ background: S.bg, minHeight: "100vh", fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
    <div style={{ padding: "32px 24px", maxWidth: 1200, margin: "0 auto" }}>
      <h1 style={{ color: S.text, fontSize: 24, fontWeight: 800, marginBottom: 32 }}>V2 Clients</h1>

      {/* Create form */}
      <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 12, padding: 24, marginBottom: 32 }}>
        <h2 style={{ color: S.text, fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Add New V2 Client</h2>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <input
            placeholder="Company name (e.g. Acme Offers)"
            value={form.name}
            onChange={e => {
              const name = e.target.value;
              setForm(f => ({ ...f, name, slug: autoSlug(name) }));
            }}
            style={inputStyle}
          />
          <input
            placeholder="Email address"
            type="email"
            value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            style={inputStyle}
          />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <input
              placeholder="Slug (e.g. todd.smith)"
              value={form.slug}
              onChange={e => setForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9.]/g, "") }))}
              style={{ ...inputStyle, width: 160 }}
            />
            {slugHint(form.slug) && (
              <p style={{ color: "#f97316", fontSize: 11, margin: "4px 0 0" }}>
                {slugHint(form.slug)}
              </p>
            )}
          </div>
          <button
            onClick={handleCreate}
            disabled={creating || !form.name}
            style={{
              background: S.green, color: "#fff", border: "none",
              borderRadius: 8, padding: "10px 20px", fontWeight: 700,
              fontSize: 14, cursor: "pointer", opacity: creating ? 0.7 : 1,
            }}
          >
            {creating ? "Creating..." : "Create Client"}
          </button>
        </div>
        {error && <p style={{ color: "#f87171", marginTop: 8, fontSize: 13 }}>{error}</p>}
        {provJobId && (
          <div style={{ marginTop: 12, padding: "10px 14px", background: provStatus === "complete" ? "#F0FDF4" : provStatus === "failed" ? "#FEF2F2" : "#EFF6FF", borderRadius: 8, fontSize: 13 }}>
            {provStatus === "complete" && "Account provisioned. Invite email sent."}
            {provStatus === "failed" && "Provisioning failed — check /admin/provisioning to retry."}
            {!["complete", "failed"].includes(provStatus) && `Provisioning... (${provStatus})`}
          </div>
        )}
      </div>

      {/* Invite result */}
      {inviteResult && (
        <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 12, padding: 20, marginBottom: 32 }}>
          <p style={{ color: S.green, fontWeight: 700, marginBottom: 8 }}>
            Client created. Send this setup link to {inviteResult.name}:
          </p>
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12 }}>
            <code style={{ color: "#15803d", fontSize: 13, wordBreak: "break-all", flex: 1 }}>{inviteResult.link}</code>
            <button onClick={() => navigator.clipboard.writeText(inviteResult.link)}
              style={{ background: "#dcfce7", color: S.green, border: "1px solid #bbf7d0", borderRadius: 6, padding: "6px 14px", fontWeight: 600, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap" }}>
              Copy
            </button>
          </div>
          <p style={{ color: S.muted, fontSize: 12 }}>Funnel URL: <a href={`https://${host}/cashoffer/${inviteResult.slug}`} target="_blank" rel="noreferrer" style={{ color: S.green }}>{host}/cashoffer/{inviteResult.slug}</a></p>
          <button onClick={() => setInviteResult(null)} style={{ marginTop: 8, background: "none", border: "none", color: S.faint, cursor: "pointer", fontSize: 12 }}>Dismiss</button>
        </div>
      )}

      {/* Clients table */}
      {loading ? (
        <p style={{ color: S.muted }}>Loading...</p>
      ) : clients.length === 0 ? (
        <p style={{ color: S.muted }}>No V2 clients yet. Create one above.</p>
      ) : (
        <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 12, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${S.border}` }}>
                {["Name / Funnel URL", "Status", "Leads", "Calendly", "Meta Pixel", "Domain", "Actions"].map(h => (
                  <th key={h} style={{ color: S.muted, fontWeight: 600, padding: "12px 16px", textAlign: "left" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {clients.map((c, i) => (
                <tr key={c.id} style={{ borderBottom: i < clients.length - 1 ? `1px solid ${S.border}` : "none" }}>
                  <td style={{ padding: "14px 16px" }}>
                    <div style={{ fontWeight: 700, color: S.text, marginBottom: 4 }}>{c.name}</div>
                    <code style={{ color: S.muted, fontSize: 11 }}>{c.slug}</code>
                    <div>
                      <a href={`https://${host}/cashoffer/${c.slug}`} target="_blank" rel="noreferrer"
                        style={{ color: S.green, fontSize: 11 }}>{host}/cashoffer/{c.slug}</a>
                    </div>
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    <span style={{
                      background: c.invite_used ? "#f0fdf4" : "#eff6ff",
                      color: c.invite_used ? S.green : "#2563eb",
                      borderRadius: 6, padding: "3px 8px", fontSize: 12, fontWeight: 600,
                    }}>
                      {c.invite_used ? "Active" : "Pending Setup"}
                    </span>
                  </td>
                  <td style={{ color: S.text, padding: "14px 16px", fontWeight: 700 }}>{c.leadCount}</td>
                  <td style={{ padding: "14px 16px" }}>
                    {calendlyEdit?.id === c.id ? (
                      <div style={{ display: "flex", gap: 6 }}>
                        <input value={calendlyEdit.value} onChange={e => setCalendlyEdit(p => p ? { ...p, value: e.target.value } : p)}
                          style={{ ...inputStyle, width: 200, fontSize: 12, padding: "4px 8px" }} placeholder="https://calendly.com/..." />
                        <button onClick={() => saveCalendly(c.id, calendlyEdit.value)} style={smallBtnStyle}>Save</button>
                        <button onClick={() => setCalendlyEdit(null)} style={{ ...smallBtnStyle, background: S.bg }}>&times;</button>
                      </div>
                    ) : (
                      <button onClick={() => setCalendlyEdit({ id: c.id, value: c.calendly_url ?? "" })}
                        style={{ ...smallBtnStyle, background: "transparent", border: `1px solid ${S.border}`, color: c.calendly_url ? S.text : S.muted, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                        title={c.calendly_url ?? ""}>
                        {c.calendly_url ? c.calendly_url.replace("https://calendly.com/", "") : "Add Calendly"}
                      </button>
                    )}
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    {pixelEdit?.id === c.id ? (
                      <div style={{ display: "flex", gap: 6 }}>
                        <input value={pixelEdit.value} onChange={e => setPixelEdit(p => p ? { ...p, value: e.target.value } : p)}
                          style={{ ...inputStyle, width: 160, fontSize: 12, padding: "4px 8px" }} placeholder="Pixel ID" />
                        <button onClick={() => savePixel(c.id, pixelEdit.value)} style={smallBtnStyle}>Save</button>
                        <button onClick={() => setPixelEdit(null)} style={{ ...smallBtnStyle, background: S.bg }}>&times;</button>
                      </div>
                    ) : (
                      <button onClick={() => setPixelEdit({ id: c.id, value: c.meta_pixel_id ?? "" })}
                        style={{ ...smallBtnStyle, background: "transparent", border: `1px solid ${S.border}`, color: S.muted }}>
                        {c.meta_pixel_id ?? "Add Pixel"}
                      </button>
                    )}
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    {domainEdit?.id === c.id ? (
                      <div style={{ display: "flex", gap: 6 }}>
                        <input value={domainEdit.value} onChange={e => setDomainEdit(p => p ? { ...p, value: e.target.value } : p)}
                          style={{ ...inputStyle, width: 180, fontSize: 12, padding: "4px 8px" }} placeholder="offers.theirdomain.com" />
                        <button onClick={() => saveDomain(c.id, domainEdit.value)} style={smallBtnStyle}>Save</button>
                        <button onClick={() => setDomainEdit(null)} style={{ ...smallBtnStyle, background: S.bg }}>&times;</button>
                      </div>
                    ) : (
                      <button onClick={() => setDomainEdit({ id: c.id, value: c.domain ?? "" })}
                        style={{ ...smallBtnStyle, background: "transparent", border: `1px solid ${S.border}`, color: c.domain ? S.text : S.muted }}>
                        {c.domain ?? "Add Domain"}
                      </button>
                    )}
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                      <button onClick={() => toggleActive(c.id, c.active)}
                        style={{ ...smallBtnStyle, background: c.active ? "#fef2f2" : "#f0fdf4", color: c.active ? "#dc2626" : S.green, border: `1px solid ${c.active ? "#fecaca" : "#bbf7d0"}` }}>
                        {c.active ? "Deactivate" : "Activate"}
                      </button>
                      {!c.invite_used && (
                        <button onClick={() => regenerateInvite(c.id, c.name)}
                          style={{ ...smallBtnStyle, background: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe" }}>
                          New Invite
                        </button>
                      )}
                      {pwEdit?.id === c.id ? (
                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          <input type="password" value={pwEdit.value}
                            onChange={e => setPwEdit(p => p ? { ...p, value: e.target.value } : p)}
                            placeholder="New password"
                            style={{ ...inputStyle, width: 140, fontSize: 12, padding: "4px 8px" }} />
                          <button onClick={() => savePassword(c.id, pwEdit.value)} disabled={pwSaving || pwEdit.value.length < 6}
                            style={{ ...smallBtnStyle, background: "#f0fdf4", color: S.green, border: "1px solid #bbf7d0", opacity: pwEdit.value.length < 6 ? 0.5 : 1 }}>
                            {pwSaving ? "..." : "Save"}
                          </button>
                          <button onClick={() => setPwEdit(null)} style={{ ...smallBtnStyle, background: S.bg }}>&times;</button>
                        </div>
                      ) : (
                        <button onClick={() => setPwEdit({ id: c.id, value: "" })}
                          style={{ ...smallBtnStyle, background: "#faf5ff", color: "#7c3aed", border: "1px solid #e9d5ff" }}>
                          Set Password
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
    </div>
  );
}
