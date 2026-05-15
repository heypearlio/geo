"use client";

import { useState, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function ResetPasswordForm() {
  const { slug } = useParams() as { slug: string };
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setError("Passwords don't match"); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters"); return; }
    setLoading(true);
    setError("");

    const res = await fetch("/api/affiliate/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, token, newPassword: password }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) { setError(data.error ?? "Reset failed"); return; }
    setDone(true);
    setTimeout(() => router.push(`/${slug}/login`), 2000);
  }

  if (!token) {
    return <p style={{ color: "#f87171" }}>Invalid reset link.</p>;
  }

  return (
    <div style={centeredStyle}>
      <div style={cardStyle}>
        <span style={{ color: "#C8F135", fontWeight: 800, fontSize: 18 }}>HeyLocal</span>
        <h1 style={{ color: "#F7F8FC", fontSize: 20, fontWeight: 700, marginTop: 8 }}>Set New Password</h1>

        {done ? (
          <p style={{ color: "#86efac", fontSize: 14, marginTop: 16 }}>
            Password updated. Redirecting to login&hellip;
          </p>
        ) : (
          <form onSubmit={handleSubmit} style={{ marginTop: 24 }}>
            <input type="password" placeholder="New password (min 8 characters)" value={password}
              onChange={e => setPassword(e.target.value)} required style={inputStyle} />
            <input type="password" placeholder="Confirm new password" value={confirm}
              onChange={e => setConfirm(e.target.value)} required
              style={{ ...inputStyle, marginTop: 12 }} />
            {error && <p style={{ color: "#f87171", fontSize: 13, marginTop: 6 }}>{error}</p>}
            <button type="submit" disabled={loading} style={btnStyle}>
              {loading ? "Saving\u2026" : "Set New Password"}
            </button>
          </form>
        )}

        <div style={{ marginTop: 20 }}>
          <Link href={`/${slug}/login`} style={{ color: "#9BACC0", fontSize: 13, textDecoration: "none" }}>
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#0F1E3A" }} />}>
      <ResetPasswordForm />
    </Suspense>
  );
}

const centeredStyle: React.CSSProperties = {
  minHeight: "100vh", background: "#0F1E3A",
  display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
};
const cardStyle: React.CSSProperties = {
  background: "#0d1e36", border: "1px solid #1e3354",
  borderRadius: 16, padding: 40, width: "100%", maxWidth: 400,
};
const inputStyle: React.CSSProperties = {
  width: "100%", boxSizing: "border-box",
  background: "#0F1E3A", border: "1px solid #1e3354", borderRadius: 10,
  color: "#F7F8FC", padding: "12px 14px", fontSize: 15, outline: "none",
};
const btnStyle: React.CSSProperties = {
  width: "100%", background: "#C8F135", color: "#0D1B2A",
  border: "none", borderRadius: 10, padding: "12px",
  fontWeight: 800, fontSize: 15, cursor: "pointer", marginTop: 16,
};
