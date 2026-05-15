"use client";

export type SummaryLeadCsvRow = {
  dateTime: string;
  firstName: string;
  email: string;
  phone: string;
  source: string;
};

function escapeCsvCell(value: string): string {
  const s = value ?? "";
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function SummaryLeadsCsvButton({ rows }: { rows: SummaryLeadCsvRow[] }) {
  function downloadCsv() {
    const header = ["Date/Time", "First Name", "Email", "Phone", "Source"];
    const lines = [header.map(escapeCsvCell).join(",")];
    for (const r of rows) {
      lines.push(
        [r.dateTime, r.firstName, r.email, r.phone, r.source].map(escapeCsvCell).join(",")
      );
    }
    const body = "\uFEFF" + lines.join("\r\n");
    const blob = new Blob([body], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `geo-live-rsvps-${new Date().toISOString().slice(0, 10)}.csv`;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      type="button"
      onClick={downloadCsv}
      className="rounded-md bg-[#0F1E3A] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#162d58] focus:outline-none focus:ring-2 focus:ring-[#0F1E3A]/40"
    >
      Export CSV
    </button>
  );
}
