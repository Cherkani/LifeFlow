import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";

import {
  changeWeekTemplateFormAction,
  generateWeekFromTemplateFormAction,
  syncWeekWithTemplateFormAction
} from "@/app/(app)/habits/actions";
import { ExecutionBoard } from "@/app/(app)/habits/execution-board";
import { WeekResetModal } from "@/app/(app)/habits/week-reset-modal";
import { DailyObjectiveChart } from "@/app/(app)/habits/daily-objective-chart";
import { CategoryObjectiveChart } from "@/app/(app)/habits/category-objective-chart";
import { ActionForm } from "@/components/forms/action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import {
  getHabitsPageData,
  getMonthSessions,
  getTemplateEntriesOrder,
  getWeekSessions
} from "@/lib/queries";
import { requireAppContext } from "@/lib/server-context";
import { endOfIsoWeek, startOfIsoWeek } from "@/lib/utils";

type HabitsSearchParams = Promise<{
  week?: string;
  session?: string;
  logDate?: string;
  objectiveId?: string;
}>;

type Category = {
  id: string;
  title: string;
  objective_id: string | null;
};

type Objective = {
  id: string;
  title: string;
  image_url: string | null;
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
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function weekHref(
  weekStartDate: Date,
  options?: {
    sessionId?: string;
    logDate?: string;
    objectiveId?: string;
  }
) {
  const query = new URLSearchParams();
  query.set("week", formatWeekKey(weekStartDate));
  if (options?.sessionId) {
    query.set("session", options.sessionId);
  }
  if (options?.logDate) {
    query.set("logDate", options.logDate);
  }
  if (options?.objectiveId) {
    query.set("objectiveId", options.objectiveId);
  }
  return `/habits?${query.toString()}` as Route;
}

function weekdayName(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "short"
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
  const monthStart = new Date(selectedWeekStart.getFullYear(), selectedWeekStart.getMonth(), 1).toISOString().slice(0, 10);
  const monthEnd = new Date(selectedWeekStart.getFullYear(), selectedWeekStart.getMonth() + 1, 0).toISOString().slice(0, 10);
  const selectedObjectiveId = typeof params.objectiveId === "string" ? params.objectiveId : undefined;

  const previousWeek = new Date(selectedWeekStart);
  previousWeek.setDate(previousWeek.getDate() - 7);
  const nextWeek = new Date(selectedWeekStart);
  nextWeek.setDate(nextWeek.getDate() + 7);

  const { supabase, account } = await requireAppContext();
  const habitsData = await getHabitsPageData(supabase, account.accountId, weekStartIso);
  const categories = habitsData.categories as Category[];
  const objectives = habitsData.objectives as Objective[];
  const templates = habitsData.templates as Template[];
  const currentWeek = habitsData.currentWeek;
  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const objectiveById = new Map(objectives.map((objective) => [objective.id, objective]));
  const selectedTemplateId = currentWeek?.template_id ?? "";
  const selectedTemplate = templates.find((template) => template.id === selectedTemplateId);
  const categoryIds = categories.map((category) => category.id);

  const [templateEntriesOrderRes, weekSessionsRes, monthSessionsRes] = await Promise.all([
    selectedTemplateId ? getTemplateEntriesOrder(supabase, selectedTemplateId) : Promise.resolve({ data: [] as Array<{ habit_id: string; day_of_week: number }> }),
    getWeekSessions(supabase, categoryIds, weekStartIso, weekEndIso),
    getMonthSessions(supabase, categoryIds, monthStart, monthEnd)
  ]);

  const sessions = (weekSessionsRes.data ?? []) as Session[];
  const monthSessions = (monthSessionsRes.data ?? []) as Array<{ actual_minutes: number | null; planned_minutes: number; completed: boolean }>;

  const templateDayOrder = new Map<number, Map<string, number>>();
  for (const entry of templateEntriesOrderRes.data ?? []) {
    const dayMap = templateDayOrder.get(entry.day_of_week) ?? new Map<string, number>();
    if (!templateDayOrder.has(entry.day_of_week)) {
      templateDayOrder.set(entry.day_of_week, dayMap);
    }
    if (!dayMap.has(entry.habit_id)) {
      dayMap.set(entry.habit_id, dayMap.size);
    }
  }


  const filteredSessions =
    selectedObjectiveId && selectedObjectiveId !== ""
      ? sessions.filter((session) => {
          const category = categoryById.get(session.habit_id);
          return category?.objective_id === selectedObjectiveId;
        })
      : sessions;

  const weekPlannedMinutes = filteredSessions.reduce((sum, session) => sum + session.planned_minutes, 0);
  const weekDoneMinutes = filteredSessions.reduce((sum, session) => sum + (session.actual_minutes ?? 0), 0);
  const monthDoneMinutes = monthSessions.reduce((sum, session) => sum + (session.actual_minutes ?? 0), 0);
  const plannedSessions = filteredSessions.filter((session) => session.planned_minutes > 0);
  const weekCompletion =
    plannedSessions.length > 0 ? Math.round((plannedSessions.filter((session) => session.completed).length / plannedSessions.length) * 100) : 0;
  const compensationMinutes = filteredSessions
    .filter((session) => session.planned_minutes === 0)
    .reduce((sum, session) => sum + (session.actual_minutes ?? 0), 0);

  const sessionsByDate = new Map<string, Session[]>();
  for (const session of filteredSessions) {
    const list = sessionsByDate.get(session.session_date) ?? [];
    list.push(session);
    sessionsByDate.set(session.session_date, list);
  }

  const weekDates = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(selectedWeekStart);
    date.setDate(selectedWeekStart.getDate() + index);
    return formatWeekKey(date);
  });

  const todayKey = formatWeekKey(new Date());
  const dayObjectiveTotals = new Map<
    string,
    Map<
      string,
      {
        objectiveId: string;
        label: string;
        plannedMinutes: number;
        doneMinutes: number;
      }
    >
  >();
  for (const session of filteredSessions) {
    const dateKey = session.session_date;
    const category = categoryById.get(session.habit_id);
    if (!category) continue;
    const objective = category.objective_id ? objectiveById.get(category.objective_id) : undefined;
    const objectiveId = objective?.id ?? `unassigned-${category.id}`;
    const label = objective?.title ?? `${category.title} (No objective)`;
    const dayMap = dayObjectiveTotals.get(dateKey) ?? new Map<string, { objectiveId: string; label: string; plannedMinutes: number; doneMinutes: number }>();
    if (!dayObjectiveTotals.has(dateKey)) {
      dayObjectiveTotals.set(dateKey, dayMap);
    }
    const existing =
      dayMap.get(objectiveId) ?? {
        objectiveId,
        label,
        plannedMinutes: 0,
        doneMinutes: 0
      };
    const plannedContribution = session.planned_minutes > 0 ? session.planned_minutes : 0;
    const doneContribution = session.actual_minutes ?? 0;
    existing.plannedMinutes += plannedContribution;
    existing.doneMinutes += doneContribution;
    dayMap.set(objectiveId, existing);
  }
  const dailyChartData = weekDates.map((dateKey) => {
    const label = weekdayName(dateKey);
    const dayMap = dayObjectiveTotals.get(dateKey) ?? new Map();
    const objectives = Array.from(dayMap.values()).map((entry) => {
      const doneWithinPlan = Math.min(entry.doneMinutes, entry.plannedMinutes);
      const remainingMinutes = Math.max(entry.plannedMinutes - doneWithinPlan, 0);
      const overrunMinutes = Math.max(entry.doneMinutes - entry.plannedMinutes, 0);
      return {
        objectiveId: entry.objectiveId,
        label: entry.label,
        plannedMinutes: entry.plannedMinutes,
        doneMinutes: entry.doneMinutes,
        doneWithinPlan,
        remainingMinutes,
        overrunMinutes
      };
    });
    const plannedMinutes = objectives.reduce((sum, entry) => sum + entry.plannedMinutes, 0);
    const doneMinutes = objectives.reduce((sum, entry) => sum + entry.doneMinutes, 0);
    const doneWithinPlan = objectives.reduce((sum, entry) => sum + entry.doneWithinPlan, 0);
    const remainingMinutes = objectives.reduce((sum, entry) => sum + entry.remainingMinutes, 0);
    const overrunMinutes = objectives.reduce((sum, entry) => sum + entry.overrunMinutes, 0);
    return {
      dateKey,
      day: label,
      plannedMinutes,
      doneMinutes,
      doneWithinPlan,
      remainingMinutes,
      overrunMinutes,
      objectives
    };
  });
  const hasDailyChartData = dailyChartData.some((day) => day.plannedMinutes > 0 || day.doneMinutes > 0);

  const objectiveChartMap = new Map<
    string,
    {
      objectiveId: string;
      label: string;
      plannedMinutes: number;
      doneMinutes: number;
      doneWithinPlan: number;
      remainingMinutes: number;
      overrunMinutes: number;
    }
  >();
  for (const session of filteredSessions) {
    const category = categoryById.get(session.habit_id);
    if (!category) continue;
    const objective = category.objective_id ? objectiveById.get(category.objective_id) : undefined;
    const objectiveId = objective?.id ?? `unassigned-${category.id}`;
    const label = objective?.title ?? `${category.title} (No objective)`;
    const existing = objectiveChartMap.get(objectiveId) ?? {
      objectiveId,
      label,
      plannedMinutes: 0,
      doneMinutes: 0,
      doneWithinPlan: 0,
      remainingMinutes: 0,
      overrunMinutes: 0
    };
    const planned = session.planned_minutes;
    const done = session.actual_minutes ?? 0;
    const doneWithinPlan = Math.min(done, planned);
    const remaining = Math.max(planned - doneWithinPlan, 0);
    const overrun = Math.max(done - planned, 0);
    existing.plannedMinutes += planned;
    existing.doneMinutes += done;
    existing.doneWithinPlan += doneWithinPlan;
    existing.remainingMinutes += remaining;
    existing.overrunMinutes += overrun;
    objectiveChartMap.set(objectiveId, existing);
  }
  const objectiveChartData = Array.from(objectiveChartMap.values())
    .map((entry) => ({
      objectiveId: entry.objectiveId,
      label: entry.label,
      plannedMinutes: entry.plannedMinutes,
      doneWithinPlan: entry.doneWithinPlan,
      remainingMinutes: entry.remainingMinutes,
      overrunMinutes: entry.overrunMinutes,
      doneMinutes: entry.doneMinutes
    }))
    .sort((a, b) => b.plannedMinutes - a.plannedMinutes);


  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--app-text-strong)]">Execution Weekly Tracker</h1>
        <p className="text-sm text-[var(--app-text-muted)]">Assign a template for the week once, then track tasks by day in minutes.</p>
      </header>

      <Card className="border-[var(--app-panel-border)] bg-[var(--app-panel-bg)]">
        <CardHeader>
          <CardTitle className="text-[var(--app-text-strong)]">Week Selector & Template</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={weekHref(previousWeek)}
              className="inline-flex size-9 items-center justify-center rounded-lg border border-[var(--app-panel-border-strong)] bg-[var(--app-btn-secondary-bg)] text-[var(--app-btn-secondary-fg)]"
            >
              <ChevronLeft size={16} />
            </Link>
            <span className="text-sm font-semibold text-[var(--app-text-strong)]">
              {selectedWeekStart.toLocaleDateString("en-US")} - {selectedWeekEnd.toLocaleDateString("en-US")}
            </span>
            <Link
              href={weekHref(nextWeek)}
              className="inline-flex size-9 items-center justify-center rounded-lg border border-[var(--app-panel-border-strong)] bg-[var(--app-btn-secondary-bg)] text-[var(--app-btn-secondary-fg)]"
            >
              <ChevronRight size={16} />
            </Link>
            <form action="/habits" method="get" className="ml-auto flex items-center gap-2 text-xs text-[var(--app-text-muted)]">
              <label htmlFor="jumpToWeek" className="font-medium">
                Jump to week
              </label>
              <input
                id="jumpToWeek"
                name="week"
                type="date"
                defaultValue={weekStartIso}
                className="h-8 rounded-md border border-[var(--ui-input-border)] bg-[var(--ui-input-bg)] px-2 text-sm text-[var(--ui-input-text)] focus:border-[var(--ui-input-focus-border)] focus:ring-2 focus:ring-[var(--ui-input-focus-ring)]"
              />
              {selectedObjectiveId ? <input type="hidden" name="objectiveId" value={selectedObjectiveId} /> : null}
              <button
                type="submit"
                className="inline-flex h-8 items-center justify-center rounded-md border border-[var(--app-panel-border-strong)] bg-[var(--app-btn-secondary-bg)] px-3 font-semibold text-[var(--app-btn-secondary-fg)] transition hover:bg-[var(--app-btn-secondary-hover)]"
              >
                Go
              </button>
            </form>
          </div>

          {templates.length === 0 ? (
            <p className="text-sm text-[var(--app-text-muted)]">No templates yet. Create one from Planner first.</p>
          ) : currentWeek?.template_id ? (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--app-panel-border-strong)] bg-[var(--app-btn-secondary-bg)] p-3">
              <div>
                <p className="text-xs font-medium text-[var(--app-text-muted)]">Template for this week</p>
                <p className="text-sm font-semibold text-[var(--app-text-strong)]">{selectedTemplate?.name ?? "Selected template"}</p>
              </div>
              <WeekResetModal
                templates={templates}
                currentTemplateId={selectedTemplateId}
                currentTemplateName={selectedTemplate?.name ?? "current template"}
                weekStartDate={weekStartIso}
                returnPath={weekHref(selectedWeekStart)}
                changeTemplateAction={changeWeekTemplateFormAction}
                resetSameTemplateAction={syncWeekWithTemplateFormAction}
              />
            </div>
          ) : (
            <ActionForm action={generateWeekFromTemplateFormAction} className="grid gap-2 md:grid-cols-[1fr_auto] md:items-end">
              <input type="hidden" name="returnPath" value={weekHref(selectedWeekStart)} />
              <input type="hidden" name="weekStartDate" value={weekStartIso} />
              <div className="space-y-1">
                <p className="text-xs font-medium text-[var(--app-text-muted)]">Template for this week</p>
                <Select name="templateId" required>
                  <option value="">Choose template</option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </Select>
              </div>
              <SubmitButton
                label="Assign Template to Week"
                pendingLabel="Assigning..."
                className="bg-[var(--app-btn-primary-bg)] text-[var(--app-btn-primary-fg)] hover:bg-[var(--app-btn-primary-hover)] md:w-auto"
              />
            </ActionForm>
          )}

          <div className="flex flex-wrap items-center gap-2">
            {currentWeek?.template_id ? (
              <Badge variant="secondary" className="bg-[var(--app-chip-bg)] text-[var(--app-chip-fg)]">Template: {selectedTemplate?.name ?? "Assigned"}</Badge>
            ) : (
              <Badge variant="warning">No template selected</Badge>
            )}
            <Badge variant="secondary" className="bg-[var(--app-chip-bg)] text-[var(--app-chip-fg)]">Week planned: {weekPlannedMinutes} min</Badge>
            <Badge className="bg-[var(--app-btn-primary-bg)] text-[var(--app-btn-primary-fg)]">Week done: {weekDoneMinutes} min</Badge>
            <Badge variant="secondary" className="bg-[var(--app-chip-bg)] text-[var(--app-chip-fg)]">Month done: {monthDoneMinutes} min</Badge>
            <Badge variant="secondary" className="bg-[var(--app-chip-bg)] text-[var(--app-chip-fg)]">Completion: {weekCompletion}%</Badge>
            {compensationMinutes > 0 ? <Badge variant="warning">Compensation: +{compensationMinutes} min</Badge> : null}
          </div>

        </CardContent>
      </Card>

      <ExecutionBoard
        weekDates={weekDates}
        sessionsByDate={Object.fromEntries(sessionsByDate)}
        templateDayOrder={Object.fromEntries(
          Array.from(templateDayOrder.entries()).map(([k, v]) => [k, Object.fromEntries(v)] as const)
        )}
        categoryById={Object.fromEntries(categoryById)}
        objectiveById={Object.fromEntries(objectiveById)}
        categories={categories}
        objectives={objectives}
        todayKey={todayKey}
        weekHref={weekHref(selectedWeekStart, selectedObjectiveId ? { objectiveId: selectedObjectiveId } : undefined)}
      />

      <Card className="border-[var(--app-panel-border)] bg-[var(--app-panel-bg)]">
        <CardHeader>
          <CardTitle className="text-[var(--app-text-strong)]">Daily Objective Bars</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!hasDailyChartData ? (
            <p className="text-sm text-[var(--app-text-muted)]">No planned tasks this week yet.</p>
          ) : (
            <DailyObjectiveChart data={dailyChartData} />
          )}
        </CardContent>
      </Card>

      <Card className="border-[var(--app-panel-border)] bg-[var(--app-panel-bg)]">
        <CardHeader>
          <CardTitle className="text-[var(--app-text-strong)]">Category Objective Bars</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <CategoryObjectiveChart data={objectiveChartData} />
        </CardContent>
      </Card>

    </div>
  );
}
