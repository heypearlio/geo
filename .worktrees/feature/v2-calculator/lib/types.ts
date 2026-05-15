export interface LeadInput {
  email: string;
  firstName?: string;
  auditId?: string;
  overall?: number;
  seo?: number;
  ai?: number;
  sequences?: string[];   // per-lead override; if omitted, falls back to request-level sequences
  suppress?: boolean;     // if true, suppress instead of enroll
}

export interface EnrollResult {
  email: string;
  status: "enrolled" | "skipped" | "suppressed" | "invalid" | "client" | "error";
  reason?: string;
}
