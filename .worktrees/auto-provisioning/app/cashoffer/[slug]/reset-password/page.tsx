"use client";

import { useParams } from "next/navigation";
import Link from "next/link";

export default function V2ResetPasswordPage() {
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
        <p style={{ color: "#f87171", fontWeight: 700 }}>This reset link is not yet active. Contact your account manager.</p>
        <div style={{ marginTop: 24 }}>
          <Link href={`/cashoffer/${slug}/login`} style={{ color: "#9BACC0", fontSize: 13, textDecoration: "none" }}>
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}
