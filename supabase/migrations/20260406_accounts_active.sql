-- supabase/migrations/20260406_accounts_active.sql
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true;
