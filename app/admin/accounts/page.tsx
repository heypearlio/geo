"use client";

import { useEffect, useState } from "react";

const S = {
  bg: "#0F1E3A", card: "#0d1e36", border: "#1e3354",
  text: "#F7F8FC", muted: "#9BACC0", pink: "#E8185C",
  green: "#16A34A", faint: "#4A5E7A",
};

interface AccountOffer { offer: string; slug: string | null; }
interface Account {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  created_at: string;
  account_offers: AccountOffer[];
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", first_name: "", last_name: "", phone: "" });
  const [toast, setToast] = useState<string | null>(null);
  const [grantModal, setGrantModal] = useState<{ accountId: string; email: string } | null>(null);
  const [grantForm, setGrantForm] = useState({ offer: "", slug: "" });

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  }

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/accounts");
    if (res.ok) setAccounts(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    const res = await fetch("/api/admin/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setCreating(false);
    if (!res.ok) { showToast(`Error: ${data.error}`); return; }
    showToast("Account created");
    setForm({ email: "", password: "", first_name: "", last_name: "", phone: "" });
    load();
  }

  async function handleGrantOffer(e: React.FormEvent) {
    e.preventDefault();
    if (!grantModal) return;
    const res = await fetch(`/api/admin/accounts/${grantModal.accountId}/offers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ offer: grantForm.offer, slug: grantForm.slug || undefined }),
    });
    const data = await res.json();
    if (!res.ok) { showToast(`Error: ${data.error}`); return; }
    showToast(`Granted ${grantForm.offer}`);
    setGrantModal(null);
    setGrantForm({ offer: "", slug: "" });
    load();
  }

  async function handleRevokeOffer(accountId: string, offer: string) {
    if (!confirm(`Remove ${offer} from this account?`)) return;
    const res = await fetch(`/api/admin/accounts/${accountId}/offers`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ offer }),
    });
    const data = await res.json();
    if (!res.ok) { showToast(`Error: ${data.error}`); return; }
    showToast(`Removed ${offer}`);
    load();
  }

  const inputStyle: React.CSSProperties = {
    background: "#1a2d4a", border: `1px solid ${S.border}`, borderRadius: 6,
    color: S.text, padding: "8px 12px", fontSize: 13, width: "100%",
  };

  return (
    <div style={{ padding: 32, maxWidth: 900 }}>
      {toast && (
        <div style={{
          position: "fixed", top: 20, right: 20, background: S.card, border: `1px solid ${S.border}`,
          borderRadius: 8, padding: "12px 20px", color: S.text, fontSize: 13, zIndex: 100,
        }}>{toast}</div>
      )}

      <h1 style={{ color: S.text, fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Accounts</h1>
      <p style={{ color: S.muted, fontSize: 13, marginBottom: 32 }}>
        One account per person. Each account can hold multiple offers.
      </p>

      {/* Create account form */}
      <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 10, padding: 24, marginBottom: 32 }}>
        <h2 style={{ color: S.text, fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Create Account</h2>
        <form onSubmit={handleCreate} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label style={{ color: S.muted, fontSize: 12, display: "block", marginBottom: 4 }}>Email *</label>
            <input style={inputStyle} value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required placeholder="todd@example.com" />
          </div>
          <div>
            <label style={{ color: S.muted, fontSize: 12, display: "block", marginBottom: 4 }}>Password *</label>
            <input style={inputStyle} type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required placeholder="Min 8 chars" />
          </div>
          <div>
            <label style={{ color: S.muted, fontSize: 12, display: "block", marginBottom: 4 }}>First Name</label>
            <input style={inputStyle} value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} placeholder="Todd" />
          </div>
          <div>
            <label style={{ color: S.muted, fontSize: 12, display: "block", marginBottom: 4 }}>Last Name</label>
            <input style={inputStyle} value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} placeholder="Smith" />
          </div>
          <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end" }}>
            <button
              type="submit"
              disabled={creating}
              style={{ background: S.pink, color: "#fff", border: "none", borderRadius: 6, padding: "9px 24px", fontWeight: 600, fontSize: 13, cursor: creating ? "not-allowed" : "pointer", opacity: creating ? 0.7 : 1 }}
            >
              {creating ? "Creating..." : "Create Account"}
            </button>
          </div>
        </form>
      </div>

      {/* Accounts list */}
      {loading ? (
        <p style={{ color: S.muted, fontSize: 13 }}>Loading...</p>
      ) : accounts.length === 0 ? (
        <p style={{ color: S.muted, fontSize: 13 }}>No accounts yet.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {accounts.map(acc => (
            <div key={acc.id} style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 10, padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ color: S.text, fontWeight: 600, fontSize: 14 }}>
                    {acc.first_name || acc.last_name ? `${acc.first_name ?? ""} ${acc.last_name ?? ""}`.trim() : acc.email}
                  </div>
                  <div style={{ color: S.muted, fontSize: 12, marginTop: 2 }}>{acc.email}</div>
                </div>
                <button
                  onClick={() => setGrantModal({ accountId: acc.id, email: acc.email })}
                  style={{ background: "transparent", border: `1px solid ${S.border}`, borderRadius: 6, color: S.muted, padding: "5px 12px", fontSize: 12, cursor: "pointer" }}
                >
                  + Add Offer
                </button>
              </div>

              {acc.account_offers.length > 0 && (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                  {acc.account_offers.map(o => (
                    <div key={o.offer} style={{
                      display: "flex", alignItems: "center", gap: 6,
                      background: "#1a2d4a", border: `1px solid ${S.border}`, borderRadius: 20,
                      padding: "4px 10px 4px 12px",
                    }}>
                      <span style={{ color: S.text, fontSize: 12 }}>{o.offer}{o.slug ? ` · ${o.slug}` : ""}</span>
                      <button
                        onClick={() => handleRevokeOffer(acc.id, o.offer)}
                        style={{ background: "none", border: "none", color: S.faint, cursor: "pointer", fontSize: 14, padding: 0, lineHeight: 1 }}
                      >×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Grant offer modal */}
      {grantModal && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex",
          alignItems: "center", justifyContent: "center", zIndex: 200,
        }}>
          <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 12, padding: 28, width: 360 }}>
            <h3 style={{ color: S.text, fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Grant Offer</h3>
            <p style={{ color: S.muted, fontSize: 12, marginBottom: 20 }}>{grantModal.email}</p>
            <form onSubmit={handleGrantOffer} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ color: S.muted, fontSize: 12, display: "block", marginBottom: 4 }}>Offer *</label>
                <select
                  style={{ ...inputStyle }}
                  value={grantForm.offer}
                  onChange={e => setGrantForm(f => ({ ...f, offer: e.target.value }))}
                  required
                >
                  <option value="">Select offer...</option>
                  <option value="affiliate">Affiliate</option>
                  <option value="v2">V2 (CashOffer)</option>
                  <option value="geo">GEO</option>
                  <option value="local">Local</option>
                </select>
              </div>
              <div>
                <label style={{ color: S.muted, fontSize: 12, display: "block", marginBottom: 4 }}>Slug (portal URL)</label>
                <input
                  style={inputStyle}
                  value={grantForm.slug}
                  onChange={e => setGrantForm(f => ({ ...f, slug: e.target.value }))}
                  placeholder="todd.smith"
                />
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
                <button
                  type="button"
                  onClick={() => { setGrantModal(null); setGrantForm({ offer: "", slug: "" }); }}
                  style={{ background: "transparent", border: `1px solid ${S.border}`, borderRadius: 6, color: S.muted, padding: "8px 16px", fontSize: 13, cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ background: S.green, color: "#fff", border: "none", borderRadius: 6, padding: "8px 20px", fontWeight: 600, fontSize: 13, cursor: "pointer" }}
                >
                  Grant
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
