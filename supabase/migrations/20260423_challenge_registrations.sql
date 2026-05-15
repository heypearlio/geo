create table if not exists challenge_registrations (
  id uuid default gen_random_uuid() primary key,
  first_name text,
  email text not null,
  phone text,
  city text,
  years_in_re text,
  source_url text,
  created_at timestamptz default now()
);

create index if not exists challenge_registrations_email_idx on challenge_registrations(email);
create index if not exists challenge_registrations_created_at_idx on challenge_registrations(created_at desc);
