"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  publicKey: string;
  assistantId: string;
  avatarUrl: string;
  headline: string;
  subheadline: string;
  statusLabel: string;
  activeStatusLabel: string;
  ctaLabel: string;
  ctaActiveLabel: string;
  ctaLoadingLabel: string;
  accentColor: string;
}

export default function VapiSupportCard({
  publicKey,
  assistantId,
  avatarUrl,
  headline,
  subheadline,
  statusLabel,
  activeStatusLabel,
  ctaLabel,
  ctaActiveLabel,
  ctaLoadingLabel,
  accentColor,
}: Props) {
  const vapiRef = useRef<any>(null);
  const [active, setActive] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let instance: any;
    import("@vapi-ai/web").then(({ default: Vapi }) => {
      instance = new Vapi(publicKey);
      vapiRef.current = instance;
      instance.on("call-start", () => { setActive(true); setLoading(false); });
      instance.on("call-end", () => { setActive(false); setLoading(false); });
    });
    return () => { instance?.stop(); };
  }, [publicKey]);

  const toggle = () => {
    if (!vapiRef.current) return;
    if (active) {
      vapiRef.current.stop();
    } else {
      setLoading(true);
      vapiRef.current.start(assistantId);
    }
  };

  return (
    <div style={{
      background: "rgba(255,255,255,0.05)",
      border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: 16,
      padding: "24px 20px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      textAlign: "center",
      gap: 12,
    }}>
      {/* Avatar */}
      <div style={{ position: "relative", width: 64, height: 64 }}>
        {active && (
          <div style={{
            position: "absolute",
            inset: -4,
            borderRadius: "50%",
            border: `2px solid ${accentColor}`,
            animation: "pulse 1.5s ease-in-out infinite",
          }} />
        )}
        <img
          src={avatarUrl}
          alt="Pearl"
          style={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            objectFit: "cover",
            border: `2px solid ${accentColor}`,
            display: "block",
          }}
        />
        <div style={{
          position: "absolute",
          bottom: 2,
          right: 2,
          width: 10,
          height: 10,
          borderRadius: "50%",
          background: active ? accentColor : "#22c55e",
          border: "2px solid #0F1E3A",
        }} />
      </div>

      {/* Text */}
      <div>
        <p style={{ color: accentColor, fontSize: 11, fontWeight: 600, margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "1px" }}>
          {active ? activeStatusLabel : statusLabel}
        </p>
        <p style={{ color: "#ffffff", fontSize: 15, fontWeight: 700, margin: "0 0 4px" }}>
          {headline}
        </p>
        <p style={{ color: "#6B8BAD", fontSize: 12, margin: 0, lineHeight: 1.5 }}>
          {subheadline}
        </p>
      </div>

      {/* Button */}
      <button
        onClick={toggle}
        disabled={loading}
        style={{
          background: active ? "rgba(255,255,255,0.12)" : "#ffffff",
          color: active ? "#ffffff" : "#0F1E3A",
          border: active ? "1px solid rgba(255,255,255,0.3)" : "none",
          borderRadius: 10,
          padding: "10px 24px",
          fontWeight: 700,
          fontSize: 14,
          cursor: loading ? "wait" : "pointer",
          width: "100%",
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading ? ctaLoadingLabel : active ? ctaActiveLabel : ctaLabel}
      </button>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.08); }
        }
      `}</style>
    </div>
  );
}
