"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { SEQUENCES } from "../../../../lib/sequences";

const C = {
  bg: "#F0F2F8", card: "#ffffff", border: "#E2E8F2", borderLight: "#F0F3F9",
  navy: "#0F1E3A", pink: "#E8185C", muted: "#8A9AB5", faint: "#B0BDD0",
  green: "#16a34a", red: "#dc2626", amber: "#d97706", blue: "#4A56C9",
};

const SEQ_COLOR: Record<string, string> = {
  ...Object.fromEntries(SEQUENCES.map(s => [s.key, s.color])),
  lead_nurture:  "#34d399",
  claim_nurture: "#34d399",
  local_nurture: "#fb923c",
};
const SEQ_LABEL: Record<string, string> = {
  ...Object.fromEntries(SEQUENCES.map(s => [s.key, s.label])),
  lead_nurture:  "Lead Nurture",
  claim_nurture: "Claim Nurture",
  local_nurture: "Local Nurture",
};

function badge(label: string, color: string) {
  return (
    <span style={{ background: color + "18", color, padding: "3px 10px", borderRadius: 4, fontWeight: 700, fontSize: 11, whiteSpace: "nowrap" as const }}>
      {label}
    </span>
  );
}

function sourceName(src: string) {
  const map: Record<string, string> = {
    audit: "Audit (/score)", claim: "Claim Form",
    calendly_geo: "Calendly (Strategy Call)", calendly_podcast: "Calendly (Podcast)",
    calendly_affiliate: "Calendly (Affiliate)",
    import: "Bulk Import", admin_move: "Admin (manual)", unknown: "Unknown",
  };
  return map[src] ?? src;
}

function statusBadge(status: string) {
  const colors: Record<string, string> = {
    Client: "#16a34a", Hot: "#f97316", Warm: "#d97706", "No Show": "#f87171", Cold: C.muted, Suppressed: "#94a3b8",
  };
  return badge(status, colors[status] ?? C.muted);
}

const OFFER_TAG: Record<string, { label: string; color: string }> = {
  v1:        { label: "V1",      color: "#4A56C9" },
  v2:        { label: "V2",      color: "#7c3aed" },
  podcast:   { label: "Podcast", color: "#0891b2" },
  universal: { label: "GEO",     color: "#8A9AB5" },
};

function deriveOffer(timeline: TimelineItem[], currentSequences: string[]): string {
  const allSeqs = [
    ...currentSequences,
    ...timeline.filter(t => t.type === "sent" && t.sequence).map(t => t.sequence!),
  ];
  if (allSeqs.some(s => ["pre_interview", "post_interview"].includes(s))) return "podcast";
  if (allSeqs.some(s => ["v2_cold", "v2_post_booking"].includes(s))) return "v2";
  if (allSeqs.some(s => ["audit_invite", "audit_failed"].includes(s))) return "v1";
  return "universal";
}

