"use client";

import { useState } from "react";
import type { LeadInput, EnrollResult } from "../../../lib/types";

// Statuses that mean skip entirely
const SKIP_STATUSES = ["bounced", "unsubscribed", "cleaned", "complained"];

// Segments that mean suppress (client / B2B / do not contact)
const SUPPRESS_SEGMENTS = ["geo clients", "moreno group"];

// Post-meeting segments — had a strategy call or meeting, go to warm_nurture (weekly)
const WARM_SEGMENTS = [
  "scheduled strategy calls",
  "post geo strategy call",
  "no show geo",
  "pre-meeting geo",
  "big fish",
];

// Cold pipeline segments — in the funnel but never met, go to long_term_nurture (monthly)
const COLD_PIPELINE_SEGMENTS = [
  "geo pipeline",
  "ai audit",
  "reached report",
  "reached schedule",
];

function routeLead(segments: string, status: string): { sequences?: string[]; suppress?: boolean; skip?: boolean } {
  if (SKIP_STATUSES.includes(status.toLowerCase())) return { skip: true };
  const segs = segments.toLowerCase();
  if (SUPPRESS_SEGMENTS.some(s => segs.includes(s))) return { suppress: true };
  if (WARM_SEGMENTS.some(s => segs.includes(s))) return { sequences: ["warm_nurture"] };
  if (COLD_PIPELINE_SEGMENTS.some(s => segs.includes(s))) return { sequences: ["long_term_nurture"] };
  return { sequences: ["audit_invite"] };
}

function splitCSVRow(row: string): string[] {
  // Simple quoted-CSV splitter — handles "value","value" format
  const cols: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < row.length; i++) {
    const ch = row[i];
    if (ch === '"') { inQuotes = !inQuotes; continue; }
    if (ch === "," && !inQuotes) { cols.push(current.trim()); current = ""; continue; }
    current += ch;
  }
  cols.push(current.trim());
  return cols;
}

function parseFlodeskCSV(text: string): { leads: LeadInput[]; skipped: number; suppressed: number } {
  const rows = text.trim().split("\n").filter(Boolean);
  if (rows.length < 2) return { leads: [], skipped: 0, suppressed: 0 };

  const headers = splitCSVRow(rows[0]).map(h => h.toLowerCase());
  const idx = (name: string) => headers.indexOf(name);

  const emailIdx     = idx("email");
  const firstNameIdx = idx("firstname");
  const statusIdx    = idx("status");
  const segmentsIdx  = idx("segments");

  const isFlodesk = segmentsIdx !== -1 && statusIdx !== -1;

  const leads: LeadInput[] = [];
  let skipped = 0;
  let suppressed = 0;

  for (let i = 1; i < rows.length; i++) {
    const cols = splitCSVRow(rows[i]);
    const email = cols[emailIdx >= 0 ? emailIdx : 0]?.toLowerCase();
    if (!email || email === "email") continue;

    if (isFlodesk) {
      const status   = cols[statusIdx] ?? "";
      const segments = cols[segmentsIdx] ?? "";
      const route    = routeLead(segments, status);

      if (route.skip) { skipped++; continue; }
      if (route.suppress) {
        suppressed++;
        leads.push({ email, suppress: true });
        continue;
      }
      leads.push({
        email,
        firstName: firstNameIdx !== -1 ? (cols[firstNameIdx] || undefined) : undefined,
        sequences: route.sequences,
      });
    } else {
      const [, firstName, auditId, overall, seo, ai] = cols;
      leads.push({
        email,
        firstName: firstName || undefined,
        auditId: auditId || undefined,
        overall: overall ? parseInt(overall) : undefined,
        seo: seo ? parseInt(seo) : undefined,
        ai: ai ? parseInt(ai) : undefined,
      });
    }
  }

  return { leads, skipped, suppressed };
}

