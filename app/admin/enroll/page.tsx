"use client";

import { useState, useEffect } from "react";

function countValidEmails(csv: string): number {
  const lines = csv.trim().split("\n");
  if (lines.length < 2) return 0;
  const headers = lines[0].toLowerCase().split(",").map(h => h.trim().replace(/"/g, ""));
  const emailIdx = headers.indexOf("email");
  if (emailIdx === -1) return 0;
  return lines.slice(1).filter(line => {
    const cols = line.split(",");
    const email = cols[emailIdx]?.trim().replace(/"/g, "");
    return email && email.includes("@");
  }).length;
}

export default function EnrollPage() {
  // --- Instantly Cold Outreach state ---
  const [superAdminCampaigns, setSuperAdminCampaigns] = useState<{id: string; name: string}[]>([]);
  const [selectedSuperAdminCampaign, setSelectedSuperAdminCampaign] = useState("");
  const [superAdminCsv, setSuperAdminCsv] = useState("");
  const [superAdminCsvCount, setSuperAdminCsvCount] = useState(0);
  const [superAdminUploading, setSuperAdminUploading] = useState(false);
  const [superAdminResult, setSuperAdminResult] = useState<{pushed: number; skipped: number; failed: number} | null>(null);
  const [superAdminError, setSuperAdminError] = useState("");

  useEffect(() => {
    fetch("/api/admin/instantly/campaigns?offer=super-admin")
      .then(r => r.json())
      .then(d => setSuperAdminCampaigns(d.campaigns ?? []))
      .catch(() => {});
  }, []);

  async function uploadToInstantly() {
    if (!selectedSuperAdminCampaign || !superAdminCsv) return;
    setSuperAdminUploading(true);
    setSuperAdminResult(null);
    setSuperAdminError("");
    const campaign = superAdminCampaigns.find(c => c.id === selectedSuperAdminCampaign);
    const res = await fetch("/api/admin/instantly/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        csv: superAdminCsv,
        campaign_id: selectedSuperAdminCampaign,
        offer: "super-admin",
        campaign_name: campaign?.name ?? "",
      }),
    });
    setSuperAdminUploading(false);
    if (res.ok) {
      const d = await res.json();
      setSuperAdminResult({ pushed: d.pushed ?? 0, skipped: d.skipped ?? 0, failed: d.failed ?? 0 });
    } else {
      setSuperAdminError("Upload failed. Check your CSV and try again.");
    }
  }

  return (
    <main className="min-h-screen bg-[#F7F8FC] p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[#0F1E3A] mb-1">Cold Outreach</h1>
          <p className="text-[#4A5E7A] text-sm">
            Upload a cold list to one of your Instantly campaigns. Leads appear in your dashboard only when they reply.
          </p>
        </div>

        {/* Instantly Cold Outreach */}
        <div className="bg-white border border-[#0F1E3A]/8 rounded-2xl p-6 shadow-sm">
          <p className="font-bold text-[#0F1E3A] mb-1">Instantly Cold Outreach</p>
          <p className="text-[#4A5E7A] text-sm mb-5">
            Upload a cold list to one of your Instantly campaigns. Leads appear in your dashboard only when they reply.
          </p>

          {/* Campaign picker */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-[#0F1E3A] mb-1.5">Campaign</label>
            <select
              value={selectedSuperAdminCampaign}
              onChange={e => setSelectedSuperAdminCampaign(e.target.value)}
              className="w-full border border-[#0F1E3A]/15 rounded-xl px-3 py-2.5 text-sm text-[#0F1E3A] bg-white focus:outline-none focus:ring-2 focus:ring-[#E8185C]/30"
            >
              <option value="">Select a campaign...</option>
              {superAdminCampaigns.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* CSV upload */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-[#0F1E3A] mb-1.5">CSV File</label>
            <input
              type="file"
              accept=".csv,.txt"
              onChange={e => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = ev => {
                  const text = ev.target?.result as string ?? "";
                  setSuperAdminCsv(text);
                  setSuperAdminCsvCount(countValidEmails(text));
                  setSuperAdminResult(null);
                  setSuperAdminError("");
                };
                reader.readAsText(file);
              }}
              className="block text-sm text-[#4A5E7A] file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-[#0F1E3A] file:text-white hover:file:bg-[#162B4C] file:cursor-pointer cursor-pointer"
            />
            {superAdminCsv && (
              <p className="text-[#4A5E7A] text-xs mt-2">
                {superAdminCsvCount} valid email{superAdminCsvCount !== 1 ? "s" : ""} detected
              </p>
            )}
          </div>

          {/* Upload button */}
          <button
            onClick={uploadToInstantly}
            disabled={superAdminUploading || !selectedSuperAdminCampaign || !superAdminCsv}
            className="bg-[#E8185C] hover:bg-[#c4134d] disabled:opacity-40 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-colors"
          >
            {superAdminUploading ? "Uploading..." : "Upload to Instantly"}
          </button>

          {/* Result */}
          {superAdminResult && (
            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="text-center bg-green-50 rounded-xl p-3">
                <p className="text-2xl font-bold text-green-600">{superAdminResult.pushed}</p>
                <p className="text-xs text-green-700 mt-1">Pushed</p>
              </div>
              <div className="text-center bg-yellow-50 rounded-xl p-3">
                <p className="text-2xl font-bold text-yellow-600">{superAdminResult.skipped}</p>
                <p className="text-xs text-yellow-700 mt-1">Skipped</p>
              </div>
              <div className="text-center bg-red-50 rounded-xl p-3">
                <p className="text-2xl font-bold text-red-600">{superAdminResult.failed}</p>
                <p className="text-xs text-red-700 mt-1">Failed</p>
              </div>
            </div>
          )}
          {superAdminError && <p className="text-red-500 text-sm mt-3">{superAdminError}</p>}
        </div>
      </div>
    </main>
  );
}
