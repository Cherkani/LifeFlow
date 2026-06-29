alter table public.income_sources
  add column if not exists phase_id uuid references public.life_phases(id) on delete set null,
  add column if not exists project_id uuid references public.life_projects(id) on delete set null;

alter table public.debt_payments
  add column if not exists project_expense_id uuid references public.ledger_entries(id) on delete set null;

create index if not exists idx_income_sources_phase on public.income_sources(phase_id);
create index if not exists idx_income_sources_project on public.income_sources(project_id);
create index if not exists idx_debt_payments_project_expense on public.debt_payments(project_expense_id);

do $$
begin
  if to_regprocedure('public.enforce_life_context_integrity()') is not null then
    drop trigger if exists trg_life_context_integrity on public.income_sources;
    create trigger trg_life_context_integrity
      before insert or update of account_id, phase_id, project_id on public.income_sources
      for each row execute function public.enforce_life_context_integrity();
  end if;
end $$;
