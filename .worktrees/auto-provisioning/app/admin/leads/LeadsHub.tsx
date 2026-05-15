"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { SEQUENCES, SEQ_LABEL, STAGE_META, OFFER_META, type Stage, type Offer } from "../../../lib/sequences";
import { EMAIL_TEMPLATES } from "../../../lib/emails/templates";
import { SERIES_LABEL } from "./page";
import LeadDetailPanel from "./LeadDetailPanel";

// ── shared email page styles ──
const C = {
  bg: "#F0F2F8", card: "#ffffff", border: "#E2E8F2", borderLight: "#F0F3F9",
  navy: "#0F1E3A", pink: "#E8185C", muted: "#8A9AB5", faint: "#B0BDD0",
  green: "#16a34a", red: "#dc2626", amber: "#d97706", blue: "#4A56C9",
};

const EVENT_COLOR: Record<string, string> = {
  sent: C.faint, delivered: C.blue, opened: C.green,
  clicked: C.pink, bounced: C.red, complained: "#7f1d1d",
};
const STATUS_COLOR: Record<string, string> = {
  sent: C.green, cancelled: C.faint, overdue: C.red, pending: C.muted,
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit", timeZone: "America/Chicago",
  }) + " CT";
}
function relTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}
function formatDelay(hours: number) {
  if (hours === 0) return "Immediate";
  if (hours < 1) return `+${Math.round(hours * 60)}min`;
  if (hours < 24) return `+${hours}h`;
  const d = Math.round(hours / 24);
  if (d < 7) return `Day ${d}`;
  const w = Math.round(d / 7);
  if (w < 4) return `Week ${w}`;
  return `Month ${Math.round(d / 30)}`;
}
function badge(label: string, color: string) {
  return <span style={{ background: color + "18", color, padding: "2px 8px", borderRadius: 4, fontWeight: 700, fontSize: 11, whiteSpace: "nowrap" as const }}>{label}</span>;
}
function Pill({ label, active, color, onClick }: { label: string; active: boolean; color?: string; onClick: () => void }) {
  const c = color ?? C.pink;
  return <button onClick={onClick} style={{ background: active ? c + "15" : C.card, color: active ? c : C.muted, border: `1px solid ${active ? c : C.border}`, borderRadius: 20, padding: "5px 14px", fontSize: 12, fontWeight: active ? 700 : 400, cursor: "pointer" }}>{label}</button>;
}
function Pagination({ page, totalPages, setPage }: { page: number; totalPages: number; setPage: (fn: (p: number) => number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 20 }}>
      <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} style={{ background: C.card, color: page === 0 ? C.faint : C.navy, border: `1px solid ${C.border}`, borderRadius: 6, padding: "6px 16px", fontSize: 12, cursor: page === 0 ? "default" : "pointer" }}>← Prev</button>
      <span style={{ color: C.muted, fontSize: 12 }}>Page {page + 1} of {totalPages}</span>
      <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} style={{ background: C.card, color: page >= totalPages - 1 ? C.faint : C.navy, border: `1px solid ${C.border}`, borderRadius: 6, padding: "6px 16px", fontSize: 12, cursor: page >= totalPages - 1 ? "default" : "pointer" }}>Next →</button>
    </div>
  );
}
function LeadLink({ email, name }: { email: string; name?: string }) {
  const router = useRouter();
  return (
    <td style={{ padding: "10px 14px" }}>
      <div onClick={e => { e.stopPropagation(); router.push(`/admin/leads/${encodeURIComponent(email)}`); }} style={{ cursor: "pointer" }}>
        {name && <div style={{ color: C.navy, fontWeight: 600, fontSize: 13 }}>{name}</div>}
        <div style={{ color: C.blue, fontSize: 11, textDecoration: "underline" }}>{email}</div>
      </div>
    </td>
  );
}

// ── Shared helpers ──
function tempInfo(lead: { temp?: string; suppress_reason: string | null; booked: boolean; no_show: boolean; opened: boolean; clicked: boolean }) {
  // Use DB-computed temp field; fall back to derived logic
  const t = (lead as any).temp as string | undefined;
  if (t === "client")       return { label: "Client",     color: "#4ade80" };
  if (t === "hot")          return { label: "Hot",        color: "#f97316" };
  if (t === "no_show")      return { label: "No Show",    color: "#f87171" };
  if (t === "warm")         return { label: "Warm",       color: "#facc15" };
  if (t === "cold")         return { label: "Cold",       color: C.muted };
  if (t === "bounced")      return { label: "Bounced",    color: C.red };
  if (t === "unsubscribed") return { label: "Unsub'd",    color: C.red };
  if (t === "suppressed")   return { label: "Suppressed", color: "#94a3b8" };
  // Fallback
  if (lead.suppress_reason === "client")                                                  return { label: "Client",     color: "#4ade80" };
  if (lead.suppress_reason === "admin_suppressed"
   || lead.suppress_reason === "bounced"
   || lead.suppress_reason === "unsubscribed"
   || lead.suppress_reason === "spam")                                                   return { label: "Suppressed", color: "#94a3b8" };
  if (lead.booked && !lead.no_show)                                                      return { label: "Hot",        color: "#f97316" };
  if (lead.no_show)                                                                      return { label: "No Show",    color: "#f87171" };
  if (lead.opened || lead.clicked)                                                       return { label: "Warm",       color: "#facc15" };
  return { label: "Cold", color: C.muted };
}

const OFFER_TAG: Record<string, { label: string; color: string }> = {
  v1:      { label: "GEO V1",   color: "#60a5fa" },
  v2:      { label: "GEO V2",   color: "#e879f9" },
  podcast: { label: "Podcast",  color: "#c084fc" },
};

