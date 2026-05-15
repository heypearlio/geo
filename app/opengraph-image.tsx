import { ImageResponse } from "next/og";
import { brand } from "./config/brand";

function hexToRgba(hex: string, alpha: number) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export const runtime = "edge";
export const alt = brand.meta.title;
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
          padding: "60px 80px",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* Accent glow */}
        <div style={{ position: "absolute", top: -100, right: -100, width: 500, height: 500, borderRadius: "50%", background: hexToRgba(brand.colors.primary, 0.15) }} />
        <div style={{ position: "absolute", bottom: -80, left: -80, width: 400, height: 400, borderRadius: "50%", background: hexToRgba(brand.colors.primary, 0.08) }} />

        {/* Brand label */}
        <div style={{ display: "flex", alignItems: "center", marginBottom: 28 }}>
          <span style={{ color: "#9BACC0", fontSize: 22, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase" }}>
            GEO by HeyPearl
          </span>
        </div>

        {/* Headline */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 36 }}>
          <span style={{ color: "#FFFFFF", fontSize: 64, fontWeight: 900, textAlign: "center", lineHeight: 1.08, maxWidth: 960 }}>
            {brand.ogImage.headline}
          </span>
        </div>

        {/* Badge */}
        <div style={{ display: "flex", background: brand.colors.primary, borderRadius: 14, paddingTop: 16, paddingBottom: 16, paddingLeft: 40, paddingRight: 40 }}>
          <span style={{ color: "#FFFFFF", fontSize: 26, fontWeight: 800, letterSpacing: "0.07em", textTransform: "uppercase" }}>
            {brand.ogImage.badge}
          </span>
        </div>
      </div>
    ),
    { ...size }
  );
}
