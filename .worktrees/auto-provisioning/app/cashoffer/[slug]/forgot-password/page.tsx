"use client";

import { useParams } from "next/navigation";
import Link from "next/link";

export default function V2ForgotPasswordPage() {
  const { slug } = useParams() as { slug: string };

  return (
    <div style={{
      minHeight: "100vh", background: "#0F1E3A",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
    }}>
      <div style={{
        background: "#0d1e36", border: "1px solid #1e3354",
        borderRadius: 16, padding: 40, width: "100%", maxWidth: 400,
      }}>
        <span style={{ color: "#16A34A", fontWeight: 800, fontSize: 18 }}>Cash Offers</span>
        <h1 style={{ color: "#F7F8FC", fontSize: 20, fontWeight: 700, marginTop: 8 }}>Forgot Password</h1>
        <p style={{ color: "#9BACC0", fontSize: 14, marginTop: 16 }}>
          Contact your account manager to reset your password.
        </p>
        <div style={{ marginTop: 24 }}>
          <Link href={`/cashoffer/${slug}/login`} style={{ color: "#9BACC0", fontSize: 13, textDecoration: "none" }}>
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}
