import { ImageResponse } from "next/og";
import cfg from "@/app/card/config";

export const runtime = "edge";
export const alt = "HeyPearl — Get Found. Get Chosen. Get Paid.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          background: `linear-gradient(135deg, ${cfg.colorNavy} 0%, ${cfg.colorNavyDeep} 100%)`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          position: "relative",
        }}
      >
        {/* Subtle glow */}
        <div style={{
          position: "absolute",
          top: -100,
          left: "50%",
          transform: "translateX(-50%)",
          width: 600,
          height: 400,
          borderRadius: "50%",
          background: "radial-gradient(ellipse, rgba(245,200,66,0.08) 0%, transparent 70%)",
          display: "flex",
        }} />

        {/* Brand name */}
        <div style={{ color: cfg.colorGold, fontSize: 52, fontWeight: 800, letterSpacing: "-1px", marginBottom: 16, display: "flex" }}>
          {cfg.brandName}
        </div>

        {/* Divider */}
        <div style={{ width: 60, height: 3, background: "rgba(245,200,66,0.5)", borderRadius: 2, marginBottom: 24, display: "flex" }} />

        {/* Tagline */}
        <div style={{ color: "rgba(255,255,255,0.85)", fontSize: 28, fontWeight: 400, letterSpacing: "-0.3px", textAlign: "center", maxWidth: 700, lineHeight: 1.4, display: "flex" }}>
          {cfg.metaTagline}
        </div>

        {/* Bottom badge */}
        <div style={{
          position: "absolute",
          bottom: 40,
          display: "flex",
          alignItems: "center",
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 24,
          padding: "8px 20px",
          color: "rgba(255,255,255,0.4)",
          fontSize: 16,
          letterSpacing: "0.5px",
        }}>
          heypearl.io
        </div>
      </div>
    ),
    { ...size }
  );
}
