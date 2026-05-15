import type { LocalServicesFunnelConfig } from "../config.types";
import heylocalConfig from "./heylocal";

// Inherits all content from the god (heylocal). Only per-affiliate identity fields are overridden.

const config: LocalServicesFunnelConfig = {
  ...heylocalConfig,

  // ── Routing & identity ────────────────────────────────────────────────────
  funnelTag: "christina",
  scheduleRoute: "/christinaschedule",
  pricingRoute: "/christinapricing",

  // ── Affiliate branding ────────────────────────────────────────────────────
  colorButton: "#0D1B2A",    // dark navy buttons for this affiliate
  logoUrl:           undefined, // no logo for this affiliate
  heroPhoto:         undefined, // no headshot for this affiliate
  vapiPublicKey:     undefined, // no Vapi widget for this affiliate
  vapiAssistantId:   undefined,

  // ── Founder card ──────────────────────────────────────────────────────────
  // Spread god's founder so stats stay in sync; override only personal identity.
  founder: {
    ...heylocalConfig.founder,
    initials: "CM",
    name:     "Christina Moreno",
    title:    "HeyLocal",
  },
};

export default config;
