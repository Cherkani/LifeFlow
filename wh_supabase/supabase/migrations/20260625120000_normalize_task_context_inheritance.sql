-- Task phase/project columns are overrides. Matching copied values are cleared
-- so tasks inherit future objective context changes automatically.
update public.habits as habit
set
  phase_id = case when habit.phase_id is not distinct from objective.phase_id then null else habit.phase_id end,
  project_id = case when habit.project_id is not distinct from objective.project_id then null else habit.project_id end
from public.habit_objectives as objective
where habit.objective_id = objective.id
  and (
    habit.phase_id is not distinct from objective.phase_id
    or habit.project_id is not distinct from objective.project_id
  );
