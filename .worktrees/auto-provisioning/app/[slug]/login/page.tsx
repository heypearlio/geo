"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

export default function AffiliateLoginPage() {
  const { slug } = useParams() as { slug: string };
  const router = useRouter();
  const [affiliateName, setAffiliateName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/affiliate/me").then(r => {
      if (r.ok) r.json().then(d => { if (d.slug === slug) router.push(`/${slug}/leads`); });
    });
    setAffiliateName(slug.charAt(0).toUpperCase() + slug.slice(1));
  }, [slug, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/affiliate/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, password }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error ?? "Login failed"); return; }
    router.push(`/${slug}/leads`);
  }

  return (
    <div style={{
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      background: "#0F1E3A", color: "#F7F8FC",
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      padding: 24,
    }}>
      <div style={{ width: "100%", maxWidth: 380, padding: "0 24px" }}>
        <h1 style={{ color: "#E8185C", marginBottom: 8, fontSize: 22, textAlign: "center", fontWeight: 800 }}>
          HeyLocal
        </h1>
        <p style={{ color: "#4A5E7A", fontSize: 12, textAlign: "center", marginBottom: 36 }}>
          {affiliateName} Dashboard
        </p>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            style={{
              background: "#1a2d4a", border: "1px solid #1a2d4a",
              color: "#F7F8FC", padding: "12px 16px",
              borderRadius: 6, fontSize: 13, outline: "none",
            }}
          />
          {error && <p style={{ color: "#f87171", fontSize: 12, margin: 0 }}>{error}</p>}
          <button
            type="submit"
            disabled={loading}
            style={{
              background: "#E8185C", color: "#fff", border: "none",
              padding: "12px", borderRadius: 6, fontSize: 13, fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <div style={{ marginTop: 20, textAlign: "center" }}>
          <Link href={`/${slug}/forgot-password`} style={{ color: "#4A5E7A", fontSize: 13, textDecoration: "none" }}>
            Forgot password?
          </Link>
        </div>
      </div>
    </div>
  );
}
