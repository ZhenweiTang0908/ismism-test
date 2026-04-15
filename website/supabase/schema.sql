create table if not exists public."ismsim-answers" (
  id bigserial primary key,
  client_id bigint not null,
  question text not null,
  answer text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public."ismism-result" (
  id bigserial primary key,
  created_at timestamptz not null default timezone('utc', now()),
  client_id bigint not null,
  field_score real not null,
  ontology_score real not null,
  phenomenon_score real not null,
  purpose_score real,
  position_result text not null,
  name_result text not null,
  client_info text
);

create table if not exists public."ismism-client" (
  id bigserial primary key,
  created_at timestamptz not null default timezone('utc', now()),
  name text,
  message text,
  client_id bigint not null
);

create index if not exists "ismsim-answers_client_id_idx"
  on public."ismsim-answers" (client_id);

create index if not exists "ismism-result_client_id_idx"
  on public."ismism-result" (client_id);

create index if not exists "ismism-client_client_id_idx"
  on public."ismism-client" (client_id);

alter table public."ismsim-answers" enable row level security;
alter table public."ismism-result" enable row level security;
alter table public."ismism-client" enable row level security;

drop policy if exists "quiz_insert_answers" on public."ismsim-answers";
create policy "quiz_insert_answers"
  on public."ismsim-answers"
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "quiz_insert_results" on public."ismism-result";
create policy "quiz_insert_results"
  on public."ismism-result"
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "quiz_insert_client" on public."ismism-client";
create policy "quiz_insert_client"
  on public."ismism-client"
  for insert
  to anon, authenticated
  with check (true);
