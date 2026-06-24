alter table public.debts
  add column if not exists phase_id uuid references public.life_phases(id) on delete set null,
  add column if not exists project_id uuid references public.life_projects(id) on delete set null;

alter table public.subscriptions
  add column if not exists phase_id uuid references public.life_phases(id) on delete set null,
  add column if not exists project_id uuid references public.life_projects(id) on delete set null;

create index if not exists idx_debts_phase on public.debts(phase_id);
create index if not exists idx_debts_project on public.debts(project_id);
create index if not exists idx_subscriptions_phase on public.subscriptions(phase_id);
create index if not exists idx_subscriptions_project on public.subscriptions(project_id);

do $$
declare
  v_table text;
begin
  foreach v_table in array array['debts', 'subscriptions']
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
    execute format('drop trigger if exists trg_life_context_integrity on public.%I', v_table);
    execute format(
      'create trigger trg_life_context_integrity before insert or update of account_id, phase_id, project_id on public.%I for each row execute function public.enforce_life_context_integrity()',
      v_table
    );
  end loop;
end $$;
