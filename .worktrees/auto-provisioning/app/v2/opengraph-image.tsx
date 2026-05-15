import { ImageResponse } from "next/og";
import { v2ColorPrimary } from "./meta";

function hexToRgba(hex: string, alpha: number) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export const runtime = "edge";
export const alt = "V2 by HeyPearl — Done-for-you listing appointment system for real estate agents";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#0F1E3A",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          paddingTop: 60,
          paddingBottom: 60,
          paddingLeft: 80,
          paddingRight: 80,
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* Accent glow */}
        <div style={{ position: "absolute", top: -100, right: -100, width: 500, height: 500, borderRadius: "50%", background: hexToRgba(v2ColorPrimary, 0.15) }} />
        <div style={{ position: "absolute", bottom: -80, left: -80, width: 400, height: 400, borderRadius: "50%", background: hexToRgba(v2ColorPrimary, 0.08) }} />

        {/* Brand label */}
        <div style={{ display: "flex", alignItems: "center", marginBottom: 28 }}>
          <span style={{ color: "#9BACC0", fontSize: 22, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase" }}>
            V2 by HeyPearl
          </span>
        </div>

        {/* Headline — two lines, no nested colored spans */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 36 }}>
          <div style={{ display: "flex" }}>
            <span style={{ color: "#FFFFFF", fontSize: 58, fontWeight: 900, textAlign: "center", lineHeight: 1.1 }}>
              Fill Your Calendar With
            </span>
          </div>
          <div style={{ display: "flex" }}>
            <span style={{ color: v2ColorPrimary, fontSize: 58, fontWeight: 900, textAlign: "center", lineHeight: 1.1 }}>
              Ready-To-List Sellers.
            </span>
          </div>
        </div>

        {/* Badge */}
        <div style={{ display: "flex", background: v2ColorPrimary, borderRadius: 14, paddingTop: 16, paddingBottom: 16, paddingLeft: 40, paddingRight: 40 }}>
          <span style={{ color: "#FFFFFF", fontSize: 26, fontWeight: 800, letterSpacing: "0.07em", textTransform: "uppercase" }}>
            Only 1 Listing Market Per City
          </span>
        </div>
      </div>
    ),
    { ...size }
  );
}
