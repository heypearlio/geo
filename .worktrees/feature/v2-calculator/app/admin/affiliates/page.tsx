"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { OFFERS } from "@/lib/offer-registry";

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

interface CustomOffer { slug: string; name: string; }

const USER_TYPE_LABEL: Record<string, { label: string; color: string }> = {
  affiliate: { label: "Affiliate", color: "#3B82F6" },
  geo_client: { label: "GEO Client", color: "#E8185C" },
  local_client: { label: "Local Client", color: "#16A34A" },
};

const S = {
  bg: "#F0F2F8", card: "#ffffff", border: "#E2E8F2",
  text: "#0F1E3A", muted: "#8A9AB5", faint: "#4A5E7A",
  pink: "#E8185C", green: "#16a34a",
};

interface Affiliate {
  id: string;
  name: string;
  slug: string;
  tag: string;
  offers: string[];
  email: string | null;
  meta_pixel_id: string | null;
  calendly_url: string | null;
  linkjolt_url: string | null;
  invite_used: boolean;
  active: boolean;
  leadCount: number;
  user_type?: string;
}

export default function AffiliatesPage() {
  const router = useRouter();
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [customOffers, setCustomOffers] = useState<CustomOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", slug: "", email: "", offers: ["local"] as string[], user_type: "affiliate" });
  const [creating, setCreating] = useState(false);
  const [provJobId, setProvJobId] = useState<string | null>(null);
  const [provStatus, setProvStatus] = useState<string>("");
  const [inviteResult, setInviteResult] = useState<{ name: string; link: string; slug: string; offers: string[] } | null>(null);
  const [pixelEdit, setPixelEdit] = useState<{ id: string; value: string } | null>(null);
  const [calendlyEdit, setCalendlyEdit] = useState<{ id: string; value: string } | null>(null);
  const [linkjoltEdit, setLinkjoltEdit] = useState<{ id: string; value: string } | null>(null);
  const [pwEdit, setPwEdit] = useState<{ id: string; value: string } | null>(null);
  const [pwSaving, setPwSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/affiliates");
    if (res.status === 401) { router.push("/admin/login"); return; }
    const data = await res.json();
    setAffiliates(data.affiliates ?? []);

    // Load custom offers from geo_offers table
    const offersRes = await fetch("/api/admin/offers");
    if (offersRes.ok) {
      const offersData = await offersRes.json();
      setCustomOffers((offersData.offers ?? []).filter((o: { active: boolean }) => o.active).map((o: { slug: string; name: string }) => ({ slug: o.slug, name: o.name })));
    }

    setLoading(false);
  }, [router]);

  useEffect(() => { load(); }, [load]);

  function autoSlug(name: string) {
    return name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  }

  function funnelUrls(slug: string, offers: string[]): string[] {
    const urls: string[] = [];
    if (offers.includes("geo"))   urls.push(`https://geo.heypearl.io/${slug}`);
    if (offers.includes("v2"))    urls.push(`https://v2.heypearl.io/${slug}`);
    if (offers.includes("local")) urls.push(`https://local.heypearl.io/${slug}`);
    return urls;
  }

  function cardUrl(slug: string): string {
    return `https://${slug}.heypearl.io`;
  }

  async function handleCreate(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    if (!isValidSlug(form.slug)) {
      setError("Slug must be in first.last format (e.g. todd.smith)");
      return;
    }
    setCreating(true);
    setError("");
    setProvJobId(null);
    setProvStatus("");

    const userType = form.user_type || "affiliate";
    const offersArr = form.offers ?? [];

    try {
      const res = await fetch("/api/admin/provisioning", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_type: userType,
          first_name: form.name.trim().split(" ")[0] ?? form.name.trim(),
          last_name: form.name.trim().split(" ").slice(1).join(" ") || null,
          email: form.email,
          offers: offersArr.length > 0 ? offersArr : undefined,
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
      setForm({ name: "", slug: "", email: "", offers: ["local"], user_type: "affiliate" });
      pollJobStatus(id);
    } finally {
      setCreating(false);
    }
  }

  function pollJobStatus(jobId: string) {
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
    await fetch(`/api/admin/affiliates/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !current }),
    });
    load();
  }

  async function toggleOffer(id: string, offer: string, currentOffers: string[]) {
    const next = currentOffers.includes(offer)
      ? currentOffers.filter(o => o !== offer)
      : [...currentOffers, offer];
    if (next.length === 0) return; // must have at least one offer
    await fetch(`/api/admin/affiliates/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ offers: next }),
    });
    load();
  }

  async function saveCalendly(id: string, value: string) {
    await fetch(`/api/admin/affiliates/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ calendlyUrl: value }),
    });
    setCalendlyEdit(null);
    load();
  }

  async function saveLinkjolt(id: string, value: string) {
    await fetch(`/api/admin/affiliates/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ linkjoltUrl: value }),
    });
    setLinkjoltEdit(null);
    load();
  }

  async function savePixel(id: string, value: string) {
    await fetch(`/api/admin/affiliates/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ metaPixelId: value }),
    });
    setPixelEdit(null);
    load();
  }

  async function savePassword(id: string, password: string) {
    if (password.length < 6) return;
    setPwSaving(true);
    await fetch(`/api/admin/affiliates/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newPassword: password }),
    });
    setPwSaving(false);
    setPwEdit(null);
  }

  async function regenerateInvite(id: string, name: string) {
    const res = await fetch(`/api/admin/affiliates/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ regenerateInvite: true }),
    });
    const data = await res.json();
    if (data.inviteLink) {
      const aff = affiliates.find(a => a.id === id);
      setInviteResult({ name, link: data.inviteLink, slug: aff?.slug ?? "", offers: aff?.offers ?? [] });
    }
  }

  return (
    <div style={{ background: S.bg, minHeight: "100vh", fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
    <div style={{ padding: "32px 24px", maxWidth: 1100, margin: "0 auto" }}>
      <h1 style={{ color: S.text, fontSize: 24, fontWeight: 800, marginBottom: 32 }}>
        Affiliate Partners
      </h1>

      {/* Create new affiliate */}
      <div style={{
        background: S.card, border: `1px solid ${S.border}`,
        borderRadius: 12, padding: 24, marginBottom: 32,
      }}>
        <h2 style={{ color: S.text, fontSize: 16, fontWeight: 700, marginBottom: 16 }}>
          Add New Affiliate
        </h2>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <input
            placeholder="Full name (e.g. Christina Moreno)"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            style={inputStyle}
          />
          <input
            placeholder="Email"
            type="email"
            value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            style={inputStyle}
          />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <input
              placeholder="Slug — auto-generated, leave blank"
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
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", padding: "8px 14px", background: S.bg, border: `1px solid ${S.border}`, borderRadius: 8 }}>
            <span style={{ color: S.muted, fontSize: 13, marginRight: 4 }}>Offers:</span>
            {[...OFFERS.map(o => ({ slug: o.slug, name: o.slug })), ...customOffers].map(offer => (
              <label key={offer.slug} style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={form.offers.includes(offer.slug)}
                  onChange={e => {
                    const next = e.target.checked
                      ? [...form.offers, offer.slug]
                      : form.offers.filter(o => o !== offer.slug);
                    if (next.length > 0) setForm(f => ({ ...f, offers: next }));
                  }}
                  style={{ accentColor: S.pink }}
                />
                <span style={{ color: S.text, fontSize: 13 }}>{offer.slug}</span>
              </label>
            ))}
          </div>
          <select
            value={form.user_type ?? "affiliate"}
            onChange={(e) => setForm({ ...form, user_type: e.target.value })}
            style={inputStyle}
          >
            <option value="affiliate">Affiliate</option>
            <option value="geo_client">GEO Client</option>
            <option value="local_client">Local Client</option>
          </select>
          <button
            onClick={handleCreate}
            disabled={creating || !form.name || !form.slug}
            style={{
              background: S.pink, color: "#fff", border: "none",
              borderRadius: 8, padding: "10px 20px", fontWeight: 700,
              fontSize: 14, cursor: "pointer", opacity: creating ? 0.7 : 1,
            }}
          >
            {creating ? "Creating…" : "Create"}
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

      {/* Invite link result */}
      {inviteResult && (
        <div style={{
          background: "#f0fdf4", border: "1px solid #bbf7d0",
          borderRadius: 12, padding: 20, marginBottom: 32,
        }}>
          <p style={{ color: S.green, fontWeight: 700, marginBottom: 8 }}>
            Affiliate created. Send this link to {inviteResult.name}:
          </p>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <code style={{ color: "#15803d", fontSize: 13, wordBreak: "break-all", flex: 1 }}>
              {inviteResult.link}
            </code>
            <button
              onClick={() => navigator.clipboard.writeText(inviteResult.link)}
              style={{
                background: "#dcfce7", color: S.green, border: "1px solid #bbf7d0",
                borderRadius: 6, padding: "6px 14px", fontWeight: 600,
                fontSize: 13, cursor: "pointer", whiteSpace: "nowrap",
              }}
            >
              Copy
            </button>
          </div>
          <div style={{ marginTop: 12 }}>
            <p style={{ color: S.muted, fontSize: 12, marginBottom: 6 }}>Business Card URL:</p>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
              <a href={cardUrl(inviteResult.slug)} target="_blank" rel="noreferrer" style={{ color: "#d97706", fontSize: 12, wordBreak: "break-all", fontWeight: 600 }}>{cardUrl(inviteResult.slug)}</a>
              <button onClick={() => navigator.clipboard.writeText(cardUrl(inviteResult.slug))} style={{ background: "#fef3c7", color: "#d97706", border: "1px solid #fde68a", borderRadius: 4, padding: "2px 8px", fontSize: 11, cursor: "pointer", whiteSpace: "nowrap" }}>Copy</button>
            </div>
            <p style={{ color: S.muted, fontSize: 12, marginBottom: 6 }}>Funnel URLs:</p>
            {funnelUrls(inviteResult.slug, inviteResult.offers).map(url => (
              <div key={url} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                <a href={url} target="_blank" rel="noreferrer" style={{ color: "#15803d", fontSize: 12, wordBreak: "break-all" }}>{url}</a>
                <button onClick={() => navigator.clipboard.writeText(url)} style={{ background: "#dcfce7", color: S.green, border: "1px solid #bbf7d0", borderRadius: 4, padding: "2px 8px", fontSize: 11, cursor: "pointer", whiteSpace: "nowrap" }}>Copy</button>
              </div>
            ))}
          </div>
          <p style={{ color: S.muted, fontSize: 12, marginTop: 8 }}>
            Once they complete setup, come back here to add their Meta Pixel ID.
          </p>
          <button
            onClick={() => setInviteResult(null)}
            style={{ marginTop: 8, background: "none", border: "none", color: S.faint, cursor: "pointer", fontSize: 12 }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Affiliates table */}
      {loading ? (
        <p style={{ color: S.muted }}>Loading…</p>
      ) : affiliates.length === 0 ? (
        <p style={{ color: S.muted }}>No affiliates yet. Create one above.</p>
      ) : (
        <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 12, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${S.border}` }}>
                {["Name", "Slug", "Funnel URLs", "Status", "Leads", "Calendly", "LinkJolt", "Meta Pixel", "Actions"].map(h => (
                  <th key={h} style={{ color: S.muted, fontWeight: 600, padding: "12px 16px", textAlign: "left" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {affiliates.map((a, i) => (
                <tr key={a.id} style={{ borderBottom: i < affiliates.length - 1 ? `1px solid ${S.border}` : "none" }}>
                  <td style={{ padding: "14px 16px" }}>
                    <Link href={`/admin/affiliates/${a.id}`} style={{ color: S.pink, fontWeight: 600, fontSize: 14, textDecoration: "none" }}>
                      {a.name}
                    </Link>
                    {(() => {
                      const typeInfo = USER_TYPE_LABEL[a.user_type ?? "affiliate"] ?? USER_TYPE_LABEL.affiliate;
                      return (
                        <span style={{ background: typeInfo.color, color: "#fff", borderRadius: 4, padding: "2px 7px", fontSize: 11, fontWeight: 700, marginLeft: 8 }}>
                          {typeInfo.label}
                        </span>
                      );
                    })()}
                  </td>
                  <td style={{ padding: "14px 16px", fontSize: 12 }}>
                    <code style={{ color: S.muted, display: "block", marginBottom: 6 }}>{a.slug}</code>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 6 }}>
                      {["geo", "v2", "local"].map(offer => {
                        const active = (a.offers ?? []).includes(offer);
                        return (
                          <button
                            key={offer}
                            onClick={() => toggleOffer(a.id, offer, a.offers ?? [])}
                            title={active ? `Deactivate ${offer}` : `Activate ${offer}`}
                            style={{
                              background: active ? S.pink : S.bg,
                              color: active ? "#fff" : S.muted,
                              border: `1px solid ${active ? S.pink : S.border}`,
                              borderRadius: 4, padding: "2px 8px", fontSize: 11,
                              fontWeight: 700, cursor: "pointer",
                            }}
                          >
                            {offer}
                          </button>
                        );
                      })}
                    </div>
                    <a href={cardUrl(a.slug)} target="_blank" rel="noreferrer" style={{ color: "#d97706", fontSize: 11, display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 220, fontWeight: 600, marginBottom: 4 }}>{cardUrl(a.slug).replace("https://", "")}</a>
                    {funnelUrls(a.slug, a.offers ?? []).map(url => (
                      <a key={url} href={url} target="_blank" rel="noreferrer" style={{ color: S.pink, fontSize: 11, display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 220 }}>{url.replace("https://", "")}</a>
                    ))}
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    <span style={{
                      background: a.invite_used ? "#f0fdf4" : "#eff6ff",
                      color: a.invite_used ? S.green : "#2563eb",
                      borderRadius: 6, padding: "3px 8px", fontSize: 12, fontWeight: 600,
                    }}>
                      {a.invite_used ? "Active" : "Pending Setup"}
                    </span>
                  </td>
                  <td style={{ color: S.text, padding: "14px 16px", fontWeight: 700 }}>{a.leadCount}</td>
                  <td style={{ padding: "14px 16px" }}>
                    {calendlyEdit?.id === a.id ? (
                      <div style={{ display: "flex", gap: 6 }}>
                        <input
                          value={calendlyEdit.value}
                          onChange={e => setCalendlyEdit(p => p ? { ...p, value: e.target.value } : p)}
                          style={{ ...inputStyle, width: 200, fontSize: 12, padding: "4px 8px" }}
                          placeholder="https://calendly.com/..."
                        />
                        <button onClick={() => saveCalendly(a.id, calendlyEdit.value)} style={smallBtnStyle}>Save</button>
                        <button onClick={() => setCalendlyEdit(null)} style={{ ...smallBtnStyle, background: S.bg }}>&times;</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setCalendlyEdit({ id: a.id, value: a.calendly_url ?? "" })}
                        style={{ ...smallBtnStyle, background: "transparent", border: `1px solid ${S.border}`, color: a.calendly_url ? S.text : S.muted, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                        title={a.calendly_url ?? ""}
                      >
                        {a.calendly_url ? a.calendly_url.replace("https://calendly.com/", "") : "Add Calendly"}
                      </button>
                    )}
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    {linkjoltEdit?.id === a.id ? (
                      <div style={{ display: "flex", gap: 6 }}>
                        <input
                          value={linkjoltEdit.value}
                          onChange={e => setLinkjoltEdit(p => p ? { ...p, value: e.target.value } : p)}
                          style={{ ...inputStyle, width: 200, fontSize: 12, padding: "4px 8px" }}
                          placeholder="https://linkjolt.com/..."
                        />
                        <button onClick={() => saveLinkjolt(a.id, linkjoltEdit.value)} style={smallBtnStyle}>Save</button>
                        <button onClick={() => setLinkjoltEdit(null)} style={{ ...smallBtnStyle, background: S.bg }}>&times;</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setLinkjoltEdit({ id: a.id, value: a.linkjolt_url ?? "" })}
                        style={{ ...smallBtnStyle, background: "transparent", border: `1px solid ${S.border}`, color: a.linkjolt_url ? S.text : S.muted }}
                      >
                        {a.linkjolt_url ? "Edit" : "Add LinkJolt"}
                      </button>
                    )}
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    {pixelEdit?.id === a.id ? (
                      <div style={{ display: "flex", gap: 6 }}>
                        <input
                          value={pixelEdit.value}
                          onChange={e => setPixelEdit(p => p ? { ...p, value: e.target.value } : p)}
                          style={{ ...inputStyle, width: 160, fontSize: 12, padding: "4px 8px" }}
                          placeholder="Pixel ID"
                        />
                        <button onClick={() => savePixel(a.id, pixelEdit.value)} style={smallBtnStyle}>Save</button>
                        <button onClick={() => setPixelEdit(null)} style={{ ...smallBtnStyle, background: S.bg }}>&times;</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setPixelEdit({ id: a.id, value: a.meta_pixel_id ?? "" })}
                        style={{ ...smallBtnStyle, background: "transparent", border: `1px solid ${S.border}`, color: S.muted }}
                      >
                        {a.meta_pixel_id ? a.meta_pixel_id : "Add Pixel"}
                      </button>
                    )}
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                      <button
                        onClick={() => toggleActive(a.id, a.active)}
                        style={{ ...smallBtnStyle, background: a.active ? "#fef2f2" : "#f0fdf4", color: a.active ? "#dc2626" : S.green, border: `1px solid ${a.active ? "#fecaca" : "#bbf7d0"}` }}
                      >
                        {a.active ? "Deactivate" : "Activate"}
                      </button>
                      {!a.invite_used && (
                        <button
                          onClick={() => regenerateInvite(a.id, a.name)}
                          style={{ ...smallBtnStyle, background: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe" }}
                        >
                          New Invite
                        </button>
                      )}
                      {pwEdit?.id === a.id ? (
                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          <input
                            type="password"
                            value={pwEdit.value}
                            onChange={e => setPwEdit(p => p ? { ...p, value: e.target.value } : p)}
                            placeholder="New password"
                            style={{ ...inputStyle, width: 140, fontSize: 12, padding: "4px 8px" }}
                          />
                          <button
                            onClick={() => savePassword(a.id, pwEdit.value)}
                            disabled={pwSaving || pwEdit.value.length < 6}
                            style={{ ...smallBtnStyle, background: "#f0fdf4", color: S.green, border: "1px solid #bbf7d0", opacity: pwEdit.value.length < 6 ? 0.5 : 1 }}
                          >
                            {pwSaving ? "…" : "Save"}
                          </button>
                          <button onClick={() => setPwEdit(null)} style={{ ...smallBtnStyle, background: S.bg }}>&times;</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setPwEdit({ id: a.id, value: "" })}
                          style={{ ...smallBtnStyle, background: "#faf5ff", color: "#7c3aed", border: "1px solid #e9d5ff" }}
                        >
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

const inputStyle: React.CSSProperties = {
  background: "#ffffff", border: "1px solid #E2E8F2", borderRadius: 8,
  color: "#0F1E3A", padding: "10px 14px", fontSize: 14, outline: "none",
  flex: 1, minWidth: 180,
};

const smallBtnStyle: React.CSSProperties = {
  background: "#F0F2F8", color: "#8A9AB5", border: "1px solid #E2E8F2",
  borderRadius: 6, padding: "5px 10px", fontSize: 12, fontWeight: 600,
  cursor: "pointer",
};
