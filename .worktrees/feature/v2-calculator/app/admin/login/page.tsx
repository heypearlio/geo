"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLogin() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (res.ok) {
      router.push("/admin/leads");
    } else {
      setError("Invalid username or password.");
      setLoading(false);
    }
  }

  return (
    <div style={{
      fontFamily: "monospace",
      background: "#0F1E3A",
      color: "#F7F8FC",
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}>
      <div style={{ width: "100%", maxWidth: 380, padding: "0 24px" }}>
        <h1 style={{ color: "#E8185C", marginBottom: 8, fontSize: 22, textAlign: "center" }}>GEO Admin</h1>
        <p style={{ color: "#4A5E7A", fontSize: 12, textAlign: "center", marginBottom: 36 }}>geo.heypearl.io</p>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <input
            type="email"
            placeholder="Email"
            value={username}
            onChange={e => setUsername(e.target.value)}
            required
            style={{
              background: "#1a2d4a",
              border: "1px solid #1a2d4a",
              color: "#F7F8FC",
              padding: "12px 16px",
              borderRadius: 6,
              fontSize: 13,
              outline: "none",
            }}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            style={{
              background: "#1a2d4a",
              border: "1px solid #1a2d4a",
              color: "#F7F8FC",
              padding: "12px 16px",
              borderRadius: 6,
              fontSize: 13,
              outline: "none",
            }}
          />
          {error && (
            <p style={{ color: "#f87171", fontSize: 12, margin: 0 }}>{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            style={{
              background: "#E8185C",
              color: "#fff",
              border: "none",
              padding: "12px",
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
              fontFamily: "monospace",
            }}
          >
            {loading ? "Logging in..." : "Log In"}
          </button>
        </form>
      </div>
    </div>
  );
}