const SEQ_OFFER: Record<string, { label: string; color: string }> = {
  v2_cold:         { label: "GEO V2",  color: "#e879f9" },
  v2_post_booking: { label: "GEO V2",  color: "#e879f9" },
  pre_interview:   { label: "Podcast", color: "#c084fc" },
  post_interview:  { label: "Podcast", color: "#c084fc" },
  local_nurture:   { label: "Local",   color: "#f97316" },
};
const GEO_V1_COLOR = "#60a5fa";
function seqOfferTag(seq: string): { label: string; color: string } {
  return SEQ_OFFER[seq] ?? { label: "GEO V1", color: GEO_V1_COLOR };
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " " +
    new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

type Step = { step: number; state: "sent" | "pending" | "cancelled"; date: string | null; opened: boolean; clicked: boolean };
type SeqCard = { sequence: string; totalSteps: number; sentCount: number; steps: Step[] };
type TimelineItem = { date: string; type: string; sequence: string | null; step: number | null; detail: string | null };
type ProfileData = {
  email: string; firstName: string | null; city: string | null; source: string;
  affiliateTags: string[];
  status: string; suppressedReason: string | null; firstSeen: string | null;
  auditScores: { overall: number | null; seo: number | null; ai: number | null; website: string | null; created_at: string }[];
  leadScore: number | null; currentSequences: string[]; sequenceCards: SeqCard[];
  timeline: TimelineItem[]; pendingCount: number;
  allSequences: { key: string; label: string }[];
  summary: { emails_sent: number; opens: number; clicks: number };
  quotedPackage: number | null;
};

function stepDot(s: Step) {
  if (s.state === "cancelled") return <span style={{ color: C.faint, fontSize: 14 }}>✕</span>;
  if (s.state === "pending")   return <span style={{ color: C.amber, fontSize: 14 }}>○</span>;
  return <span style={{ color: C.green, fontSize: 14 }}>●</span>;
}

function TimelineRow({ item }: { item: TimelineItem }) {
  const typeColors: Record<string, string> = {
    sent: C.muted, opened: C.amber, clicked: C.green, bounced: C.red,
    audit: C.blue, booking: C.green, claim: C.blue,
  };
  const color = typeColors[item.type] ?? C.muted;

  let label = item.type;
  if (item.type === "sent")    label = `Sent — ${SEQ_LABEL[item.sequence ?? ""] ?? item.sequence} step ${item.step}`;
  if (item.type === "opened")  label = `Opened — ${SEQ_LABEL[item.sequence ?? ""] ?? item.sequence} step ${item.step}`;
  if (item.type === "clicked") label = `Clicked — ${SEQ_LABEL[item.sequence ?? ""] ?? item.sequence} step ${item.step}`;
  if (item.type === "bounced") label = `Bounced — ${SEQ_LABEL[item.sequence ?? ""] ?? item.sequence} step ${item.step}`;
  if (item.sequence === "personal" && item.type === "sent") label = "Personal email sent";
  if (item.type === "audit")   label = "Audit score";
  if (item.type === "booking") label = "Call booked";
  if (item.type === "claim")   label = "Claim form submitted";

  return (
    <div style={{ display: "flex", gap: 14, padding: "10px 0", borderBottom: `1px solid ${C.borderLight}`, alignItems: "flex-start" }}>
      <div style={{ width: 76, flexShrink: 0, color: C.faint, fontSize: 11, paddingTop: 1 }}>{fmtDate(item.date)}</div>
      <div style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0, marginTop: 4 }} />
      <div style={{ flex: 1 }}>
        <span style={{ color: C.navy, fontSize: 13 }}>{label}</span>
        {item.detail && <span style={{ color: C.faint, fontSize: 11, marginLeft: 8 }}>{item.detail}</span>}
      </div>
    </div>
  );
}

