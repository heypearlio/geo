// Single source of truth for all email sequences.
// Add a new sequence here and it automatically appears in the funnel,
// emails dashboard, leads table, and activity feed.

export const STAGE_META = {
  cold:    { label: "Cold",    color: "#60a5fa" },
  warm:    { label: "Warm",    color: "#f59e0b" },
  hot:     { label: "Hot",     color: "#E8185C" },
  podcast: { label: "Podcast", color: "#c084fc" },
  client:  { label: "Client",  color: "#facc15" },
} as const;

export type Stage = keyof typeof STAGE_META;

export const OFFER_META = {
  v1:        { label: "GEO V1 — AI Visibility"       },
  v2:        { label: "GEO V2 — Seller Appointments" },
  universal: { label: "Universal"                    },
  podcast:   { label: "Podcast"                      },
  affiliate: { label: "Affiliate"                    },
} as const;

export type Offer = keyof typeof OFFER_META;

export const SEQUENCES = [
  { key: "audit_invite",       label: "Audit Invite",         stage: "cold"    as Stage, offer: "v1"        as Offer, steps: 3,  color: "#E8185C", delays: [0, 72, 168] },
  { key: "audit_failed",       label: "Audit Failed",         stage: "cold"    as Stage, offer: "v1"        as Offer, steps: 3,  color: "#f97316", delays: [0, 72, 168] },
  { key: "v2_cold",            label: "V2 Cold",              stage: "cold"    as Stage, offer: "v2"        as Offer, steps: 3,  color: "#e879f9", delays: [0, 48, 120] },
  { key: "v2_post_booking",   label: "V2 Post Booking",      stage: "cold"    as Stage, offer: "v2"        as Offer, steps: 2,  color: "#c026d3", delays: [0, 24] },
  { key: "schedule_abandoned", label: "Schedule Abandoned",   stage: "cold"    as Stage, offer: "v1"        as Offer, steps: 1,  color: "#fb923c", delays: [0.25] },
  { key: "video_watched",      label: "Video Watched (50%+)", stage: "cold"    as Stage, offer: "v1"        as Offer, steps: 1,  color: "#fbbf24", delays: [0] },
  { key: "video_abandoned",    label: "Video Abandoned",      stage: "cold"    as Stage, offer: "v1"        as Offer, steps: 1,  color: "#94a3b8", delays: [0] },
  { key: "post_booking",       label: "Post-Booking",         stage: "warm"    as Stage, offer: "universal" as Offer, steps: 2,  color: "#4ade80", delays: [0, 24] }, // step 1 instant, step 2 rescheduled to 1 day before meeting by Calendly webhook
  { key: "no_show",            label: "No Show",              stage: "warm"    as Stage, offer: "universal" as Offer, steps: 4,  color: "#f87171", delays: [0, 48, 120, 168] },
  { key: "post_call",          label: "Post-Call",            stage: "hot"     as Stage, offer: "universal" as Offer, steps: 12, color: "#f472b6", delays: [0, 96, 192, 288, 384, 480, 600, 720, 840, 960, 1080, 1200] },
  { key: "warm_nurture",       label: "Warm Nurture",         stage: "warm"    as Stage, offer: "universal" as Offer, steps: 10, color: "#34d399", delays: [0, 4, 48, 96, 168, 336, 504, 672, 840, 1008] },
  { key: "long_term_nurture",  label: "Long-Term Nurture",    stage: "warm"    as Stage, offer: "universal" as Offer, steps: 6,  color: "#a78bfa", delays: [0, 1440, 2160, 2880, 3600, 4320] },
  { key: "pre_interview",      label: "Pre-Interview",        stage: "podcast" as Stage, offer: "podcast"   as Offer, steps: 2,  color: "#c084fc", delays: [0, 24] },
  { key: "proof",              label: "Proof Series",         stage: "warm"    as Stage, offer: "universal" as Offer, steps: 12, color: "#2dd4bf", delays: [24, 72, 168, 240, 336, 504, 672, 840, 1008, 1176, 1344, 1512] },
  { key: "purchased_welcome",  label: "Purchased Welcome",    stage: "client"  as Stage, offer: "universal" as Offer, steps: 1,  color: "#facc15", delays: [0] },
  { key: "hot_proof",          label: "Hot Proof",            stage: "hot"     as Stage, offer: "universal" as Offer, steps: 5,  color: "#f97316", delays: [24, 48, 72, 96, 120] },
  { key: "post_interview",               label: "Post-Interview",               stage: "podcast"   as Stage, offer: "podcast"   as Offer, steps: 1, color: "#818cf8", delays: [0] },
  { key: "affiliate_schedule_abandoned", label: "Affiliate Schedule Abandoned",  stage: "cold"      as Stage, offer: "affiliate" as Offer, steps: 1, color: "#fb923c", delays: [1] },
  { key: "affiliate_post_booking",       label: "Affiliate Post-Booking",        stage: "warm"      as Stage, offer: "affiliate" as Offer, steps: 2, color: "#4ade80", delays: [0, 24] },
] as const;

export type SequenceKey = typeof SEQUENCES[number]["key"];

// Flat label lookup: { lead_nurture: "Lead Nurture", ... }
export const SEQ_LABEL: Record<string, string> =
  Object.fromEntries(SEQUENCES.map(s => [s.key, s.label]));

// Flat color lookup: { lead_nurture: "#60a5fa", ... }
export const SEQ_COLOR: Record<string, string> =
  Object.fromEntries(SEQUENCES.map(s => [s.key, s.color]));

// Delay arrays for enqueueSequence: { lead_nurture: [0, 4, 48, ...], ... }
export const SEQUENCE_DELAYS: Record<string, number[]> =
  Object.fromEntries(SEQUENCES.map(s => [s.key, [...s.delays]]));
