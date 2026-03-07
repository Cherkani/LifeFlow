import { CheckSquare, ChevronLeft, ChevronRight, Square } from "lucide-react";

import { completeSessionWithHoursAction, generateWeekFromTemplateAction } from "@/app/(app)/habits/actions";
import { SubmitButton } from "@/components/forms/submit-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ModalShell } from "@/components/ui/modal-shell";
import { Select } from "@/components/ui/select";
import { SectionHeader } from "@/components/ui/section-header";
import { requireAppContext } from "@/lib/server-context";
import { endOfIsoWeek, startOfIsoWeek } from "@/lib/utils";

type HabitsSearchParams = Promise<{
  week?: string;
  session?: string;
}>;

type Category = {
  id: string;
  title: string;
  objective_id: string | null;
};

type Objective = {
  id: string;
  title: string;
};

type Template = {
  id: string;
  name: string;
};

type Session = {
  id: string;
  habit_id: string;
  session_date: string;
  planned_minutes: number;
  minimum_minutes: number;
  actual_minutes: number | null;
  completed: boolean;
};

function parseWeekStart(raw: string | undefined) {
  if (typeof raw === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return new Date(`${raw}T00:00:00`);
  }
  return startOfIsoWeek(new Date());
}

function formatWeekKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function weekHref(weekStartDate: Date, sessionId?: string) {
  const query = new URLSearchParams();
  query.set("week", formatWeekKey(weekStartDate));
  if (sessionId) {
    query.set("session", sessionId);
  }
  return `/habits?${query.toString()}`;
}

function dayHeaderLabel(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric"
  });
}

