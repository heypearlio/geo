"use client";

import { useEffect, useRef, useState } from "react";

type CallStatus = "idle" | "connecting" | "active" | "ending";

export default function VapiWidget({
  publicKey,
  assistantId,
}: {
  publicKey: string;
  assistantId: string;
}) {
  const vapiRef = useRef<import("@vapi-ai/web").default | null>(null);
  const [status, setStatus] = useState<CallStatus>("idle");
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    let instance: import("@vapi-ai/web").default;

    import("@vapi-ai/web").then(({ default: Vapi }) => {
      instance = new Vapi(publicKey);
      vapiRef.current = instance;

      instance.on("call-start", () => setStatus("active"));
      instance.on("call-end", () => { setStatus("idle"); setIsMuted(false); });
      instance.on("error", () => setStatus("idle"));
    });

    return () => {
      if (vapiRef.current) {
        try { vapiRef.current.stop(); } catch {}
      }
    };
  }, [publicKey]);

  async function toggleCall() {
    if (!vapiRef.current) return;
    if (status === "active" || status === "connecting") {
      setStatus("ending");
      vapiRef.current.stop();
    } else {
      setStatus("connecting");
      try {
        await vapiRef.current.start(assistantId);
      } catch {
        setStatus("idle");
      }
    }
  }

  function toggleMute() {
    if (!vapiRef.current || status !== "active") return;
    const next = !isMuted;
    vapiRef.current.setMuted(next);
    setIsMuted(next);
  }

  const isLive = status === "active";
  const isBusy = status === "connecting" || status === "ending";

  return (
    <div style={{
      position: "fixed",
      bottom: 24,
      right: 24,
      zIndex: 9999,
      display: "flex",
      flexDirection: "column",
      alignItems: "flex-end",
      gap: 10,
    }}>

      {/* Tooltip label */}
      {status === "idle" && (
        <div style={{
          background: "#0F1E3A",
          color: "#fff",
          fontSize: 13,
          fontWeight: 600,
          padding: "6px 14px",
          borderRadius: 20,
          whiteSpace: "nowrap",
          boxShadow: "0 4px 16px rgba(0,0,0,0.18)",
        }}>
          Talk to Pearl AI
        </div>
      )}

      {/* Active call controls */}
      {isLive && (
        <div style={{
          background: "#0F1E3A",
          borderRadius: 16,
          padding: "10px 14px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
        }}>
          <span style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>Live</span>
          <span style={{
            width: 8, height: 8, borderRadius: "50%",
            background: "#16A34A",
            display: "inline-block",
            animation: "pulse 1.5s infinite",
          }} />
          <button
            onClick={toggleMute}
            style={{
              background: isMuted ? "rgba(255,255,255,0.15)" : "transparent",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: 8,
              color: isMuted ? "#fff" : "#9BACC0",
              fontSize: 12,
              fontWeight: 600,
              padding: "4px 10px",
              cursor: "pointer",
            }}
          >
            {isMuted ? "Unmute" : "Mute"}
          </button>
        </div>
      )}

      {/* Main button */}
      <button
        onClick={toggleCall}
        disabled={isBusy}
        style={{
          width: 60,
          height: 60,
          borderRadius: "50%",
          border: "none",
          cursor: isBusy ? "default" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 26,
          boxShadow: isLive
            ? "0 0 0 4px rgba(220,38,38,0.3), 0 4px 20px rgba(0,0,0,0.25)"
            : "0 4px 20px rgba(0,0,0,0.25)",
          background: isLive ? "#DC2626"
            : isBusy ? "#6B7FA0"
            : "#16A34A",
          transition: "background 0.2s, box-shadow 0.2s",
          opacity: isBusy ? 0.7 : 1,
        }}
        title={isLive ? "End call" : isBusy ? "Connecting…" : "Start call"}
      >
        {isLive ? "✕" : isBusy ? "⋯" : "🎙️"}
      </button>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
