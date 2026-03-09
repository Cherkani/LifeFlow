import { Plus } from "lucide-react";
import Image from "next/image";

import { createObjectiveAction } from "@/app/(app)/habits/actions";
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

import { createTemplateWithDailyTasksAction, updateTemplateWithDailyTasksAction } from "./actions";
import { TemplateTaskBuilder } from "./template-task-builder";

type PlanningSearchParams = Promise<{
  modal?: string;
  templateId?: string;
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
      .order("week_start_date", { ascending: false })
      .limit(12)
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
  const editingTemplateId = modal === "edit-template" ? templateIdParam : undefined;
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
                  const templateCount = templates.filter((template) => template.objective_id === objective.id).length;
                  return (
                    <div key={objective.id} className="rounded-lg border border-[#c7d3e8] bg-[#f8fbff] p-3">
                      {objective.image_url ? (
                        <div className="relative mb-3 h-28 w-full overflow-hidden rounded-lg border border-[#d7e0f1] bg-white">
                          <Image src={objective.image_url} alt={objective.title} fill className="object-cover" />
                        </div>
                      ) : null}
                      <p className="truncate text-base font-semibold text-[#0c1d3c]">{objective.title}</p>
                      {objective.description ? <p className="mt-1 text-xs leading-5 text-[#4a5f83]">{objective.description}</p> : null}
                      <p className="mt-1 text-xs text-[#4a5f83]">{templateCount} template{templateCount !== 1 ? "s" : ""}</p>
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
                  <div key={template.id} className="relative rounded-lg border border-[#c7d3e8] bg-[#f8fbff] p-3">
                    <div className="mb-2 flex items-center gap-2 pr-10">
                      <p className="text-sm font-semibold text-[#0c1d3c]">{template.name}</p>
                      <Badge variant="secondary" className="ml-auto">
                        {templateEntries.length} task(s)
                      </Badge>
                    </div>
                    {templateEntries.length > 0 ? (
                      <ul className="space-y-2 text-sm text-[#4a5f83]">
                        {templateEntries.map((entry) => {
                          const task = taskById.get(entry.habit_id);
                          const startTime = getStartTime(task?.metadata);
                          const taskObjective = objectiveById.get(task?.objective_id ?? "")?.title ?? "Objective";
                          return (
                            <li key={entry.id} className="flex items-start justify-between gap-3 rounded-md border border-[#d7e0f1] bg-white px-2 py-1.5">
                              <div>
                                <p className="text-xs font-semibold text-[#0c1d3c]">
                                  {dayName[entry.day_of_week - 1]} · {task?.title ?? "Task"}
                                </p>
                                <p className="text-[11px] text-[#4a5f83]">
                                  {entry.planned_minutes} min planned · Minimum {entry.minimum_minutes} min
                                  {startTime ? ` · ${startTime}` : ""}
                                  {taskObjective ? ` · ${taskObjective}` : ""}
                                  {entry.is_required ? " · Required" : ""}
                                </p>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <p className="text-sm text-[#4a5f83]">No day tasks yet.</p>
                    )}
                    <a
                      href={buildPlanningHref("edit-template", { templateId: template.id })}
                      aria-label="Edit template"
                      className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#c7d3e8] bg-white text-[#0c1d3c] transition hover:bg-[#f1f5ff]"
                    >
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 20h9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <path
                          d="M16.5 3.5c.66-.66 1.74-.66 2.4 0l1.6 1.6c.66.66.66 1.74 0 2.4l-8.8 8.8L9 17l.7-2.7 6.8-6.8Z"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </a>
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
        </CardHeader>
        <CardContent>
          {weeks.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {weeks.map((week) => {
                const template = templates.find((item) => item.id === week.template_id);
                return (
                  <div key={week.id} className="rounded-lg border border-[#c7d3e8] p-3">
                    <p className="text-sm font-semibold text-[#0c1d3c]">{template?.name ?? "Template"}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <Badge variant="secondary">Week {week.week_start_date}</Badge>
                      <a href={`/habits?week=${encodeURIComponent(week.week_start_date)}`} className="text-xs font-semibold text-[#0b1f3b]">
                        Open in execution
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-[#4a5f83]">No weeks generated yet.</p>
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
