"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

const S = {
  bg: "#F0F2F8", card: "#ffffff", border: "#E2E8F2",
  text: "#0F1E3A", muted: "#8A9AB5",
  green: "#16a34a", pink: "#E8185C", blue: "#3B82F6",
  red: "#dc2626", orange: "#f97316",
};

type Job = {
  id: string;
  user_type: string;
  slug: string | null;
  first_name: string;
  last_name: string | null;
  email: string;
  status: string;
  error: string | null;
  error_count: number;
  created_at: string;
  completed_at: string | null;
};

const STATUS_COLOR: Record<string, string> = {
  pending: S.muted,
  db_created: S.blue,
  dns_added: S.orange,
  domain_pending: S.orange,
  complete: S.green,
  failed: S.red,
};

export default function ProvisioningPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/provisioning");
    if (res.status === 401) { router.push("/admin"); return; }
    const { jobs: data } = await res.json() as { jobs: Job[] };
    setJobs(data ?? []);
    setLoading(false);
  }, [router]);

  useEffect(() => { load(); }, [load]);

  async function handleRetry(id: string) {
    setRetrying(id);
    await fetch(`/api/admin/provisioning/${id}/retry`, { method: "POST" });
    setRetrying(null);
    load();
  }

  if (loading) return <div style={{ padding: 40, color: S.muted }}>Loading...</div>;

  return (
    <div style={{ background: S.bg, minHeight: "100vh", padding: "32px 24px" }}>
      <h1 style={{ color: S.text, fontSize: 22, fontWeight: 700, marginBottom: 24 }}>Provisioning Jobs</h1>
      <div style={{ background: S.card, borderRadius: 12, border: `1px solid ${S.border}`, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${S.border}` }}>
              {["Name", "Email", "Type", "Slug", "Status", "Created", ""].map((h) => (
                <th key={h} style={{ padding: "10px 14px", color: S.muted, fontWeight: 600, textAlign: "left" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => (
              <tr key={job.id} style={{ borderBottom: `1px solid ${S.border}` }}>
                <td style={{ padding: "10px 14px", color: S.text }}>{job.first_name} {job.last_name ?? ""}</td>
                <td style={{ padding: "10px 14px", color: S.muted }}>{job.email}</td>
                <td style={{ padding: "10px 14px" }}>
                  <span style={{ background: S.border, color: S.text, borderRadius: 4, padding: "2px 7px", fontSize: 11, fontWeight: 700 }}>
                    {job.user_type}
                  </span>
                </td>
                <td style={{ padding: "10px 14px", color: S.muted, fontFamily: "monospace" }}>{job.slug ?? "—"}</td>
                <td style={{ padding: "10px 14px" }}>
                  <span style={{ color: STATUS_COLOR[job.status] ?? S.muted, fontWeight: 600 }}>{job.status}</span>
                  {job.error && <div style={{ color: S.red, fontSize: 11, marginTop: 2 }}>{job.error}</div>}
                </td>
                <td style={{ padding: "10px 14px", color: S.muted }}>
                  {new Date(job.created_at).toLocaleDateString()}
                </td>
                <td style={{ padding: "10px 14px" }}>
                  {job.status === "failed" && (
                    <button
                      onClick={() => handleRetry(job.id)}
                      disabled={retrying === job.id}
                      style={{ background: S.blue, color: "#fff", border: "none", borderRadius: 6, padding: "5px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                    >
                      {retrying === job.id ? "Retrying..." : "Retry"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {jobs.length === 0 && (
              <tr><td colSpan={7} style={{ padding: "24px", color: S.muted, textAlign: "center" }}>No provisioning jobs yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
