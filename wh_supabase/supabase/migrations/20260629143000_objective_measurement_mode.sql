alter table public.habit_objectives
  add column if not exists measurement_mode text not null default 'quantitative'
  check (measurement_mode in ('quantitative', 'qualitative'));

create index if not exists idx_habit_objectives_measurement_mode
  on public.habit_objectives(account_id, measurement_mode);
