-- Affiliate contractors table
CREATE TABLE IF NOT EXISTS affiliates (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT NOT NULL,
  slug             TEXT UNIQUE NOT NULL,
  tag              TEXT UNIQUE NOT NULL,
  email            TEXT,
  phone            TEXT,
  headshot_url     TEXT,
  calendly_url     TEXT,
  meta_pixel_id    TEXT,
  password_hash    TEXT,
  session_token    TEXT,
  invite_token     TEXT,
  invite_used      BOOLEAN DEFAULT false,
  reset_token      TEXT,
  reset_expires_at TIMESTAMPTZ,
  active           BOOLEAN DEFAULT true,
  created_at       TIMESTAMPTZ DEFAULT now()
);

-- Leads from affiliate landing pages
CREATE TABLE IF NOT EXISTS geo_local_submissions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT NOT NULL,
  first_name    TEXT,
  business_type TEXT,
  source_tag    TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_geo_local_submissions_source_tag
  ON geo_local_submissions(source_tag);

CREATE INDEX IF NOT EXISTS idx_geo_local_submissions_created_at
  ON geo_local_submissions(created_at DESC);
