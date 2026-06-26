-- Screener results: one row per screener completion, per user (optionally per child)
create table screener_results (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  child_id uuid references children(id) on delete cascade,
  answers jsonb not null,
  result_bucket text not null check (result_bucket in ('strong_match','partial_match','no_match')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index screener_results_user_id_idx on screener_results(user_id);
create index screener_results_child_id_idx on screener_results(child_id);

alter table screener_results enable row level security;

create policy "Users can read own screener results"
  on screener_results for select using (user_id = auth.uid()::text);

create policy "Users can insert own screener results"
  on screener_results for insert with check (user_id = auth.uid()::text);

create policy "Users can update own screener results"
  on screener_results for update using (user_id = auth.uid()::text);
