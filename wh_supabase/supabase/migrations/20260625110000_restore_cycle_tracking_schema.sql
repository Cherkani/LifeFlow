-- Recovery migration for environments where the first Life Context migration
-- was applied before its unrelated cycle-table drops were removed.
-- This restores schema and policies; previously deleted rows require a backup.

alter table public.profiles
  add column if not exists cycle_tracking_enabled boolean not null default false,
  add column if not exists luteal_phase_length smallint not null default 14;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_luteal_phase_length_check'
  ) then
    alter table public.profiles
      add constraint profiles_luteal_phase_length_check
      check (luteal_phase_length between 8 and 20);
  end if;
end $$;

create table if not exists public.period_cycles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  period_start date not null,
  period_end date,
  created_at timestamptz not null default now()
);
create index if not exists idx_period_cycles_user on public.period_cycles(user_id);
create index if not exists idx_period_cycles_dates on public.period_cycles(user_id, period_start desc);
alter table public.period_cycles enable row level security;
drop policy if exists period_cycles_own on public.period_cycles;
create policy period_cycles_own on public.period_cycles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.period_daily_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null,
  flow_intensity text check (flow_intensity is null or flow_intensity in ('spotting', 'light', 'medium', 'heavy')),
  symptoms text[] default '{}',
  moods text[] not null default '{}',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, log_date)
);
alter table public.period_daily_logs add column if not exists moods text[] not null default '{}';
create index if not exists idx_period_daily_logs_user on public.period_daily_logs(user_id);
create index if not exists idx_period_daily_logs_date on public.period_daily_logs(user_id, log_date desc);
alter table public.period_daily_logs enable row level security;
drop policy if exists period_daily_logs_own on public.period_daily_logs;
create policy period_daily_logs_own on public.period_daily_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop trigger if exists trg_period_daily_logs_set_updated on public.period_daily_logs;
create trigger trg_period_daily_logs_set_updated
  before update on public.period_daily_logs
  for each row execute function public.set_updated_at();

create table if not exists public.ovulation_confirmations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  confirmed_on date not null,
  method text check (method in ('opk', 'bbt', 'symptoms', 'monitoring', 'other')) default 'other',
  notes text,
  created_at timestamptz not null default timezone('utc'::text, now())
);
create unique index if not exists idx_ovulation_confirmations_user_date
  on public.ovulation_confirmations(user_id, confirmed_on);
alter table public.ovulation_confirmations enable row level security;
drop policy if exists ovulation_confirmations_own on public.ovulation_confirmations;
create policy ovulation_confirmations_own on public.ovulation_confirmations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
