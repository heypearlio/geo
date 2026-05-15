"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { EMAIL_TEMPLATES } from "../../../lib/emails/templates";
import { SEQUENCES, OFFER_META, type Offer } from "../../../lib/sequences";

const S = {
  bg: "#F0F2F8", card: "#ffffff", border: "#E2E8F2",
  pink: "#E8185C", text: "#0F1E3A", muted: "#8A9AB5", faint: "#B0BDD0",
  green: "#16a34a", yellow: "#d97706", red: "#dc2626",
};

const SEQ_COLOR = Object.fromEntries(SEQUENCES.map(s => [s.key, s.color]));
const SEQ_LABEL = Object.fromEntries(SEQUENCES.map(s => [s.key, s.label]));
const SEQ_STEPS = Object.fromEntries(SEQUENCES.map(s => [s.key, s.steps]));

function getSubject(sequence: string, step: number): string {
  const key = `${sequence}_${step}` as keyof typeof EMAIL_TEMPLATES;
  const fn = EMAIL_TEMPLATES[key];
  if (!fn) return `Email ${step}`;
  try {
    const { subject } = fn({ firstName: undefined, email: "" });
    return subject.replace(/, there$/, "").replace(/^there, /, "");
  } catch { return `Email ${step}`; }
}

function openColor(pct: number) {
  if (pct >= 40) return S.green;
  if (pct >= 20) return S.yellow;
  return S.red;
}
function clickColor(pct: number) {
  if (pct >= 10) return S.green;
  if (pct >= 3) return S.yellow;
  return S.red;
}

// Thresholds based on unique open/click rates (not raw event counts)
function stepIndicator(openPct: number, clickPct: number, hasSends: boolean): { icon: string; label: string; color: string } {
  if (!hasSends) return { icon: "—", label: "No sends yet", color: S.faint };
  if (openPct > 50 || clickPct > 15) return { icon: "🏆", label: "Top performer", color: S.green };
  if (openPct >= 25 && clickPct >= 5)  return { icon: "✅", label: "Healthy", color: S.green };
  if (openPct < 15 || clickPct < 2)   return { icon: "🔴", label: "Problem", color: S.red };
  if (openPct < 25 || clickPct < 5)   return { icon: "⚠️", label: "Underperforming", color: S.yellow };
  return { icon: "✅", label: "Healthy", color: S.green };
}

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div style={{ background: S.border, borderRadius: 4, height: 6, width: 60, display: "inline-block", verticalAlign: "middle", marginRight: 6 }}>
      <div style={{ background: color, height: "100%", borderRadius: 4, width: `${pct}%` }} />
    </div>
  );
}

type StepStats = { sent: number; opened: number; clicked: number };
type StatsMap = Record<string, Record<number, StepStats>>;

type StepDetailData = {
  total_sent: number;
  opened_count: number;
  clicked_count: number;
  opened: { email: string; opened: boolean; clicked: boolean; sent_at: string }[];
  not_opened: { email: string; opened: boolean; clicked: boolean; sent_at: string }[];
};

