import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getPlanningData, getPlanningSessions, getPlanningTemplateEntries } from "@/lib/queries";
import { requireAppContext } from "@/lib/server-context";
import { startOfIsoWeek, toDateInputValue } from "@/lib/utils";

import { GeneratedWeeksCalendar } from "./generated-weeks-calendar";
import { PlanningContent } from "./planning-content";

type Objective = {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
};

type Task = {
  id: string;
  title: string;
  objective_id: string | null;
  metadata: unknown;
};

type Template = {
  id: string;
  name: string;
  objective_id: string | null;
};

type TemplateEntry = {
  id: string;
  template_id: string;
  habit_id: string;
  day_of_week: number;
  planned_minutes: number;
  minimum_minutes: number;
  is_required: boolean;
};

export default async function PlanningPage() {
  const { supabase, account } = await requireAppContext();

  const { objectives: objectivesRaw, tasks: tasksRaw, templates: templatesRaw, weeks } = await getPlanningData(
    supabase,
    account.accountId
  );
  const objectives = objectivesRaw as Objective[];
  const tasks = tasksRaw as Task[];
  const templates = templatesRaw as Template[];

  const objectiveById = new Map(objectives.map((objective) => [objective.id, objective]));
  const taskById = new Map(tasks.map((task) => [task.id, task]));

  const today = new Date();
  const currentWeekStart = startOfIsoWeek(today);
  const currentWeekKey = toDateInputValue(currentWeekStart);
  const firstAssignedDate =
    weeks.length > 0 ? weeks.reduce((min, w) => (w.week_start_date < min ? w.week_start_date : min), weeks[0].week_start_date) : null;
  const calendarWeeks: string[] = [];
  const rangeStart = firstAssignedDate
    ? new Date(`${firstAssignedDate}T00:00:00`)
    : (() => {
        const d = new Date(currentWeekStart);
        d.setDate(d.getDate() - 28);
        return d;
      })();
  const rangeEnd = new Date(currentWeekStart);
  rangeEnd.setDate(rangeEnd.getDate() + 21);
  const d = new Date(rangeStart);
  while (d <= rangeEnd) {
    calendarWeeks.push(toDateInputValue(d));
    d.setDate(d.getDate() + 7);
  }
  const firstWeekIso = calendarWeeks[0] ?? currentWeekKey;
  const lastWeekDate = new Date(calendarWeeks[calendarWeeks.length - 1] ?? currentWeekKey);
  lastWeekDate.setDate(lastWeekDate.getDate() + 6);
  const lastWeekIso = toDateInputValue(lastWeekDate);

  const [entriesRes, sessionsRes] = await Promise.all([
    getPlanningTemplateEntries(supabase, templates.map((t) => t.id)),
    getPlanningSessions(supabase, tasks.map((t) => t.id), firstWeekIso, lastWeekIso)
  ]);
  const entries = (entriesRes.data ?? []) as TemplateEntry[];
  const assignedWeeksCount = weeks.length;
  const totalTemplateEntries = entries.length;

  const templateIdsByObjective: Record<string, string[]> = {};
  for (const objective of objectives) {
    templateIdsByObjective[objective.id] = [];
  }
  for (const entry of entries) {
    const habit = taskById.get(entry.habit_id);
    const objectiveId = habit?.objective_id;
    if (objectiveId && templateIdsByObjective[objectiveId]) {
      const ids = templateIdsByObjective[objectiveId];
      if (!ids.includes(entry.template_id)) {
        ids.push(entry.template_id);
      }
    }
  }

  const assignedWeeksMap = new Map<string, { id: string; template_id: string }>();
  for (const w of weeks) {
    assignedWeeksMap.set(w.week_start_date, { id: w.id, template_id: w.template_id });
  }

  const totalTasksCountByWeek = new Map<string, number>();
  const completedTasksCountByWeek = new Map<string, number>();
  for (const s of sessionsRes.data ?? []) {
    const weekStart = startOfIsoWeek(new Date(`${s.session_date}T00:00:00`));
    const key = toDateInputValue(weekStart);
    totalTasksCountByWeek.set(key, (totalTasksCountByWeek.get(key) ?? 0) + 1);
    if (s.completed) {
      completedTasksCountByWeek.set(key, (completedTasksCountByWeek.get(key) ?? 0) + 1);
    }
  }

  const weeksByMonth = new Map<string, string[]>();
  for (const weekKey of calendarWeeks) {
    const monthKey = weekKey.slice(0, 7);
    const list = weeksByMonth.get(monthKey) ?? [];
    list.push(weekKey);
    weeksByMonth.set(monthKey, list);
  }
  const sortedMonths = Array.from(weeksByMonth.keys()).sort();

  const taskByIdRecord = Object.fromEntries(taskById);
  const objectiveByIdRecord = Object.fromEntries(objectiveById);

  return (
    <div className="space-y-6">
      <PlanningContent
        objectives={objectives}
        templates={templates}
        entries={entries}
        taskById={taskByIdRecord}
        objectiveById={objectiveByIdRecord}
        templateIdsByObjective={templateIdsByObjective}
        stats={{
          objectivesCount: objectives.length,
          templatesCount: templates.length,
          totalTemplateEntries,
          assignedWeeksCount
        }}
      />

      <Card>
        <CardHeader>
          <CardTitle>Generated Weeks</CardTitle>
          <p className="mt-1 text-sm text-[#4a5f83]">
            Circle = not assigned · CheckCircle (outline) = assigned, no tasks done · CheckCircle2 (filled) = tasks completed.
          </p>
        </CardHeader>
        <CardContent>
          {calendarWeeks.length > 0 ? (
            <GeneratedWeeksCalendar
              sortedMonths={sortedMonths}
              weeksByMonth={Object.fromEntries(weeksByMonth)}
              assignedWeeksMap={Object.fromEntries(assignedWeeksMap)}
              completedTasksCountByWeek={Object.fromEntries(completedTasksCountByWeek)}
              totalTasksCountByWeek={Object.fromEntries(totalTasksCountByWeek)}
              templates={templates.map((t) => ({ id: t.id, name: t.name }))}
              currentWeekKey={currentWeekKey}
            />
          ) : (
            <p className="text-sm text-[#4a5f83]">Assign a template to a week in Execution to start your calendar.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
