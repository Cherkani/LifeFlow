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

import { createTemplateWithDailyTasksAction } from "./actions";
import { TemplateTaskBuilder } from "./template-task-builder";

type PlanningSearchParams = Promise<{
  modal?: string;
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
          .select("id, template_id, habit_id, day_of_week, planned_minutes")
          .in("template_id", templates.map((template) => template.id))
          .order("day_of_week", { ascending: true })
      : { data: [] as TemplateEntry[] };
  const entries = (entriesRes.data ?? []) as TemplateEntry[];
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
                      <div className="flex items-start justify-between gap-2">
                        <p className="truncate text-base font-semibold text-[#0c1d3c]">{objective.title}</p>
                        <Badge variant="secondary" className="shrink-0">{templateCount} template(s)</Badge>
                      </div>
                      {objective.description ? <p className="mt-1 text-xs leading-5 text-[#4a5f83]">{objective.description}</p> : null}
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
                  <div key={template.id} className="rounded-lg border border-[#c7d3e8] bg-[#f8fbff] p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-[#0c1d3c]">{template.name}</p>
                      <Badge variant="secondary">{templateEntries.length} task(s)</Badge>
                    </div>
                    {templateEntries.length > 0 ? (
                      <ul className="space-y-2 text-sm text-[#4a5f83]">
                        {templateEntries.map((entry) => {
                          const task = taskById.get(entry.habit_id);
                          const startTime = getStartTime(task?.metadata);
                          const taskObjective = objectiveById.get(task?.objective_id ?? "")?.title ?? "Objective";
                          return (
                            <li key={entry.id} className="rounded-md border border-[#d7e0f1] bg-white px-2 py-1.5">
                              <span className="font-semibold text-[#0c1d3c]">{dayName[entry.day_of_week - 1]}</span> · {task?.title ?? "Task"} (
                              {entry.planned_minutes} min
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

    </div>
  );
}
