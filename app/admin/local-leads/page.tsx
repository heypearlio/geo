"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

const S = {
  bg: "#F0F2F8", card: "#ffffff", border: "#E2E8F2",
  text: "#0F1E3A", muted: "#8A9AB5", faint: "#4A5E7A",
  pink: "#E8185C",
};

interface LocalLead {
  email: string;
  first_name: string | null;
  business_type: string | null;
  tags: string[];
  submissions: number;
  first_at: string;
  last_at: string;
}

export default function LocalLeadsPage() {
  const router = useRouter();
  const [leads, setLeads] = useState<LocalLead[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), search });
    const res = await fetch(`/api/admin/local-leads?${params}`);
    if (res.status === 401) { router.push("/admin/login"); return; }
    const data = await res.json();
    setLeads(data.leads ?? []);
    setTotal(data.total ?? 0);
    setLoading(false);
  }, [page, search, router]);

  useEffect(() => { load(); }, [load]);

  const pageSize = 50;
  const totalPages = Math.ceil(total / pageSize);

  return (
    <div style={{ background: S.bg, minHeight: "100vh", fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      <div style={{ padding: "32px 24px", maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h1 style={{ color: S.text, fontSize: 22, fontWeight: 800, margin: 0 }}>Local Leads</h1>
          <span style={{ color: S.muted, fontSize: 14 }}>{total} unique leads</span>
        </div>

        <input
          placeholder="Search by email or name…"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          style={{
            width: "100%", boxSizing: "border-box", marginBottom: 20,
            background: S.card, border: `1px solid ${S.border}`, borderRadius: 10,
            color: S.text, padding: "10px 14px", fontSize: 14, outline: "none",
          }}
        />

        {loading ? (
          <p style={{ color: S.muted }}>Loading…</p>
        ) : leads.length === 0 ? (
          <p style={{ color: S.muted }}>No leads yet.</p>
        ) : (
          <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 12, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${S.border}` }}>
                  {["Email", "Name", "Business", "Entry Points", "Submissions", "First", "Latest"].map(h => (
                    <th key={h} style={{ color: S.muted, fontWeight: 600, padding: "12px 16px", textAlign: "left", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {leads.map((lead, i) => (
                  <tr key={lead.email} style={{ borderBottom: i < leads.length - 1 ? `1px solid ${S.border}` : "none" }}>
                    <td style={{ color: S.text, padding: "12px 16px", fontWeight: 500 }}>{lead.email}</td>
                    <td style={{ color: S.muted, padding: "12px 16px" }}>{lead.first_name ?? "—"}</td>
                    <td style={{ color: S.muted, padding: "12px 16px" }}>{lead.business_type ?? "—"}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        {lead.tags.map(tag => (
                          <span key={tag} style={{
                            background: "#fff0f4", color: S.pink,
                            border: "1px solid #fecdd3", borderRadius: 4,
                            padding: "2px 7px", fontSize: 11, fontWeight: 600,
                          }}>
                            /{tag}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td style={{ color: lead.submissions > 1 ? S.pink : S.muted, padding: "12px 16px", fontWeight: lead.submissions > 1 ? 700 : 400, textAlign: "center" }}>
                      {lead.submissions}
                    </td>
                    <td style={{ color: S.muted, padding: "12px 16px", whiteSpace: "nowrap" }}>
                      {new Date(lead.first_at).toLocaleDateString()}
                    </td>
                    <td style={{ color: S.text, padding: "12px 16px", fontWeight: 600, whiteSpace: "nowrap" }}>
                      {new Date(lead.last_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div style={{ display: "flex", gap: 8, marginTop: 20, justifyContent: "center" }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              style={{ background: S.card, border: `1px solid ${S.border}`, color: S.muted, borderRadius: 6, padding: "6px 14px", cursor: "pointer" }}>
              Previous
            </button>
            <span style={{ color: S.muted, fontSize: 14, lineHeight: "32px" }}>Page {page} of {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              style={{ background: S.card, border: `1px solid ${S.border}`, color: S.muted, borderRadius: 6, padding: "6px 14px", cursor: "pointer" }}>
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
