"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const S = {
  bg: "#0F1E3A", card: "#0d1e36", border: "#1e3354",
  text: "#F7F8FC", muted: "#9BACC0", pink: "#E8185C",
  green: "#16A34A", faint: "#4A5E7A",
};

interface AccountOffer {
  offer: string;
  slug: string | null;
  meta: Record<string, unknown>;
}

interface Account {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  headshot_url: string | null;
  offers: AccountOffer[];
}

function offerLinks(o: AccountOffer): { label: string; href: string }[] {
  const slug = o.slug ?? "";
  if (o.offer === "affiliate") {
    return [
      { label: "My Leads Dashboard", href: `https://geo.heypearl.io/${slug}/leads` },
      { label: "GEO Funnel Page",    href: `https://geo.heypearl.io/${slug}` },
      { label: "V2 Funnel Page",     href: `https://v2.heypearl.io/${slug}` },
      { label: "Local Funnel Page",  href: `https://local.heypearl.io/${slug}` },
      { label: "My Business Card",   href: `https://${slug}.heypearl.io` },
    ];
  }
  if (o.offer === "v2") {
    return [
      { label: "My Leads Dashboard", href: `https://v2.heypearl.io/cashoffer/${slug}/leads` },
    ];
  }
  return [];
}

function offerTitle(offer: string): string {
  if (offer === "affiliate") return "Affiliate Partner";
  if (offer === "v2")        return "CashOffer Client";
  if (offer === "geo")       return "GEO Client";
  if (offer === "local")     return "Local Client";
  return offer;
}

