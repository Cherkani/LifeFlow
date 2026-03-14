-- Allow period_end to be null when user logs start only (will add end when period finishes)
alter table public.period_cycles
  alter column period_end drop not null;
