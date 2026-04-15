create table if not exists public.calendar_event_types (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  name text not null check (length(btrim(name)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (account_id, name)
);

create index if not exists idx_calendar_event_types_account_name
  on public.calendar_event_types(account_id, name);

drop trigger if exists trg_calendar_event_types_set_updated on public.calendar_event_types;
create trigger trg_calendar_event_types_set_updated
  before update on public.calendar_event_types
  for each row execute function public.set_updated_at();

alter table public.calendar_event_types enable row level security;

drop policy if exists calendar_event_types_member on public.calendar_event_types;
create policy calendar_event_types_member on public.calendar_event_types
  for all using (account_id in (select account_ids_for_user()))
  with check (account_id in (select account_ids_for_user()));

drop policy if exists calendar_event_types_admin on public.calendar_event_types;
create policy calendar_event_types_admin on public.calendar_event_types
  for all using (is_admin()) with check (is_admin());

insert into public.calendar_event_types (account_id, name)
select distinct ce.account_id, btrim(ce.event_type)
from public.calendar_events ce
where ce.event_type is not null
  and length(btrim(ce.event_type)) > 0
on conflict (account_id, name) do nothing;
