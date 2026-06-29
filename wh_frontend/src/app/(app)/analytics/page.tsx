import { ChevronLeft, ChevronRight } from "lucide-react";

import { AnalyticsCharts } from "@/app/(app)/analytics/analytics-charts";
import { LifeSummaryBand } from "@/components/life/life-context";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import {
  getAnalyticsInitialData,
  getAnalyticsSessions
} from "@/lib/queries";
import { requireAppContext } from "@/lib/server-context";
import { endOfIsoWeek, formatMoneyDhs, startOfIsoWeek } from "@/lib/utils";

type AnalyticsSearchParams = Promise<{
  week?: string;
  month?: string;
  objective?: string;
  mode?: string;
  project?: string;
}>;

type HabitSession = {
  id: string;
  habit_id: string;
  session_date: string;
  planned_minutes: number;
  actual_minutes: number | null;
  completed: boolean;
};

type AnalyticsMode = "all" | "quantitative" | "qualitative";

function percent(value: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((value / total) * 100);
}

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function toMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function parseWeekStart(raw: string | undefined) {
  if (typeof raw === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return startOfIsoWeek(new Date(`${raw}T00:00:00`));
  }
  return startOfIsoWeek(new Date());
}

function parseMonthStart(raw: string | undefined) {
  if (typeof raw === "string" && /^\d{4}-\d{2}$/.test(raw)) {
    const [yearRaw, monthRaw] = raw.split("-");
    const year = Number(yearRaw);
    const month = Number(monthRaw);
    if (Number.isFinite(year) && Number.isFinite(month) && month >= 1 && month <= 12) {
      return new Date(year, month - 1, 1);
    }
  }
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function formatWeekRange(start: Date, end: Date) {
  return `${start.toLocaleDateString("en-US")} - ${end.toLocaleDateString("en-US")}`;
}

function analyticsHref(
  weekStart: Date,
  monthStart: Date,
  filters?: { objectiveId?: string; mode?: AnalyticsMode; projectId?: string }
) {
  const query = new URLSearchParams();
  query.set("week", toIsoDate(startOfIsoWeek(weekStart)));
  query.set("month", toMonthKey(monthStart));
  if (filters?.objectiveId) query.set("objective", filters.objectiveId);
  if (filters?.mode && filters.mode !== "all") query.set("mode", filters.mode);
  if (filters?.projectId) query.set("project", filters.projectId);
  return `/analytics?${query.toString()}`;
}

function parseAnalyticsMode(raw: string | undefined): AnalyticsMode {
  return raw === "quantitative" || raw === "qualitative" ? raw : "all";
}

export default async function AnalyticsPage({
  searchParams
}: {
  searchParams: AnalyticsSearchParams;
}) {
  const params = await searchParams;
  const weekStart = parseWeekStart(params.week);
  const weekEnd = endOfIsoWeek(weekStart);
  const monthStart = parseMonthStart(params.month);
  const selectedMode = parseAnalyticsMode(params.mode);
  const selectedObjectiveId = typeof params.objective === "string" ? params.objective : "";
  const selectedProjectId = typeof params.project === "string" ? params.project : "";
  const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);

  const previousWeekStart = new Date(weekStart);
  previousWeekStart.setDate(previousWeekStart.getDate() - 7);
  const nextWeekStart = new Date(weekStart);
  nextWeekStart.setDate(nextWeekStart.getDate() + 7);

  const previousMonthStart = new Date(monthStart.getFullYear(), monthStart.getMonth() - 1, 1);
  const nextMonthStart = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1);

  const weekStartIso = toIsoDate(weekStart);
  const weekEndIso = toIsoDate(weekEnd);
  const monthStartIso = toIsoDate(monthStart);
  const monthEndIso = toIsoDate(monthEnd);

  const previousWeekEnd = endOfIsoWeek(previousWeekStart);
  const previousWeekStartIso = toIsoDate(previousWeekStart);
  const previousWeekEndIso = toIsoDate(previousWeekEnd);

  const { supabase, account } = await requireAppContext();
  const initialData = await getAnalyticsInitialData(
    supabase,
    account.accountId,
    monthStartIso,
    monthEndIso
  );
  const objectiveById = new Map(initialData.objectives.map((objective) => [objective.id, objective]));
  const projectById = new Map(initialData.projects.map((project) => [project.id, project]));
  const filteredHabits = initialData.habits.filter((habit) => {
    const objective = habit.objective_id ? objectiveById.get(habit.objective_id) : null;
    if (selectedObjectiveId && habit.objective_id !== selectedObjectiveId) return false;
    if (selectedMode !== "all" && objective?.measurement_mode !== selectedMode) return false;
    if (selectedProjectId && objective?.project_id !== selectedProjectId) return false;
    return true;
  });
  const habitIds = filteredHabits.map((habit) => habit.id);
  const habitById = new Map(filteredHabits.map((habit) => [habit.id, habit]));
  const categories = initialData.categories as Array<{ id: string; name: string; monthly_limit: string | null }>;
  const monthExpenses = initialData.monthExpenses.filter((expense) => !selectedProjectId || expense.project_id === selectedProjectId);
  const monthIncome = initialData.monthIncome.filter((income) => !selectedProjectId || income.project_id === selectedProjectId);
  const monthCalendarDone = initialData.monthCalendarDone.filter((event) => {
    if (selectedObjectiveId && event.objective_id !== selectedObjectiveId) return false;
    const objective = event.objective_id ? objectiveById.get(event.objective_id) : null;
    if (selectedMode !== "all" && objective?.measurement_mode !== selectedMode) return false;
    if (selectedProjectId && objective?.project_id !== selectedProjectId) return false;
    return true;
  });
  const activeFilters = { objectiveId: selectedObjectiveId, mode: selectedMode, projectId: selectedProjectId };

  const sessionsResult = await getAnalyticsSessions(
    supabase,
    habitIds,
    weekStartIso,
    weekEndIso,
    previousWeekStartIso,
    previousWeekEndIso,
    monthStartIso,
    monthEndIso
  );

  const weekSessions = (sessionsResult.weekSessions ?? []) as HabitSession[];
  const previousWeekSessions = (sessionsResult.previousWeekSessions ?? []) as HabitSession[];
  const monthSessions = (sessionsResult.monthSessions ?? []) as HabitSession[];
  const timedWeekSessions = weekSessions.filter((session) => habitById.get(session.habit_id)?.type === "time_tracking");
  const noTimeWeekSessions = weekSessions.filter((session) => habitById.get(session.habit_id)?.type !== "time_tracking");
  const timedMonthSessions = monthSessions.filter((session) => habitById.get(session.habit_id)?.type === "time_tracking");

  const weekPlannedHours = timedWeekSessions.reduce((sum, session) => sum + session.planned_minutes, 0) / 60;
  const weekDoneHours = timedWeekSessions.reduce((sum, session) => sum + (session.actual_minutes ?? 0), 0) / 60;
  const weekCompletion = percent(weekSessions.filter((session) => session.completed).length, weekSessions.length);
  const previousWeekDoneHours = previousWeekSessions
    .filter((session) => habitById.get(session.habit_id)?.type === "time_tracking")
    .reduce((sum, session) => sum + (session.actual_minutes ?? 0), 0) / 60;
  const trendDeltaHours = weekDoneHours - previousWeekDoneHours;
  const trendText = trendDeltaHours >= 0 ? `+${trendDeltaHours.toFixed(1)}h vs previous week` : `${trendDeltaHours.toFixed(1)}h vs previous week`;

  const monthPlannedHours = timedMonthSessions.reduce((sum, session) => sum + session.planned_minutes, 0) / 60;
  const monthDoneHours = timedMonthSessions.reduce((sum, session) => sum + (session.actual_minutes ?? 0), 0) / 60;
  const monthCompletion = percent(monthSessions.filter((session) => session.completed).length, monthSessions.length);

  const weekDates = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);
    return toIsoDate(date);
  });

  const weeklyChartData = weekDates.map((dateKey) => {
    const sessions = weekSessions.filter((session) => session.session_date === dateKey);
    const timedSessions = sessions.filter((session) => habitById.get(session.habit_id)?.type === "time_tracking");
    const plannedHours = timedSessions.reduce((sum, session) => sum + session.planned_minutes, 0) / 60;
    const doneHours = timedSessions.reduce((sum, session) => sum + (session.actual_minutes ?? 0), 0) / 60;
    return {
      day: new Date(`${dateKey}T00:00:00`).toLocaleDateString("en-US", { weekday: "short" }),
      plannedHours: Number(plannedHours.toFixed(1)),
      doneHours: Number(doneHours.toFixed(1)),
      completion: percent(sessions.filter((session) => session.completed).length, sessions.length)
    };
  });

  const monthDates = Array.from({ length: monthEnd.getDate() }, (_, index) => {
    const date = new Date(monthStart);
    date.setDate(monthStart.getDate() + index);
    return toIsoDate(date);
  });

  const expenseByDay = new Map<string, number>();
  const spentByCategory = new Map<string, number>();
  for (const expense of monthExpenses) {
    const amount = Number(expense.amount);
    const dayKey = expense.occurred_on;
    expenseByDay.set(dayKey, (expenseByDay.get(dayKey) ?? 0) + amount);
    const categoryKey = expense.category_id ?? "";
    spentByCategory.set(categoryKey, (spentByCategory.get(categoryKey) ?? 0) + amount);
  }

  const monthlyChartData = monthDates.map((dateKey) => {
    const sessions = monthSessions.filter((session) => session.session_date === dateKey);
    const timedSessions = sessions.filter((session) => habitById.get(session.habit_id)?.type === "time_tracking");
    const plannedHours = timedSessions.reduce((sum, session) => sum + session.planned_minutes, 0) / 60;
    const doneHours = timedSessions.reduce((sum, session) => sum + (session.actual_minutes ?? 0), 0) / 60;
    return {
      day: new Date(`${dateKey}T00:00:00`).toLocaleDateString("en-US", { day: "2-digit" }),
      plannedHours: Number(plannedHours.toFixed(1)),
      doneHours: Number(doneHours.toFixed(1)),
      expense: Number((expenseByDay.get(dateKey) ?? 0).toFixed(2))
    };
  });

  const categoriesWithMetrics = categories.map((category) => {
    const spent = spentByCategory.get(category.id) ?? 0;
    const limit = category.monthly_limit ? Number(category.monthly_limit) : null;
    const ratio = limit && limit > 0 ? Math.min((spent / limit) * 100, 100) : 0;
    return {
      ...category,
      spent,
      limit,
      ratio,
      overBy: limit !== null && spent > limit ? spent - limit : 0
    };
  });

  const expensePieData = categoriesWithMetrics
    .filter((category) => category.spent > 0)
    .sort((a, b) => b.spent - a.spent)
    .slice(0, 6)
    .map((category) => ({
      name: category.name,
      spent: Number(category.spent.toFixed(2))
    }));

  const monthSpent = monthExpenses.reduce((sum, entry) => sum + Number(entry.amount), 0);
  const monthRevenue = monthIncome.reduce((sum, entry) => sum + Number(entry.amount), 0);
  const monthProfit = monthRevenue - monthSpent;
  const monthLimit = categoriesWithMetrics.reduce((sum, category) => sum + (category.limit ?? 0), 0);
  const overLimitCount = categoriesWithMetrics.filter((category) => category.overBy > 0).length;
  const monthPace = monthLimit > 0 ? Math.round((monthSpent / monthLimit) * 100) : 0;
  const activeDays = weeklyChartData.filter((row) => row.doneHours > 0).length;
  const calendarOnlyDone = monthCalendarDone.filter((event) => !event.habit_session_id).length;
  const noTimeDoneWeek = noTimeWeekSessions.filter((session) => session.completed).length;
  const projectsWithMetrics = initialData.projects
    .map((project) => {
      const revenue = initialData.monthIncome
        .filter((income) => income.project_id === project.id)
        .reduce((sum, income) => sum + Number(income.amount), 0);
      const cost = initialData.monthExpenses
        .filter((expense) => expense.project_id === project.id)
        .reduce((sum, expense) => sum + Number(expense.amount), 0);
      const projectObjectiveIds = new Set(initialData.objectives.filter((objective) => objective.project_id === project.id).map((objective) => objective.id));
      const projectHabitIds = new Set(initialData.habits.filter((habit) => habit.objective_id && projectObjectiveIds.has(habit.objective_id)).map((habit) => habit.id));
      const minutes = monthSessions
        .filter((session) => projectHabitIds.has(session.habit_id))
        .reduce((sum, session) => sum + (session.actual_minutes ?? 0), 0);
      return { ...project, revenue, cost, profit: revenue - cost, hours: minutes / 60 };
    })
    .filter((project) => project.revenue > 0 || project.cost > 0 || project.hours > 0)
    .sort((a, b) => b.profit - a.profit)
    .slice(0, 5);
  const selectedObjective = selectedObjectiveId ? objectiveById.get(selectedObjectiveId) : null;
  const selectedProject = selectedProjectId ? projectById.get(selectedProjectId) : null;

  return (
    <div className="space-y-6">
      <LifeSummaryBand
        title="Analysis"
        description="Weekly execution and monthly spending in one view."
        stats={[
          { label: "sessions", value: monthSessions.length },
          { label: "expenses", value: monthExpenses.length }
        ]}
      />

      <Card>
        <CardContent className="space-y-2 py-6">
          <h1 className="text-4xl font-bold tracking-tight text-[#0c1d3c]">Analysis</h1>
          <p className="text-base text-[#4a5f83]">Richer weekly/monthly insights for execution and spending.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Insight Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <form action="/analytics" className="grid gap-3 md:grid-cols-5">
            <input type="hidden" name="week" value={weekStartIso} />
            <input type="hidden" name="month" value={toMonthKey(monthStart)} />
            <div className="space-y-2 md:col-span-2">
              <p className="text-xs font-medium uppercase tracking-wide text-[#4a5f83]">Objective</p>
              <Select name="objective" defaultValue={selectedObjectiveId}>
                <option value="">All objectives</option>
                {initialData.objectives.map((objective) => (
                  <option key={objective.id} value={objective.id}>
                    {objective.title} · {objective.measurement_mode}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-[#4a5f83]">Mode</p>
              <Select name="mode" defaultValue={selectedMode}>
                <option value="all">All modes</option>
                <option value="quantitative">Quantitative</option>
                <option value="qualitative">Qualitative</option>
              </Select>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-[#4a5f83]">Project</p>
              <Select name="project" defaultValue={selectedProjectId}>
                <option value="">All projects</option>
                {initialData.projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex items-end gap-2">
              <button
                type="submit"
                className="inline-flex h-10 items-center justify-center rounded-lg bg-[#0b1f3b] px-4 text-sm font-semibold text-white transition hover:bg-[#102a52]"
              >
                Apply
              </button>
              <a
                href={analyticsHref(weekStart, monthStart)}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-[#c7d3e8] bg-[#edf3ff] px-4 text-sm font-semibold text-[#23406d]"
              >
                Reset
              </a>
            </div>
          </form>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge variant="secondary">{selectedObjective ? `Objective: ${selectedObjective.title}` : "All objectives"}</Badge>
            <Badge variant="secondary">Mode: {selectedMode}</Badge>
            <Badge variant="secondary">{selectedProject ? `Project: ${selectedProject.name}` : "All projects"}</Badge>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Week Selector</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <a
                href={analyticsHref(previousWeekStart, monthStart, activeFilters)}
                className="inline-flex size-9 items-center justify-center rounded-lg border border-[#c7d3e8] bg-[#edf3ff] text-[#23406d]"
              >
                <ChevronLeft size={16} />
              </a>
              <p className="text-sm font-semibold text-[#0c1d3c]">{formatWeekRange(weekStart, weekEnd)}</p>
              <a
                href={analyticsHref(nextWeekStart, monthStart, activeFilters)}
                className="inline-flex size-9 items-center justify-center rounded-lg border border-[#c7d3e8] bg-[#edf3ff] text-[#23406d]"
              >
                <ChevronRight size={16} />
              </a>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">Week done {weekDoneHours.toFixed(1)}h</Badge>
              <Badge variant="secondary">Week planned {weekPlannedHours.toFixed(1)}h</Badge>
              <Badge variant={weekCompletion >= 75 ? "secondary" : "warning"}>{weekCompletion}% completion</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Month Selector</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <a
                href={analyticsHref(weekStart, previousMonthStart, activeFilters)}
                className="inline-flex size-9 items-center justify-center rounded-lg border border-[#c7d3e8] bg-[#edf3ff] text-[#23406d]"
              >
                <ChevronLeft size={16} />
              </a>
              <p className="text-sm font-semibold text-[#0c1d3c]">
                {monthStart.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              </p>
              <a
                href={analyticsHref(weekStart, nextMonthStart, activeFilters)}
                className="inline-flex size-9 items-center justify-center rounded-lg border border-[#c7d3e8] bg-[#edf3ff] text-[#23406d]"
              >
                <ChevronRight size={16} />
              </a>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">Month done {monthDoneHours.toFixed(1)}h</Badge>
              <Badge variant="secondary">Month planned {monthPlannedHours.toFixed(1)}h</Badge>
              <Badge variant={monthCompletion >= 75 ? "secondary" : "warning"}>{monthCompletion}% completion</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-wide text-[#4a5f83]">Weekly trend</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-semibold ${trendDeltaHours >= 0 ? "text-emerald-700" : "text-rose-700"}`}>{trendText}</p>
            <p className="text-xs text-[#4a5f83]">{activeDays}/7 active days</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-wide text-[#4a5f83]">No-time progress</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-[#0c1d3c]">{noTimeDoneWeek}/{noTimeWeekSessions.length}</p>
            <p className="text-xs text-[#4a5f83]">Week qualitative/checklist done</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-wide text-[#4a5f83]">Calendar done</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-emerald-700">{monthCalendarDone.length}</p>
            <p className="text-xs text-[#4a5f83]">{calendarOnlyDone} calendar-only, rest synced to Execution</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-wide text-[#4a5f83]">Project profit</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-semibold ${monthProfit >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
              {formatMoneyDhs(monthProfit)}
            </p>
            <p className="text-xs text-[#4a5f83]">{formatMoneyDhs(monthRevenue)} revenue · {formatMoneyDhs(monthSpent)} cost</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-wide text-[#4a5f83]">Month spent</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-rose-700">{formatMoneyDhs(monthSpent)}</p>
            <p className="text-xs text-[#4a5f83]">{categories.length} expense categories</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-wide text-[#4a5f83]">Limits status</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-amber-700">{overLimitCount} over limit</p>
            <p className="text-xs text-[#4a5f83]">{monthLimit > 0 ? `${monthPace}% of total limit used` : "Set finance limits"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-wide text-[#4a5f83]">Overall completion</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-[#0c1d3c]">{Math.round((weekCompletion + monthCompletion) / 2)}%</p>
            <p className="text-xs text-[#4a5f83]">Blended week/month completion</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Objective Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {initialData.objectives.length > 0 ? (
              initialData.objectives
                .filter((objective) => !selectedMode || selectedMode === "all" || objective.measurement_mode === selectedMode)
                .filter((objective) => !selectedProjectId || objective.project_id === selectedProjectId)
                .map((objective) => {
                  const objectiveHabitIds = new Set(initialData.habits.filter((habit) => habit.objective_id === objective.id).map((habit) => habit.id));
                  const objectiveSessions = monthSessions.filter((session) => objectiveHabitIds.has(session.habit_id));
                  const minutes = objectiveSessions.reduce((sum, session) => sum + (session.actual_minutes ?? 0), 0);
                  const done = objectiveSessions.filter((session) => session.completed).length;
                  return (
                    <div key={objective.id} className="rounded-xl border border-[#d7e0f1] bg-[#f8fafc] p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="font-semibold text-[#0c1d3c]">{objective.title}</p>
                          <p className="text-xs capitalize text-[#4a5f83]">{objective.measurement_mode}</p>
                        </div>
                        <Badge variant="secondary">{done}/{objectiveSessions.length} done</Badge>
                      </div>
                      <p className="mt-2 text-sm text-[#4a5f83]">{(minutes / 60).toFixed(1)}h logged this month</p>
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
            <CardTitle>Project Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {projectsWithMetrics.length > 0 ? (
              projectsWithMetrics.map((project) => (
                <div key={project.id} className="rounded-xl border border-[#d7e0f1] bg-[#f8fafc] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-[#0c1d3c]">{project.name}</p>
                    <Badge variant={project.profit >= 0 ? "secondary" : "warning"}>{formatMoneyDhs(project.profit)}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-[#4a5f83]">
                    {project.hours.toFixed(1)}h · {formatMoneyDhs(project.revenue)} revenue · {formatMoneyDhs(project.cost)} cost
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-[#4a5f83]">No project-linked time or money in this month.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <AnalyticsCharts
        weekly={weeklyChartData}
        monthly={monthlyChartData}
        expenseCategories={expensePieData}
      />
    </div>
  );
}
