"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

const C = {
  bg: "#F0F2F8",
  card: "#ffffff",
  border: "#E2E8F2",
  borderLight: "#F0F3F9",
  navy: "#0F1E3A",
  pink: "#E8185C",
  muted: "#8A9AB5",
  faint: "#B0BDD0",
  green: "#16a34a",
  orange: "#ea580c",
  orangeLight: "#f97316",
  amber: "#d97706",
  blue: "#4A56C9",
  blueBg: "#EEF1FF",
};

type HotLead = { email: string; name: string | null; click_count: number; last_click: string };
type SourceStat = { source: string; leads: number; booked: number; conversion_rate: number };
type UpcomingAppt = { email: string; first_name: string | null; meeting_time: string };
type PendingCall = { id: string; email: string; first_name: string | null; meeting_time: string };
type ActivityData = {
  total_leads: number;
  new_leads_7d: { email: string }[];
  emails_sent_today: number;
  open_rate_30d: number;
  needs_action: number;
  pending_calls: PendingCall[];
  email_health: { healthy: boolean; bounces_24h: number; complaints_24h: number; queue_depth: number };
  hot_leads: HotLead[];
  hot_leads_total: number;
  upcoming_appointments: UpcomingAppt[];
  source_attribution: SourceStat[];
};

function fmtMeetingTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const isToday = d.toDateString() === now.toDateString();
  const isTomorrow = d.toDateString() === tomorrow.toDateString();
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZoneName: "short" });
  if (isToday) return `Today ${time}`;
  if (isTomorrow) return `Tomorrow ${time}`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " " + time;
}

function sourceName(src: string) {
  if (src === "audit" || src === "claim" || src === "calendly_geo") return "Audit";
  if (src === "import") return "Import";
  return "No Source";
}

