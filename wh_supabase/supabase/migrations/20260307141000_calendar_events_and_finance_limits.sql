-- Add calendar events and monthly expense limits.

create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  title text not null,
  details text,
  event_date date not null,
  event_type text not null default 'important' check (event_type in ('meeting', 'important', 'general')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_calendar_events_account_date
  on public.calendar_events(account_id, event_date desc);

drop trigger if exists trg_calendar_events_set_updated on public.calendar_events;
create trigger trg_calendar_events_set_updated
  before update on public.calendar_events
  for each row execute function public.set_updated_at();

alter table public.calendar_events enable row level security;

drop policy if exists calendar_events_member on public.calendar_events;
create policy calendar_events_member on public.calendar_events
  for all using (account_id in (select account_ids_for_user()))
  with check (account_id in (select account_ids_for_user()));

drop policy if exists calendar_events_admin on public.calendar_events;
create policy calendar_events_admin on public.calendar_events
  for all using (is_admin()) with check (is_admin());

alter table public.finance_categories
  add column if not exists monthly_limit numeric(14,2) check (monthly_limit is null or monthly_limit >= 0);
