import { ChevronLeft, ChevronRight } from "lucide-react";

import { AnalyticsCharts } from "@/app/(app)/analytics/analytics-charts";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getAnalyticsInitialData,
  getAnalyticsSessions
} from "@/lib/queries";
import { requireAppContext } from "@/lib/server-context";
import { endOfIsoWeek, startOfIsoWeek } from "@/lib/utils";

type AnalyticsSearchParams = Promise<{
  week?: string;
  month?: string;
}>;

type HabitSession = {
  id: string;
  habit_id: string;
  session_date: string;
  planned_minutes: number;
  actual_minutes: number | null;
  completed: boolean;
};

function percent(value: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((value / total) * 100);
}

function money(amount: number, currencyCode: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 2
  }).format(amount);
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

function analyticsHref(weekStart: Date, monthStart: Date) {
  const query = new URLSearchParams();
  query.set("week", toIsoDate(startOfIsoWeek(weekStart)));
  query.set("month", toMonthKey(monthStart));
  return `/analytics?${query.toString()}`;
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
  const habitIds = initialData.habitIds;
  const categories = initialData.categories as Array<{ id: string; name: string; monthly_limit: string | null }>;
  const monthExpenses = initialData.monthExpenses as Array<{ amount: string; category_id: string | null; occurred_on: string }>;

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

  const weekPlannedHours = weekSessions.reduce((sum, session) => sum + session.planned_minutes, 0) / 60;
  const weekDoneHours = weekSessions.reduce((sum, session) => sum + (session.actual_minutes ?? 0), 0) / 60;
  const weekCompletion = percent(weekSessions.filter((session) => session.completed).length, weekSessions.length);
  const previousWeekDoneHours = previousWeekSessions.reduce((sum, session) => sum + (session.actual_minutes ?? 0), 0) / 60;
  const trendDeltaHours = weekDoneHours - previousWeekDoneHours;
  const trendText = trendDeltaHours >= 0 ? `+${trendDeltaHours.toFixed(1)}h vs previous week` : `${trendDeltaHours.toFixed(1)}h vs previous week`;

  const monthPlannedHours = monthSessions.reduce((sum, session) => sum + session.planned_minutes, 0) / 60;
  const monthDoneHours = monthSessions.reduce((sum, session) => sum + (session.actual_minutes ?? 0), 0) / 60;
  const monthCompletion = percent(monthSessions.filter((session) => session.completed).length, monthSessions.length);

  const weekDates = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);
    return toIsoDate(date);
  });

  const weeklyChartData = weekDates.map((dateKey) => {
    const sessions = weekSessions.filter((session) => session.session_date === dateKey);
    const plannedHours = sessions.reduce((sum, session) => sum + session.planned_minutes, 0) / 60;
    const doneHours = sessions.reduce((sum, session) => sum + (session.actual_minutes ?? 0), 0) / 60;
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
    const plannedHours = sessions.reduce((sum, session) => sum + session.planned_minutes, 0) / 60;
    const doneHours = sessions.reduce((sum, session) => sum + (session.actual_minutes ?? 0), 0) / 60;
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
  const monthLimit = categoriesWithMetrics.reduce((sum, category) => sum + (category.limit ?? 0), 0);
  const overLimitCount = categoriesWithMetrics.filter((category) => category.overBy > 0).length;
  const monthPace = monthLimit > 0 ? Math.round((monthSpent / monthLimit) * 100) : 0;
  const activeDays = weeklyChartData.filter((row) => row.doneHours > 0).length;

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-2 py-6">
          <h1 className="text-4xl font-bold tracking-tight text-[#0c1d3c]">Analysis</h1>
          <p className="text-base text-[#4a5f83]">Richer weekly/monthly insights for execution and spending.</p>
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
                href={analyticsHref(previousWeekStart, monthStart)}
                className="inline-flex size-9 items-center justify-center rounded-lg border border-[#c7d3e8] bg-[#edf3ff] text-[#23406d]"
              >
                <ChevronLeft size={16} />
              </a>
              <p className="text-sm font-semibold text-[#0c1d3c]">{formatWeekRange(weekStart, weekEnd)}</p>
              <a
                href={analyticsHref(nextWeekStart, monthStart)}
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
                href={analyticsHref(weekStart, previousMonthStart)}
                className="inline-flex size-9 items-center justify-center rounded-lg border border-[#c7d3e8] bg-[#edf3ff] text-[#23406d]"
              >
                <ChevronLeft size={16} />
              </a>
              <p className="text-sm font-semibold text-[#0c1d3c]">
                {monthStart.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              </p>
              <a
                href={analyticsHref(weekStart, nextMonthStart)}
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
            <CardTitle className="text-sm uppercase tracking-wide text-[#4a5f83]">Month spent</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-rose-700">{money(monthSpent, account.currencyCode)}</p>
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

      <AnalyticsCharts
        weekly={weeklyChartData}
        monthly={monthlyChartData}
        expenseCategories={expensePieData}
        currencyCode={account.currencyCode}
      />
    </div>
  );
}
