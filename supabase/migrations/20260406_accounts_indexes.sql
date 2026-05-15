-- supabase/migrations/20260406_accounts_indexes.sql
-- Add performance indexes for accounts auth lookups

CREATE INDEX IF NOT EXISTS idx_accounts_session_token
  ON accounts(session_token)
  WHERE session_token IS NOT NULL;
