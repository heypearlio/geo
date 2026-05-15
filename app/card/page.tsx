// ─────────────────────────────────────────────────────────────────────────────
// GOD V-CARD — Misti Bruton (Master Template)
// Accessible at: geo.heypearl.io/card
//
// This is the master version. Updating config.ts updates:
//   - This god card (Misti's card)
//   - Every affiliate card automatically on next deploy
// ─────────────────────────────────────────────────────────────────────────────

import type { Metadata } from "next";
import cfg from "./config";
import { cardMetaForSlug } from "./meta";
import VapiSupportCard from "./[slug]/VapiSupportCard";

export const metadata: Metadata = cardMetaForSlug("misti");

const OFFER_CONFIG: Record<string, { label: string; section: string; url: (slug: string) => string }> = {
  geo:   { label: "GEO AI Visibility Engine",      section: "For Real Estate Agents", url: () => `https://geo.heypearl.io` },
  v2:    { label: "V2 Seller Attraction Engine",   section: "For Real Estate Agents", url: () => `https://v2.heypearl.io` },
  local: { label: "Local Business Growth Engine",  section: "For Local Businesses",  url: () => `https://local.heypearl.io` },
};

const SECTION_ORDER = ["For Real Estate Agents", "For Local Businesses"];

const btn: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  background: "#ffffff",
  color: cfg.colorNavy,
  padding: "14px 18px",
  borderRadius: 12,
  fontWeight: 600,
  fontSize: 14,
  textDecoration: "none",
  border: "none",
  boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
  letterSpacing: "-0.1px",
};

const sectionLabel: React.CSSProperties = {
  fontSize: 10,
  color: `rgba(245,200,66,0.7)`,
  textTransform: "uppercase",
  letterSpacing: "2px",
  fontWeight: 700,
  margin: "0 0 10px",
};

const glassCard: React.CSSProperties = {
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 16,
  padding: "20px 16px",
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

export default function GodCardPage() {
  const god = cfg.godProfile;

  const sections: Record<string, Array<{ label: string; url: string }>> = {};
  for (const offerKey of god.offers) {
    const offerCfg = OFFER_CONFIG[offerKey];
    if (!offerCfg) continue;
    if (!sections[offerCfg.section]) sections[offerCfg.section] = [];
    sections[offerCfg.section].push({ label: offerCfg.label, url: offerCfg.url(offerKey) });
  }

  const hasOffers = Object.keys(sections).length > 0;

  return (
    <div style={{
      minHeight: "100vh",
      background: `linear-gradient(160deg, ${cfg.colorNavy} 0%, ${cfg.colorNavyDeep} 100%)`,
      display: "flex",
      alignItems: "flex-start",
      justifyContent: "center",
      padding: "36px 16px 72px",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    }}>
      <div style={{ width: "100%", maxWidth: 400, display: "flex", flexDirection: "column", gap: 20 }}>

        {/* Logo */}
        <div style={{ display: "flex", justifyContent: "center", paddingBottom: 4 }}>
          <img src={cfg.logoUrl} alt={cfg.brandName} style={{ height: 32, width: "auto", opacity: 0.9 }} />
        </div>

        {/* Profile card */}
        <div style={{
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 20,
          padding: "28px 20px 24px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
        }}>
          {god.headshot_url && (
            <div style={{ position: "relative", width: 112, height: 112, marginBottom: 16 }}>
              <div style={{
                position: "absolute",
                inset: -3,
                borderRadius: "50%",
                background: `linear-gradient(135deg, ${cfg.colorGold}, #e0b030)`,
              }} />
              <img
                src={god.headshot_url}
                alt={god.name}
                style={{
                  position: "relative",
                  width: 112,
                  height: 112,
                  borderRadius: "50%",
                  objectFit: "cover",
                  border: `3px solid ${cfg.colorNavy}`,
                  display: "block",
                }}
              />
            </div>
          )}

          <h1 style={{ color: "#ffffff", fontWeight: 800, fontSize: 24, margin: "0 0 4px", letterSpacing: "-0.5px" }}>
            {god.name}
          </h1>

          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, margin: "0 0 12px" }}>
            {god.title}
          </p>

          <div style={{
            display: "inline-block",
            background: "rgba(245,200,66,0.15)",
            border: `1px solid rgba(245,200,66,0.35)`,
            borderRadius: 20,
            padding: "4px 14px",
            color: cfg.colorGold,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "1px",
            textTransform: "uppercase",
          }}>
            {cfg.brandName} Founder
          </div>
        </div>

        {/* Pearl support */}
        <VapiSupportCard
          publicKey={cfg.vapiPublicKey}
          assistantId={cfg.vapiAssistantId}
          avatarUrl={cfg.pearlAvatarUrl}
          headline={cfg.pearlHeadline}
          subheadline={cfg.pearlSubheadline}
          statusLabel={cfg.pearlStatusLabel}
          activeStatusLabel={cfg.pearlActiveLabel}
          ctaLabel={cfg.pearlCtaLabel}
          ctaActiveLabel={cfg.pearlCtaActiveLabel}
          ctaLoadingLabel={cfg.pearlCtaLoadingLabel}
          accentColor={cfg.colorGold}
        />

        {/* Offer sections */}
        {hasOffers && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {SECTION_ORDER.filter(sec => sections[sec]).map(sec => (
              <div key={sec}>
                <p style={sectionLabel}>{sec}</p>
                <div style={glassCard}>
                  {sections[sec].map(offer => (
                    <a key={offer.label} href={offer.url} target="_blank" rel="noreferrer" style={btn}>
                      <span>{offer.label}</span>
                      <span style={{ fontSize: 16, opacity: 0.4 }}>›</span>
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Contact */}
        {(god.email || god.phone || god.calendly_url) && (
          <div>
            <p style={sectionLabel}>Get In Touch</p>
            <div style={glassCard}>
              {god.email && (
                <a href={`mailto:${god.email}`} style={btn}>
                  <span>Email Me</span>
                  <span style={{ fontSize: 16, opacity: 0.4 }}>›</span>
                </a>
              )}
              {god.phone && (
                <a href={`tel:${god.phone}`} style={btn}>
                  <span>Call Me</span>
                  <span style={{ fontSize: 16, opacity: 0.4 }}>›</span>
                </a>
              )}
              {god.calendly_url && (
                <a href={god.calendly_url} target="_blank" rel="noreferrer" style={btn}>
                  <span>Book a Call</span>
                  <span style={{ fontSize: 16, opacity: 0.4 }}>›</span>
                </a>
              )}
            </div>
          </div>
        )}

        {/* Refer others */}
        <div>
          <p style={sectionLabel}>{cfg.referSectionLabel}</p>
          <div style={{ ...glassCard, padding: "0" }}>
            <a href={cfg.affiliateSignupUrl} target="_blank" rel="noreferrer" style={btn}>
              <span>{cfg.becomeAffiliateLabel}</span>
              <span style={{ fontSize: 16, opacity: 0.4 }}>›</span>
            </a>
          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign: "center", paddingTop: 12 }}>
          <img src={cfg.logoUrl} alt={cfg.brandName} style={{ height: 26, width: "auto", opacity: 0.35, marginBottom: 8 }} />
          <p style={{ color: "rgba(255,255,255,0.25)", fontSize: 11, margin: 0, letterSpacing: "0.3px" }}>
            {cfg.footerTagline}
          </p>
        </div>

      </div>
    </div>
  );
}
