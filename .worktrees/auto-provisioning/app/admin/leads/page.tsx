import { Suspense } from "react";
import LeadsHub from "./LeadsHub";

export const dynamic = "force-dynamic";

export const TEMP_LABEL: Record<string, { label: string; color: string }> = {
  client:  { label: "Client",  color: "#4ade80" },
  booked:  { label: "Hot",     color: "#f97316" },
  no_show: { label: "No Show", color: "#f87171" },
  watched: { label: "Warm",    color: "#facc15" },
  nurture: { label: "Cold",    color: "#9BACC0" },
};

import { SEQUENCES } from "../../../lib/sequences";
export const SERIES_LABEL: Record<string, { label: string; color: string }> = {
  ...Object.fromEntries(SEQUENCES.map(s => [s.key, { label: s.label, color: s.color }])),
  // Legacy keys — renamed sequences still present in historical queue rows
  lead_nurture:  { label: "Lead Nurture",  color: "#34d399" }, // merged into warm_nurture
  claim_nurture: { label: "Claim Nurture", color: "#34d399" }, // merged into warm_nurture
};

export default function LeadsPage() {
  return (
    <Suspense>
      <LeadsHub />
    </Suspense>
  );
}
