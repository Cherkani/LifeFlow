-- Track moods for per-day logs

alter table public.period_daily_logs
  add column if not exists moods text[] not null default '{}';