export default async function HabitsPage({
  searchParams
}: {
  searchParams: HabitsSearchParams;
}) {
  const params = await searchParams;
  const selectedWeekStart = startOfIsoWeek(parseWeekStart(params.week));
  const selectedWeekEnd = endOfIsoWeek(selectedWeekStart);
  const weekStartIso = formatWeekKey(selectedWeekStart);
  const weekEndIso = formatWeekKey(selectedWeekEnd);
  const selectedSessionId = params.session?.trim();

  const monthStart = new Date(selectedWeekStart.getFullYear(), selectedWeekStart.getMonth(), 1).toISOString().slice(0, 10);
  const monthEnd = new Date(selectedWeekStart.getFullYear(), selectedWeekStart.getMonth() + 1, 0).toISOString().slice(0, 10);

  const previousWeek = new Date(selectedWeekStart);
  previousWeek.setDate(previousWeek.getDate() - 7);
  const nextWeek = new Date(selectedWeekStart);
  nextWeek.setDate(nextWeek.getDate() + 7);

  const { supabase, account } = await requireAppContext();
  const [objectivesRes, categoriesRes, templatesRes, currentWeekRes] = await Promise.all([
    supabase.from("habit_objectives").select("id, title").eq("account_id", account.accountId),
    supabase.from("habits").select("id, title, objective_id").eq("account_id", account.accountId).eq("is_active", true),
    supabase.from("templates").select("id, name").eq("account_id", account.accountId).order("created_at", { ascending: false }),
    supabase
      .from("weeks")
      .select("id, template_id")
      .eq("account_id", account.accountId)
      .eq("week_start_date", weekStartIso)
      .maybeSingle()
  ]);

  const categories = (categoriesRes.data ?? []) as Category[];
  const objectives = (objectivesRes.data ?? []) as Objective[];
  const templates = (templatesRes.data ?? []) as Template[];
  const currentWeek = currentWeekRes.data;
  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const objectiveById = new Map(objectives.map((objective) => [objective.id, objective.title]));
  const selectedTemplateId = currentWeek?.template_id ?? "";
  const selectedTemplate = templates.find((template) => template.id === selectedTemplateId);

  const [weekSessionsRes, monthSessionsRes] =
    categories.length > 0
      ? await Promise.all([
          supabase
            .from("habit_sessions")
            .select("id, habit_id, session_date, planned_minutes, minimum_minutes, actual_minutes, completed")
            .in("habit_id", categories.map((category) => category.id))
            .gte("session_date", weekStartIso)
            .lte("session_date", weekEndIso)
            .order("session_date", { ascending: true }),
          supabase
            .from("habit_sessions")
            .select("id, actual_minutes, planned_minutes, completed")
            .in("habit_id", categories.map((category) => category.id))
            .gte("session_date", monthStart)
            .lte("session_date", monthEnd)
        ])
      : [{ data: [] as Session[] }, { data: [] as Array<{ actual_minutes: number | null; planned_minutes: number; completed: boolean }> }];

  const sessions = (weekSessionsRes.data ?? []) as Session[];
  const monthSessions = monthSessionsRes.data ?? [];

  const weekPlannedMinutes = sessions.reduce((sum, session) => sum + session.planned_minutes, 0);
  const weekDoneMinutes = sessions.reduce((sum, session) => sum + (session.actual_minutes ?? 0), 0);
  const monthDoneMinutes = monthSessions.reduce((sum, session) => sum + (session.actual_minutes ?? 0), 0);
  const weekCompletion = sessions.length > 0 ? Math.round((sessions.filter((session) => session.completed).length / sessions.length) * 100) : 0;

  const sessionsByDate = new Map<string, Session[]>();
  for (const session of sessions) {
    const list = sessionsByDate.get(session.session_date) ?? [];
    list.push(session);
    sessionsByDate.set(session.session_date, list);
  }

  const weekDates = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(selectedWeekStart);
    date.setDate(selectedWeekStart.getDate() + index);
    return formatWeekKey(date);
  });

  const selectedSession = selectedSessionId ? sessions.find((session) => session.id === selectedSessionId) ?? null : null;

  return (
    <div className="space-y-6">
      <SectionHeader title="Habits Weekly Tracker" description="Assign a template for the week once, then track tasks by day in minutes." />

      <Card>
        <CardHeader>
          <CardTitle>Week Selector & Template</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <a href={weekHref(previousWeek)} className="inline-flex size-9 items-center justify-center rounded-lg border border-[#c7d3e8] bg-[#edf3ff] text-[#23406d]">
              <ChevronLeft size={16} />
            </a>
            <span className="text-sm font-semibold text-[#0c1d3c]">
              {selectedWeekStart.toLocaleDateString("en-US")} - {selectedWeekEnd.toLocaleDateString("en-US")}
            </span>
            <a href={weekHref(nextWeek)} className="inline-flex size-9 items-center justify-center rounded-lg border border-[#c7d3e8] bg-[#edf3ff] text-[#23406d]">
              <ChevronRight size={16} />
            </a>
          </div>

          {templates.length === 0 ? (
            <p className="text-sm text-[#4a5f83]">No templates yet. Create one from Planner first.</p>
          ) : currentWeek?.template_id ? (
            <div className="space-y-1 rounded-lg border border-[#c7d3e8] bg-[#edf3ff] p-3">
              <p className="text-xs font-medium text-[#4a5f83]">Template for this week</p>
              <p className="text-sm font-semibold text-[#0c1d3c]">{selectedTemplate?.name ?? "Selected template"}</p>
              <p className="text-xs text-[#4a5f83]">Template assignment is locked for this week.</p>
            </div>
          ) : (
            <form action={generateWeekFromTemplateAction} className="grid gap-2 md:grid-cols-[1fr_auto] md:items-end">
              <input type="hidden" name="returnPath" value={weekHref(selectedWeekStart)} />
              <input type="hidden" name="weekStartDate" value={weekStartIso} />
              <div className="space-y-1">
                <p className="text-xs font-medium text-[#4a5f83]">Template for this week</p>
                <Select name="templateId" required>
                  <option value="">Choose template</option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </Select>
              </div>
              <SubmitButton label="Assign Template to Week" pendingLabel="Assigning..." className="md:w-auto" />
            </form>
          )}

          <div className="flex flex-wrap items-center gap-2">
            {currentWeek?.template_id ? <Badge variant="secondary">Template locked</Badge> : <Badge variant="warning">No template selected</Badge>}
            <Badge variant="secondary">Week planned: {weekPlannedMinutes} min</Badge>
            <Badge>Week done: {weekDoneMinutes} min</Badge>
            <Badge variant="secondary">Month done: {monthDoneMinutes} min</Badge>
            <Badge variant="secondary">Completion: {weekCompletion}%</Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Weekly Tracker (7 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-7">
            {weekDates.map((dateKey) => {
              const daySessions = sessionsByDate.get(dateKey) ?? [];
              return (
                <div key={dateKey} className="rounded-lg border border-[#c7d3e8] bg-[#f8fbff] p-3">
                  <p className="mb-2 text-xs font-semibold text-[#0c1d3c]">{dayHeaderLabel(dateKey)}</p>
                  {daySessions.length > 0 ? (
                    <div className="space-y-2">
                      {daySessions.map((session) => {
                        const category = categoryById.get(session.habit_id);
                        const objectiveTitle = objectiveById.get(category?.objective_id ?? "") ?? "Objective";
                        return (
                          <a
                            key={session.id}
                            href={weekHref(selectedWeekStart, session.id)}
                            className="flex items-center justify-between gap-2 rounded-md border border-[#d7e0f1] bg-white px-2 py-2 text-left"
                          >
                            <div>
                              <p className="text-xs font-semibold text-[#0c1d3c]">{category?.title ?? "Task"}</p>
                              <p className="text-[11px] text-[#4a5f83]">{objectiveTitle}</p>
                            </div>
                            {session.completed ? <CheckSquare size={16} className="text-emerald-600" /> : <Square size={16} className="text-[#4a5f83]" />}
                          </a>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-[#4a5f83]">No tasks</p>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {selectedSession ? (
        <ModalShell
          title="Update Task"
          description="Check/uncheck and set minutes done for this day."
          closeHref={weekHref(selectedWeekStart)}
        >
          <form action={completeSessionWithHoursAction} className="space-y-4">
            <input type="hidden" name="sessionId" value={selectedSession.id} />
            <input type="hidden" name="returnPath" value={weekHref(selectedWeekStart)} />
            <div className="rounded-lg border border-[#d7e0f1] bg-[#f8fbff] p-3">
              <p className="text-sm font-semibold text-[#0c1d3c]">{categoryById.get(selectedSession.habit_id)?.title ?? "Task"}</p>
              <p className="text-xs text-[#4a5f83]">
                Planned {selectedSession.planned_minutes} min · Minimum {selectedSession.minimum_minutes} min
              </p>
            </div>
            <label className="inline-flex items-center gap-2 text-sm text-[#23406d]">
              <Checkbox name="completed" defaultChecked={selectedSession.completed} />
              Mark completed
            </label>
            <div className="space-y-2">
              <p className="text-xs font-medium text-[#4a5f83]">Minutes done</p>
              <Input
                name="actualMinutes"
                type="number"
                min={0}
                step={10}
                defaultValue={selectedSession.actual_minutes ?? undefined}
                placeholder="0"
              />
            </div>
            <div className="flex items-center gap-2">
              <SubmitButton label="Save" pendingLabel="Saving..." className="sm:w-auto" />
              <a
                href={weekHref(selectedWeekStart)}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-[#c7d3e8] bg-[#edf3ff] px-4 py-2 text-sm font-medium text-[#23406d]"
              >
                Back
              </a>
            </div>
          </form>
        </ModalShell>
      ) : null}
    </div>
  );
}
