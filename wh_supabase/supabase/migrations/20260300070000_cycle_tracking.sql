-- Profile: gender and cycle tracking toggle (only relevant when gender = female)
alter table public.profiles
  add column if not exists gender text check (gender is null or gender in ('male', 'female', 'other', 'prefer_not_to_say'));

alter table public.profiles
  add column if not exists cycle_tracking_enabled boolean not null default false;

-- Period cycles: user logs start/end of each period
create table if not exists public.period_cycles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_period_cycles_user on public.period_cycles(user_id);
create index if not exists idx_period_cycles_dates on public.period_cycles(user_id, period_start desc);

alter table public.period_cycles enable row level security;

drop policy if exists period_cycles_own on public.period_cycles;
create policy period_cycles_own on public.period_cycles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Daily logs: symptoms, flow intensity, notes per day
create table if not exists public.period_daily_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null,
  flow_intensity text check (flow_intensity is null or flow_intensity in ('spotting', 'light', 'medium', 'heavy')),
  symptoms text[] default '{}',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, log_date)
);

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
