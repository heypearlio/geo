"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const S = {
  bg: "#0F1E3A", card: "#0d1e36", border: "#1e3354",
  text: "#F7F8FC", muted: "#9BACC0", pink: "#E8185C",
};

export default function AccountLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/account/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Login failed");
      return;
    }

    router.push("/account/dashboard");
  }

  const inputStyle: React.CSSProperties = {
    background: "#1a2d4a", border: `1px solid ${S.border}`, borderRadius: 6,
    color: S.text, padding: "10px 14px", fontSize: 14, width: "100%",
    boxSizing: "border-box", outline: "none",
  };

  return (
    <div style={{ background: S.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ marginBottom: 32, textAlign: "center" }}>
          <div style={{ color: S.pink, fontWeight: 800, fontSize: 22, letterSpacing: "-0.02em" }}>HeyPearl</div>
          <div style={{ color: S.muted, fontSize: 14, marginTop: 6 }}>Sign in to your account</div>
        </div>

        <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 12, padding: 32 }}>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ color: S.muted, fontSize: 12, display: "block", marginBottom: 6 }}>Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="todd@example.com"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ color: S.muted, fontSize: 12, display: "block", marginBottom: 6 }}>Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Your password"
                style={inputStyle}
              />
            </div>

            {error && (
              <div style={{ color: "#f87171", fontSize: 13, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 6, padding: "8px 12px" }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                background: S.pink, color: "#fff", border: "none", borderRadius: 8,
                padding: "12px 24px", fontWeight: 700, fontSize: 14,
                cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1,
                marginTop: 8,
              }}
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
