import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";

import { generateWeekFromTemplateFormAction, syncWeekWithTemplateFormAction } from "@/app/(app)/habits/actions";
import { ExecutionBoard } from "@/app/(app)/habits/execution-board";
import { SyncWeekConfirmForm } from "@/app/(app)/habits/sync-week-confirm-form";
import { DailyObjectiveChart } from "@/app/(app)/habits/daily-objective-chart";
import { ActionForm } from "@/components/forms/action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { SectionHeader } from "@/components/ui/section-header";
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
  return date.toISOString().slice(0, 10);
}

function weekHref(
  weekStartDate: Date,
  options?: {
    sessionId?: string;
    logDate?: string;
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


  const weekPlannedMinutes = sessions.reduce((sum, session) => sum + session.planned_minutes, 0);
  const weekDoneMinutes = sessions.reduce((sum, session) => sum + (session.actual_minutes ?? 0), 0);
  const monthDoneMinutes = monthSessions.reduce((sum, session) => sum + (session.actual_minutes ?? 0), 0);
  const plannedSessions = sessions.filter((session) => session.planned_minutes > 0);
  const weekCompletion =
    plannedSessions.length > 0 ? Math.round((plannedSessions.filter((session) => session.completed).length / plannedSessions.length) * 100) : 0;
  const compensationMinutes = sessions
    .filter((session) => session.planned_minutes === 0)
    .reduce((sum, session) => sum + (session.actual_minutes ?? 0), 0);

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

  const todayKey = formatWeekKey(new Date());
  const dailyChart = weekDates.map((dateKey) => {
    const daySessions = sessionsByDate.get(dateKey) ?? [];
    const dayPlannedSessions = daySessions.filter((session) => session.planned_minutes > 0);
    const plannedMinutes = dayPlannedSessions.reduce((sum, session) => sum + session.planned_minutes, 0);
    const doneMinutes = daySessions.reduce((sum, session) => sum + (session.actual_minutes ?? 0), 0);
    const doneWithinPlan = Math.min(doneMinutes, plannedMinutes);
    const remainingMinutes = Math.max(plannedMinutes - doneWithinPlan, 0);
    const overrunMinutes = Math.max(doneMinutes - plannedMinutes, 0);
    return {
      dateKey,
      label: weekdayName(dateKey),
      plannedMinutes,
      doneMinutes,
      doneWithinPlan,
      remainingMinutes,
      overrunMinutes
    };
  });
  const dailyChartData = dailyChart.map((day) => ({
    day: day.label,
    plannedMinutes: day.plannedMinutes,
    doneWithinPlan: day.doneWithinPlan,
    remainingMinutes: day.remainingMinutes,
    overrunMinutes: day.overrunMinutes,
    doneMinutes: day.doneMinutes
  }));

  return (
    <div className="space-y-6">
      <SectionHeader title="Execution Weekly Tracker" description="Assign a template for the week once, then track tasks by day in minutes." />

      <Card>
        <CardHeader>
          <CardTitle>Week Selector & Template</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Link href={weekHref(previousWeek)} className="inline-flex size-9 items-center justify-center rounded-lg border border-[#c7d3e8] bg-[#edf3ff] text-[#23406d]">
              <ChevronLeft size={16} />
            </Link>
            <span className="text-sm font-semibold text-[#0c1d3c]">
              {selectedWeekStart.toLocaleDateString("en-US")} - {selectedWeekEnd.toLocaleDateString("en-US")}
            </span>
            <Link href={weekHref(nextWeek)} className="inline-flex size-9 items-center justify-center rounded-lg border border-[#c7d3e8] bg-[#edf3ff] text-[#23406d]">
              <ChevronRight size={16} />
            </Link>
            <form action="/habits" method="get" className="ml-auto flex items-center gap-2 text-xs text-[#4a5f83]">
              <label htmlFor="jumpToWeek" className="font-medium">
                Jump to week
              </label>
              <input
                id="jumpToWeek"
                name="week"
                type="date"
                defaultValue={weekStartIso}
                className="h-8 rounded-md border border-[#c7d3e8] bg-white px-2 text-sm text-[#0c1d3c] focus:border-[#1e3a6d] focus:ring-2 focus:ring-[#d6e0f2]"
              />
              <button type="submit" className="inline-flex h-8 items-center justify-center rounded-md border border-[#c7d3e8] bg-[#f8fbff] px-3 font-semibold text-[#23406d] transition hover:bg-[#edf3ff]">
                Go
              </button>
            </form>
          </div>

          {templates.length === 0 ? (
            <p className="text-sm text-[#4a5f83]">No templates yet. Create one from Planner first.</p>
          ) : currentWeek?.template_id ? (
            <div className="space-y-1 rounded-lg border border-[#c7d3e8] bg-[#edf3ff] p-3">
              <p className="text-xs font-medium text-[#4a5f83]">Template for this week</p>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-[#0c1d3c]">{selectedTemplate?.name ?? "Selected template"}</p>
                <SyncWeekConfirmForm
                  action={syncWeekWithTemplateFormAction}
                  returnPath={weekHref(selectedWeekStart)}
                  weekStartDate={weekStartIso}
                />
              </div>
              <p className="text-xs text-[#4a5f83]">Template assignment is locked for this week.</p>
            </div>
          ) : (
            <ActionForm action={generateWeekFromTemplateFormAction} className="grid gap-2 md:grid-cols-[1fr_auto] md:items-end">
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
            </ActionForm>
          )}

          <div className="flex flex-wrap items-center gap-2">
            {currentWeek?.template_id ? <Badge variant="secondary">Template locked</Badge> : <Badge variant="warning">No template selected</Badge>}
            <Badge variant="secondary">Week planned: {weekPlannedMinutes} min</Badge>
            <Badge>Week done: {weekDoneMinutes} min</Badge>
            <Badge variant="secondary">Month done: {monthDoneMinutes} min</Badge>
            <Badge variant="secondary">Completion: {weekCompletion}%</Badge>
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
        weekHref={weekHref(selectedWeekStart)}
      />

      <Card>
        <CardHeader>
          <CardTitle>Daily Objective Bars</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {dailyChart.every((day) => day.plannedMinutes === 0 && day.doneMinutes === 0) ? (
            <p className="text-sm text-[#4a5f83]">No planned tasks this week yet.</p>
          ) : (
            <DailyObjectiveChart data={dailyChartData} />
          )}
        </CardContent>
      </Card>

    </div>
  );
}