export default function LeadProfilePage() {
  const params = useParams();
  const router = useRouter();
  const email = decodeURIComponent(params.id as string);

  const [data, setData]                     = useState<ProfileData | null>(null);
  const [loading, setLoading]               = useState(true);
  const [error, setError]                   = useState("");
  const [actionLoading, setActionLoading]   = useState(false);
  const [showMoveMenu, setShowMoveMenu]     = useState(false);
  const [showAddMenu, setShowAddMenu]       = useState(false);
  const [showPurchaseMenu, setShowPurchaseMenu] = useState(false);
  const [actionMsg, setActionMsg]           = useState("");
  const [showCompose, setShowCompose]       = useState(false);
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody]       = useState("");
  const [sendingEmail, setSendingEmail]     = useState(false);
  const [sendEmailMsg, setSendEmailMsg]     = useState("");

  useEffect(() => {
    fetch(`/api/admin/lead-profile?email=${encodeURIComponent(email)}`)
      .then(r => r.json())
      .then(d => { if (d.error) setError(d.error); else setData(d); setLoading(false); })
      .catch(() => { setError("Failed to load"); setLoading(false); });
  }, [email]);

  async function doAction(action: string, sequence?: string, packageNumber?: 1 | 2 | 3) {
    setActionLoading(true);
    setShowMoveMenu(false);
    setShowAddMenu(false);
    setShowPurchaseMenu(false);
    const res = await fetch("/api/admin/lead-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, action, sequence, packageNumber }),
    });
    const d = await res.json();
    setActionLoading(false);
    if (d.ok) {
      setActionMsg(`Done: ${action}${sequence ? " → " + sequence : ""}`);
      // Refresh the detail view in-place so the user sees the change immediately
      // router.refresh() also busts the Next.js router cache so the leads list
      // re-fetches fresh data when the user navigates back
      router.refresh();
      fetch(`/api/admin/lead-profile?email=${encodeURIComponent(email)}`)
        .then(r => r.json())
        .then(updated => { if (!updated.error) setData(updated); });
    } else {
      setActionMsg(`Error: ${d.error}`);
    }
  }

  function openCompose() {
    const name = data?.firstName ?? email.split("@")[0];
    const status = data?.status ?? "";
    let subject = `Quick thought for you, ${name}`;
    let body = `Hey ${name},\n\nJust wanted to reach out personally...\n\n`;
    if (status === "Hot") {
      subject = `${name}, I noticed you've been reading these`;
      body = `Hey ${name},\n\nI saw you've been opening and clicking through our emails and wanted to reach out personally.\n\nMost agents in your market haven't claimed their AI visibility yet. I wanted to make sure you had a chance before someone else does.\n\nDo you have 15 minutes this week to chat?\n\n`;
    } else if (status === "No Show") {
      subject = `Hey ${name} - wanted to check in`;
      body = `Hey ${name},\n\nI noticed we had a call scheduled that didn't connect. No worries at all - things come up.\n\nWanted to reach out personally and see if you'd like to reschedule. I have a few spots open this week.\n\n`;
    } else if (data?.currentSequences?.includes("post_booking")) {
      subject = `Looking forward to our call, ${name}`;
      body = `Hey ${name},\n\nJust a personal note ahead of our call - really looking forward to connecting.\n\nIf you have any questions before we talk, feel free to reply here.\n\n`;
    }
    setComposeSubject(subject);
    setComposeBody(body);
    setShowCompose(true);
    setSendEmailMsg("");
  }

  async function sendPersonalEmail() {
    if (!composeSubject.trim() || !composeBody.trim()) return;
    setSendingEmail(true);
    const res = await fetch("/api/admin/send-personal-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, subject: composeSubject, body: composeBody }),
    });
    const d = await res.json();
    setSendingEmail(false);
    if (d.ok) {
      setSendEmailMsg("Sent!");
      setTimeout(() => { setShowCompose(false); setSendEmailMsg(""); }, 2000);
    } else {
      setSendEmailMsg(`Error: ${d.error}`);
    }
  }

  if (loading) return (
    <div style={{ background: C.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: C.muted, fontFamily: "system-ui, -apple-system, sans-serif" }}>
      Loading...
    </div>
  );
  if (error) return (
    <div style={{ background: C.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: C.red, fontFamily: "system-ui, -apple-system, sans-serif" }}>
      {error}
    </div>
  );
  if (!data) return null;

  const latestAudit = data.auditScores[0] ?? null;

  return (
    <div style={{ fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", background: C.bg, minHeight: "100vh", padding: "28px 40px", maxWidth: 1100, margin: "0 auto" }}>

      {/* Back */}
      <button
        onClick={() => router.back()}
        style={{ background: "transparent", border: "none", color: C.muted, fontSize: 13, cursor: "pointer", marginBottom: 20, padding: 0, display: "flex", alignItems: "center", gap: 6 }}
      >
        ← Back
      </button>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap" as const, gap: 16 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4, flexWrap: "wrap" as const }}>
            <h1 style={{ color: C.navy, fontSize: 22, margin: 0, fontWeight: 800 }}>
              {data.firstName ?? email.split("@")[0]}
            </h1>
            {statusBadge(data.status)}
            {(() => {
              const offer = deriveOffer(data.timeline, data.currentSequences);
              const tag = OFFER_TAG[offer];
              return tag ? badge(tag.label, tag.color) : null;
            })()}
            {(data.affiliateTags ?? []).map((tag: string) => (
              <span key={tag} style={{ background: "#E8185C18", color: C.pink, padding: "3px 10px", borderRadius: 4, fontWeight: 700, fontSize: 11 }}>
                /{tag}
              </span>
            ))}
          </div>
          <div style={{ color: C.blue, fontSize: 13, marginBottom: 6, textDecoration: "underline" }}>{data.email}</div>
          <div style={{ display: "flex", gap: 18, flexWrap: "wrap" as const, alignItems: "center" }}>
            {data.city && <span style={{ color: C.muted, fontSize: 12 }}>{data.city}</span>}
            <span style={{ color: C.faint, fontSize: 12 }}>Source: {sourceName(data.source)}</span>
            {data.firstSeen && <span style={{ color: C.faint, fontSize: 12 }}>First seen: {fmtDate(data.firstSeen)}</span>}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", flexDirection: "column" as const, alignItems: "flex-end", gap: 8 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const }}>
            {/* Move to Sequence */}
            <div style={{ position: "relative" as const }}>
              <button
                onClick={() => setShowMoveMenu(v => !v)}
                disabled={actionLoading}
                style={{ background: C.card, border: `1px solid ${C.border}`, color: C.navy, padding: "8px 14px", borderRadius: 6, fontSize: 12, cursor: "pointer" }}
              >
                Move to Sequence ▾
              </button>
              {showMoveMenu && (
                <div style={{ position: "absolute" as const, right: 0, top: "110%", background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, zIndex: 100, minWidth: 220, maxHeight: 300, overflowY: "auto" as const, boxShadow: "0 4px 16px rgba(0,0,0,0.1)" }}>
                  {data.allSequences.map(s => (
                    <button
                      key={s.key}
                      onClick={() => doAction("move_to_sequence", s.key)}
                      style={{ display: "block", width: "100%", textAlign: "left" as const, background: "transparent", border: "none", color: SEQ_COLOR[s.key] ?? C.navy, padding: "10px 14px", fontSize: 12, cursor: "pointer", borderBottom: `1px solid ${C.borderLight}` }}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Add Sequence */}
            <div style={{ position: "relative" as const }}>
              <button
                onClick={() => setShowAddMenu(v => !v)}
                disabled={actionLoading}
                style={{ background: C.card, border: `1px solid ${C.border}`, color: C.navy, padding: "8px 14px", borderRadius: 6, fontSize: 12, cursor: "pointer" }}
              >
                Add Sequence ▾
              </button>
              {showAddMenu && (
                <div style={{ position: "absolute" as const, right: 0, top: "110%", background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, zIndex: 100, minWidth: 220, maxHeight: 300, overflowY: "auto" as const, boxShadow: "0 4px 16px rgba(0,0,0,0.1)" }}>
                  {data.allSequences.map(s => (
                    <button
                      key={s.key}
                      onClick={() => doAction("add_sequence", s.key)}
                      style={{ display: "block", width: "100%", textAlign: "left" as const, background: "transparent", border: "none", color: SEQ_COLOR[s.key] ?? C.navy, padding: "10px 14px", fontSize: 12, cursor: "pointer", borderBottom: `1px solid ${C.borderLight}` }}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Suppress */}
            <button
              onClick={() => { if (confirm(`Suppress ${email}? This cancels all pending emails.`)) doAction("suppress"); }}
              disabled={actionLoading}
              style={{ background: C.card, border: `1px solid ${C.border}`, color: C.red, padding: "8px 14px", borderRadius: 6, fontSize: 12, cursor: "pointer" }}
            >
              Suppress
            </button>

            {/* Purchased */}
            <div style={{ position: "relative" as const }}>
              <button
                onClick={() => setShowPurchaseMenu(v => !v)}
                disabled={actionLoading}
                style={{ background: "#dcfce7", border: `1px solid ${C.green}`, color: C.green, padding: "8px 14px", borderRadius: 6, fontSize: 12, cursor: "pointer", fontWeight: 700 }}
              >
                Purchased ▾
              </button>
              {showPurchaseMenu && (
                <div style={{ position: "absolute" as const, right: 0, top: "110%", background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, zIndex: 100, minWidth: 180, boxShadow: "0 4px 16px rgba(0,0,0,0.1)" }}>
                  {([1, 2, 3] as const).map(pkg => {
                    const labels: Record<number, string> = { 1: "$1,500/mo", 2: "$2,500/mo", 3: "$3,500/mo" };
                    return (
                      <button
                        key={pkg}
                        onClick={() => { if (confirm(`Mark as Purchased — ${labels[pkg]}?`)) doAction("mark_purchased", undefined, pkg); }}
                        style={{ display: "block", width: "100%", textAlign: "left" as const, background: "transparent", border: "none", color: C.green, padding: "10px 14px", fontSize: 12, cursor: "pointer", borderBottom: `1px solid ${C.borderLight}` }}
                      >
                        {labels[pkg]}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Personal email */}
            <button
              onClick={openCompose}
              disabled={actionLoading}
              style={{ background: C.pink, border: "none", color: "#fff", padding: "8px 14px", borderRadius: 6, fontSize: 12, cursor: "pointer", fontWeight: 700 }}
            >
              Send Email
            </button>
          </div>
          {actionMsg && <div style={{ color: C.green, fontSize: 11, textAlign: "right" as const }}>{actionMsg}</div>}
        </div>
      </div>

      {/* Audit scores */}
      {latestAudit && (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 20px", marginBottom: 20, display: "flex", gap: 32, flexWrap: "wrap" as const, alignItems: "center" }}>
          <span style={{ color: C.muted, fontSize: 10, textTransform: "uppercase" as const, letterSpacing: "0.07em", fontWeight: 600 }}>AI Visibility Scores</span>
          {[
            { label: "Overall", value: latestAudit.overall },
            { label: "SEO",     value: latestAudit.seo },
            { label: "AI",      value: latestAudit.ai },
          ].filter(s => s.value != null).map(s => (
            <div key={s.label} style={{ textAlign: "center" as const }}>
              <div style={{ color: C.faint, fontSize: 10, marginBottom: 2 }}>{s.label}</div>
              <div style={{ color: C.pink, fontSize: 24, fontWeight: 800 }}>{s.value}</div>
            </div>
          ))}
          {latestAudit.website && <div style={{ color: C.muted, fontSize: 12 }}>{latestAudit.website}</div>}
          <div style={{ color: C.faint, fontSize: 11, marginLeft: "auto" }}>{fmtDateTime(latestAudit.created_at)}</div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 20, alignItems: "start" }}>

        {/* Left: sequences + timeline */}
        <div>
          {/* Sequence cards */}
          {data.sequenceCards.length > 0 ? (
            <div style={{ marginBottom: 24 }}>
              <div style={{ color: C.faint, fontSize: 10, textTransform: "uppercase" as const, letterSpacing: "0.07em", fontWeight: 600, marginBottom: 12 }}>Active Sequences</div>
              {data.sequenceCards.map(card => (
                <div key={card.sequence} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: "14px 18px", marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {(() => {
                        const ot = seqOfferTag(card.sequence);
                        return (
                          <span style={{ background: ot.color + "20", color: ot.color, padding: "2px 8px", borderRadius: 4, fontWeight: 700, fontSize: 11, whiteSpace: "nowrap" as const }}>
                            {ot.label}
                          </span>
                        );
                      })()}
                      <span style={{ color: SEQ_COLOR[card.sequence] ?? C.navy, fontWeight: 700, fontSize: 13 }}>
                        {SEQ_LABEL[card.sequence] ?? card.sequence}
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ color: C.faint, fontSize: 11 }}>Step {card.sentCount}/{card.totalSteps}</span>
                      <button
                        onClick={() => { if (confirm(`Remove ${SEQ_LABEL[card.sequence] ?? card.sequence} from this lead?`)) doAction("remove_sequence", card.sequence); }}
                        disabled={actionLoading}
                        style={{ background: "transparent", border: "none", color: C.faint, fontSize: 11, cursor: "pointer", padding: "2px 6px" }}
                      >
                        ✕ Remove
                      </button>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column" as const, gap: 6 }}>
                    {card.steps.map(step => (
                      <div key={step.step} style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 12 }}>
                        <span style={{ width: 16, textAlign: "center" as const }}>{stepDot(step)}</span>
                        <span style={{ color: C.muted, width: 46 }}>Step {step.step}</span>
                        {step.date && (
                          <span style={{ color: C.faint, fontSize: 11 }}>
                            {step.state === "pending" ? `Scheduled ${fmtDate(step.date)}` : fmtDate(step.date)}
                          </span>
                        )}
                        {step.state === "sent" && (
                          <span style={{ color: step.clicked ? C.green : step.opened ? C.amber : C.faint, fontSize: 11, marginLeft: 4 }}>
                            {step.clicked ? "Clicked" : step.opened ? "Opened" : "Not opened"}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: "16px 20px", marginBottom: 24, color: C.faint, fontSize: 13 }}>
              No active sequences. Use &ldquo;Move to Sequence&rdquo; to enroll this lead.
            </div>
          )}

          {/* Timeline */}
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: "16px 20px" }}>
            <div style={{ color: C.faint, fontSize: 10, textTransform: "uppercase" as const, letterSpacing: "0.07em", fontWeight: 600, marginBottom: 12 }}>Timeline</div>
            {data.timeline.length === 0 ? (
              <div style={{ color: C.faint, fontSize: 13 }}>No activity yet.</div>
            ) : (
              data.timeline.map((item, i) => <TimelineRow key={i} item={item} />)
            )}
          </div>
        </div>

        {/* Right: sidebar */}
        <div style={{ display: "flex", flexDirection: "column" as const, gap: 16 }}>

          {/* Summary stats */}
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: "14px 18px" }}>
            <div style={{ color: C.faint, fontSize: 10, textTransform: "uppercase" as const, letterSpacing: "0.07em", fontWeight: 600, marginBottom: 12 }}>Summary</div>
            {[
              { label: "Emails Sent",    value: data.summary?.emails_sent ?? 0 },
              { label: "Unique Opens",   value: data.summary?.opens ?? 0 },
              { label: "Unique Clicks",  value: data.summary?.clicks ?? 0 },
              { label: "Pending",        value: data.pendingCount },
              ...(data.quotedPackage ? [{ label: "Quoted Package", value: `$${data.quotedPackage.toLocaleString()}/mo` }] : []),
            ].map(s => (
              <div key={s.label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${C.borderLight}` }}>
                <span style={{ color: C.muted, fontSize: 12 }}>{s.label}</span>
                <span style={{ color: C.navy, fontSize: 14, fontWeight: 700 }}>{s.value}</span>
              </div>
            ))}
          </div>

          {/* Sequences seen */}
          {data.timeline.filter(t => t.type === "sent" && t.sequence).length > 0 && (
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: "14px 18px" }}>
              <div style={{ color: C.faint, fontSize: 10, textTransform: "uppercase" as const, letterSpacing: "0.07em", fontWeight: 600, marginBottom: 12 }}>Sequences Seen</div>
              {[...new Set(data.timeline.filter(t => t.type === "sent").map(t => t.sequence))].map(seq => (
                <div key={seq} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: `1px solid ${C.borderLight}` }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: SEQ_COLOR[seq!] ?? C.faint, flexShrink: 0 }} />
                  <span style={{ color: C.navy, fontSize: 12 }}>{SEQ_LABEL[seq!] ?? seq}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Personal Email Modal */}
      {showCompose && (
        <div style={{ position: "fixed" as const, inset: 0, background: "rgba(15,30,58,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 20 }}>
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 28, width: "100%", maxWidth: 560, boxShadow: "0 8px 32px rgba(0,0,0,0.12)", fontFamily: "system-ui, -apple-system, sans-serif" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ margin: 0, color: C.navy, fontSize: 16, fontWeight: 700 }}>Send Personal Email</h2>
              <button onClick={() => setShowCompose(false)} style={{ background: "transparent", border: "none", color: C.muted, fontSize: 20, cursor: "pointer", lineHeight: 1 }}>✕</button>
            </div>
            <div style={{ color: C.faint, fontSize: 11, marginBottom: 16 }}>
              From: GEO by HeyPearl → {email}
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ color: C.muted, fontSize: 11, textTransform: "uppercase" as const, letterSpacing: "0.06em", display: "block", marginBottom: 4 }}>Subject</label>
              <input
                value={composeSubject}
                onChange={e => setComposeSubject(e.target.value)}
                style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: "10px 12px", color: C.navy, fontSize: 13, boxSizing: "border-box" as const, outline: "none" }}
              />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ color: C.muted, fontSize: 11, textTransform: "uppercase" as const, letterSpacing: "0.06em", display: "block", marginBottom: 4 }}>Body</label>
              <textarea
                value={composeBody}
                onChange={e => setComposeBody(e.target.value)}
                rows={10}
                style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: "10px 12px", color: C.navy, fontSize: 13, resize: "vertical" as const, boxSizing: "border-box" as const, outline: "none" }}
              />
              <div style={{ color: C.faint, fontSize: 10, marginTop: 4 }}>Plain text — your signature (&ldquo;— Misti&rdquo;) is added automatically.</div>
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <button
                onClick={sendPersonalEmail}
                disabled={sendingEmail || !composeSubject.trim() || !composeBody.trim()}
                style={{ background: C.pink, border: "none", color: "#fff", padding: "10px 20px", borderRadius: 6, fontSize: 13, cursor: "pointer", fontWeight: 700, opacity: sendingEmail ? 0.6 : 1 }}
              >
                {sendingEmail ? "Sending..." : "Send Email"}
              </button>
              <button
                onClick={() => setShowCompose(false)}
                style={{ background: "transparent", border: `1px solid ${C.border}`, color: C.muted, padding: "10px 16px", borderRadius: 6, fontSize: 13, cursor: "pointer" }}
              >
                Cancel
              </button>
              {sendEmailMsg && (
                <span style={{ color: sendEmailMsg.startsWith("Error") ? C.red : C.green, fontSize: 12 }}>
                  {sendEmailMsg}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
