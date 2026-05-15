create table if not exists geo_responses (
  id          uuid default gen_random_uuid() primary key,
  email       text not null,
  sequence    text not null,
  step        int  not null,
  answer      text not null,
  created_at  timestamptz default now()
);

create index if not exists geo_responses_email_idx on geo_responses(email);
create index if not exists geo_responses_answer_idx on geo_responses(answer);
