-- Custom luteal phase length and ovulation confirmations

alter table public.profiles
  add column if not exists luteal_phase_length smallint not null default 14
  check (luteal_phase_length between 8 and 20);

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
create policy ovulation_confirmations_own
  on public.ovulation_confirmations
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