export default function CampaignsPage() {
  const router = useRouter();
  const [statsMap, setStatsMap] = useState<StatsMap>({});
  const [activeLeads, setActiveLeads] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [selectedSeq, setSelectedSeq] = useState<string | null>(null);
  const [selectedStep, setSelectedStep] = useState<number | null>(null);
  const [stepDetail, setStepDetail] = useState<StepDetailData | null>(null);
  const [stepDetailLoading, setStepDetailLoading] = useState(false);
  const [templateHtml, setTemplateHtml] = useState<string | null>(null);
  const [view, setView] = useState<"campaigns" | "queue">("campaigns");
  const [offerFilter, setOfferFilter] = useState<Offer | "all">("all");

  useEffect(() => {
    fetch("/api/admin/campaigns")
      .then(r => r.json())
      .then(d => {
        const map: StatsMap = {};
        for (const row of d.rows ?? []) {
          if (!map[row.sequence]) map[row.sequence] = {};
          map[row.sequence][row.step] = {
            sent: Number(row.sent), opened: Number(row.opened), clicked: Number(row.clicked),
          };
        }
        setStatsMap(map);
        setActiveLeads(d.active_leads ?? {});
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const loadStepDetail = useCallback(async (seq: string, step: number) => {
    setStepDetailLoading(true);
    setStepDetail(null);
    const res = await fetch(`/api/admin/campaigns?sequence=${encodeURIComponent(seq)}&step=${step}`);
    const d = await res.json();
    setStepDetail(d);
    setStepDetailLoading(false);

    // Load template preview
    const key = `${seq}_${step}` as keyof typeof EMAIL_TEMPLATES;
    const fn = EMAIL_TEMPLATES[key];
    if (fn) {
      try {
        const { html } = fn({ firstName: "Agent", email: "preview@example.com" });
        setTemplateHtml(html);
      } catch { setTemplateHtml(null); }
    } else {
      setTemplateHtml(null);
    }
  }, []);

  function selectStep(seq: string, step: number) {
    setSelectedSeq(seq);
    setSelectedStep(step);
    loadStepDetail(seq, step);
  }

  const maxSent = Math.max(...Object.values(statsMap).flatMap(s => Object.values(s).map(v => v.sent)), 1);

  if (loading) return (
    <div style={{ background: S.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: S.muted, fontFamily: "monospace" }}>
      Loading...
    </div>
  );

  return (
    <div style={{ fontFamily: "monospace", background: S.bg, color: S.text, minHeight: "100vh", padding: "32px 40px" }}>

      <div style={{ marginBottom: 24 }}>
        <h1 style={{ color: S.text, fontSize: 22, margin: "0 0 4px" }}>Campaigns</h1>
        <p style={{ color: S.muted, fontSize: 13, margin: 0 }}>Sequence performance — click any step to see who opened it.</p>
        <p style={{ color: S.faint, fontSize: 11, margin: "4px 0 0" }}>Rates are unique opens/clicks per email, excluding internal addresses.</p>
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", gap: 4, marginBottom: 28, alignItems: "center", flexWrap: "wrap" as const }}>
        {(["campaigns", "queue"] as const).map(t => (
          <button type="button" key={t} onClick={() => setView(t)} style={{
            background: view === t ? S.card : "transparent",
            border: `1px solid ${view === t ? S.border : "transparent"}`,
            color: view === t ? S.text : S.faint,
            padding: "6px 16px", borderRadius: 6, fontSize: 13,
            cursor: "pointer", fontFamily: "monospace",
          }}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
        {view === "campaigns" && (
          <select
            value={offerFilter}
            onChange={e => { setOfferFilter(e.target.value as Offer | "all"); setSelectedSeq(null); setSelectedStep(null); }}
            style={{
              marginLeft: 12,
              background: S.card, color: offerFilter === "all" ? S.muted : S.text,
              border: `1px solid ${offerFilter === "all" ? S.border : S.pink}`,
              borderRadius: 6, padding: "6px 12px", fontSize: 12,
              cursor: "pointer", fontFamily: "monospace", outline: "none",
            }}
          >
            <option value="all">All offers</option>
            {(Object.entries(OFFER_META) as [Offer, { label: string }][]).map(([key, meta]) => (
              <option key={key} value={key}>{meta.label}</option>
            ))}
          </select>
        )}
        <a href="/admin/emails" style={{ marginLeft: "auto", color: S.faint, fontSize: 12, textDecoration: "none", alignSelf: "center" }}>
          Full Email Admin →
        </a>
      </div>

      {view === "queue" ? (
        <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 10, padding: "20px", color: S.muted, fontSize: 13 }}>
          <p style={{ marginTop: 0 }}>For full queue management, visit <a href="/admin/emails" style={{ color: S.pink }}>Email Admin → Queue tab</a>.</p>
        </div>
      ) : (

        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 24 }}>

          {/* Campaign cards */}
          <div>
            {SEQUENCES.filter(seq => offerFilter === "all" || seq.offer === offerFilter).map(seq => {
              const steps = statsMap[seq.key] ?? {};
              const hasSends = Object.values(steps).some(s => s.sent > 0);
              const activeCount = activeLeads[seq.key] ?? 0;

              // Compute sequence-level averages
              const stepCount = seq.steps;
              const allSentArr = Object.values(steps).map(s => s.sent);
              const totalSent  = allSentArr.reduce((a, b) => a + b, 0);
              const avgOpen  = hasSends ? Math.round(
                Object.values(steps).filter(s => s.sent > 0).reduce((a, s) => a + s.opened / s.sent, 0) /
                Object.values(steps).filter(s => s.sent > 0).length * 100
              ) : 0;
              const avgClick = hasSends ? Math.round(
                Object.values(steps).filter(s => s.sent > 0).reduce((a, s) => a + s.clicked / s.sent, 0) /
                Object.values(steps).filter(s => s.sent > 0).length * 100
              ) : 0;

              const isSelected = selectedSeq === seq.key;

              return (
                <div
                  key={seq.key}
                  style={{
                    background: isSelected ? S.bg : S.card,
                    border: `1px solid ${isSelected ? seq.color : S.border}`,
                    borderRadius: 10,
                    padding: "16px 20px",
                    marginBottom: 12,
                  }}
                >
                  {/* Sequence header */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <span style={{ color: seq.color, fontWeight: 700, fontSize: 14 }}>
                      📧 {seq.label}
                    </span>
                    <div style={{ display: "flex", gap: 16, fontSize: 12 }}>
                      <span style={{ color: S.muted }}>{stepCount} emails</span>
                      {activeCount > 0 && (
                        <span style={{ color: S.faint }}>Active: <strong style={{ color: S.text }}>{activeCount}</strong></span>
                      )}
                      {hasSends && (
                        <>
                          <span style={{ color: S.faint }}>Avg open: <strong style={{ color: openColor(avgOpen) }}>{avgOpen}%</strong></span>
                          <span style={{ color: S.faint }}>Avg click: <strong style={{ color: clickColor(avgClick) }}>{avgClick}%</strong></span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Step rows */}
                  <div>
                    {Array.from({ length: stepCount }, (_, i) => {
                      const step = i + 1;
                      const s = steps[step] ?? { sent: 0, opened: 0, clicked: 0 };
                      const openPct  = s.sent > 0 ? Math.round(s.opened  / s.sent * 100) : 0;
                      const clickPct = s.sent > 0 ? Math.round(s.clicked / s.sent * 100) : 0;
                      const indicator = stepIndicator(openPct, clickPct, s.sent > 0);
                      const subject = getSubject(seq.key, step);
                      const isSelectedStep = isSelected && selectedStep === step;

                      return (
                        <div
                          key={step}
                          onClick={() => selectStep(seq.key, step)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            padding: "6px 8px",
                            borderRadius: 6,
                            cursor: "pointer",
                            background: isSelectedStep ? seq.color + "15" : "transparent",
                            borderBottom: step < stepCount ? `1px solid ${S.border}33` : "none",
                          }}
                        >
                          <span style={{ color: S.faint, fontSize: 11, width: 20 }}>#{step}</span>
                          <ProgressBar value={s.sent} max={maxSent} color={seq.color} />
                          <span style={{ color: S.muted, fontSize: 11, width: 60 }}>
                            {s.sent > 0 ? `${s.sent} sent` : "—"}
                          </span>
                          <span style={{ color: openColor(openPct), fontSize: 11, width: 70 }}>
                            {s.sent > 0 ? `${openPct}% open` : ""}
                          </span>
                          <span style={{ color: clickColor(clickPct), fontSize: 11, width: 72 }}>
                            {s.sent > 0 ? `${clickPct}% click` : ""}
                          </span>
                          <span style={{ fontSize: 13 }}>{indicator.icon}</span>
                          <span style={{ color: S.faint, fontSize: 11, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>
                            {subject}
                          </span>
                        </div>
                      );
                    })}
                    {!hasSends && (
                      <div style={{ color: S.faint, fontSize: 11, padding: "4px 8px" }}>No sends yet</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      )}

      {/* Step detail modal */}
      {selectedSeq && selectedStep && (
        <div style={{ position: "fixed" as const, inset: 0, background: "rgba(15,30,58,0.6)", display: "flex", alignItems: "flex-start", justifyContent: "center", zIndex: 200, padding: "40px 24px", overflowY: "auto" }}>
          <div style={{ background: S.card, border: `1px solid ${SEQ_COLOR[selectedSeq]}`, borderRadius: 12, width: "100%", maxWidth: 900, boxShadow: "0 8px 40px rgba(0,0,0,0.2)", fontFamily: "monospace" }}>

            {/* Modal header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 28px", borderBottom: `1px solid ${S.border}` }}>
              <div>
                <div style={{ color: SEQ_COLOR[selectedSeq], fontWeight: 700, fontSize: 15 }}>
                  {SEQ_LABEL[selectedSeq]} — Step {selectedStep}
                </div>
                <div style={{ color: S.faint, fontSize: 12, marginTop: 3 }}>{getSubject(selectedSeq, selectedStep)}</div>
              </div>
              <button
                onClick={() => { setSelectedSeq(null); setSelectedStep(null); setStepDetail(null); setTemplateHtml(null); }}
                style={{ background: S.bg, border: `1px solid ${S.border}`, color: S.muted, cursor: "pointer", fontSize: 14, padding: "8px 16px", borderRadius: 6, fontFamily: "monospace", fontWeight: 700 }}
              >
                ✕ Close
              </button>
            </div>

            <div style={{ padding: "24px 28px" }}>
              {stepDetailLoading ? (
                <div style={{ color: S.muted, fontSize: 13, padding: "40px 0", textAlign: "center" }}>Loading...</div>
              ) : stepDetail ? (
                <>
                  {/* Stats row */}
                  <div style={{ display: "flex", gap: 40, marginBottom: 24 }}>
                    {[
                      { label: "Sent",    value: stepDetail.total_sent, color: S.text },
                      { label: "Opened",  value: `${stepDetail.opened_count} (${stepDetail.total_sent > 0 ? Math.round(stepDetail.opened_count / stepDetail.total_sent * 100) : 0}%)`, color: S.green },
                      { label: "Clicked", value: `${stepDetail.clicked_count} (${stepDetail.total_sent > 0 ? Math.round(stepDetail.clicked_count / stepDetail.total_sent * 100) : 0}%)`, color: S.pink },
                    ].map(s => (
                      <div key={s.label}>
                        <div style={{ color: S.faint, fontSize: 11, marginBottom: 4 }}>{s.label}</div>
                        <div style={{ color: s.color, fontSize: 22, fontWeight: 700 }}>{s.value}</div>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: templateHtml ? "320px 1fr" : "1fr 1fr", gap: 24 }}>
                    {/* Opened / Not Opened lists */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      <div>
                        <div style={{ color: S.green, fontSize: 10, fontWeight: 700, marginBottom: 8 }}>OPENED ✅</div>
                        <div style={{ maxHeight: 400, overflowY: "auto" }}>
                          {stepDetail.opened.slice(0, 50).map((r, i) => (
                            <div
                              key={i}
                              onClick={() => { setSelectedSeq(null); setSelectedStep(null); router.push(`/admin/leads/${encodeURIComponent(r.email)}`); }}
                              style={{ fontSize: 10, color: S.muted, padding: "4px 0", cursor: "pointer", borderBottom: `1px solid ${S.border}33`, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}
                            >
                              {r.email}
                              {r.clicked && <span style={{ color: S.pink, marginLeft: 4 }}>↗</span>}
                            </div>
                          ))}
                          {stepDetail.opened.length > 50 && (
                            <div style={{ color: S.faint, fontSize: 10, paddingTop: 4 }}>+{stepDetail.opened.length - 50} more</div>
                          )}
                        </div>
                      </div>
                      <div>
                        <div style={{ color: S.red, fontSize: 10, fontWeight: 700, marginBottom: 8 }}>DID NOT OPEN ❌</div>
                        <div style={{ maxHeight: 400, overflowY: "auto" }}>
                          {stepDetail.not_opened.slice(0, 50).map((r, i) => (
                            <div
                              key={i}
                              onClick={() => { setSelectedSeq(null); setSelectedStep(null); router.push(`/admin/leads/${encodeURIComponent(r.email)}`); }}
                              style={{ fontSize: 10, color: S.faint, padding: "4px 0", cursor: "pointer", borderBottom: `1px solid ${S.border}33`, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}
                            >
                              {r.email}
                            </div>
                          ))}
                          {stepDetail.not_opened.length > 50 && (
                            <div style={{ color: S.faint, fontSize: 10, paddingTop: 4 }}>+{stepDetail.not_opened.length - 50} more</div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Full email preview */}
                    {templateHtml && (
                      <div>
                        <div style={{ color: S.faint, fontSize: 10, fontWeight: 700, marginBottom: 8, textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>Email Preview</div>
                        <div style={{ background: "#fff", borderRadius: 8, overflow: "hidden", border: `1px solid ${S.border}` }}>
                          <iframe
                            srcDoc={templateHtml}
                            style={{ width: "100%", height: 520, border: "none", display: "block" }}
                            title="Email preview"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
