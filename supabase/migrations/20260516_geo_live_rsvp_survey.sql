-- RSVP modal on /live (Save Your Free Seat)
create table if not exists geo_live_rsvps (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz not null default now(),
  first_name text not null,
  email text not null,
  phone text not null,
  source text not null default 'live'
);

create index if not exists geo_live_rsvps_created_at_idx on geo_live_rsvps (created_at desc);
create index if not exists geo_live_rsvps_email_idx on geo_live_rsvps (lower(trim(email)));

-- Follow-up survey on /live/survey
create table if not exists geo_live_survey_responses (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz not null default now(),
  email text,
  first_name text,
  q1 text,
  q2 text,
  q3 text
);

create index if not exists geo_live_survey_created_at_idx on geo_live_survey_responses (created_at desc);
