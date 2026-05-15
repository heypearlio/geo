import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { SummaryLeadsCsvButton, type SummaryLeadCsvRow } from "./SummaryLeadsCsvButton";

export const metadata: Metadata = {
  title: "Live RSVP leads | Summary",
};

/** Matches public.geo_live_rsvps in migration 20260516_geo_live_rsvp_survey.sql */
interface GeoLiveRsvpRow {
  id: string;
  created_at: string;
  first_name: string;
  email: string;
  phone: string;
  source: string;
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZoneName: "short",
  });
}

export default async function SummaryLeadsPage() {
  const admin = getSupabaseAdmin();
  if (admin.client === null) {
    return (
      <main className="min-h-screen bg-[#F7F8FC] px-6 py-16 text-[#0F1E3A]">
        <div className="mx-auto max-w-2xl rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-900">
          <p className="font-semibold">Could not connect to the database.</p>
          <p className="mt-2 text-red-800">Check that NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.</p>
        </div>
      </main>
    );
  }

  const { data, error } = await admin.client
    .from("geo_live_rsvps")
    .select("id, created_at, first_name, email, phone, source")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[summaryleads]", error);
    return (
      <main className="min-h-screen bg-[#F7F8FC] px-6 py-16 text-[#0F1E3A]">
        <div className="mx-auto max-w-2xl rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-900">
          <p className="font-semibold">Failed to load RSVP data.</p>
          <p className="mt-2 font-mono text-xs text-red-800">{error.message}</p>
        </div>
      </main>
    );
  }

  const rawRows = (data ?? []) as GeoLiveRsvpRow[];
  const csvRows: SummaryLeadCsvRow[] = rawRows.map((r) => ({
    dateTime: formatDateTime(r.created_at),
    firstName: r.first_name,
    email: r.email,
    phone: r.phone,
    source: r.source,
  }));

  return (
    <main className="min-h-screen bg-[#F7F8FC] text-[#0F1E3A]">
      <nav className="flex items-center justify-between border-b border-[#E5E9F2] bg-white px-6 py-4 shadow-sm">
        <Link href="/" className="flex items-center gap-3">
          <Image src="/geo-logo.png" alt="GEO by HeyPearl" width={120} height={50} />
        </Link>
        <SummaryLeadsCsvButton rows={csvRows} />
      </nav>

      <div className="mx-auto w-full max-w-[1600px] px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-[#0F1E3A]">Live RSVP submissions</h1>
          <p className="mt-1 text-sm text-[#6B7FA0]">
            Rows from <span className="font-mono text-[#4A5E7A]">geo_live_rsvps</span>, newest first.
          </p>
        </div>

        <div className="overflow-hidden rounded-lg border border-[#E5E9F2] bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-[#E5E9F2] bg-[#F0F3FA] text-xs font-semibold uppercase tracking-wide text-[#4A5E7A]">
                  <th className="px-4 py-3">Date/Time</th>
                  <th className="px-4 py-3">First name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EEF1F7] text-[#0F1E3A]">
                {rawRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-[#6B7FA0]">
                      No submissions yet.
                    </td>
                  </tr>
                ) : (
                  rawRows.map((r) => (
                    <tr key={r.id} className="hover:bg-[#F9FAFD]">
                      <td className="whitespace-nowrap px-4 py-3 text-[#4A5E7A]">{formatDateTime(r.created_at)}</td>
                      <td className="px-4 py-3 font-medium">{r.first_name}</td>
                      <td className="break-all px-4 py-3">{r.email}</td>
                      <td className="whitespace-nowrap px-4 py-3">{r.phone}</td>
                      <td className="px-4 py-3 text-[#4A5E7A]">{r.source}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