export default function AccountDashboard() {
  const router = useRouter();
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);

  // Settings form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName]   = useState("");
  const [phone, setPhone]         = useState("");
  const [headshotUrl, setHeadshotUrl] = useState("");
  const [saving, setSaving]       = useState(false);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast]         = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  }

  useEffect(() => {
    fetch("/api/account/me")
      .then(r => {
        if (!r.ok) { router.push("/account/login"); return null; }
        return r.json();
      })
      .then((data: Account | null) => {
        if (!data) {
          setLoading(false);
          return;
        }
        setAccount(data);
        setFirstName(data.first_name ?? "");
        setLastName(data.last_name ?? "");
        setPhone(data.phone ?? "");
        setHeadshotUrl(data.headshot_url ?? "");
        setLoading(false);
      });
  }, [router]);

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const uploadRes = await fetch("/api/account/upload-headshot", { method: "POST", body: fd });
    if (!uploadRes.ok) { setUploading(false); showToast("Upload failed"); return; }
    const { url } = await uploadRes.json();
    // Auto-save the URL to DB immediately so it persists without requiring "Save Changes"
    const saveRes = await fetch("/api/account/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ headshot_url: url }),
    });
    setUploading(false);
    if (!saveRes.ok) { showToast("Photo saved to preview but failed to persist — click Save Changes"); return; }
    setHeadshotUrl(url);
    showToast("Photo saved");
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/account/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        first_name: firstName,
        last_name: lastName,
        phone,
        headshot_url: headshotUrl,
      }),
    });
    setSaving(false);
    if (!res.ok) { showToast("Save failed"); return; }
    const updated = await res.json();
    setAccount(prev => prev ? { ...prev, ...updated } : prev);
    showToast("Saved");
  }

  const inputStyle: React.CSSProperties = {
    background: "#1a2d4a", border: `1px solid ${S.border}`, borderRadius: 6,
    color: S.text, padding: "9px 12px", fontSize: 13, width: "100%",
    boxSizing: "border-box", outline: "none",
  };

  if (loading) {
    return (
      <div style={{ background: S.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ color: S.muted, fontSize: 14 }}>Loading...</span>
      </div>
    );
  }

  if (!account) return null;

  const displayName = [account.first_name, account.last_name].filter(Boolean).join(" ") || account.email;

  return (
    <div style={{ background: S.bg, minHeight: "100vh", padding: "32px 24px" }}>
      {toast && (
        <div style={{
          position: "fixed", top: 20, right: 20, background: S.card,
          border: `1px solid ${S.border}`, borderRadius: 8, padding: "12px 20px",
          color: S.text, fontSize: 13, zIndex: 100,
        }}>
          {toast}
        </div>
      )}

      <div style={{ maxWidth: 720, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ color: S.text, fontSize: 22, fontWeight: 700, margin: 0 }}>
            Welcome back, {account.first_name || displayName}
          </h1>
          <p style={{ color: S.muted, fontSize: 13, marginTop: 4 }}>{account.email}</p>
        </div>

        {/* Offer Cards */}
        {account.offers.length > 0 && (
          <div style={{ marginBottom: 40 }}>
            <h2 style={{ color: S.text, fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Your Offers</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {account.offers.map(o => {
                const links = offerLinks(o);
                return (
                  <div
                    key={o.offer}
                    style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 10, padding: 24 }}
                  >
                    <div style={{ color: S.text, fontWeight: 700, fontSize: 15, marginBottom: 4 }}>
                      {offerTitle(o.offer)}
                    </div>
                    {o.slug && (
                      <div style={{ color: S.muted, fontSize: 12, marginBottom: 16 }}>
                        Slug: {o.slug}
                      </div>
                    )}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                      {links.map(l => (
                        <a
                          key={l.href}
                          href={l.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            background: "#1a2d4a", border: `1px solid ${S.border}`,
                            borderRadius: 6, color: S.text, textDecoration: "none",
                            padding: "7px 14px", fontSize: 13, fontWeight: 500,
                            display: "inline-block",
                          }}
                        >
                          {l.label} ↗
                        </a>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Profile Settings */}
        <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 10, padding: 24 }}>
          <h2 style={{ color: S.text, fontSize: 15, fontWeight: 600, marginBottom: 20 }}>Profile</h2>

          {/* Headshot */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
            <div
              onClick={() => fileRef.current?.click()}
              style={{
                width: 72, height: 72, borderRadius: "50%",
                background: headshotUrl ? "transparent" : "#1a2d4a",
                border: `2px solid ${S.border}`, cursor: "pointer",
                overflow: "hidden", flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              {headshotUrl ? (
                <img src={headshotUrl} alt="Photo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <span style={{ color: S.faint, fontSize: 11 }}>Photo</span>
              )}
            </div>
            <div>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                style={{
                  background: "transparent", border: `1px solid ${S.border}`, borderRadius: 6,
                  color: S.muted, padding: "6px 14px", fontSize: 12, cursor: uploading ? "not-allowed" : "pointer",
                  opacity: uploading ? 0.6 : 1,
                }}
              >
                {uploading ? "Uploading..." : "Change Photo"}
              </button>
              <p style={{ color: S.faint, fontSize: 11, margin: "4px 0 0" }}>JPG, PNG, WebP — max 5MB</p>
            </div>
            <input ref={fileRef} type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: "none" }} />
          </div>

          <form onSubmit={handleSave}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
              <div>
                <label style={{ color: S.muted, fontSize: 12, display: "block", marginBottom: 5 }}>First Name</label>
                <input style={inputStyle} value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Todd" />
              </div>
              <div>
                <label style={{ color: S.muted, fontSize: 12, display: "block", marginBottom: 5 }}>Last Name</label>
                <input style={inputStyle} value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Smith" />
              </div>
              <div>
                <label style={{ color: S.muted, fontSize: 12, display: "block", marginBottom: 5 }}>Phone</label>
                <input style={inputStyle} value={phone} onChange={e => setPhone(e.target.value)} placeholder="(555) 123-4567" />
              </div>
              <div>
                <label style={{ color: S.muted, fontSize: 12, display: "block", marginBottom: 5 }}>Email</label>
                <input style={{ ...inputStyle, opacity: 0.5, cursor: "not-allowed" }} value={account.email} readOnly />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                type="submit"
                disabled={saving}
                style={{
                  background: S.pink, color: "#fff", border: "none", borderRadius: 7,
                  padding: "9px 24px", fontWeight: 700, fontSize: 13,
                  cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1,
                }}
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>

          <div style={{ borderTop: `1px solid ${S.border}`, marginTop: 20, paddingTop: 14 }}>
            <p style={{ color: S.faint, fontSize: 12, margin: 0 }}>
              Social links and Calendly URL are managed in your leads dashboard Settings modal.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
