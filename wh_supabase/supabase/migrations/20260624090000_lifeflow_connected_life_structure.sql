create table if not exists public.life_phases (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  title text not null,
  phase_type text not null default 'custom'
    check (phase_type in ('school', 'study', 'internship', 'job', 'freelance', 'project', 'career_growth', 'travel', 'custom')),
  status text not null default 'current'
    check (status in ('past', 'current', 'planned', 'archived')),
  start_date date,
  end_date date,
  income_source text,
  monthly_income numeric(14,2),
  monthly_spending numeric(14,2),
  currency_code text not null default 'USD',
  summary text,
  image_url text,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date is null or start_date is null or end_date >= start_date),
  check (monthly_income is null or monthly_income >= 0),
  check (monthly_spending is null or monthly_spending >= 0)
);

create index if not exists idx_life_phases_account_position
  on public.life_phases(account_id, position, created_at);
create index if not exists idx_life_phases_account_status
  on public.life_phases(account_id, status);

drop trigger if exists trg_life_phases_set_updated on public.life_phases;
create trigger trg_life_phases_set_updated
  before update on public.life_phases
  for each row execute function public.set_updated_at();

alter table public.life_phases enable row level security;

drop policy if exists life_phases_member on public.life_phases;
create policy life_phases_member on public.life_phases
  for all using (account_id in (select account_ids_for_user()))
  with check (account_id in (select account_ids_for_user()));

drop policy if exists life_phases_admin on public.life_phases;
create policy life_phases_admin on public.life_phases
  for all using (is_admin()) with check (is_admin());


create table if not exists public.life_projects (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  phase_id uuid references public.life_phases(id) on delete set null,
  name text not null,
  description text,
  status text not null default 'active'
    check (status in ('idea', 'active', 'paused', 'completed', 'archived')),
  start_date date,
  end_date date,
  progress integer not null default 0 check (progress >= 0 and progress <= 100),
  outcome text,
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date is null or start_date is null or end_date >= start_date)
);

create index if not exists idx_life_projects_account
  on public.life_projects(account_id, created_at desc);
create index if not exists idx_life_projects_phase
  on public.life_projects(phase_id);
create index if not exists idx_life_projects_status
  on public.life_projects(account_id, status);

drop trigger if exists trg_life_projects_set_updated on public.life_projects;
create trigger trg_life_projects_set_updated
  before update on public.life_projects
  for each row execute function public.set_updated_at();

alter table public.life_projects enable row level security;

drop policy if exists life_projects_member on public.life_projects;
create policy life_projects_member on public.life_projects
  for all using (account_id in (select account_ids_for_user()))
  with check (account_id in (select account_ids_for_user()));

drop policy if exists life_projects_admin on public.life_projects;
create policy life_projects_admin on public.life_projects
  for all using (is_admin()) with check (is_admin());

alter table public.ledger_entries
  add column if not exists phase_id uuid references public.life_phases(id) on delete set null,
  add column if not exists project_id uuid references public.life_projects(id) on delete set null;
create index if not exists idx_ledger_entries_phase on public.ledger_entries(phase_id);
create index if not exists idx_ledger_entries_project on public.ledger_entries(project_id);

alter table public.calendar_events
  add column if not exists phase_id uuid references public.life_phases(id) on delete set null,
  add column if not exists project_id uuid references public.life_projects(id) on delete set null;
create index if not exists idx_calendar_events_phase on public.calendar_events(phase_id);
create index if not exists idx_calendar_events_project on public.calendar_events(project_id);

alter table public.habit_objectives
  add column if not exists phase_id uuid references public.life_phases(id) on delete set null,
  add column if not exists project_id uuid references public.life_projects(id) on delete set null;
create index if not exists idx_habit_objectives_phase on public.habit_objectives(phase_id);
create index if not exists idx_habit_objectives_project on public.habit_objectives(project_id);

alter table public.habits
  add column if not exists phase_id uuid references public.life_phases(id) on delete set null,
  add column if not exists project_id uuid references public.life_projects(id) on delete set null;
create index if not exists idx_habits_phase on public.habits(phase_id);
create index if not exists idx_habits_project on public.habits(project_id);

alter table public.knowledge_spaces
  add column if not exists phase_id uuid references public.life_phases(id) on delete set null,
  add column if not exists project_id uuid references public.life_projects(id) on delete set null;
create index if not exists idx_knowledge_spaces_phase on public.knowledge_spaces(phase_id);
create index if not exists idx_knowledge_spaces_project on public.knowledge_spaces(project_id);

-- Cycle tracking is a separate feature and must not be removed by Life Context.
