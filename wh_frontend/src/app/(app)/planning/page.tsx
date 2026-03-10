import { Pencil, Plus } from "lucide-react";
import Image from "next/image";

import { createObjectiveAction, updateObjectiveAction } from "@/app/(app)/habits/actions";
import { PexelsImagePicker } from "@/components/forms/pexels-image-picker";
import { SubmitButton } from "@/components/forms/submit-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ModalShell } from "@/components/ui/modal-shell";
import { SectionHeader } from "@/components/ui/section-header";
import { Textarea } from "@/components/ui/textarea";
import { requireAppContext } from "@/lib/server-context";
import { startOfIsoWeek, toDateInputValue } from "@/lib/utils";

import { createTemplateWithDailyTasksAction, updateTemplateWithDailyTasksAction } from "./actions";
import { GeneratedWeeksCalendar } from "./generated-weeks-calendar";
import { TemplateTaskBuilder } from "./template-task-builder";

type PlanningSearchParams = Promise<{
  modal?: string;
  templateId?: string;
  objectiveId?: string;
}>;

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

const dayName = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function buildPlanningHref(modal?: string, extraParams?: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  if (modal) {
    params.set("modal", modal);
  }
  if (extraParams) {
    for (const [key, value] of Object.entries(extraParams)) {
      if (value) {
        params.set(key, value);
      }
    }
  }
  return params.size > 0 ? `/planning?${params.toString()}` : "/planning";
}

function getStartTime(metadata: unknown) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }

  const value = (metadata as { preferred_start_time?: unknown }).preferred_start_time;
  return typeof value === "string" && value.length > 0 ? value : null;
}

