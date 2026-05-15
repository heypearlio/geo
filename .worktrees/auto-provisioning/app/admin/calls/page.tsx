"use client";

import { useState, useEffect, useCallback } from "react";

const S = {
  bg: "#F0F2F8", card: "#ffffff", cardHover: "#F8FAFD",
  border: "#E2E8F2", pink: "#E8185C", text: "#0F1E3A",
  muted: "#8A9AB5", faint: "#B0BDD0",
  green: "#16a34a", yellow: "#d97706", red: "#dc2626",
};

interface Call {
  id: string;
  email: string;
  first_name: string | null;
  meeting_time: string;
  outcome: string;
}

function relTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const hr = Math.floor(diff / 3600000);
  if (hr < 1) return `${Math.floor(diff / 60000)} min ago`;
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

function OutcomeTag({ outcome }: { outcome: string }) {
  if (outcome === "purchased") return <span style={{ color: S.green, fontSize: 12, fontWeight: 700 }}>✅ Purchased</span>;
  if (outcome === "post_call") return <span style={{ color: S.text, fontSize: 12, fontWeight: 700 }}>📧 Post-Call</span>;
  if (outcome === "proof") return <span style={{ color: S.yellow, fontSize: 12, fontWeight: 700 }}>📊 Proof</span>;
  return <span style={{ color: S.muted, fontSize: 12 }}>pending</span>;
}

