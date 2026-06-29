alter table public.calendar_events
  add column if not exists objective_id uuid references public.habit_objectives(id) on delete set null,
  add column if not exists habit_id uuid references public.habits(id) on delete set null,
  add column if not exists habit_session_id uuid references public.habit_sessions(id) on delete set null,
  add column if not exists completed_at timestamptz,
  add column if not exists completed_on date;

create index if not exists idx_calendar_events_objective on public.calendar_events(objective_id);
create index if not exists idx_calendar_events_habit on public.calendar_events(habit_id);
create index if not exists idx_calendar_events_session on public.calendar_events(habit_session_id);
create index if not exists idx_calendar_events_completed_on on public.calendar_events(account_id, completed_on);
