create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  name text not null,
  amount numeric(14,2) not null check (amount >= 0),
  currency_code text not null default 'USD',
  recurrence text not null check (recurrence in ('monthly', 'yearly')),
  next_due_date date,
  end_date date,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.subscriptions
  add column if not exists end_date date;

create index if not exists idx_subscriptions_account on public.subscriptions(account_id);

alter table public.subscriptions enable row level security;

drop trigger if exists trg_subscriptions_set_updated on public.subscriptions;
create trigger trg_subscriptions_set_updated
  before update on public.subscriptions for each row execute function public.set_updated_at();

drop policy if exists subscriptions_member on public.subscriptions;
create policy subscriptions_member on public.subscriptions
  for all using (account_id in (select account_ids_for_user()))
  with check (account_id in (select account_ids_for_user()));

drop policy if exists subscriptions_admin on public.subscriptions;
create policy subscriptions_admin on public.subscriptions
  for all using (is_admin()) with check (is_admin());