export default function ActivityPage() {
  const router = useRouter();
  const [data, setData] = useState<ActivityData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    fetch("/api/admin/activity")
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, [load]);

  if (loading) return (
    <div style={{ background: C.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: C.muted, fontFamily: "system-ui, -apple-system, sans-serif" }}>
      Loading...
    </div>
  );

  if (!data) return null;

  // Merge sources — Audit, Import, No Source
  const SOURCE_ORDER = ["Audit", "Import", "No Source"];
  const mergedSources = Object.values(
    (data.source_attribution ?? []).reduce((acc, row) => {
      const name = sourceName(row.source);
      if (!acc[name]) acc[name] = { name, leads: 0, booked: 0 };
      acc[name].leads += row.leads;
      acc[name].booked += row.booked;
      return acc;
    }, {} as Record<string, { name: string; leads: number; booked: number }>)
  ).map(r => ({
    ...r,
    conv: r.leads > 0 ? Math.round((r.booked / r.leads) * 1000) / 10 : 0,
  })).sort((a, b) => SOURCE_ORDER.indexOf(a.name) - SOURCE_ORDER.indexOf(b.name));

  const newLeadsCount = data.total_leads ?? data.new_leads_7d?.length ?? 0;
  const hotTotal = data.hot_leads_total ?? data.hot_leads?.length ?? 0;

  const divider = (
    <div style={{ width: 1, background: C.border, alignSelf: "stretch" }} />
  );

  const sectionLabel = (text: string, right?: React.ReactNode) => (
    <div style={{ fontSize: 9.5, color: C.muted, textTransform: "uppercase" as const, letterSpacing: "0.08em", fontWeight: 600, marginBottom: 5, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span>{text}</span>
      {right}
    </div>
  );

  return (
    <div style={{ fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", background: C.bg, minHeight: "100vh", display: "flex", flexDirection: "column" }}>

      {/* Page content */}
      <div style={{ padding: "16px 28px", display: "flex", flexDirection: "column", gap: 10, flex: 1, minHeight: 0 }}>

        {/* Header */}
        <div style={{ flexShrink: 0 }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: C.navy }}>Activity</span>
          <span style={{ fontSize: 11, color: C.muted, marginLeft: 10 }}>What&apos;s happening and what needs your attention.</span>
        </div>

        {/* Row 1 — Email */}
        {sectionLabel("Email")}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, display: "flex", overflow: "hidden", flexShrink: 0 }}>
          {[
            { label: "Emails Sent",  value: data.emails_sent_today,                          color: C.navy,                                                                   sub: "Today",              onClick: () => router.push("/admin/leads?view=sent") },
            { label: "Open Rate",    value: `${data.open_rate_30d}%`,                        color: C.green,                                                                  sub: "Unique · 30 days",   onClick: () => router.push("/admin/leads?view=opened") },
            { label: "Queue",        value: data.email_health.queue_depth.toLocaleString(),  color: C.navy,                                                                   sub: "Pending emails",     onClick: () => router.push("/admin/leads?view=queue") },
            { label: "Bounces",      value: data.email_health.bounces_24h,                   color: data.email_health.bounces_24h > 0 ? "#dc2626" : C.green,                  sub: "24 hours",           onClick: () => router.push("/admin/leads?view=bounced") },
            { label: "Unsubscribed", value: data.email_health.complaints_24h,                color: data.email_health.complaints_24h > 0 ? "#dc2626" : C.green,               sub: "24 hours",           onClick: () => router.push("/admin/leads?view=unsubscribed") },
          ].map((item, i) => (
            <div key={i} style={{ display: "flex", alignItems: "stretch" }}>
              {i > 0 && divider}
              <div onClick={item.onClick} style={{ flex: 1, padding: "12px 22px", cursor: "pointer" }}
                onMouseEnter={e => (e.currentTarget.style.background = "#F8FAFD")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                <div style={{ fontSize: 9.5, color: C.muted, textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 600, marginBottom: 5 }}>{item.label}</div>
                <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1, color: item.color }}>{item.value}</div>
                <div style={{ fontSize: 9.5, color: C.faint, marginTop: 3 }}>{item.sub}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Row 2 — Leads */}
        {sectionLabel("Leads")}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, display: "flex", overflow: "hidden", flexShrink: 0 }}>
          {/* New Leads stat */}
          <div onClick={() => router.push("/admin/leads")} style={{ padding: "12px 22px", cursor: "pointer", minWidth: 120 }}
            onMouseEnter={e => (e.currentTarget.style.background = "#F8FAFD")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
            <div style={{ fontSize: 9.5, color: C.muted, textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 600, marginBottom: 5 }}>Total Leads</div>
            <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1, color: C.navy }}>{newLeadsCount.toLocaleString()}</div>
            <div style={{ fontSize: 9.5, color: C.faint, marginTop: 3 }}>In system</div>
          </div>
          {divider}
          {/* Active Clickers stat */}
          <div onClick={() => router.push("/admin/leads?temp=clicked")} style={{ padding: "12px 22px", cursor: "pointer", minWidth: 120 }}
            onMouseEnter={e => (e.currentTarget.style.background = "#F8FAFD")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
            <div style={{ fontSize: 9.5, color: C.muted, textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 600, marginBottom: 5 }}>Hot Leads</div>
            <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1, color: C.orange }}>{hotTotal}</div>
            <div style={{ fontSize: 9.5, color: C.faint, marginTop: 3 }}>2+ clicks · 7 days</div>
          </div>
          {divider}
          {/* Source columns */}
          {mergedSources.map((src, i) => (
            <div key={i} style={{ display: "flex", alignItems: "stretch" }}>
              {i > 0 && divider}
              <div onClick={() => router.push(`/admin/leads?source=${src.name === "No Source" ? "unknown" : src.name.toLowerCase()}`)} style={{ padding: "10px 18px", cursor: "pointer" }}
                onMouseEnter={e => (e.currentTarget.style.background = "#F8FAFD")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                <div style={{ fontSize: 9.5, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>{src.name}</div>
                <div style={{ display: "flex", gap: 14 }}>
                  <div>
                    <div style={{ fontSize: 17, fontWeight: 800, lineHeight: 1, color: C.navy }}>{src.leads}</div>
                    <div style={{ fontSize: 9, color: C.faint, marginTop: 2, textTransform: "uppercase", letterSpacing: "0.04em" }}>Leads</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 17, fontWeight: 800, lineHeight: 1, color: C.green }}>{src.booked}</div>
                    <div style={{ fontSize: 9, color: C.faint, marginTop: 2, textTransform: "uppercase", letterSpacing: "0.04em" }}>Booked</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 17, fontWeight: 800, lineHeight: 1, color: src.conv >= 15 ? C.green : src.conv >= 5 ? C.amber : C.faint }}>{src.conv}%</div>
                    <div style={{ fontSize: 9, color: C.faint, marginTop: 2, textTransform: "uppercase", letterSpacing: "0.04em" }}>Appt %</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Two-column: Upcoming Appointments + Hot Leads */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr", gap: 12, flex: 1, minHeight: 0 }}>

          {/* Upcoming Appointments + Needs Outcome */}
          <div style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
            {sectionLabel("Appointments", <span style={{ fontSize: 9.5, color: C.faint, fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>upcoming · needs outcome</span>)}
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden", flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
              {/* Upcoming */}
              {(data.upcoming_appointments ?? []).length === 0 && (data.pending_calls ?? []).length === 0 ? (
                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: C.faint, fontSize: 12 }}>
                  No upcoming appointments
                </div>
              ) : (
                <>
                  {(data.upcoming_appointments ?? []).map((appt, i) => (
                    <div
                      key={`up-${i}`}
                      onClick={() => router.push(`/admin/leads/${encodeURIComponent(appt.email)}`)}
                      style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "13px 16px", borderBottom: `1px solid ${C.borderLight}`, cursor: "pointer" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "#F8FAFD")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                    >
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: C.navy }}>{appt.first_name ?? appt.email.split("@")[0]}</div>
                        <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{appt.email}</div>
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: C.blue, background: C.blueBg, padding: "4px 10px", borderRadius: 6, whiteSpace: "nowrap" }}>
                        {fmtMeetingTime(appt.meeting_time)}
                      </div>
                    </div>
                  ))}
                  {/* Pending outcome calls */}
                  {(data.pending_calls ?? []).length > 0 && (
                    <>
                      <div style={{ padding: "6px 16px", fontSize: 9.5, color: C.amber, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", background: "#FFFBEB", borderTop: (data.upcoming_appointments ?? []).length > 0 ? `1px solid ${C.borderLight}` : undefined, borderBottom: `1px solid #FDE68A`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span>Needs Outcome</span>
                        <a onClick={() => router.push("/admin/calls")} style={{ fontSize: 9.5, color: C.amber, cursor: "pointer", fontWeight: 500, textTransform: "none", letterSpacing: 0 }}>Manage →</a>
                      </div>
                      {(data.pending_calls ?? []).map((call, i) => (
                        <div
                          key={`pc-${i}`}
                          onClick={() => router.push("/admin/calls")}
                          style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 16px", borderBottom: `1px solid ${C.borderLight}`, cursor: "pointer" }}
                          onMouseEnter={e => (e.currentTarget.style.background = "#FFFBEB")}
                          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                        >
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: C.navy }}>{call.first_name ?? call.email.split("@")[0]}</div>
                            <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{call.email}</div>
                          </div>
                          <div style={{ fontSize: 11, fontWeight: 600, color: C.amber, background: "#FEF3C7", padding: "4px 10px", borderRadius: 6, whiteSpace: "nowrap" }}>
                            {fmtMeetingTime(call.meeting_time)}
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Active Clickers */}
          <div style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
            {sectionLabel(
              "Active Clickers · last 7 days",
              <a onClick={() => router.push("/admin/leads?temp=clicked")} style={{ fontSize: 10, color: C.pink, cursor: "pointer", fontWeight: 500, textTransform: "none", letterSpacing: 0 }}>
                View all {hotTotal > 0 ? hotTotal : ""} →
              </a>
            )}
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden", flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
              {/* Header */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 60px", padding: "8px 16px", background: "#F8FAFD", borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
                <span style={{ fontSize: 9.5, color: C.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Email</span>
                <span style={{ fontSize: 9.5, color: C.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "right" }}>Clicks</span>
              </div>
              {/* Rows */}
              {(data.hot_leads ?? []).length === 0 ? (
                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: C.faint, fontSize: 12 }}>No hot leads right now</div>
              ) : (
                <>
                  {(data.hot_leads ?? []).map((lead, i) => (
                    <div
                      key={i}
                      onClick={() => router.push(`/admin/leads/${encodeURIComponent(lead.email)}`)}
                      style={{ display: "grid", gridTemplateColumns: "1fr 60px", padding: "11px 16px", borderBottom: `1px solid ${C.borderLight}`, alignItems: "center", cursor: "pointer" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "#F8FAFD")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                    >
                      <div style={{ fontSize: 12, fontWeight: 500, color: C.navy, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{lead.email}</div>
                      <div style={{ fontSize: 12, fontWeight: 700, textAlign: "right", color: lead.click_count >= 6 ? C.orange : C.orangeLight }}>
                        {lead.click_count}{lead.click_count >= 6 ? " 🔥" : ""}
                      </div>
                    </div>
                  ))}
                  {hotTotal > (data.hot_leads ?? []).length && (
                    <div
                      onClick={() => router.push("/admin/leads?temp=clicked")}
                      style={{ padding: "10px 16px", fontSize: 11, color: C.muted, textAlign: "center", background: "#F8FAFD", borderTop: `1px solid ${C.borderLight}`, cursor: "pointer", marginTop: "auto", flexShrink: 0 }}
                      onMouseEnter={e => (e.currentTarget.style.color = C.pink)}
                      onMouseLeave={e => (e.currentTarget.style.color = C.muted)}
                    >
                      + {hotTotal - (data.hot_leads ?? []).length} more · click to view all
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
