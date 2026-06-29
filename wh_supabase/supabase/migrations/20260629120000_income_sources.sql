create table if not exists public.income_sources (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  name text not null,
  amount numeric(14,2) not null,
  currency_code text not null default 'USD',
  recurrence text not null check (recurrence in ('monthly', 'yearly')),
  start_date date not null,
  end_date date,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (amount >= 0),
  check (end_date is null or end_date >= start_date)
);

create index if not exists idx_income_sources_account on public.income_sources(account_id, is_active, start_date);

drop trigger if exists trg_income_sources_set_updated on public.income_sources;
create trigger trg_income_sources_set_updated
  before update on public.income_sources
  for each row execute function public.set_updated_at();

alter table public.income_sources enable row level security;

drop policy if exists income_sources_member on public.income_sources;
create policy income_sources_member on public.income_sources
  for all using (account_id in (select account_ids_for_user()))
  with check (account_id in (select account_ids_for_user()));

drop policy if exists income_sources_admin on public.income_sources;
create policy income_sources_admin on public.income_sources
  for all using (is_admin()) with check (is_admin());
