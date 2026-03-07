-- Habit system upgrade:
-- objectives -> categories(habits) -> templates -> daily scheduler checkboxes

create table if not exists public.habit_objectives (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  title text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_habit_objectives_account
  on public.habit_objectives(account_id);

alter table public.habit_objectives enable row level security;

drop policy if exists habit_objectives_member on public.habit_objectives;
create policy habit_objectives_member on public.habit_objectives
  for all using (account_id in (select account_ids_for_user()))
  with check (account_id in (select account_ids_for_user()));

drop policy if exists habit_objectives_admin on public.habit_objectives;
create policy habit_objectives_admin on public.habit_objectives
  for all using (is_admin()) with check (is_admin());

drop trigger if exists trg_habit_objectives_set_updated on public.habit_objectives;
create trigger trg_habit_objectives_set_updated
  before update on public.habit_objectives
  for each row execute function public.set_updated_at();

alter table public.habits
  add column if not exists objective_id uuid references public.habit_objectives(id) on delete set null;
create index if not exists idx_habits_objective on public.habits(objective_id);

alter table public.templates
  add column if not exists objective_id uuid references public.habit_objectives(id) on delete set null;
create index if not exists idx_templates_objective on public.templates(objective_id);

-- Backfill existing rows into a default objective per account
insert into public.habit_objectives (account_id, title, description)
select
  account_id,
  'General Objective',
  'Auto-created during objective/category migration.'
from (
  select distinct account_id from public.habits where objective_id is null
  union
  select distinct account_id from public.templates where objective_id is null
) as accounts_without_objective
where not exists (
  select 1
  from public.habit_objectives ho
  where ho.account_id = accounts_without_objective.account_id
    and ho.title = 'General Objective'
);

update public.habits h
set objective_id = (
  select ho.id
  from public.habit_objectives ho
  where ho.account_id = h.account_id
  order by
    case when ho.title = 'General Objective' then 0 else 1 end,
    ho.created_at
  limit 1
)
where h.objective_id is null;

update public.templates t
set objective_id = (
  select ho.id
  from public.habit_objectives ho
  where ho.account_id = t.account_id
  order by
    case when ho.title = 'General Objective' then 0 else 1 end,
    ho.created_at
  limit 1
)
where t.objective_id is null;