const SRC_LABEL: Record<string, string> = {
  audit: "Audit", claim: "Audit", calendly_geo: "Audit",
  import: "Import",
  affiliate_application: "Affiliate App",
};
const SYSTEM_SOURCES = new Set(["audit", "claim", "calendly_geo", "import", "unknown", "affiliate_application"]);

// ── Shared column header button style ──
function selStyle(active: boolean) {
  return {
    background: active ? C.navy + "12" : "transparent",
    color: active ? C.navy : C.muted,
    border: `1px solid ${active ? C.navy + "60" : C.border}`,
    borderRadius: 4, padding: "3px 7px",
    fontSize: 10, fontWeight: active ? 700 : 500,
    outline: "none", cursor: "pointer",
    textTransform: "uppercase" as const, letterSpacing: "0.04em",
  };
}
function filterSelectStyle(active: boolean) {
  return {
    background: active ? C.navy + "08" : C.card,
    color: active ? C.navy : C.muted,
    border: `1px solid ${active ? C.navy + "60" : C.border}`,
    borderRadius: 6, padding: "6px 10px",
    fontSize: 12, fontWeight: active ? 600 : 400,
    outline: "none", cursor: "pointer",
  };
}

// ── All Leads tab ──
function AllLeadsTab({ initialTemp = "", initialSource = "", initialFilterNew = false, initialSeq = "", search = "", onSelectLead }: { initialTemp?: string; initialSource?: string; initialFilterNew?: boolean; initialSeq?: string; search?: string; onSelectLead: (email: string) => void }) {
  const router = useRouter(); // kept for LeadLink usage only
  const [data, setData]         = useState<any>(null);
  const [page, setPage]         = useState(0);
  const [source, setSource]     = useState(initialSource);
  const [statusFilter, setStatusFilter] = useState(() => initialFilterNew ? "new" : initialTemp);
  const [seqFilter, setSeqFilter]       = useState(initialSeq);
  const [sortName, setSortName]         = useState<"asc"|"desc"|"">("");
  const [sort, setSort]                 = useState<"date_desc"|"date_asc"|"activity_desc"|"activity_asc">("date_desc");
  const [loading, setLoading]   = useState(false);
  const [affiliates, setAffiliates] = useState<{ tag: string; name: string }[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/admin/affiliates")
      .then(r => r.ok ? r.json() : { affiliates: [] })
      .then(d => setAffiliates((d.affiliates ?? []).map((a: any) => ({ tag: a.tag, name: a.name }))));
    fetch("/api/admin/tags")
      .then(r => r.ok ? r.json() : { tags: [] })
      .then(d => setAllTags(d.tags ?? []));
  }, []);

  const temp      = statusFilter === "new" ? "" : statusFilter;
  const filterNew = statusFilter === "new";

  const load = useCallback(async () => {
    setLoading(true);
    const p = new URLSearchParams({
      page: String(page), search,
      temp, sort_name: sortName, sort: sort,
      ...(source    ? { source }           : {}),
      ...(filterNew ? { filter: "new" }    : {}),
      ...(seqFilter ? { sequence: seqFilter } : {}),
    });
    const res = await fetch(`/api/admin/leads?${p}`);
    if (res.ok) setData(await res.json());
    setLoading(false);
  }, [page, temp, source, filterNew, seqFilter, sortName, sort, search]);

  useEffect(() => { setPage(0); }, [temp, source, filterNew, seqFilter, sortName, sort, search]);
  useEffect(() => { load(); }, [load]);

  const leads: any[] = data?.leads ?? [];
  const total = data?.totals?.total ?? 0;
  const totalPages = Math.ceil(total / 50);

  function cycleSortName() {
    setSortName(s => s === "" ? "asc" : s === "asc" ? "desc" : "");
  }
  function cycleSortActivity() {
    setSort(s => s === "activity_desc" ? "activity_asc" : "activity_desc");
  }
  function cycleSortDate() {
    setSort(s => s === "date_desc" ? "date_asc" : "date_desc");
  }
  const nameArrow     = sortName === "asc" ? " ↑" : sortName === "desc" ? " ↓" : " ↕";
  const activityArrow = sort === "activity_desc" ? " ↓" : sort === "activity_asc" ? " ↑" : " ↕";
  const dateArrow     = sort === "date_desc"     ? " ↓" : sort === "date_asc"     ? " ↑" : " ↕";

  const EVENT_LABEL: Record<string, string> = {
    sent: "Sent", opened: "Opened", clicked: "Clicked",
    bounced: "Bounced", complained: "Unsubscribed",
  };

  return (
    <div style={{ padding: "20px 40px", background: C.bg, minHeight: "100vh" }}>
      <div style={{ fontSize: 11, color: C.faint, marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
        {total.toLocaleString()} contacts
        {loading && <span style={{ color: C.faint, fontSize: 10 }}>Updating…</span>}
      </div>
      {/* Filter bar */}
      <div style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap" as const, alignItems: "center" }}>
        <select value={source} onChange={e => { setSource(e.target.value); setPage(0); }} style={{ ...filterSelectStyle(!!source), minWidth: 130 }}>
          <option value="">All Tags</option>
          {allTags.map(tag => (
            <option key={tag} value={tag}>{tag}</option>
          ))}
        </select>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(0); }} style={filterSelectStyle(!!statusFilter)}>
          <option value="">All Statuses</option>
          <option value="client">Client</option>
          <option value="appt_set">Appt Set</option>
          <option value="hot">Hot</option>
          <option value="no_show">No Show</option>
          <option value="warm">Warm</option>
          <option value="cold">Cold</option>
          <option value="bounced">Bounced</option>
          <option value="unsubscribed">Unsubscribed</option>
          <option value="suppressed">Suppressed</option>
          <option value="clicked">Active Clickers</option>
          <option value="new">New · 7d</option>
        </select>
        <select value={seqFilter} onChange={e => { setSeqFilter(e.target.value); setPage(0); }} style={{ ...filterSelectStyle(!!seqFilter), minWidth: 160 }}>
          <option value="">All Sequences</option>
          {SEQUENCES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
          <option value="none">None (fallen off)</option>
        </select>
        {(source || statusFilter || seqFilter) && (
          <button onClick={() => { setSource(""); setStatusFilter(""); setSeqFilter(""); setPage(0); }} style={{ background: "transparent", border: `1px solid ${C.border}`, color: C.muted, borderRadius: 6, padding: "6px 12px", fontSize: 12, cursor: "pointer" }}>
            Clear filters
          </button>
        )}
      </div>

      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" as const, fontSize: 12, tableLayout: "fixed" as const }}>
          <colgroup>
            <col style={{ width: "34%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "15%" }} />
            <col style={{ width: "15%" }} />
            <col style={{ width: "15%" }} />
            <col style={{ width: "14%" }} />
          </colgroup>
          <thead>
            <tr style={{ background: "#F8FAFD", borderBottom: `1px solid ${C.border}` }}>
              <th style={{ textAlign: "left" as const, padding: "9px 14px" }}>
                <button onClick={cycleSortName} style={{ ...selStyle(!!sortName), display: "inline-flex", alignItems: "center", gap: 2 }}>
                  Name / Email{nameArrow}
                </button>
              </th>
              <th style={{ textAlign: "left" as const, padding: "9px 14px", color: C.faint, fontSize: 10, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.04em" }}>Source</th>
              <th style={{ textAlign: "left" as const, padding: "9px 14px", color: C.faint, fontSize: 10, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.04em" }}>Sequence</th>
              <th style={{ textAlign: "left" as const, padding: "9px 14px" }}>
                <button onClick={cycleSortActivity} style={{ ...selStyle(sort.startsWith("activity")), display: "inline-flex", alignItems: "center", gap: 2 }}>
                  Last Email{activityArrow}
                </button>
              </th>
              <th style={{ textAlign: "left" as const, padding: "9px 14px" }}>
                <button onClick={cycleSortDate} style={{ ...selStyle(sort.startsWith("date")), display: "inline-flex", alignItems: "center", gap: 2 }}>
                  Date Created{dateArrow}
                </button>
              </th>
              <th style={{ textAlign: "left" as const, padding: "9px 14px", color: C.faint, fontSize: 10, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.04em" }}>Last Inquiry</th>
            </tr>
          </thead>
          <tbody style={{ opacity: loading ? 0.5 : 1, transition: "opacity 0.15s" }}>
            {leads.map((lead, i) => {
              const ti = tempInfo(lead);
              const src = lead.source ?? "unknown";
              const curSeq = lead.current_sequence;
              const lastEv = lead.last_email;
              const evType = (lastEv?.event_type as string) ?? "";
              const lastEvColor = evType === "clicked" ? C.green : evType === "opened" ? C.amber : evType === "bounced" ? C.red : C.faint;
              const lastEvLabel = lastEv && lastEv.event_type
                ? `${EVENT_LABEL[evType] ?? evType} · ${new Date(lastEv.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                : "—";
              return (
                <tr
                  key={i}
                  onClick={() => onSelectLead(lead.email)}
                  style={{ borderBottom: `1px solid ${C.borderLight}`, cursor: "pointer" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#F8FAFD")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  <td style={{ padding: "10px 14px" }}>
                    {lead.first_name && (
                      <div style={{ color: C.navy, fontWeight: 600, fontSize: 13, marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{lead.first_name}</div>
                    )}
                    <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" as const, marginBottom: 3 }}>
                      {badge(ti.label, ti.color)}
                      {OFFER_TAG[(lead as any).offer] && (
                        <span style={{ background: OFFER_TAG[(lead as any).offer].color + "20", color: OFFER_TAG[(lead as any).offer].color, padding: "2px 8px", borderRadius: 4, fontWeight: 700, fontSize: 11, whiteSpace: "nowrap" as const }}>
                          {OFFER_TAG[(lead as any).offer].label}
                        </span>
                      )}
                      {((lead as any).tags as string[] ?? []).map((tag: string) => (
                        <span key={tag} style={{ background: C.pink + "18", color: C.pink, padding: "2px 8px", borderRadius: 4, fontWeight: 700, fontSize: 11, whiteSpace: "nowrap" as const }}>
                          {tag}
                        </span>
                      ))}
                    </div>
                    <div style={{ color: C.blue, fontSize: 11, textDecoration: "underline", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{lead.email}</div>
                  </td>
                  <td style={{ padding: "10px 14px", fontSize: 12, color: C.muted }}>
                    {SRC_LABEL[src] ?? (src === "unknown" ? "—" : src)}
                  </td>
                  <td style={{ padding: "10px 14px" }}>
                    {curSeq ? (() => {
                      const info = SERIES_LABEL[curSeq as string];
                      return info
                        ? badge(info.label, info.color)
                        : <span style={{ color: C.muted, fontSize: 11 }}>{curSeq as string}</span>;
                    })() : (lead as any).fallen_off
                      ? <span style={{ background: "#f9731620", color: "#f97316", padding: "1px 6px", borderRadius: 4, fontSize: 11, fontWeight: 700 }}>none</span>
                      : <span style={{ color: C.faint }}>—</span>}
                  </td>
                  <td style={{ padding: "10px 14px", fontSize: 11, color: lastEvColor }}>{lastEvLabel}</td>
                  <td style={{ padding: "10px 14px", fontSize: 11, color: C.muted }}>
                    {lead.enrolled_at
                      ? new Date(lead.enrolled_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                      : "—"}
                  </td>
                  <td style={{ padding: "10px 14px", fontSize: 11 }}>
                    {(lead as any).latest_inquiry_at ? (
                      <span>
                        <span style={{ color: C.navy, fontWeight: 600 }}>
                          {new Date((lead as any).latest_inquiry_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </span>
                        {(lead as any).latest_inquiry_tag && (
                          <span style={{ color: C.muted, marginLeft: 4 }}>· {(lead as any).latest_inquiry_tag}</span>
                        )}
                      </span>
                    ) : <span style={{ color: C.faint }}>—</span>}
                  </td>
                </tr>
              );
            })}
            {!loading && leads.length === 0 && (
              <tr><td colSpan={6} style={{ padding: "40px", textAlign: "center" as const, color: C.faint }}>No leads found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <Pagination page={page} totalPages={totalPages} setPage={setPage} />
    </div>
  );
}

// ── Queue tab ──
function QueueTab({ initialStatus = "pending", search = "" }: { initialStatus?: string; search?: string }) {
  const [data, setData] = useState<any>(null);
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState(initialStatus);
  const [sequence, setSequence] = useState("");
  const [sortCol, setSortCol] = useState("send_at");
  const [sortDir, setSortDir] = useState<"asc"|"desc">("asc");

  function cycleSort(col: string) {
    if (sortCol === col) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortCol(col);
      setSortDir("asc");
    }
    setPage(0);
  }
  function arrow(col: string) {
    if (sortCol !== col) return " ↕";
    return sortDir === "asc" ? " ↑" : " ↓";
  }

  const load = useCallback(async () => {
    const p = new URLSearchParams({ page: String(page), status, sequence, search, sort_col: sortCol, sort_dir: sortDir });
    const res = await fetch(`/api/admin/emails/queue?${p}`);
    if (res.ok) setData(await res.json());
  }, [page, status, sequence, search, sortCol, sortDir]);

  useEffect(() => { setPage(0); }, [status, sequence, search, sortCol, sortDir]);
  useEffect(() => { load(); }, [load]);

  const rows: any[] = data?.rows ?? [];
  const totalPages = Math.ceil((data?.total ?? 0) / 50);

  const thBtn = (col: string, label: string) => (
    <th style={{ textAlign: "left" as const, padding: "9px 14px" }}>
      <button onClick={() => cycleSort(col)} style={{ ...selStyle(sortCol === col), display: "inline-flex", alignItems: "center", gap: 2 }}>
        {label}{arrow(col)}
      </button>
    </th>
  );

  return (
    <div style={{ padding: "20px 40px", background: C.bg, minHeight: "100vh" }}>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" as const, marginBottom: 16, alignItems: "center" }}>
        {["all","pending","overdue","sent","cancelled"].map(s => (
          <Pill key={s} label={s.charAt(0).toUpperCase() + s.slice(1)} active={status === s} color={s === "overdue" ? C.red : s === "sent" ? C.green : undefined} onClick={() => { setStatus(s); setPage(0); }} />
        ))}
        <select value={sequence} onChange={e => { setSequence(e.target.value); setPage(0); }} style={{ background: C.card, color: C.muted, border: `1px solid ${C.border}`, borderRadius: 6, padding: "5px 12px", fontSize: 12, outline: "none" }}>
          <option value="">All Sequences</option>
          {SEQUENCES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
      </div>
      <div style={{ fontSize: 11, color: C.faint, marginBottom: 10 }}>{(data?.total ?? 0).toLocaleString()} rows</div>
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" as const, fontSize: 12 }}>
          <thead>
            <tr style={{ background: "#F8FAFD", borderBottom: `1px solid ${C.border}` }}>
              {thBtn("email",    "Recipient")}
              {thBtn("sequence", "Sequence")}
              {thBtn("step",     "Step")}
              {thBtn("send_at",  "Scheduled For")}
              {thBtn("status",   "Status")}
              {thBtn("sent_at",  "Sent At")}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const seq = SEQUENCES.find(s => s.key === row.sequence);
              return (
                <tr key={i} style={{ borderBottom: `1px solid ${C.borderLight}`, background: row.status === "overdue" ? "#FEF2F2" : "transparent" }}>
                  <LeadLink email={row.email} name={row.first_name} />
                  <td style={{ padding: "10px 14px" }}>{seq ? badge(seq.label, seq.color) : <span style={{ color: C.faint, fontSize: 11 }}>{row.sequence}</span>}</td>
                  <td style={{ padding: "10px 14px", color: C.muted, fontSize: 12 }}>#{row.step}</td>
                  <td style={{ padding: "10px 14px", color: C.muted, fontSize: 11 }}>{fmtDate(row.send_at)}</td>
                  <td style={{ padding: "10px 14px" }}><span style={{ color: STATUS_COLOR[row.status] ?? C.muted, fontWeight: 700, fontSize: 12 }}>{row.status === "overdue" ? "⚠ Overdue" : row.status.charAt(0).toUpperCase() + row.status.slice(1)}</span></td>
                  <td style={{ padding: "10px 14px", color: C.faint, fontSize: 11 }}>{row.sent_at ? relTime(row.sent_at) : "—"}</td>
                </tr>
              );
            })}
            {rows.length === 0 && <tr><td colSpan={6} style={{ padding: "40px", textAlign: "center" as const, color: C.faint }}>No rows found.</td></tr>}
          </tbody>
        </table>
      </div>
      <Pagination page={page} totalPages={totalPages} setPage={setPage} />
    </div>
  );
}

// ── Events tab ──
function EventsTab({ initialEvent = "all", search = "" }: { initialEvent?: string; search?: string }) {
  const [data, setData] = useState<any>(null);
  const [page, setPage] = useState(0);
  const [eventType, setEventType] = useState(initialEvent);
  const [sequence, setSequence] = useState("");

  const load = useCallback(async () => {
    const p = new URLSearchParams({ page: String(page), event: eventType, sequence, search });
    const res = await fetch(`/api/admin/emails/events?${p}`);
    if (res.ok) setData(await res.json());
  }, [page, eventType, sequence, search]);

  useEffect(() => { setPage(0); }, [eventType, sequence, search]);
  useEffect(() => { load(); }, [load]);

  const rows: any[] = data?.rows ?? [];
  const totalPages = Math.ceil((data?.total ?? 0) / 50);

  return (
    <div style={{ padding: "20px 40px", background: C.bg, minHeight: "100vh" }}>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" as const, marginBottom: 16, alignItems: "center" }}>
        {[
          { key: "all", label: "All" },
          { key: "sent", label: "Sent" },
        ].map(({ key: e, label }) => (
          <Pill key={e} label={label} active={eventType === e} color={EVENT_COLOR[e] ?? C.pink} onClick={() => setEventType(e)} />
        ))}
        <select value={sequence} onChange={ev => setSequence(ev.target.value)} style={{ background: C.card, color: C.muted, border: `1px solid ${C.border}`, borderRadius: 6, padding: "5px 12px", fontSize: 12, outline: "none" }}>
          <option value="">All Sequences</option>
          {SEQUENCES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
      </div>
      <div style={{ fontSize: 11, color: C.faint, marginBottom: 10 }}>{(data?.total ?? 0).toLocaleString()} events</div>
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" as const, fontSize: 12 }}>
          <thead>
            <tr style={{ background: "#F8FAFD", borderBottom: `1px solid ${C.border}` }}>
              {["Time","Recipient","Sequence","Step","Event","Resend ID"].map(h => (
                <th key={h} style={{ textAlign: "left" as const, padding: "9px 14px", fontWeight: 600, fontSize: 10, color: C.muted, textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const color = EVENT_COLOR[row.event_type] ?? C.muted;
              return (
                <tr key={i} style={{ borderBottom: `1px solid ${C.borderLight}` }}>
                  <td style={{ padding: "10px 14px", color: C.muted, fontSize: 11, whiteSpace: "nowrap" as const }}>{relTime(row.created_at)}</td>
                  <LeadLink email={row.email} />
                  <td style={{ padding: "10px 14px", color: C.muted, fontSize: 12 }}>{SEQ_LABEL[row.sequence] ?? row.sequence}</td>
                  <td style={{ padding: "10px 14px", color: C.faint, fontSize: 12 }}>#{row.step}</td>
                  <td style={{ padding: "10px 14px" }}><span style={{ background: color + "18", color, padding: "2px 8px", borderRadius: 4, fontWeight: 700, fontSize: 11, textTransform: "capitalize" as const }}>{row.event_type}</span></td>
                  <td style={{ padding: "10px 14px", color: C.faint, fontSize: 11, fontFamily: "monospace" }}>
                    {row.resend_email_id ? <span title={row.resend_email_id} style={{ cursor: "pointer" }} onClick={() => navigator.clipboard?.writeText(row.resend_email_id)}>{row.resend_email_id.slice(0, 12)}…</span> : "—"}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && <tr><td colSpan={6} style={{ padding: "40px", textAlign: "center" as const, color: C.faint }}>No events found.</td></tr>}
          </tbody>
        </table>
      </div>
      <Pagination page={page} totalPages={totalPages} setPage={setPage} />
    </div>
  );
}

// ── Templates tab ──
const OFFER_COLORS: Record<Offer, string> = {
  v1: "#E8185C", v2: "#e879f9", universal: "#34d399", podcast: "#c084fc", affiliate: "#fb923c",
};

function TemplatesTab() {
  const [activeOffer, setActiveOffer] = useState<"all" | Offer>("all");
  const [activeStage, setActiveStage] = useState<"all" | Stage>("all");
  const [activeSeq, setActiveSeq] = useState("warm_nurture");
  const [activeStep, setActiveStep] = useState(1);

  const offerMatch = (offer: "all" | Offer, s: typeof SEQUENCES[number]) =>
    offer === "all" || s.offer === offer;

  const visibleSequences = SEQUENCES.filter(s =>
    offerMatch(activeOffer, s) &&
    (activeStage === "all" || s.stage === activeStage)
  );
  const seq = visibleSequences.find(s => s.key === activeSeq) ?? visibleSequences[0];

  function handleOfferChange(offer: "all" | Offer) {
    setActiveOffer(offer);
    const next = SEQUENCES.filter(s =>
      offerMatch(offer, s) &&
      (activeStage === "all" || s.stage === activeStage)
    );
    if (!next.find(s => s.key === activeSeq)) { setActiveSeq(next[0]?.key ?? "warm_nurture"); setActiveStep(1); }
  }

  function handleStageChange(stage: "all" | Stage) {
    setActiveStage(stage);
    const next = SEQUENCES.filter(s =>
      offerMatch(activeOffer, s) &&
      (stage === "all" || s.stage === stage)
    );
    if (!next.find(s => s.key === activeSeq)) { setActiveSeq(next[0]?.key ?? "warm_nurture"); setActiveStep(1); }
  }

  const templateFn = EMAIL_TEMPLATES[`${seq?.key}_${activeStep}` as keyof typeof EMAIL_TEMPLATES];
  const email = templateFn?.({ firstName: "Sarah", email: "sarah@example.com", overall: 28, seo: 22, ai: 24, auditId: "demo123" });

  const offerFilters: Array<{ key: "all" | Offer; label: string; color: string }> = [
    { key: "all", label: "All", color: C.muted },
    ...(Object.entries(OFFER_META) as [Offer, { label: string }][]).map(([k, v]) => ({ key: k, label: v.label, color: OFFER_COLORS[k] })),
  ];

  const stageFilters: Array<{ key: "all" | Stage; label: string; color: string }> = [
    { key: "all", label: "All", color: C.muted },
    ...Object.entries(STAGE_META).map(([k, v]) => ({ key: k as Stage, label: v.label, color: v.color })),
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 52px)", background: C.bg }}>
      {/* Offer filter pills */}
      <div style={{ display: "flex", gap: 6, padding: "8px 16px", background: C.card, borderBottom: `1px solid ${C.border}`, flexShrink: 0, flexWrap: "wrap" as const, alignItems: "center" }}>
        <span style={{ color: C.faint, fontSize: 10, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.06em", marginRight: 4 }}>Offer</span>
        {offerFilters.map(of => {
          const active = activeOffer === of.key;
          return (
            <button type="button" key={of.key} onClick={() => handleOfferChange(of.key)} style={{ padding: "3px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700, cursor: "pointer", border: `1px solid ${active ? of.color : C.border}`, background: active ? of.color : "transparent", color: active ? "#fff" : C.muted, letterSpacing: "0.03em" }}>
              {of.label}
            </button>
          );
        })}
      </div>
      {/* Stage filter pills */}
      <div style={{ display: "flex", gap: 6, padding: "8px 16px", background: C.card, borderBottom: `1px solid ${C.border}`, flexShrink: 0, flexWrap: "wrap" as const, alignItems: "center" }}>
        <span style={{ color: C.faint, fontSize: 10, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.06em", marginRight: 4 }}>Stage</span>
        {stageFilters.map(st => {
          const active = activeStage === st.key;
          return (
            <button type="button" key={st.key} onClick={() => handleStageChange(st.key)} style={{ padding: "3px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700, cursor: "pointer", border: `1px solid ${active ? st.color : C.border}`, background: active ? st.color : "transparent", color: active ? "#fff" : C.muted, letterSpacing: "0.03em", textTransform: "uppercase" as const }}>
              {st.label}
            </button>
          );
        })}
      </div>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Sequence sidebar */}
        <div style={{ width: 200, borderRight: `1px solid ${C.border}`, overflowY: "auto" as const, flexShrink: 0, background: C.card }}>
          <div style={{ padding: "12px 16px 8px", color: C.faint, fontSize: 9.5, textTransform: "uppercase" as const, letterSpacing: "0.08em", fontWeight: 600 }}>Sequences</div>
          {visibleSequences.length === 0 && (
            <div style={{ padding: "12px 16px", color: C.faint, fontSize: 12 }}>No sequences match.</div>
          )}
          {visibleSequences.map(s => (
            <button type="button" key={s.key} onClick={() => { setActiveSeq(s.key); setActiveStep(1); }} style={{ display: "block", width: "100%", textAlign: "left" as const, padding: "10px 16px", fontSize: 12, cursor: "pointer", border: "none", background: seq?.key === s.key ? C.bg : "transparent", color: seq?.key === s.key ? s.color : C.muted, borderLeft: seq?.key === s.key ? `3px solid ${s.color}` : "3px solid transparent" }}>
              {s.label}
              <span style={{ display: "block", fontSize: 10, color: C.faint, marginTop: 2 }}>
                {STAGE_META[s.stage as keyof typeof STAGE_META]?.label ?? s.stage} · {s.delays.length} email{s.delays.length !== 1 ? "s" : ""}
              </span>
            </button>
          ))}
        </div>

        {/* Step sidebar */}
        <div style={{ width: 150, borderRight: `1px solid ${C.border}`, overflowY: "auto" as const, flexShrink: 0, background: C.card }}>
          <div style={{ padding: "12px 16px 8px", color: C.faint, fontSize: 9.5, textTransform: "uppercase" as const, letterSpacing: "0.08em", fontWeight: 600 }}>{seq?.label ?? "—"}</div>
          {seq?.delays.map((delay, i) => {
            const step = i + 1;
            const has = !!(EMAIL_TEMPLATES[`${seq.key}_${step}` as keyof typeof EMAIL_TEMPLATES]);
            return (
              <button type="button" key={step} onClick={() => setActiveStep(step)} style={{ display: "block", width: "100%", textAlign: "left" as const, padding: "10px 16px", fontSize: 12, cursor: "pointer", border: "none", background: activeStep === step ? C.bg : "transparent", color: activeStep === step ? seq.color : has ? C.muted : C.faint, borderLeft: activeStep === step ? `3px solid ${seq.color}` : "3px solid transparent", opacity: has ? 1 : 0.45 }}>
                Email {step}
                <span style={{ display: "block", fontSize: 10, color: C.faint, marginTop: 2 }}>{formatDelay(delay)}</span>
              </button>
            );
          })}
        </div>

        {/* Email preview */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {seq && email ? (
            <>
              <div style={{ padding: "12px 20px", borderBottom: `1px solid ${C.border}`, background: C.card, flexShrink: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
                  <span style={{ background: seq.color + "18", color: seq.color, fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 4 }}>{seq.label} — Email {activeStep}</span>
                  <span style={{ color: C.faint, fontSize: 11 }}>{formatDelay(seq.delays[activeStep - 1])}</span>
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.navy }}>Subject: {email.subject}</div>
              </div>
              <div style={{ flex: 1, overflow: "hidden" }}>
                <iframe srcDoc={email.html} style={{ width: "100%", height: "100%", border: "none" }} title={`${seq.label} Email ${activeStep}`} />
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: C.faint, fontSize: 13 }}>No template for this step.</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Enroll modals ──
function EnrollModals({ onClose }: { onClose: () => void }) {
  const [mode, setMode] = useState<"choose" | "individual" | "csv">("choose");
  const [sequence, setSequence] = useState("warm_nurture");
  // Individual form
  const [firstName, setFirstName] = useState("");
  const [email, setEmail]         = useState("");
  const [website, setWebsite]     = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg]              = useState("");
  // CSV
  const [csvText, setCsvText]    = useState("");
  const [csvResult, setCsvResult] = useState("");

  async function submitIndividual() {
    if (!email.trim()) { setMsg("Email is required."); return; }
    setSubmitting(true);
    setMsg("");
    const res = await fetch("/api/admin/bulk-enroll", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leads: [{ email: email.trim().toLowerCase(), firstName: firstName.trim() || undefined, sequences: [sequence] }] }),
    });
    const d = await res.json();
    setSubmitting(false);
    if (res.ok) {
      const r = d.results?.[0];
      setMsg(r?.status === "enrolled" ? "Enrolled!" : r?.status === "skipped" ? "Already enrolled." : r?.status === "suppressed" ? "Suppressed — not enrolled." : "Done.");
    } else {
      setMsg("Error: " + (d.error ?? "Unknown"));
    }
  }

  async function submitCsv() {
    const lines = csvText.trim().split("\n").filter(Boolean);
    if (lines.length < 2) { setCsvResult("Paste a CSV with a header row and at least one data row."); return; }
    const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/"/g, ""));
    const emailIdx = headers.indexOf("email");
    if (emailIdx === -1) { setCsvResult("CSV must have an 'email' column."); return; }
    const nameIdx   = headers.indexOf("first_name");
    const leads = lines.slice(1).map(line => {
      const cols = line.split(",").map(c => c.trim().replace(/"/g, ""));
      return {
        email: cols[emailIdx]?.trim().toLowerCase(),
        firstName: nameIdx >= 0 ? cols[nameIdx]?.trim() || undefined : undefined,
        sequences: [sequence],
      };
    }).filter(l => l.email);
    if (leads.length === 0) { setCsvResult("No valid rows found."); return; }
    setSubmitting(true);
    setCsvResult("");
    const res = await fetch("/api/admin/bulk-enroll", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leads }),
    });
    const d = await res.json();
    setSubmitting(false);
    if (res.ok) {
      const s = d.summary ?? {};
      setCsvResult(`Done — enrolled: ${s.enrolled ?? 0}, skipped: ${s.skipped ?? 0}, suppressed: ${s.suppressed ?? 0}`);
    } else {
      setCsvResult("Error: " + (d.error ?? "Unknown"));
    }
  }

  return (
    <div style={{ position: "fixed" as const, inset: 0, background: "rgba(15,30,58,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300, padding: 20 }}>
      <div style={{ background: C.card, borderRadius: 12, padding: 28, width: "100%", maxWidth: 520, boxShadow: "0 8px 32px rgba(0,0,0,0.15)", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ margin: 0, color: C.navy, fontSize: 16, fontWeight: 700 }}>
            {mode === "choose" ? "Enroll a Lead" : mode === "individual" ? "Add Individual" : "Upload CSV"}
          </h2>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: C.muted, fontSize: 20, cursor: "pointer" }}>✕</button>
        </div>

        {mode === "choose" && (
          <div style={{ display: "flex", gap: 12 }}>
            <button onClick={() => setMode("individual")} style={{ flex: 1, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "20px 16px", cursor: "pointer", color: C.navy, fontSize: 14, fontWeight: 600, textAlign: "left" as const }}>
              <div style={{ fontSize: 22, marginBottom: 8 }}>+</div>
              Add Individual
              <div style={{ color: C.muted, fontSize: 12, fontWeight: 400, marginTop: 4 }}>Enroll one lead by email</div>
            </button>
            <button onClick={() => setMode("csv")} style={{ flex: 1, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "20px 16px", cursor: "pointer", color: C.navy, fontSize: 14, fontWeight: 600, textAlign: "left" as const }}>
              <div style={{ fontSize: 22, marginBottom: 8 }}>↑</div>
              Upload CSV
              <div style={{ color: C.muted, fontSize: 12, fontWeight: 400, marginTop: 4 }}>Paste CSV with email column</div>
            </button>
          </div>
        )}

        {mode === "individual" && (
          <div>
            <button onClick={() => { setMode("choose"); setMsg(""); }} style={{ background: "transparent", border: "none", color: C.muted, fontSize: 12, cursor: "pointer", marginBottom: 16, padding: 0 }}>← Back</button>
            {[
              { label: "First Name (optional)", value: firstName, set: setFirstName, placeholder: "Jane" },
              { label: "Email *", value: email, set: setEmail, placeholder: "jane@example.com" },
              { label: "Website (optional)", value: website, set: setWebsite, placeholder: "example.com" },
            ].map(f => (
              <div key={f.label} style={{ marginBottom: 12 }}>
                <label style={{ color: C.muted, fontSize: 11, textTransform: "uppercase" as const, letterSpacing: "0.06em", display: "block", marginBottom: 4 }}>{f.label}</label>
                <input value={f.value} onChange={e => f.set(e.target.value)} placeholder={f.placeholder}
                  style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: "9px 12px", color: C.navy, fontSize: 13, boxSizing: "border-box" as const, outline: "none" }} />
              </div>
            ))}
            <div style={{ marginBottom: 16 }}>
              <label style={{ color: C.muted, fontSize: 11, textTransform: "uppercase" as const, letterSpacing: "0.06em", display: "block", marginBottom: 4 }}>Sequence</label>
              <select value={sequence} onChange={e => setSequence(e.target.value)} style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: "9px 12px", color: C.navy, fontSize: 13, outline: "none" }}>
                {SEQUENCES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <button onClick={submitIndividual} disabled={submitting} style={{ background: C.pink, border: "none", color: "#fff", padding: "10px 20px", borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: "pointer", opacity: submitting ? 0.6 : 1 }}>
                {submitting ? "Enrolling..." : "Enroll"}
              </button>
              {msg && <span style={{ color: msg.startsWith("Error") ? C.red : C.green, fontSize: 12 }}>{msg}</span>}
            </div>
          </div>
        )}

        {mode === "csv" && (
          <div>
            <button onClick={() => { setMode("choose"); setCsvResult(""); }} style={{ background: "transparent", border: "none", color: C.muted, fontSize: 12, cursor: "pointer", marginBottom: 12, padding: 0 }}>← Back</button>
            <div style={{ color: C.faint, fontSize: 12, marginBottom: 12 }}>
              Paste CSV below. Required column: <code>email</code>. Optional: <code>first_name</code>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ color: C.muted, fontSize: 11, textTransform: "uppercase" as const, letterSpacing: "0.06em", display: "block", marginBottom: 4 }}>Sequence</label>
              <select value={sequence} onChange={e => setSequence(e.target.value)} style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: "9px 12px", color: C.navy, fontSize: 13, outline: "none" }}>
                {SEQUENCES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </div>
            <textarea
              value={csvText}
              onChange={e => setCsvText(e.target.value)}
              placeholder={"email,first_name\njane@example.com,Jane\nbob@example.com,Bob"}
              rows={8}
              style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: "10px 12px", color: C.navy, fontSize: 12, resize: "vertical" as const, boxSizing: "border-box" as const, outline: "none", fontFamily: "monospace", marginBottom: 12 }}
            />
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <button onClick={submitCsv} disabled={submitting || !csvText.trim()} style={{ background: C.pink, border: "none", color: "#fff", padding: "10px 20px", borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: "pointer", opacity: (submitting || !csvText.trim()) ? 0.6 : 1 }}>
                {submitting ? "Processing..." : "Upload & Enroll"}
              </button>
              {csvResult && <span style={{ color: csvResult.startsWith("Error") ? C.red : C.green, fontSize: 12 }}>{csvResult}</span>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Hub ──
export default function LeadsHub() {
  const searchParams = useSearchParams();

  const view = searchParams.get("view") ?? "";

  // Derive initial tab from view param
  const initialTab = (() => {
    if (view === "queue" || view === "pending") return "queue";
    if (view === "templates") return "templates";
    return "leads";
  })() as "leads" | "queue" | "templates";

  // Map filter params for AllLeadsTab
  const initialTemp = (() => {
    const t = searchParams.get("temp") ?? "";
    if (t) return t;
    if (view === "bounced")      return "bounced";
    if (view === "unsubscribed") return "unsubscribed";
    return "";
  })();
  const initialSource    = searchParams.get("source") ?? "";
  const initialFilterNew = searchParams.get("filter") === "new";

  const [activeTab, setActiveTab]         = useState<"leads" | "queue" | "templates">(initialTab as "leads" | "queue" | "templates");
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null);
  const [showEnroll, setShowEnroll]       = useState(false);
  const [search, setSearch]               = useState("");
  const [searchInput, setSearchInput]     = useState("");
  const debRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const tabs: { key: "leads" | "queue" | "templates"; label: string }[] = [
    { key: "leads",     label: "Leads" },
    { key: "queue",     label: "Queue" },
    { key: "templates", label: "Templates" },
  ];

  function handleTabChange(tab: "leads" | "queue" | "templates") {
    setActiveTab(tab);
    setSelectedEmail(null); // close any open lead when switching tabs
  }

  return (
    <div style={{ fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      {/* Top bar — always visible */}
      <div style={{ background: C.card, borderBottom: `1px solid ${C.border}`, padding: "10px 28px", display: "flex", alignItems: "center", gap: 4 }}>
        {/* Tab nav */}
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => handleTabChange(t.key)}
            style={{
              background: activeTab === t.key && !selectedEmail ? C.navy : activeTab === t.key ? C.navy + "80" : "transparent",
              color: activeTab === t.key ? "#fff" : C.muted,
              border: "none",
              borderRadius: 6,
              padding: "7px 16px",
              fontSize: 13,
              fontWeight: activeTab === t.key ? 700 : 400,
              cursor: "pointer",
            }}
          >
            {t.label}
          </button>
        ))}

        {/* Search — only on Leads tab and not in lead detail */}
        {activeTab === "leads" && !selectedEmail && (
          <>
            <div style={{ width: 1, height: 20, background: C.border, margin: "0 12px" }} />
            <input
              placeholder="Search email or name..."
              value={searchInput}
              onChange={e => {
                setSearchInput(e.target.value);
                if (debRef.current) clearTimeout(debRef.current);
                debRef.current = setTimeout(() => setSearch(e.target.value), 350);
              }}
              style={{ background: C.bg, color: C.navy, border: `1px solid ${C.border}`, borderRadius: 6, padding: "7px 14px", fontSize: 13, width: 260, outline: "none" }}
            />
            {search && (
              <button onClick={() => { setSearch(""); setSearchInput(""); }} style={{ background: "transparent", border: "none", color: C.muted, fontSize: 12, cursor: "pointer" }}>✕ Clear</button>
            )}
          </>
        )}

        {/* Enroll button — always visible on Leads tab */}
        {activeTab === "leads" && (
          <button
            onClick={() => setShowEnroll(true)}
            style={{ marginLeft: "auto", background: C.pink, border: "none", color: "#fff", padding: "7px 16px", borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: "pointer" }}
          >
            + Enroll
          </button>
        )}
      </div>

      {/* Content */}
      {selectedEmail ? (
        <LeadDetailPanel email={selectedEmail} onClose={() => setSelectedEmail(null)} />
      ) : (
        <>
          {activeTab === "leads"     && <AllLeadsTab initialTemp={initialTemp} initialSource={initialSource} initialFilterNew={initialFilterNew} search={search} onSelectLead={email => setSelectedEmail(email)} />}
          {activeTab === "queue"     && <QueueTab />}
          {activeTab === "templates" && <TemplatesTab />}
        </>
      )}

      {/* Enroll modal */}
      {showEnroll && <EnrollModals onClose={() => setShowEnroll(false)} />}
    </div>
  );
}
