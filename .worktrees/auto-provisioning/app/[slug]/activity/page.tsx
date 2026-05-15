"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";

interface ActivityData {
  totalLeads: number;
  leadsThisWeek: number;
  leadsThisMonth: number;
  recentOptIns: Array<{ email: string; first_name: string | null; business_type: string | null; created_at: string }>;
  hotLeads: Array<{ email: string; first_name: string | null; click_count: number }>;
}

interface Call {
  id: string;
  email: string;
  first_name: string | null;
  meeting_time: string;
  outcome: string | null;
}

interface CallsData { upcoming: Call[]; past: Call[]; }

const S = {
  text: "#0F1E3A", muted: "#8A9AB5", border: "#E2E8F2", borderLight: "#F0F3F9",
  card: "#ffffff", pink: "#E8185C", faint: "#B0BDD0", bg: "#F0F2F8",
  orange: "#ea580c", orangeLight: "#f97316", amber: "#d97706",
  blue: "#4A56C9", blueBg: "#EEF1FF",
};

function fmtMeetingTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const isToday = d.toDateString() === now.toDateString();
  const isTomorrow = d.toDateString() === tomorrow.toDateString();
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  if (isToday) return `Today ${time}`;
  if (isTomorrow) return `Tomorrow ${time}`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " " + time;
}

const OUTCOME_LABELS: Record<string, string> = {
  attended: "Attended", no_show: "No Show", rescheduled: "Rescheduled", bought: "Bought",
};
const OUTCOME_COLORS: Record<string, string> = {
  attended: "#16a34a", no_show: "#dc2626", rescheduled: "#d97706", bought: "#E8185C",
};

interface AffiliateInfo {
  slug: string;
  offers: string[];
  calendlyUrl: string | null;
}

function funnelUrls(slug: string, offers: string[]): { label: string; url: string }[] {
  const results: { label: string; url: string }[] = [];
  if (offers.includes("geo"))   results.push({ label: "GEO",   url: `https://geo.heypearl.io/${slug}` });
  if (offers.includes("v2"))    results.push({ label: "V2",    url: `https://geo.heypearl.io/v2/${slug}` });
  if (offers.includes("local")) results.push({ label: "Local", url: `https://local.heypearl.io/${slug}` });
  return results;
}

