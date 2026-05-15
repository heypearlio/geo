"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const { slug } = useParams() as { slug: string };
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/affiliate/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, email }),
    });
    setLoading(false);
    setSubmitted(true);
  }

  return (
    <div style={centeredStyle}>
      <div style={cardStyle}>
        <span style={{ color: "#C8F135", fontWeight: 800, fontSize: 18 }}>HeyLocal</span>
        <h1 style={{ color: "#F7F8FC", fontSize: 20, fontWeight: 700, marginTop: 8 }}>Reset Password</h1>

        {submitted ? (
          <p style={{ color: "#9BACC0", fontSize: 14, marginTop: 16 }}>
            If that email matches your account, you&apos;ll receive a reset link shortly.
          </p>
        ) : (
          <form onSubmit={handleSubmit} style={{ marginTop: 24 }}>
            <input type="email" placeholder="Your email address" value={email}
              onChange={e => setEmail(e.target.value)} required style={inputStyle} />
            <button type="submit" disabled={loading} style={btnStyle}>
              {loading ? "Sending\u2026" : "Send Reset Link"}
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
