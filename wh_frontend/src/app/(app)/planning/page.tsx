import { Plus } from "lucide-react";

import { createObjectiveAction } from "@/app/(app)/habits/actions";
import { SubmitButton } from "@/components/forms/submit-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ModalShell } from "@/components/ui/modal-shell";
import { SectionHeader } from "@/components/ui/section-header";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { requireAppContext } from "@/lib/server-context";
import { startOfIsoWeek, toDateInputValue } from "@/lib/utils";

import { createTemplateWithDailyTasksAction, generateWeekAction } from "./actions";
import { TemplateTaskBuilder } from "./template-task-builder";

type PlanningSearchParams = Promise<{
  modal?: string;
}>;

type Objective = {
  id: string;
  title: string;
  description: string | null;
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
};

const dayName = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function buildPlanningHref(modal?: string) {
  return modal ? `/planning?modal=${encodeURIComponent(modal)}` : "/planning";
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
      .select("id, title, description")
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
          .select("id, template_id, habit_id, day_of_week, planned_minutes")
          .in("template_id", templates.map((template) => template.id))
          .order("day_of_week", { ascending: true })
      : { data: [] as TemplateEntry[] };
  const entries = (entriesRes.data ?? []) as TemplateEntry[];

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Planner"
        description="Simple setup: objective, one template with daily tasks, then generate a week."
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
            <a
              href={buildPlanningHref("week")}
              className="inline-flex items-center gap-2 rounded-lg border border-[#c7d3e8] bg-[#edf3ff] px-3 py-2 text-sm font-semibold text-[#23406d] transition hover:bg-[#e3ebf9]"
            >
              <Plus size={16} />
              Generate Week
            </a>
          </div>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Workflow</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-[#4a5f83]">
          <p>1. Create objective.</p>
          <p>2. Create one template with day tasks, purpose/objective, average minutes, and optional start times.</p>
          <p>3. Generate a week. Execution appears in Habits as checkboxes + hours.</p>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Objectives</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {objectives.length > 0 ? (
              objectives.map((objective) => {
                const templateCount = templates.filter((template) => template.objective_id === objective.id).length;
                return (
                  <div key={objective.id} className="rounded-lg border border-[#c7d3e8] p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-[#0c1d3c]">{objective.title}</p>
                      <Badge variant="secondary">{templateCount} template(s)</Badge>
                    </div>
                    {objective.description ? <p className="mt-1 text-xs text-[#4a5f83]">{objective.description}</p> : null}
                  </div>
                );
              })
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
                  <div key={template.id} className="rounded-lg border border-[#c7d3e8] p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-[#0c1d3c]">{template.name}</p>
                      <Badge variant="secondary">Template</Badge>
                    </div>
                    {templateEntries.length > 0 ? (
                      <ul className="space-y-1 text-sm text-[#4a5f83]">
                        {templateEntries.map((entry) => {
                          const task = taskById.get(entry.habit_id);
                          const startTime = getStartTime(task?.metadata);
                          const taskObjective = objectiveById.get(task?.objective_id ?? "")?.title ?? "Objective";
                          return (
                            <li key={entry.id}>
                              {dayName[entry.day_of_week - 1]} · {task?.title ?? "Task"} ({entry.planned_minutes} min
                              {startTime ? ` · ${startTime}` : ""}
                              {taskObjective ? ` · ${taskObjective}` : ""})
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <p className="text-sm text-[#4a5f83]">No day tasks yet.</p>
                    )}
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
                        Open in habits
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

      {modal === "week" ? (
        <ModalShell title="Generate week" description="Pick template and week start date." closeHref={buildPlanningHref()}>
          {templates.length === 0 ? (
            <p className="text-sm text-[#4a5f83]">Create template first.</p>
          ) : (
            <form action={generateWeekAction} className="space-y-4">
              <input type="hidden" name="returnPath" value="/planning" />
              <Select name="templateId" required>
                <option value="">Template</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>{template.name}</option>
                ))}
              </Select>
              <Input name="weekStartDate" type="date" defaultValue={toDateInputValue(startOfIsoWeek(new Date()))} />
              <SubmitButton label="Generate week" pendingLabel="Generating..." className="w-full sm:w-auto" />
            </form>
          )}
        </ModalShell>
      ) : null}
    </div>
  );
}
