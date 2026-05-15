# Supabase Rules

**Project:** `jntughoiksxosjapklfo`
**Schema:** all GEO tables are in `public`

- Always verify column names against `information_schema.columns` before writing queries — never assume a column exists
- Use `apply_migration` for DDL (ALTER TABLE, CREATE TABLE) — not raw SQL execution
- `geo_lead_scores` is a VIEW — it cannot be upserted or updated directly; derive tier from `geo_suppressed.reason`
- `geo_email_queue` has a constraint `geo_email_queue_sequence_check` — every new sequence key must be added to it or inserts silently fail with no error
- Service role key bypasses RLS — app code is unaffected by RLS policy changes
- The `geo_suppressed` table is the source of truth for client/unsubscribe status
