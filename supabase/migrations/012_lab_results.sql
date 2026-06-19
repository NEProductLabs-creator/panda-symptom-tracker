-- 012: lab_results table for ASO, CRP, and other immune-marker tracking

create table if not exists lab_results (
  id               text primary key,
  user_id          text not null,
  child_id         text not null,
  date             text not null,
  test_name        text not null,
  result_value     numeric,
  result_unit      text,
  reference_range  text,
  lab_name         text,
  notes            text,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

create index if not exists lab_results_user_id_idx  on lab_results(user_id);
create index if not exists lab_results_child_id_idx on lab_results(child_id);
