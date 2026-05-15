"use client";

import { useState, useEffect, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";

function SetupWizard() {
  const { slug } = useParams() as { slug: string };
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") ?? "";

  const [step, setStep] = useState(1);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [calendlyUrl, setCalendlyUrl] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) { setTokenValid(false); return; }
    fetch(`/api/v2client/setup?slug=${slug}&token=${token}`)
      .then(r => setTokenValid(r.ok))
      .catch(() => setTokenValid(false));
  }, [slug, token]);

  async function handleFinish() {
    setSubmitting(true);
    setError("");
    const res = await fetch("/api/v2client/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug, inviteToken: token, password,
        calendlyUrl: calendlyUrl || undefined,
      }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) { setError(data.error ?? "Setup failed"); return; }
    router.push(`/cashoffer/${slug}/leads`);
  }

  const S = {
    bg: "#0F1E3A", card: "#0d1e36", border: "#1e3354",
    text: "#F7F8FC", muted: "#9BACC0", green: "#16A34A",
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", boxSizing: "border-box",
    background: S.bg, border: `1px solid ${S.border}`, borderRadius: 8,
    color: S.text, padding: "12px 14px", fontSize: 14, outline: "none",
  };

  const btnStyle: React.CSSProperties = {
    width: "100%", background: S.green, color: "#fff",
    border: "none", borderRadius: 8, padding: "12px",
    fontWeight: 700, fontSize: 14, cursor: "pointer", marginTop: 8,
  };

  if (tokenValid === null) {
    return (
      <div style={{ minHeight: "100vh", background: S.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: S.muted }}>Verifying invite link...</p>
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div style={{ minHeight: "100vh", background: S.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 16, padding: 40, maxWidth: 400 }}>
          <p style={{ color: "#f87171", fontWeight: 700 }}>This invite link is invalid or has already been used.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: S.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 16, padding: 40, width: "100%", maxWidth: 440 }}>
        <p style={{ color: S.muted, fontSize: 12, marginBottom: 4 }}>Step {step} of 2</p>
        <h1 style={{ color: S.green, fontSize: 20, fontWeight: 800, marginBottom: 24 }}>
          {step === 1 ? "Set your password" : "Add your Calendly link"}
        </h1>

        {step === 1 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <input type="password" placeholder="Password (min 8 characters)" value={password}
              onChange={e => setPassword(e.target.value)} style={inputStyle} />
            <input type="password" placeholder="Confirm password" value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)} style={inputStyle} />
            {error && <p style={{ color: "#f87171", fontSize: 13 }}>{error}</p>}
            <button
              onClick={() => {
                if (password.length < 8) { setError("Password must be at least 8 characters"); return; }
                if (password !== confirmPassword) { setError("Passwords do not match"); return; }
                setError("");
                setStep(2);
              }}
              style={btnStyle}
            >
              Continue
            </button>
          </div>
        )}

        {step === 2 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <input type="url" placeholder="https://calendly.com/your-link (optional)"
              value={calendlyUrl} onChange={e => setCalendlyUrl(e.target.value)} style={inputStyle} />
            {error && <p style={{ color: "#f87171", fontSize: 13 }}>{error}</p>}
            <button onClick={handleFinish} disabled={submitting} style={{ ...btnStyle, opacity: submitting ? 0.7 : 1 }}>
              {submitting ? "Setting up..." : "Finish Setup"}
            </button>
            <button onClick={handleFinish} disabled={submitting}
              style={{ ...btnStyle, background: "transparent", border: `1px solid ${S.border}`, color: S.muted, marginTop: 0 }}>
              Skip for now
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SetupPage() {
  return <Suspense><SetupWizard /></Suspense>;
}