function statusBadge(status: EnrollResult["status"]) {
  const styles: Record<string, string> = {
    enrolled:   "bg-green-100 text-green-700",
    skipped:    "bg-gray-100 text-gray-500",
    suppressed: "bg-yellow-100 text-yellow-700",
    invalid:    "bg-red-100 text-red-600",
    client:     "bg-blue-100 text-blue-700",
    error:      "bg-red-200 text-red-800",
  };
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${styles[status] ?? "bg-gray-100"}`}>
      {status}
    </span>
  );
}

export default function EnrollPage() {
  const [leads, setLeads]     = useState<LeadInput[]>([]);
  const [parseInfo, setParseInfo] = useState<{ skipped: number; suppressed: number; auditInvite: number; longTerm: number; warmNurture: number } | null>(null);
  const [fetchError, setFetchError] = useState("");
  const [enrolling, setEnrolling]   = useState(false);
  const [results, setResults]       = useState<EnrollResult[]>([]);
  const [summary, setSummary]       = useState<Record<string, number> | null>(null);

  const loadCSV = (text: string) => {
    const { leads: parsed, skipped, suppressed } = parseFlodeskCSV(text);
    setLeads(parsed);
    setParseInfo({
      skipped,
      suppressed,
      auditInvite: parsed.filter(l => !l.suppress && l.sequences?.includes("audit_invite")).length,
      longTerm:    parsed.filter(l => !l.suppress && l.sequences?.includes("long_term_nurture")).length,
      warmNurture: parsed.filter(l => !l.suppress && l.sequences?.includes("warm_nurture")).length,
    });
    setFetchError("");
  };

  const [enrollProgress, setEnrollProgress] = useState<{ done: number; total: number } | null>(null);

  const enroll = async () => {
    if (leads.length === 0) return;
    setEnrolling(true);
    setResults([]);
    setSummary(null);
    setFetchError("");

    const BATCH = 500;
    const allResults: EnrollResult[] = [];
    const allSummary: Record<string, number> = {};

    try {
      for (let i = 0; i < leads.length; i += BATCH) {
        const batch = leads.slice(i, i + BATCH);
        setEnrollProgress({ done: i, total: leads.length });

        const res  = await fetch("/api/admin/bulk-enroll", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ leads: batch }),
        });
        const text = await res.text();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let data: any;
        try {
          data = JSON.parse(text);
        } catch {
          throw new Error(`API error (batch ${Math.floor(i / BATCH) + 1}): ${text.slice(0, 200)}`);
        }
        if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);

        allResults.push(...(data.results ?? []));
        for (const [k, v] of Object.entries(data.summary ?? {})) {
          allSummary[k] = (allSummary[k] ?? 0) + (v as number);
        }
        setResults([...allResults]);
        setSummary({ ...allSummary });
      }
    } catch (e) {
      setFetchError(String(e));
    }

    setEnrollProgress({ done: leads.length, total: leads.length });
    setTimeout(() => setEnrollProgress(null), 1000);
    setEnrolling(false);
  };

  return (
    <main className="min-h-screen bg-[#F7F8FC] p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[#0F1E3A] mb-1">Bulk Lead Enrollment</h1>
          <p className="text-[#4A5E7A] text-sm">
            Upload your Flodesk CSV export. Routing is automatic based on segment — clients are suppressed, GEO pipeline goes to long-term nurture, everyone else gets the audit invite.
          </p>
        </div>


        {/* Upload */}
        <div className="bg-white border border-[#0F1E3A]/8 rounded-2xl p-6 shadow-sm">
          <p className="font-bold text-[#0F1E3A] mb-1">Upload Flodesk CSV Export</p>
          <p className="text-[#4A5E7A] text-sm mb-4">
            Export your subscribers from Flodesk and upload here. Routing is decided automatically by segment. You can also upload any plain CSV with an <code className="bg-[#F7F8FC] px-1 rounded text-xs">email</code> column.
          </p>
          <input
            type="file"
            accept=".csv,.txt"
            onChange={e => {
              const file = e.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = ev => loadCSV(ev.target?.result as string ?? "");
              reader.readAsText(file);
            }}
            className="block text-sm text-[#4A5E7A] file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-[#0F1E3A] file:text-white hover:file:bg-[#162B4C] file:cursor-pointer cursor-pointer"
          />
          {fetchError && <p className="text-red-500 text-sm mt-3">{fetchError}</p>}
        </div>

        {/* Parsed preview */}
        {parseInfo && leads.length > 0 && (
          <div className="bg-white border border-[#0F1E3A]/8 rounded-2xl p-6 shadow-sm">
            <p className="font-bold text-[#0F1E3A] mb-4">Ready to Enroll</p>

            {/* Routing breakdown */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
              {[
                { label: "Audit Invite",   value: parseInfo.auditInvite, color: "#E8185C" },
                { label: "Warm Nurture",   value: parseInfo.warmNurture, color: "#f97316" },
                { label: "Long-Term",      value: parseInfo.longTerm,    color: "#a78bfa" },
                { label: "Suppressed",     value: parseInfo.suppressed,  color: "#f59e0b" },
                { label: "Skipped",        value: parseInfo.skipped,     color: "#9BACC0" },
              ].map(s => (
                <div key={s.label} className="text-center bg-[#F7F8FC] rounded-xl p-3">
                  <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
                  <p className="text-[#9BACC0] text-xs mt-1">{s.label}</p>
                </div>
              ))}
            </div>

            {enrollProgress && (
              <div className="mb-4">
                <div className="flex justify-between text-xs text-[#4A5E7A] mb-1">
                  <span>Enrolling... {enrollProgress.done} of {enrollProgress.total}</span>
                  <span>{Math.round((enrollProgress.done / enrollProgress.total) * 100)}%</span>
                </div>
                <div className="w-full bg-[#F7F8FC] rounded-full h-2">
                  <div className="bg-[#E8185C] h-2 rounded-full transition-all" style={{ width: `${(enrollProgress.done / enrollProgress.total) * 100}%` }} />
                </div>
              </div>
            )}

            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-[#4A5E7A]">{leads.length} contacts loaded</p>
              <button
                onClick={enroll}
                disabled={enrolling}
                className="bg-[#E8185C] hover:bg-[#c4134d] disabled:opacity-40 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-colors"
              >
                {enrolling ? `Enrolling (${enrollProgress ? Math.round((enrollProgress.done / enrollProgress.total) * 100) : 0}%)...` : `Run Enrollment`}
              </button>
            </div>

            <div className="max-h-64 overflow-y-auto space-y-1">
              {leads.filter(l => !l.suppress).slice(0, 100).map((l, i) => (
                <div key={i} className="flex items-center justify-between text-sm py-1 border-b border-[#EDF0FA] last:border-0">
                  <span className="text-[#0F1E3A] font-medium">{l.email}</span>
                  <span className="text-[#9BACC0] text-xs">
                    {l.sequences?.join(", ") ?? "lead_nurture + long_term_nurture"}
                  </span>
                </div>
              ))}
              {leads.length > 100 && <p className="text-[#9BACC0] text-xs pt-1">...and {leads.length - 100} more</p>}
            </div>
          </div>
        )}

        {/* Results */}
        {summary && (
          <div className="bg-white border border-[#0F1E3A]/8 rounded-2xl p-6 shadow-sm">
            <p className="font-bold text-[#0F1E3A] mb-4">Enrollment Complete</p>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-6">
              {Object.entries(summary).map(([k, v]) => (
                <div key={k} className="text-center">
                  <p className="text-2xl font-bold text-[#0F1E3A]">{v}</p>
                  <p className="text-[#9BACC0] text-xs">{k}</p>
                </div>
              ))}
            </div>
            <div className="max-h-80 overflow-y-auto space-y-1">
              {results.map((r, i) => (
                <div key={i} className="flex items-center justify-between text-sm py-1.5 border-b border-[#EDF0FA] last:border-0">
                  <span className="text-[#0F1E3A]">{r.email}</span>
                  <div className="flex items-center gap-2">
                    {r.reason && <span className="text-[#9BACC0] text-xs">{r.reason}</span>}
                    {statusBadge(r.status)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
