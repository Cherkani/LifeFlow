alter table public.calendar_events
  drop constraint if exists calendar_events_event_type_check;

alter table public.calendar_events
  alter column event_type drop default;

alter table public.calendar_events
  add constraint calendar_events_event_type_check
  check (length(btrim(event_type)) > 0);
