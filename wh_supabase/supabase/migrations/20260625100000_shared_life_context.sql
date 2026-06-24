alter table public.templates
  add column if not exists phase_id uuid references public.life_phases(id) on delete set null,
  add column if not exists project_id uuid references public.life_projects(id) on delete set null;

create index if not exists idx_templates_phase on public.templates(phase_id);
create index if not exists idx_templates_project on public.templates(project_id);

-- Existing tasks should follow their objective when they have not been linked directly.
update public.habits as habit
set
  phase_id = coalesce(habit.phase_id, objective.phase_id),
  project_id = coalesce(habit.project_id, objective.project_id)
from public.habit_objectives as objective
where habit.objective_id = objective.id
  and (habit.phase_id is null or habit.project_id is null);