export default function AdminCallsPage() {
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<Record<string, boolean>>({});
  const [expandedPackage, setExpandedPackage] = useState<string | null>(null);
  const [expandedPostCall, setExpandedPostCall] = useState<string | null>(null);

  const fetchCalls = useCallback(async () => {
    const res = await fetch("/api/admin/calls");
    if (res.ok) {
      const data = await res.json();
      setCalls(data.calls);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchCalls(); }, [fetchCalls]);

  async function setOutcome(call: Call, outcome: "purchased" | "post_call" | "proof" | "no_show", packageNumber?: 1 | 2 | 3) {
    const key = call.id + outcome;
    setSubmitting(s => ({ ...s, [key]: true }));
    try {
      await fetch("/api/admin/calls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callId: call.id, email: call.email, firstName: call.first_name ?? undefined, outcome, packageNumber }),
      });
      setCalls(prev => prev.map(c => c.id === call.id ? { ...c, outcome } : c));
      setExpandedPackage(null);
      setExpandedPostCall(null);
    } finally {
      setSubmitting(s => ({ ...s, [key]: false }));
    }
  }

  const pending = calls.filter(c => c.outcome === "pending");
  const completed = calls.filter(c => c.outcome !== "pending");

  return (
    <div style={{ minHeight: "100vh", background: S.bg, color: S.text, fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "40px 20px" }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>Post-Call Outcomes</h1>
        <p style={{ color: S.muted, fontSize: 14, marginBottom: 32 }}>Set the outcome for each completed GEO strategy call. If no outcome is set within 4 hours, the lead is auto-enrolled in the post-call series.</p>

        {loading && <p style={{ color: S.muted }}>Loading calls...</p>}

        {/* PENDING */}
        {!loading && pending.length > 0 && (
          <div style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: S.yellow, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>
              Awaiting Outcome ({pending.length})
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {pending.map(call => (
                <div key={call.id} style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 14, padding: "20px 24px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 2 }}>{call.first_name ?? "Unknown"}</div>
                      <div style={{ color: S.muted, fontSize: 13 }}>{call.email}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ color: S.muted, fontSize: 12 }}>Met {relTime(call.meeting_time)}</div>
                      <div style={{ color: S.faint, fontSize: 11 }}>{new Date(call.meeting_time).toLocaleDateString()}</div>
                      <a href={`/admin/leads/${encodeURIComponent(call.email)}`} style={{ color: S.pink, fontSize: 11, fontWeight: 700, textDecoration: "none" }}>View Profile →</a>
                    </div>
                  </div>

                  {/* Outcome buttons */}
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {expandedPackage === call.id ? (
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", width: "100%" }}>
                        <span style={{ color: S.muted, fontSize: 13, alignSelf: "center", marginRight: 4 }}>Package:</span>
                        {([1, 2, 3] as const).map(pkg => {
                          const labels: Record<number, string> = { 1: "GEO $1,500/mo", 2: "GEO $2,500/mo", 3: "GEO $3,500/mo" };
                          return (
                            <button
                              key={pkg}
                              disabled={submitting[call.id + "purchased"]}
                              onClick={() => setOutcome(call, "purchased", pkg)}
                              style={{ background: S.green, color: "#fff", fontWeight: 700, fontSize: 13, padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", opacity: submitting[call.id + "purchased"] ? 0.6 : 1 }}
                            >
                              {labels[pkg]}
                            </button>
                          );
                        })}
                        <button onClick={() => setExpandedPackage(null)} style={{ background: "transparent", color: S.muted, fontSize: 13, padding: "8px 12px", borderRadius: 8, border: `1px solid ${S.border}`, cursor: "pointer" }}>
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setExpandedPackage(call.id)}
                        style={{ background: S.green, color: "#fff", fontWeight: 700, fontSize: 13, padding: "10px 18px", borderRadius: 8, border: "none", cursor: "pointer" }}
                      >
                        ✅ Purchased
                      </button>
                    )}

                    {expandedPostCall === call.id ? (
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", width: "100%" }}>
                        <span style={{ color: S.muted, fontSize: 13, alignSelf: "center", marginRight: 4 }}>Quoted price:</span>
                        {([1, 2, 3] as const).map(pkg => {
                          const labels: Record<number, string> = { 1: "$1,500/mo", 2: "$2,500/mo", 3: "$3,500/mo" };
                          return (
                            <button
                              key={pkg}
                              disabled={submitting[call.id + "post_call"]}
                              onClick={() => setOutcome(call, "post_call", pkg)}
                              style={{ background: S.card, color: S.text, fontWeight: 700, fontSize: 13, padding: "8px 16px", borderRadius: 8, border: `1px solid ${S.border}`, cursor: "pointer", opacity: submitting[call.id + "post_call"] ? 0.6 : 1 }}
                            >
                              {labels[pkg]}
                            </button>
                          );
                        })}
                        <button onClick={() => setExpandedPostCall(null)} style={{ background: "transparent", color: S.muted, fontSize: 13, padding: "8px 12px", borderRadius: 8, border: `1px solid ${S.border}`, cursor: "pointer" }}>
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setExpandedPostCall(call.id)}
                        style={{ background: S.card, color: S.text, fontWeight: 700, fontSize: 13, padding: "10px 18px", borderRadius: 8, border: `1px solid ${S.border}`, cursor: "pointer" }}
                      >
                        📧 Post-Call Series
                      </button>
                    )}

                    <button
                      disabled={submitting[call.id + "no_show"]}
                      onClick={() => setOutcome(call, "no_show")}
                      style={{ background: S.card, color: S.muted, fontWeight: 700, fontSize: 13, padding: "10px 18px", borderRadius: 8, border: `1px solid ${S.border}`, cursor: "pointer", opacity: submitting[call.id + "no_show"] ? 0.6 : 1 }}
                    >
                      👻 No Show
                    </button>

                    <button
                      disabled={submitting[call.id + "proof"]}
                      onClick={() => setOutcome(call, "proof")}
                      style={{ background: S.card, color: S.yellow, fontWeight: 700, fontSize: 13, padding: "10px 18px", borderRadius: 8, border: `1px solid ${S.yellow}40`, cursor: "pointer", opacity: submitting[call.id + "proof"] ? 0.6 : 1 }}
                    >
                      📊 Send Proof/Info
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && pending.length === 0 && (
          <div style={{ background: S.card, borderRadius: 14, padding: 32, textAlign: "center", marginBottom: 40, border: `1px solid ${S.border}` }}>
            <p style={{ color: S.muted, fontSize: 15 }}>No calls awaiting outcome selection.</p>
          </div>
        )}

        {/* COMPLETED */}
        {completed.length > 0 && (
          <div>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: S.faint, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>
              Completed ({completed.length})
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {completed.map(call => (
                <div key={call.id} style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 10, padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <span style={{ fontWeight: 600, fontSize: 14, marginRight: 8 }}>{call.first_name ?? "Unknown"}</span>
                    <span style={{ color: S.faint, fontSize: 13 }}>{call.email}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ color: S.faint, fontSize: 12 }}>{relTime(call.meeting_time)}</span>
                    <OutcomeTag outcome={call.outcome} />
                    <a href={`/admin/leads/${encodeURIComponent(call.email)}`} style={{ color: S.pink, fontSize: 12, fontWeight: 700, textDecoration: "none" }}>View Profile →</a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
