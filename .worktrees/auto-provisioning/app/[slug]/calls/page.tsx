"use client";

import { useEffect, useState, useCallback } from "react";

interface Call {
  id: string;
  email: string;
  first_name: string | null;
  meeting_time: string;
  outcome: string | null;
}

interface CallsData { upcoming: Call[]; past: Call[]; }

const S = { text: "#0F1E3A", muted: "#8A9AB5", border: "#E2E8F2", card: "#ffffff", pink: "#E8185C" };

const OUTCOME_LABELS: Record<string, string> = {
  attended: "Attended", no_show: "No Show", rescheduled: "Rescheduled", bought: "Bought",
};
const OUTCOME_COLORS: Record<string, string> = {
  attended: "#16a34a", no_show: "#dc2626", rescheduled: "#d97706", bought: "#E8185C",
};
const OUTCOME_BG: Record<string, string> = {
  attended: "#f0fdf4", no_show: "#fef2f2", rescheduled: "#fffbeb", bought: "#fff0f4",
};

export default function CallsPage() {
  const [data, setData] = useState<CallsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch("/api/affiliate/calls").then(r => r.json()).then(d => { setData(d); setLoading(false); });
  }, []);

  useEffect(() => { load(); }, [load]);

  async function setOutcome(callId: string, outcome: string) {
    setUpdating(callId);
    await fetch("/api/affiliate/calls", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ callId, outcome }),
    });
    setUpdating(null);
    load();
  }

  if (loading) return <div style={{ padding: 32 }}><p style={{ color: S.muted }}>Loading…</p></div>;
  if (!data) return null;

  function CallRow({ call, showOutcome }: { call: Call; showOutcome: boolean }) {
    return (
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "14px 16px",
      }}>
        <div>
          <p style={{ color: S.text, fontSize: 14, fontWeight: 600, margin: 0 }}>
            {call.first_name ?? call.email}
          </p>
          <p style={{ color: S.muted, fontSize: 12, margin: "2px 0 0" }}>
            {call.email} &middot; {new Date(call.meeting_time).toLocaleString()}
          </p>
        </div>
        {showOutcome && (
          call.outcome ? (
            <span style={{
              background: OUTCOME_BG[call.outcome] ?? "#f8fafc",
              color: OUTCOME_COLORS[call.outcome] ?? S.muted,
              borderRadius: 6, padding: "4px 10px", fontSize: 12, fontWeight: 600,
            }}>
              {OUTCOME_LABELS[call.outcome] ?? call.outcome}
            </span>
          ) : (
            <select
              disabled={updating === call.id}
              onChange={e => setOutcome(call.id, e.target.value)}
              defaultValue=""
              style={{
                background: "#ffffff", border: `1px solid ${S.border}`, color: S.muted,
                borderRadius: 6, padding: "5px 10px", fontSize: 12, cursor: "pointer",
              }}
            >
              <option value="" disabled>Mark outcome…</option>
              <option value="attended">Attended</option>
              <option value="no_show">No Show</option>
              <option value="rescheduled">Rescheduled</option>
              <option value="bought">Bought</option>
            </select>
          )
        )}
      </div>
    );
  }

  return (
    <div style={{ padding: "32px 24px", maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ color: S.text, fontSize: 22, fontWeight: 800, marginBottom: 24 }}>Calls</h1>

      <h2 style={{ color: S.text, fontSize: 16, fontWeight: 700, marginBottom: 12 }}>
        Upcoming ({data.upcoming.length})
      </h2>
      {data.upcoming.length === 0 ? (
        <p style={{ color: S.muted, marginBottom: 32 }}>No upcoming calls.</p>
      ) : (
        <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 12, marginBottom: 32, overflow: "hidden" }}>
          {data.upcoming.map((call, i) => (
            <div key={call.id} style={{ borderBottom: i < data.upcoming.length - 1 ? `1px solid ${S.border}` : "none" }}>
              <CallRow call={call} showOutcome={false} />
            </div>
          ))}
        </div>
      )}

      <h2 style={{ color: S.text, fontSize: 16, fontWeight: 700, marginBottom: 12 }}>
        Past Calls ({data.past.length})
      </h2>
      {data.past.length === 0 ? (
        <p style={{ color: S.muted }}>No past calls.</p>
      ) : (
        <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 12, overflow: "hidden" }}>
          {data.past.map((call, i) => (
            <div key={call.id} style={{ borderBottom: i < data.past.length - 1 ? `1px solid ${S.border}` : "none" }}>
              <CallRow call={call} showOutcome={true} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
