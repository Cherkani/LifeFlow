alter table public.calendar_events
  add column if not exists event_time time;
