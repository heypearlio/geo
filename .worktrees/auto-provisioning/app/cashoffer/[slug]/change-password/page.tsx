"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";

export default function V2ChangePasswordPage() {
  const { slug } = useParams() as { slug: string };
  const router = useRouter();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const S = {
    bg: "#F0F2F8", card: "#ffffff", border: "#E2E8F2",
    text: "#0F1E3A", muted: "#8A9AB5", green: "#16A34A",
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", boxSizing: "border-box",
    background: S.bg, border: `1px solid ${S.border}`, borderRadius: 8,
    color: S.text, padding: "12px 14px", fontSize: 14, outline: "none",
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (next !== confirm) { setError("Passwords do not match"); return; }
    setLoading(true);
    setError("");
    const res = await fetch("/api/v2client/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: current, newPassword: next }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error ?? "Failed"); return; }
    setSuccess(true);
    setTimeout(() => router.push(`/cashoffer/${slug}/leads`), 1500);
  }

  return (
    <div style={{ padding: "48px 24px", maxWidth: 480, margin: "0 auto" }}>
      <h1 style={{ color: S.text, fontSize: 22, fontWeight: 800, marginBottom: 24 }}>Change Password</h1>
      {success ? (
        <p style={{ color: S.green, fontWeight: 700 }}>Password updated. Redirecting...</p>
      ) : (
        <form onSubmit={handleSubmit} style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 12, padding: 24, display: "flex", flexDirection: "column", gap: 12 }}>
          <input type="password" placeholder="Current password" value={current} onChange={e => setCurrent(e.target.value)} required style={inputStyle} />
          <input type="password" placeholder="New password (min 8 characters)" value={next} onChange={e => setNext(e.target.value)} required style={inputStyle} />
          <input type="password" placeholder="Confirm new password" value={confirm} onChange={e => setConfirm(e.target.value)} required style={inputStyle} />
          {error && <p style={{ color: "#f87171", fontSize: 13, margin: 0 }}>{error}</p>}
          <button type="submit" disabled={loading}
            style={{ background: S.green, color: "#fff", border: "none", borderRadius: 8, padding: "12px", fontWeight: 700, fontSize: 14, cursor: "pointer", opacity: loading ? 0.7 : 1 }}>
            {loading ? "Saving..." : "Update Password"}
          </button>
        </form>
      )}
    </div>
  );
}
