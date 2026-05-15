"use client";

import { useState } from "react";
import { EMAIL_TEMPLATES } from "../../../lib/emails/templates";
import { SEQUENCES, OFFER_META, STAGE_META, type Offer } from "../../../lib/sequences";

const S = {
  bg: "#F0F2F8", card: "#ffffff", border: "#E2E8F2",
  pink: "#E8185C", text: "#0F1E3A", muted: "#8A9AB5", faint: "#B0BDD0",
  navy: "#0F1E3A",
};

function getTemplate(sequence: string, step: number) {
  const key = `${sequence}_${step}` as keyof typeof EMAIL_TEMPLATES;
  const fn = EMAIL_TEMPLATES[key];
  if (!fn) return null;
  try {
    return fn({ firstName: "Sarah", email: "preview@example.com", city: "Austin, TX" });
  } catch { return null; }
}

function formatDelay(hours: number) {
  if (hours === 0) return "Instant";
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  return `${days}d`;
}

export default function TemplatesPage() {
  const [offerFilter, setOfferFilter] = useState<Offer | "all">("all");
  const [previewKey, setPreviewKey] = useState<string | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);

  const filtered = SEQUENCES.filter(s => offerFilter === "all" || s.offer === offerFilter);

  // Group filtered sequences by stage
  const byStage: Record<string, typeof SEQUENCES[number][]> = {};
  for (const seq of filtered) {
    if (!byStage[seq.stage]) byStage[seq.stage] = [];
    byStage[seq.stage].push(seq);
  }
  const stageOrder = ["cold", "warm", "hot", "client", "podcast"] as const;

  function openPreview(seqKey: string, step: number) {
    const key = `${seqKey}_${step}`;
    if (previewKey === key) { setPreviewKey(null); setPreviewHtml(null); return; }
    const t = getTemplate(seqKey, step);
    setPreviewKey(key);
    setPreviewHtml(t?.html ?? null);
  }

  return (
    <div style={{ fontFamily: "monospace", background: S.bg, color: S.text, minHeight: "100vh", padding: "32px 40px" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap" as const, gap: 12 }}>
        <div>
          <h1 style={{ color: S.text, fontSize: 22, margin: "0 0 4px" }}>Email Templates</h1>
          <p style={{ color: S.muted, fontSize: 13, margin: 0 }}>Browse and preview every email in the system. Click any step to preview.</p>
        </div>
        <select
          value={offerFilter}
          onChange={e => { setOfferFilter(e.target.value as Offer | "all"); setPreviewKey(null); setPreviewHtml(null); }}
          style={{
            background: S.card,
            color: offerFilter === "all" ? S.muted : S.text,
            border: `1px solid ${offerFilter === "all" ? S.border : S.pink}`,
            borderRadius: 6, padding: "8px 14px", fontSize: 13,
            cursor: "pointer", fontFamily: "monospace", outline: "none",
            fontWeight: offerFilter === "all" ? 400 : 700,
          }}
        >
          <option value="all">All offers</option>
          {(Object.entries(OFFER_META) as [Offer, { label: string }][]).map(([key, meta]) => (
            <option key={key} value={key}>{meta.label}</option>
          ))}
        </select>
      </div>

      {/* Stages */}
      {stageOrder.filter(stage => byStage[stage]?.length).map(stage => {
        const stageMeta = STAGE_META[stage as keyof typeof STAGE_META];
        const seqs = byStage[stage] ?? [];

        return (
          <div key={stage} style={{ marginBottom: 36 }}>

            {/* Stage heading */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: stageMeta?.color ?? S.muted }} />
              <span style={{ color: stageMeta?.color ?? S.muted, fontWeight: 700, fontSize: 13, textTransform: "uppercase" as const, letterSpacing: "0.08em" }}>
                {stageMeta?.label ?? stage}
              </span>
              <div style={{ flex: 1, height: 1, background: S.border }} />
            </div>

            {/* Sequence cards in this stage */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 14 }}>
              {seqs.map(seq => (
                <div key={seq.key} style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 10, overflow: "hidden" }}>

                  {/* Sequence header */}
                  <div style={{ padding: "12px 16px", borderBottom: `1px solid ${S.border}`, display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: seq.color, flexShrink: 0 }} />
                    <span style={{ color: seq.color, fontWeight: 700, fontSize: 13 }}>{seq.label}</span>
                    <span style={{ color: S.faint, fontSize: 11, marginLeft: "auto" }}>{seq.steps} emails</span>
                  </div>

                  {/* Steps */}
                  <div>
                    {Array.from({ length: seq.steps }, (_, i) => {
                      const step = i + 1;
                      const t = getTemplate(seq.key, step);
                      const key = `${seq.key}_${step}`;
                      const isOpen = previewKey === key;
                      const delay = seq.delays[i] as number | undefined;

                      return (
                        <div key={step}>
                          <div
                            onClick={() => openPreview(seq.key, step)}
                            style={{
                              display: "flex", alignItems: "center", gap: 10,
                              padding: "9px 16px",
                              cursor: "pointer",
                              background: isOpen ? seq.color + "12" : "transparent",
                              borderBottom: `1px solid ${S.border}33`,
                              transition: "background 0.1s",
                            }}
                          >
                            <span style={{ color: S.faint, fontSize: 10, width: 16, flexShrink: 0 }}>#{step}</span>
                            <span style={{
                              fontSize: 10, fontWeight: 700,
                              color: delay === 0 ? "#16a34a" : S.muted,
                              width: 36, flexShrink: 0,
                            }}>
                              {delay !== undefined ? formatDelay(delay) : "—"}
                            </span>
                            <span style={{
                              fontSize: 12, color: t ? S.text : S.faint,
                              flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const,
                            }}>
                              {t ? t.subject : "No template"}
                            </span>
                            <span style={{ color: isOpen ? seq.color : S.faint, fontSize: 11 }}>
                              {isOpen ? "▲" : "▼"}
                            </span>
                          </div>

                          {/* Inline preview */}
                          {isOpen && previewHtml && (
                            <div style={{ borderBottom: `2px solid ${seq.color}33`, background: "#fff" }}>
                              <iframe
                                srcDoc={previewHtml}
                                style={{ width: "100%", height: 420, border: "none", display: "block" }}
                                title={`Preview ${seq.key} step ${step}`}
                              />
                            </div>
                          )}
                          {isOpen && !previewHtml && (
                            <div style={{ padding: "12px 16px", color: S.faint, fontSize: 12 }}>No template found.</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

    </div>
  );
}
