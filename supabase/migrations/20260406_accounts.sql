-- supabase/migrations/20260406_accounts.sql

CREATE TABLE IF NOT EXISTS accounts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  session_token TEXT,
  first_name    TEXT,
  last_name     TEXT,
  headshot_url  TEXT,
  phone         TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS account_offers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id  UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  offer       TEXT NOT NULL,
  slug        TEXT,
  meta        JSONB NOT NULL DEFAULT '{}'::jsonb,
  granted_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(account_id, offer)
);

CREATE INDEX IF NOT EXISTS idx_account_offers_account_id ON account_offers(account_id);