export default async function PlanningPage({
  searchParams
}: {
  searchParams: PlanningSearchParams;
}) {
  const params = await searchParams;
  const modal = params.modal?.trim();
  const { supabase, account } = await requireAppContext();

  const [objectivesRes, tasksRes, templatesRes, weeksRes] = await Promise.all([
    supabase
      .from("habit_objectives")
      .select("id, title, description, image_url")
      .eq("account_id", account.accountId)
      .order("created_at", { ascending: false }),
    supabase
      .from("habits")
      .select("id, title, objective_id, metadata")
      .eq("account_id", account.accountId)
      .eq("is_active", true)
      .order("created_at", { ascending: false }),
    supabase
      .from("templates")
      .select("id, name, objective_id")
      .eq("account_id", account.accountId)
      .order("created_at", { ascending: false }),
    supabase
      .from("weeks")
      .select("id, template_id, week_start_date")
      .eq("account_id", account.accountId)
      .order("week_start_date", { ascending: true })
  ]);

  const objectives = (objectivesRes.data ?? []) as Objective[];
  const tasks = (tasksRes.data ?? []) as Task[];
  const templates = (templatesRes.data ?? []) as Template[];
  const weeks = weeksRes.data ?? [];

  const objectiveById = new Map(objectives.map((objective) => [objective.id, objective]));
  const taskById = new Map(tasks.map((task) => [task.id, task]));

  const entriesRes =
    templates.length > 0
      ? await supabase
          .from("template_entries")
          .select("id, template_id, habit_id, day_of_week, planned_minutes, minimum_minutes, is_required")
          .in("template_id", templates.map((template) => template.id))
          .order("day_of_week", { ascending: true })
      : { data: [] as TemplateEntry[] };
  const entries = (entriesRes.data ?? []) as TemplateEntry[];
  const templateIdParam = params.templateId?.trim();
  const objectiveIdParam = params.objectiveId?.trim();
  const editingTemplateId = modal === "edit-template" ? templateIdParam : undefined;
  const editingObjectiveId = modal === "edit-objective" ? objectiveIdParam : undefined;
  const editingObjective = editingObjectiveId ? objectives.find((o) => o.id === editingObjectiveId) ?? null : null;
  const editingTemplate = editingTemplateId ? templates.find((template) => template.id === editingTemplateId) ?? null : null;
  const editingTemplateInitialTasks =
    editingTemplate !== null
      ? entries
          .filter((entry) => entry.template_id === editingTemplate.id)
          .map((entry) => {
            const task = taskById.get(entry.habit_id);
            return {
              dayOfWeek: entry.day_of_week,
              title: task?.title ?? "",
              objectiveId: task?.objective_id ?? "",
              plannedMinutes: entry.planned_minutes,
              startTime: getStartTime(task?.metadata),
              habitId: entry.habit_id
            };
          })
      : [];
  const assignedWeeksCount = weeks.length;
  const totalTemplateEntries = entries.length;

  const templateIdsByObjective = new Map<string, Set<string>>();
  for (const objective of objectives) {
    templateIdsByObjective.set(objective.id, new Set());
  }
  for (const entry of entries) {
    const habit = taskById.get(entry.habit_id);
    const objectiveId = habit?.objective_id;
    if (objectiveId && templateIdsByObjective.has(objectiveId)) {
      templateIdsByObjective.get(objectiveId)!.add(entry.template_id);
    }
  }

  const assignedWeeksMap = new Map<string, { id: string; template_id: string }>();
  for (const w of weeks) {
    assignedWeeksMap.set(w.week_start_date, { id: w.id, template_id: w.template_id });
  }
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

  const sessionsRes =
    tasks.length > 0
      ? await supabase
          .from("habit_sessions")
          .select("session_date, completed")
          .in("habit_id", tasks.map((t) => t.id))
          .gte("session_date", firstWeekIso)
          .lte("session_date", lastWeekIso)
      : { data: [] as Array<{ session_date: string; completed: boolean }> };

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

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Planning Studio"
        description="Design objectives and weekly templates with clearer, faster structure."
        action={
          <div className="flex flex-wrap gap-2">
            <a
              href={buildPlanningHref("objective")}
              className="inline-flex items-center gap-2 rounded-lg bg-[#0b1f3b] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#102a52]"
            >
              <Plus size={16} />
              Objective
            </a>
            <a
              href={buildPlanningHref("template")}
              className="inline-flex items-center gap-2 rounded-lg bg-[#1e3a6d] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#274881]"
            >
              <Plus size={16} />
              Template
            </a>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-wide text-[#4a5f83]">Objectives</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-[#0c1d3c]">{objectives.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-wide text-[#4a5f83]">Templates</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-[#0c1d3c]">{templates.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-wide text-[#4a5f83]">Template tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-[#0c1d3c]">{totalTemplateEntries}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-wide text-[#4a5f83]">Generated weeks</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-[#0c1d3c]">{assignedWeeksCount}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Workflow</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-[#4a5f83]">
          <p>1. Create objective.</p>
          <p>2. Create one template with day tasks, purpose/objective, average minutes, and optional start times.</p>
          <p>3. Assign template to week in Execution Tracker. Then track checkboxes + minutes there.</p>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Objectives</CardTitle>
          </CardHeader>
          <CardContent>
            {objectives.length > 0 ? (
              <div className="grid gap-3 lg:grid-cols-3">
                {objectives.map((objective) => {
                  const templateCount = templateIdsByObjective.get(objective.id)?.size ?? 0;
                  const editHref = buildPlanningHref("edit-objective", { objectiveId: objective.id });
                  return (
                    <div
                      key={objective.id}
                      className="group relative overflow-hidden rounded-xl border border-[#d7e0f1] bg-white shadow-[0_2px_8px_rgba(11,31,59,0.06)] transition-all duration-200 hover:border-[#b8cae8] hover:shadow-[0_8px_24px_rgba(11,31,59,0.1)]"
                    >
                      {objective.image_url ? (
                        <div className="relative h-32 w-full overflow-hidden bg-[#e8eefb]">
                          <Image src={objective.image_url} alt={objective.title} fill className="object-cover transition-transform duration-300 group-hover:scale-[1.02]" />
                          <a
                            href={editHref}
                            className="absolute right-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-lg bg-white/95 px-2.5 py-1.5 text-xs font-medium text-[#23406d] shadow-md backdrop-blur-sm transition hover:bg-white hover:shadow-lg"
                          >
                            <Pencil size={14} />
                            Edit
                          </a>
                        </div>
                      ) : (
                        <div className="relative h-20 w-full bg-gradient-to-br from-[#e8eefb] to-[#f0f4fc]">
                          <a
                            href={editHref}
                            className="absolute right-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-lg bg-white/95 px-2.5 py-1.5 text-xs font-medium text-[#23406d] shadow-md backdrop-blur-sm transition hover:bg-white hover:shadow-lg"
                          >
                            <Pencil size={14} />
                            Edit
                          </a>
                        </div>
                      )}
                      <div className="p-4">
                        <p className="truncate text-base font-semibold text-[#0c1d3c]">{objective.title}</p>
                        {objective.description ? <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-[#4a5f83]">{objective.description}</p> : null}
                        <p className="mt-2 text-xs font-medium text-[#6b7da1]">{templateCount} template{templateCount !== 1 ? "s" : ""}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-[#4a5f83]">No objectives yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Template Stack</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {templates.length > 0 ? (
              templates.map((template) => {
                const templateEntries = entries.filter((entry) => entry.template_id === template.id);
                return (
                  <div
                    key={template.id}
                    className="group relative overflow-hidden rounded-xl border border-[#d7e0f1] bg-white shadow-[0_2px_8px_rgba(11,31,59,0.06)] transition-all duration-200 hover:border-[#b8cae8] hover:shadow-[0_8px_24px_rgba(11,31,59,0.1)]"
                  >
                    <div className="relative flex items-start justify-between gap-3 border-b border-[#ecebf6] bg-[#fafbff] px-4 py-3 pr-12">
                      <p className="min-w-0 flex-1 truncate text-sm font-semibold text-[#0c1d3c]">{template.name}</p>
                      <Badge variant="secondary" className="shrink-0">
                        {templateEntries.length} task{templateEntries.length !== 1 ? "s" : ""}
                      </Badge>
                      <a
                        href={buildPlanningHref("edit-template", { templateId: template.id })}
                        aria-label="Edit template"
                        className="absolute right-3 top-3 z-10 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-sm text-[#23406d] transition hover:bg-[#edf3ff] hover:shadow-md"
                      >
                        <Pencil size={14} />
                      </a>
                    </div>
                    <div className="p-4">
                      {templateEntries.length > 0 ? (
                        <div className="space-y-0">
                          {[1, 2, 3, 4, 5, 6, 7].map((dayOfWeek) => {
                            const dayEntries = templateEntries.filter((entry) => entry.day_of_week === dayOfWeek);
                            if (dayEntries.length === 0) return null;
                            return (
                              <div key={dayOfWeek}>
                                {dayOfWeek > 1 ? <div className="my-4 border-t-2 border-violet-200" /> : null}
                                <div className="space-y-2">
                                  {dayEntries.map((entry) => {
                                    const task = taskById.get(entry.habit_id);
                                    const startTime = getStartTime(task?.metadata);
                                    const taskObjective = objectiveById.get(task?.objective_id ?? "")?.title ?? "Objective";
                                    return (
                                      <div
                                        key={entry.id}
                                        className="rounded-lg border border-[#e8eefb] bg-[#fafbff] px-3 py-2 transition-colors hover:border-[#d7e0f1] hover:bg-[#f8fbff]"
                                      >
                                        <p className="text-xs font-semibold text-[#0c1d3c]">
                                          {dayName[dayOfWeek - 1]} · {task?.title ?? "Task"}
                                        </p>
                                        <p className="mt-0.5 text-[11px] leading-relaxed text-[#4a5f83]">
                                          {entry.planned_minutes} min planned · Min {entry.minimum_minutes} min
                                          {startTime ? ` · ${startTime}` : ""}
                                          {taskObjective ? ` · ${taskObjective}` : ""}
                                          {entry.is_required ? " · Required" : ""}
                                        </p>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-sm text-[#6b7da1]">No day tasks yet.</p>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-[#4a5f83]">No templates yet.</p>
                <a
                  href={buildPlanningHref("template")}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#0b1f3b] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#102a52]"
                >
                  <Plus size={16} />
                  Create first template
                </a>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

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

      {modal === "objective" ? (
        <ModalShell title="Create objective" description="Main result you want to achieve." closeHref={buildPlanningHref()}>
          <form action={createObjectiveAction} className="space-y-4">
            <input type="hidden" name="returnPath" value="/planning" />
            <div className="space-y-2">
              <Label htmlFor="objectiveTitle">Title</Label>
              <Input id="objectiveTitle" name="title" required placeholder="e.g. Improve coding productivity" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="objectiveDescription">Description (optional)</Label>
              <Textarea id="objectiveDescription" name="description" placeholder="Short context for this objective." />
            </div>
            <PexelsImagePicker inputName="imageUrl" label="Objective image (optional)" />
            <SubmitButton label="Save objective" pendingLabel="Saving..." className="w-full sm:w-auto" />
          </form>
        </ModalShell>
      ) : null}

      {modal === "edit-objective" && editingObjective ? (
        <ModalShell
          title="Edit objective"
          description="Update title, description, or image."
          closeHref={buildPlanningHref()}
        >
          <form action={updateObjectiveAction} className="space-y-4">
            <input type="hidden" name="returnPath" value="/planning" />
            <input type="hidden" name="objectiveId" value={editingObjective.id} />
            <div className="space-y-2">
              <Label htmlFor="editObjectiveTitle">Title</Label>
              <Input
                id="editObjectiveTitle"
                name="title"
                required
                defaultValue={editingObjective.title}
                placeholder="e.g. Improve coding productivity"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editObjectiveDescription">Description (optional)</Label>
              <Textarea
                id="editObjectiveDescription"
                name="description"
                defaultValue={editingObjective.description ?? ""}
                placeholder="Short context for this objective."
              />
            </div>
            <PexelsImagePicker
              inputName="imageUrl"
              label="Objective image (optional)"
              defaultValue={editingObjective.image_url ?? ""}
            />
            <SubmitButton label="Save changes" pendingLabel="Saving..." className="w-full sm:w-auto" />
          </form>
        </ModalShell>
      ) : null}

      {modal === "template" ? (
        <ModalShell
          title="Create template"
          description="Each day can have multiple tasks. Each task has its own objective."
          closeHref={buildPlanningHref()}
        >
          {objectives.length === 0 ? (
            <p className="text-sm text-[#4a5f83]">Create objective first.</p>
          ) : (
            <form action={createTemplateWithDailyTasksAction} className="space-y-4">
              <input type="hidden" name="returnPath" value="/planning" />

              <div className="space-y-2">
                <Label htmlFor="templateName">Template name</Label>
                <Input id="templateName" name="name" required placeholder="e.g. Focus Week, Exam Week" />
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-[#0c1d3c]">Daily tasks</p>
                <TemplateTaskBuilder objectives={objectives.map((objective) => ({ id: objective.id, title: objective.title }))} />
              </div>

              <SubmitButton label="Save template" pendingLabel="Saving..." className="w-full sm:w-auto" />
            </form>
          )}
        </ModalShell>
      ) : null}

      {modal === "edit-template" ? (
        editingTemplate ? (
          <ModalShell
            title={`Edit ${editingTemplate.name}`}
            description="Adjust template tasks carefully—future generated weeks inherit these changes."
            closeHref={buildPlanningHref()}
          >
            {objectives.length === 0 ? (
              <p className="text-sm text-[#4a5f83]">Create an objective first.</p>
            ) : (
              <form action={updateTemplateWithDailyTasksAction} className="space-y-4">
                <input type="hidden" name="returnPath" value="/planning" />
                <input type="hidden" name="templateId" value={editingTemplate.id} />

                <div className="space-y-2">
                  <Label htmlFor="editTemplateName">Template name</Label>
                  <Input id="editTemplateName" name="name" required defaultValue={editingTemplate.name} />
                </div>

                <TemplateTaskBuilder
                  objectives={objectives.map((objective) => ({ id: objective.id, title: objective.title }))}
                  initialTasks={editingTemplateInitialTasks}
                />

                <SubmitButton label="Save template changes" pendingLabel="Saving..." className="w-full sm:w-auto" />
              </form>
            )}
          </ModalShell>
        ) : (
          <ModalShell title="Template not found" description="Select another template to edit." closeHref={buildPlanningHref()}>
            <p className="text-sm text-[#4a5f83]">The requested template is unavailable.</p>
          </ModalShell>
        )
      ) : null}

    </div>
  );
}
