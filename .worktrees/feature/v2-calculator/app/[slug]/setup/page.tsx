"use client";

import { useState, useEffect, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";

const SOCIAL_PLATFORMS = [
  { key: "instagramUrl", label: "Instagram", placeholder: "https://instagram.com/yourhandle" },
  { key: "facebookUrl",  label: "Facebook",  placeholder: "https://facebook.com/yourpage" },
  { key: "linkedinUrl",  label: "LinkedIn",  placeholder: "https://linkedin.com/in/yourprofile" },
  { key: "tiktokUrl",    label: "TikTok",    placeholder: "https://tiktok.com/@yourhandle" },
  { key: "youtubeUrl",   label: "YouTube",   placeholder: "https://youtube.com/@yourchannel" },
] as const;

type SocialKey = typeof SOCIAL_PLATFORMS[number]["key"];

function SetupWizard() {
  const { slug } = useParams() as { slug: string };
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") ?? "";

  const [step, setStep] = useState(1);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [headshotUrl, setHeadshotUrl] = useState("");
  const [headshotTab, setHeadshotTab] = useState<"upload" | "url">("upload");
  const [calendlyUrl, setCalendlyUrl] = useState("");
  const [socials, setSocials] = useState<Record<SocialKey, string>>({
    instagramUrl: "", facebookUrl: "", linkedinUrl: "", tiktokUrl: "", youtubeUrl: "",
  });

  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const STEP_LABELS = ["Set your password", "Your profile", "Your booking link", "Social channels"];

  useEffect(() => {
    if (!token) { setTokenValid(false); return; }
    fetch(`/api/affiliate/setup?slug=${slug}&token=${token}`)
      .then(r => setTokenValid(r.ok))
      .catch(() => setTokenValid(false));
  }, [slug, token]);

  async function handleUpload(file: File) {
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(
      `/api/affiliate/upload-headshot?slug=${slug}&invite_token=${token}`,
      { method: "POST", body: fd }
    );
    const data = await res.json();
    setUploading(false);
    if (res.ok) setHeadshotUrl(data.url);
    else setError(data.error ?? "Upload failed");
  }

  async function handleFinish() {
    setSubmitting(true);
    setError("");
    const res = await fetch("/api/affiliate/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug, inviteToken: token, password,
        name, email, phone,
        headshotUrl: headshotUrl || undefined,
        calendlyUrl: calendlyUrl || undefined,
        instagramUrl: socials.instagramUrl || undefined,
        facebookUrl:  socials.facebookUrl  || undefined,
        linkedinUrl:  socials.linkedinUrl  || undefined,
        tiktokUrl:    socials.tiktokUrl    || undefined,
        youtubeUrl:   socials.youtubeUrl   || undefined,
      }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) { setError(data.error ?? "Setup failed"); return; }
    router.push(`/${slug}/leads`);
  }

  if (tokenValid === null) {
    return <div style={centeredStyle}><p style={{ color: "#9BACC0" }}>Validating invite link&hellip;</p></div>;
  }

  if (!tokenValid) {
    return (
      <div style={centeredStyle}>
        <div style={cardStyle}>
          <p style={{ color: "#f87171", fontSize: 16, textAlign: "center" }}>
            This invite link is no longer valid.<br />Contact Misti for a new one.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={centeredStyle}>
      <div style={{ ...cardStyle, maxWidth: 500 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <span style={{ color: "#C8F135", fontWeight: 800, fontSize: 18 }}>HeyPearl</span>
          <p style={{ color: "#9BACC0", fontSize: 13, marginTop: 4 }}>
            Step {step} of 4 &mdash; {STEP_LABELS[step - 1]}
          </p>
          <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 12 }}>
            {[1, 2, 3, 4].map(s => (
              <div key={s} style={{
                height: 4, width: 48, borderRadius: 2,
                background: s <= step ? "#C8F135" : "#1e3354",
              }} />
            ))}
          </div>
        </div>

        {step === 1 && (
          <>
            <input type="password" placeholder="Password (min 8 characters)" value={password}
              onChange={e => setPassword(e.target.value)} style={inputStyle} />
            <input type="password" placeholder="Confirm password" value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)} style={{ ...inputStyle, marginTop: 12 }} />
            {error && <p style={{ color: "#f87171", fontSize: 13, marginTop: 6 }}>{error}</p>}
            <button onClick={() => {
              if (password.length < 8) { setError("Password must be at least 8 characters"); return; }
              if (password !== confirmPassword) { setError("Passwords don't match"); return; }
              setError(""); setStep(2);
            }} style={btnStyle}>Next</button>
          </>
        )}

        {step === 2 && (
          <>
            <input placeholder="Full name" value={name} onChange={e => setName(e.target.value)} style={inputStyle} />
            <input type="email" placeholder="Email (for password recovery)" value={email}
              onChange={e => setEmail(e.target.value)} style={{ ...inputStyle, marginTop: 12 }} />
            <input placeholder="Phone number" value={phone} onChange={e => setPhone(e.target.value)}
              style={{ ...inputStyle, marginTop: 12 }} />
            <div style={{ marginTop: 20 }}>
              <p style={{ color: "#9BACC0", fontSize: 13, marginBottom: 10 }}>Headshot (optional)</p>
              <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                {(["upload", "url"] as const).map(tab => (
                  <button key={tab} onClick={() => setHeadshotTab(tab)} style={{
                    background: headshotTab === tab ? "#C8F135" : "transparent",
                    color: headshotTab === tab ? "#0D1B2A" : "#9BACC0",
                    border: "1px solid #1e3354", borderRadius: 6,
                    padding: "5px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer",
                  }}>
                    {tab === "upload" ? "Upload photo" : "Paste URL"}
                  </button>
                ))}
              </div>
              {headshotTab === "upload" ? (
                <div>
                  <input type="file" accept="image/*" onChange={e => {
                    const f = e.target.files?.[0];
                    if (f) handleUpload(f);
                  }} style={{ color: "#9BACC0", fontSize: 13 }} />
                  {uploading && <p style={{ color: "#9BACC0", fontSize: 12, marginTop: 4 }}>Uploading&hellip;</p>}
                  {headshotUrl && <p style={{ color: "#C8F135", fontSize: 12, marginTop: 4 }}>Uploaded</p>}
                </div>
              ) : (
                <input placeholder="https://example.com/photo.jpg" value={headshotUrl}
                  onChange={e => setHeadshotUrl(e.target.value)}
                  style={{ ...inputStyle, fontSize: 13 }} />
              )}
            </div>
            {error && <p style={{ color: "#f87171", fontSize: 13, marginTop: 6 }}>{error}</p>}
            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button onClick={() => setStep(1)} style={{ ...btnStyle, background: "#1e3354", color: "#9BACC0", flex: "0 0 auto", width: 80 }}>Back</button>
              <button onClick={() => { setError(""); setStep(3); }} style={btnStyle}>Next</button>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <input placeholder="Your Calendly URL (e.g. https://calendly.com/...)" value={calendlyUrl}
              onChange={e => setCalendlyUrl(e.target.value)} style={inputStyle} />
            <div style={{
              background: "#0F1E3A", border: "1px solid #1e3354", borderRadius: 10,
              padding: 16, marginTop: 20,
            }}>
              <p style={{ color: "#9BACC0", fontSize: 12, marginBottom: 4 }}>Your landing page URL:</p>
              <p style={{ color: "#C8F135", fontFamily: "monospace", fontSize: 13 }}>
                https://geo.heypearl.io/{slug}
              </p>
            </div>
            {error && <p style={{ color: "#f87171", fontSize: 13, marginTop: 6 }}>{error}</p>}
            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button onClick={() => setStep(2)} style={{ ...btnStyle, background: "#1e3354", color: "#9BACC0", flex: "0 0 auto", width: 80 }}>Back</button>
              <button onClick={() => { setError(""); setStep(4); }} style={btnStyle}>Next</button>
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <p style={{ color: "#9BACC0", fontSize: 13, marginBottom: 16 }}>
              Add your social channels so they appear on your landing pages and emails. All optional — you can add or update these later from your dashboard.
            </p>
            {SOCIAL_PLATFORMS.map(({ key, label, placeholder }) => (
              <input
                key={key}
                placeholder={`${label} — ${placeholder}`}
                value={socials[key]}
                onChange={e => setSocials(prev => ({ ...prev, [key]: e.target.value }))}
                style={{ ...inputStyle, marginTop: 10 }}
              />
            ))}
            {error && <p style={{ color: "#f87171", fontSize: 13, marginTop: 6 }}>{error}</p>}
            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button onClick={() => setStep(3)} style={{ ...btnStyle, background: "#1e3354", color: "#9BACC0", flex: "0 0 auto", width: 80 }}>Back</button>
              <button onClick={handleFinish} disabled={submitting} style={{ ...btnStyle, opacity: submitting ? 0.7 : 1 }}>
                {submitting ? "Setting up\u2026" : "Complete Setup"}
              </button>
            </div>
            <button onClick={handleFinish} disabled={submitting} style={{
              width: "100%", marginTop: 8, background: "transparent", border: "none",
              color: "#9BACC0", fontSize: 13, cursor: "pointer", textDecoration: "underline",
            }}>
              Skip for now
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function SetupPage() {
  return (
    <Suspense fallback={<div style={centeredStyle}><p style={{ color: "#9BACC0" }}>Loading&hellip;</p></div>}>
      <SetupWizard />
    </Suspense>
  );
}

const centeredStyle: React.CSSProperties = {
  minHeight: "100vh", background: "#0F1E3A",
  display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
};
const cardStyle: React.CSSProperties = {
  background: "#0d1e36", border: "1px solid #1e3354",
  borderRadius: 16, padding: 40, width: "100%", maxWidth: 420,
};
const inputStyle: React.CSSProperties = {
  width: "100%", boxSizing: "border-box",
  background: "#0F1E3A", border: "1px solid #1e3354", borderRadius: 10,
  color: "#F7F8FC", padding: "12px 14px", fontSize: 15, outline: "none",
};
const btnStyle: React.CSSProperties = {
  flex: 1, background: "#C8F135", color: "#0D1B2A",
  border: "none", borderRadius: 10, padding: "12px",
  fontWeight: 800, fontSize: 15, cursor: "pointer", marginTop: 8, width: "100%",
};