export default function ActivityPage() {
  const { slug } = useParams() as { slug: string };
  const router = useRouter();
  const [data, setData] = useState<ActivityData | null>(null);
  const [calls, setCalls] = useState<CallsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingCall, setUpdatingCall] = useState<string | null>(null);
  const [affiliateInfo, setAffiliateInfo] = useState<AffiliateInfo | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [calendlyInput, setCalendlyInput] = useState("");
  const [calendlySaving, setCalendlySaving] = useState(false);
  const [calendlySaved, setCalendlySaved] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  }

  async function saveCalendly() {
    if (!calendlyInput.trim()) return;
    setCalendlySaving(true);
    await fetch("/api/affiliate/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ calendlyUrl: calendlyInput.trim() }),
    });
    setAffiliateInfo(prev => prev ? { ...prev, calendlyUrl: calendlyInput.trim() } : prev);
    setCalendlySaving(false);
    setCalendlySaved(true);
    setTimeout(() => setCalendlySaved(false), 2000);
  }

  async function uploadPhoto(file: File) {
    setPhotoUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/affiliate/upload-headshot", { method: "POST", body: fd });
    if (res.ok) {
      const { url } = await res.json();
      await fetch("/api/affiliate/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ headshotUrl: url }),
      });
      setPhotoPreview(url);
    }
    setPhotoUploading(false);
  }

  const loadCalls = useCallback(() => {
    fetch("/api/affiliate/calls").then(r => r.json()).then(d => setCalls(d));
  }, []);

  useEffect(() => {
    Promise.all([
      fetch("/api/affiliate/activity").then(r => r.json()),
      fetch("/api/affiliate/calls").then(r => r.json()),
      fetch("/api/affiliate/me").then(r => r.ok ? r.json() : null),
    ]).then(([activityData, callsData, meData]) => {
      setData(activityData);
      setCalls(callsData);
      if (meData) {
        setAffiliateInfo({ slug: meData.slug, offers: meData.offers ?? [], calendlyUrl: meData.calendlyUrl ?? null });
        setCalendlyInput(meData.calendlyUrl ?? "");
      }
      setLoading(false);
    });
  }, [loadCalls]);

  async function setOutcome(callId: string, outcome: string) {
    setUpdatingCall(callId);
    await fetch("/api/affiliate/calls", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ callId, outcome }),
    });
    setUpdatingCall(null);
    loadCalls();
  }

  if (loading) return (
    <div style={{ padding: 32 }}><p style={{ color: S.muted }}>Loading…</p></div>
  );
  if (!data) return null;

  const upcomingCalls = calls?.upcoming ?? [];
  const needsOutcome = (calls?.past ?? []).filter(c => !c.outcome);
  const hotLeads = data.hotLeads ?? [];

  const stats = [
    { label: "Total Leads", value: data.totalLeads },
    { label: "This Week", value: data.leadsThisWeek },
    { label: "This Month", value: data.leadsThisMonth },
  ];

  const hasAppointments = upcomingCalls.length > 0 || needsOutcome.length > 0;

  return (
    <div style={{ padding: "32px 24px", maxWidth: 980, margin: "0 auto" }}>
      <h1 style={{ color: S.text, fontSize: 22, fontWeight: 800, marginBottom: 24 }}>Activity</h1>

      {affiliateInfo && (affiliateInfo.calendlyUrl || funnelUrls(affiliateInfo.slug, affiliateInfo.offers).length > 0) && (
        <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 10, padding: "14px 16px", marginBottom: 24 }}>
          <p style={{ color: S.muted, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>My Links</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {funnelUrls(affiliateInfo.slug, affiliateInfo.offers).map(({ label, url }) => (
              <div key={url} style={{ display: "flex", alignItems: "center", gap: 6, background: S.bg, borderRadius: 6, padding: "6px 10px" }}>
                <span style={{ color: S.muted, fontSize: 11, fontWeight: 600 }}>{label}</span>
                <a href={url} target="_blank" rel="noreferrer" style={{ color: S.pink, fontSize: 12, textDecoration: "none" }}>{url.replace("https://", "")}</a>
                <button onClick={() => copy(url, url)} style={{ background: "none", border: "none", color: copied === url ? S.pink : S.muted, cursor: "pointer", fontSize: 11, padding: "0 2px" }}>
                  {copied === url ? "✓" : "Copy"}
                </button>
              </div>
            ))}
            {affiliateInfo.calendlyUrl && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, background: S.bg, borderRadius: 6, padding: "6px 10px" }}>
                <span style={{ color: S.muted, fontSize: 11, fontWeight: 600 }}>Calendly</span>
                <a href={affiliateInfo.calendlyUrl} target="_blank" rel="noreferrer" style={{ color: S.pink, fontSize: 12, textDecoration: "none" }}>{affiliateInfo.calendlyUrl.replace("https://", "")}</a>
                <button onClick={() => copy(affiliateInfo.calendlyUrl!, "calendly")} style={{ background: "none", border: "none", color: copied === "calendly" ? S.pink : S.muted, cursor: "pointer", fontSize: 11, padding: "0 2px" }}>
                  {copied === "calendly" ? "✓" : "Copy"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 28 }}>
        {stats.map(({ label, value }) => (
          <div key={label} style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 12, padding: 24 }}>
            <p style={{ color: S.pink, fontSize: 36, fontWeight: 800, margin: 0 }}>{value}</p>
            <p style={{ color: S.muted, fontSize: 14, marginTop: 4, marginBottom: 0 }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Appointments + Active Clickers — two columns */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 28 }}>

        {/* Appointments */}
        <div>
          <p style={{ color: S.muted, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", margin: "0 0 8px" }}>
            Appointments
          </p>
          <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 12, overflow: "hidden" }}>
            {!hasAppointments ? (
              <div style={{ padding: "32px 16px", textAlign: "center", color: S.faint, fontSize: 13 }}>
                No upcoming appointments
              </div>
            ) : (
              <>
                {/* Upcoming */}
                {upcomingCalls.map((call, i) => (
                  <div
                    key={call.id}
                    onClick={() => router.push(`/${slug}/leads/${encodeURIComponent(call.email)}`)}
                    style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", borderBottom: `1px solid ${S.borderLight}`, cursor: "pointer" }}
                  >
                    <div>
                      <p style={{ color: S.text, fontSize: 14, fontWeight: 600, margin: 0 }}>{call.first_name ?? call.email.split("@")[0]}</p>
                      <p style={{ color: S.muted, fontSize: 11, margin: "2px 0 0" }}>{call.email}</p>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 600, color: S.blue, background: S.blueBg, padding: "4px 10px", borderRadius: 6, whiteSpace: "nowrap", flexShrink: 0 }}>
                      {fmtMeetingTime(call.meeting_time)}
                    </span>
                  </div>
                ))}

                {/* Needs Outcome */}
                {needsOutcome.length > 0 && (
                  <>
                    <div style={{ padding: "6px 16px", fontSize: 10, color: S.amber, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", background: "#FFFBEB", borderTop: upcomingCalls.length > 0 ? `1px solid ${S.borderLight}` : undefined, borderBottom: `1px solid #FDE68A` }}>
                      Needs Outcome
                    </div>
                    {needsOutcome.map(call => (
                      <div
                        key={call.id}
                        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderBottom: `1px solid ${S.borderLight}` }}
                      >
                        <div>
                          <p style={{ color: S.text, fontSize: 13, fontWeight: 600, margin: 0 }}>{call.first_name ?? call.email.split("@")[0]}</p>
                          <p style={{ color: S.muted, fontSize: 11, margin: "2px 0 0" }}>{fmtMeetingTime(call.meeting_time)}</p>
                        </div>
                        <select
                          disabled={updatingCall === call.id}
                          onChange={e => setOutcome(call.id, e.target.value)}
                          defaultValue=""
                          style={{ background: "#ffffff", border: `1px solid ${S.border}`, color: S.muted, borderRadius: 6, padding: "5px 10px", fontSize: 12, cursor: "pointer", flexShrink: 0 }}
                        >
                          <option value="" disabled>Mark outcome…</option>
                          <option value="attended">Attended</option>
                          <option value="no_show">No Show</option>
                          <option value="rescheduled">Rescheduled</option>
                          <option value="bought">Bought</option>
                        </select>
                      </div>
                    ))}
                  </>
                )}
              </>
            )}
          </div>

          {/* Past calls with outcomes — collapsed below */}
          {(calls?.past ?? []).filter(c => c.outcome).length > 0 && (
            <div style={{ marginTop: 12 }}>
              <p style={{ color: S.muted, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", margin: "0 0 8px" }}>
                Past Calls
              </p>
              <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 12, overflow: "hidden" }}>
                {(calls?.past ?? []).filter(c => c.outcome).map((call, i, arr) => (
                  <div
                    key={call.id}
                    onClick={() => router.push(`/${slug}/leads/${encodeURIComponent(call.email)}`)}
                    style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderBottom: i < arr.length - 1 ? `1px solid ${S.borderLight}` : "none", cursor: "pointer" }}
                  >
                    <div>
                      <p style={{ color: S.text, fontSize: 13, fontWeight: 600, margin: 0 }}>{call.first_name ?? call.email.split("@")[0]}</p>
                      <p style={{ color: S.muted, fontSize: 11, margin: "2px 0 0" }}>{new Date(call.meeting_time).toLocaleDateString()}</p>
                    </div>
                    <span style={{
                      background: ((OUTCOME_COLORS[call.outcome!] ?? S.muted) + "18"),
                      color: OUTCOME_COLORS[call.outcome!] ?? S.muted,
                      borderRadius: 6, padding: "4px 10px", fontSize: 11, fontWeight: 600, flexShrink: 0,
                    }}>
                      {OUTCOME_LABELS[call.outcome!] ?? call.outcome}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Active Clickers */}
        <div>
          <p style={{ color: S.muted, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", margin: "0 0 8px" }}>
            Hot Leads — Active Clickers <span style={{ color: S.faint, fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>· last 7 days</span>
          </p>
          <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 12, overflow: "hidden" }}>
            {/* Header row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 50px", padding: "8px 16px", background: "#F8FAFD", borderBottom: `1px solid ${S.border}` }}>
              <span style={{ fontSize: 10, color: S.muted, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>Lead</span>
              <span style={{ fontSize: 10, color: S.muted, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.05em", textAlign: "right" }}>Clicks</span>
            </div>
            {hotLeads.length === 0 ? (
              <div style={{ padding: "32px 16px", textAlign: "center", color: S.faint, fontSize: 13 }}>
                No active clickers this week
              </div>
            ) : (
              hotLeads.map((lead, i) => (
                <div
                  key={lead.email}
                  onClick={() => router.push(`/${slug}/leads/${encodeURIComponent(lead.email)}`)}
                  style={{ display: "grid", gridTemplateColumns: "1fr 50px", padding: "12px 16px", borderBottom: i < hotLeads.length - 1 ? `1px solid ${S.borderLight}` : "none", alignItems: "center", cursor: "pointer" }}
                >
                  <div>
                    {lead.first_name && (
                      <p style={{ color: S.text, fontSize: 13, fontWeight: 600, margin: 0 }}>{lead.first_name}</p>
                    )}
                    <p style={{ color: lead.first_name ? S.muted : S.text, fontSize: lead.first_name ? 11 : 13, fontWeight: lead.first_name ? 400 : 600, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {lead.email}
                    </p>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, textAlign: "right", color: lead.click_count >= 6 ? S.orange : S.orangeLight }}>
                    {lead.click_count}{lead.click_count >= 6 ? " 🔥" : ""}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Settings */}
      <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 12, padding: 24, marginBottom: 28 }}>
        <h2 style={{ color: S.text, fontSize: 15, fontWeight: 700, marginBottom: 20 }}>Settings</h2>
        <div style={{ display: "flex", gap: 32, flexWrap: "wrap" }}>

          {/* Photo upload */}
          <div>
            <p style={{ color: S.muted, fontSize: 12, fontWeight: 600, marginBottom: 10 }}>Profile Photo</p>
            <label style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, cursor: "pointer" }}>
              <div style={{
                width: 72, height: 72, borderRadius: "50%",
                background: S.bg, border: `2px solid ${S.border}`,
                overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {photoUploading ? (
                  <span style={{ color: S.muted, fontSize: 11 }}>…</span>
                ) : photoPreview ? (
                  <img src={photoPreview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <span style={{ color: S.muted, fontSize: 22 }}>+</span>
                )}
              </div>
              <span style={{ color: S.pink, fontSize: 12, fontWeight: 600 }}>
                {photoUploading ? "Uploading…" : "Upload Photo"}
              </span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                style={{ display: "none" }}
                onChange={e => { const f = e.target.files?.[0]; if (f) uploadPhoto(f); }}
              />
            </label>
          </div>

          {/* Calendly */}
          <div style={{ flex: 1, minWidth: 240 }}>
            <p style={{ color: S.muted, fontSize: 12, fontWeight: 600, marginBottom: 10 }}>Calendly Link</p>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={calendlyInput}
                onChange={e => setCalendlyInput(e.target.value)}
                placeholder="https://calendly.com/your-link"
                style={{
                  flex: 1, background: S.bg, border: `1px solid ${S.border}`,
                  borderRadius: 8, color: S.text, padding: "8px 12px", fontSize: 13, outline: "none",
                }}
              />
              <button
                onClick={saveCalendly}
                disabled={calendlySaving || !calendlyInput.trim()}
                style={{
                  background: calendlySaved ? "#16a34a" : S.pink,
                  color: "#fff", border: "none", borderRadius: 8,
                  padding: "8px 16px", fontSize: 13, fontWeight: 700,
                  cursor: "pointer", whiteSpace: "nowrap",
                  opacity: calendlySaving || !calendlyInput.trim() ? 0.6 : 1,
                }}
              >
                {calendlySaved ? "Saved" : calendlySaving ? "…" : "Save"}
              </button>
            </div>
            <p style={{ color: S.muted, fontSize: 11, marginTop: 6 }}>
              This link is used on your booking page and updates immediately.
            </p>
          </div>

        </div>
      </div>

      {/* Recent Opt-ins */}
      <h2 style={{ color: S.text, fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Recent Opt-ins</h2>
      {data.recentOptIns.length === 0 ? (
        <p style={{ color: S.muted }}>No opt-ins yet.</p>
      ) : (
        <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 12, overflow: "hidden" }}>
          {data.recentOptIns.map((lead, i) => (
            <div
              key={i}
              onClick={() => router.push(`/${slug}/leads/${encodeURIComponent(lead.email)}`)}
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderBottom: i < data.recentOptIns.length - 1 ? `1px solid ${S.border}` : "none", cursor: "pointer" }}
            >
              <div>
                <p style={{ color: S.text, fontSize: 14, margin: 0 }}>{lead.email}</p>
                {(lead.first_name || lead.business_type) && (
                  <p style={{ color: S.muted, fontSize: 12, margin: "2px 0 0" }}>
                    {[lead.first_name, lead.business_type].filter(Boolean).join(" · ")}
                  </p>
                )}
              </div>
              <p style={{ color: S.muted, fontSize: 12, margin: 0 }}>{new Date(lead.created_at).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
