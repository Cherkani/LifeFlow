create or replace function public.enforce_life_context_integrity()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_phase_account uuid;
  v_project_account uuid;
  v_project_phase uuid;
begin
  if new.project_id is not null then
    select account_id, phase_id into v_project_account, v_project_phase
    from public.life_projects where id = new.project_id;
    if v_project_account is null or v_project_account <> new.account_id then
      raise exception 'Project does not belong to this account';
    end if;
    new.phase_id := v_project_phase;
  elsif new.phase_id is not null then
    select account_id into v_phase_account from public.life_phases where id = new.phase_id;
    if v_phase_account is null or v_phase_account <> new.account_id then
      raise exception 'Phase does not belong to this account';
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.enforce_habit_objective_integrity()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_objective_account uuid;
begin
  if new.objective_id is not null then
    select account_id into v_objective_account from public.habit_objectives where id = new.objective_id;
    if v_objective_account is null or v_objective_account <> new.account_id then
      raise exception 'Objective does not belong to this account';
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.enforce_life_project_phase_integrity()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_phase_account uuid;
begin
  if new.phase_id is not null then
    select account_id into v_phase_account from public.life_phases where id = new.phase_id;
    if v_phase_account is null or v_phase_account <> new.account_id then
      raise exception 'Phase does not belong to this account';
    end if;
  end if;
  return new;
end;
$$;

-- Repair legacy mismatches before enforcing the rule for future writes.
update public.life_projects as project
set phase_id = null
where phase_id is not null
  and not exists (
    select 1 from public.life_phases as phase
    where phase.id = project.phase_id and phase.account_id = project.account_id
  );

do $$
declare
  v_table text;
begin
  foreach v_table in array array['ledger_entries', 'calendar_events', 'habit_objectives', 'habits', 'knowledge_spaces', 'templates']
  loop
    execute format(
      'update public.%I as item set project_id = null, phase_id = null where project_id is not null and not exists (select 1 from public.life_projects as project where project.id = item.project_id and project.account_id = item.account_id)',
      v_table
    );
    execute format(
      'update public.%I as item set phase_id = project.phase_id from public.life_projects as project where item.project_id = project.id and item.account_id = project.account_id and item.phase_id is distinct from project.phase_id',
      v_table
    );
    execute format(
      'update public.%I as item set phase_id = null where project_id is null and phase_id is not null and not exists (select 1 from public.life_phases as phase where phase.id = item.phase_id and phase.account_id = item.account_id)',
      v_table
    );
  end loop;
end $$;

drop trigger if exists trg_life_projects_context_integrity on public.life_projects;
create trigger trg_life_projects_context_integrity
  before insert or update of account_id, phase_id on public.life_projects
  for each row execute function public.enforce_life_project_phase_integrity();

do $$
declare
  v_table text;
begin
  foreach v_table in array array['ledger_entries', 'calendar_events', 'habit_objectives', 'habits', 'knowledge_spaces', 'templates']
  loop
    execute format('drop trigger if exists trg_life_context_integrity on public.%I', v_table);
    execute format(
      'create trigger trg_life_context_integrity before insert or update of account_id, phase_id, project_id on public.%I for each row execute function public.enforce_life_context_integrity()',
      v_table
    );
  end loop;
end $$;

drop trigger if exists trg_habit_objective_integrity on public.habits;
create trigger trg_habit_objective_integrity
  before insert or update of account_id, objective_id on public.habits
  for each row execute function public.enforce_habit_objective_integrity();
