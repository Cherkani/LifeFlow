import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAppContext } from "@/lib/server-context";
import { endOfIsoWeek, startOfIsoWeek } from "@/lib/utils";

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

function formatDayLabel(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric"
  });
}

export default async function AnalyticsPage() {
  const { supabase, account } = await requireAppContext();
  const today = new Date();

  const weekStart = startOfIsoWeek(today);
  const weekEnd = endOfIsoWeek(today);
  const weekStartIso = toIsoDate(weekStart);
  const weekEndIso = toIsoDate(weekEnd);

  const monthStartIso = toIsoDate(new Date(today.getFullYear(), today.getMonth(), 1));
  const monthEndIso = toIsoDate(new Date(today.getFullYear(), today.getMonth() + 1, 0));

  const habitsRes = await supabase.from("habits").select("id").eq("account_id", account.accountId).eq("is_active", true);
  const habitIds = (habitsRes.data ?? []).map((habit) => habit.id);

  const [weekSessionsRes, monthSessionsRes, categoriesRes, monthExpensesRes] = await Promise.all([
    habitIds.length > 0
      ? supabase
          .from("habit_sessions")
          .select("id, habit_id, session_date, planned_minutes, actual_minutes, completed")
          .in("habit_id", habitIds)
          .gte("session_date", weekStartIso)
          .lte("session_date", weekEndIso)
          .order("session_date", { ascending: true })
      : Promise.resolve({ data: [] as HabitSession[] }),
    habitIds.length > 0
      ? supabase
          .from("habit_sessions")
          .select("id, habit_id, session_date, planned_minutes, actual_minutes, completed")
          .in("habit_id", habitIds)
          .gte("session_date", monthStartIso)
          .lte("session_date", monthEndIso)
      : Promise.resolve({ data: [] as HabitSession[] }),
    supabase
      .from("finance_categories")
      .select("id, name, monthly_limit")
      .eq("account_id", account.accountId)
      .eq("kind", "expense")
      .order("name"),
    supabase
      .from("ledger_entries")
      .select("id, category_id, amount")
      .eq("account_id", account.accountId)
      .eq("entry_type", "expense")
      .gte("occurred_on", monthStartIso)
      .lte("occurred_on", monthEndIso)
  ]);

  const weekSessions = (weekSessionsRes.data ?? []) as HabitSession[];
  const monthSessions = (monthSessionsRes.data ?? []) as HabitSession[];
  const categories = categoriesRes.data ?? [];
  const monthExpenses = monthExpensesRes.data ?? [];

  const weekPlannedHours = weekSessions.reduce((sum, session) => sum + session.planned_minutes, 0) / 60;
  const weekDoneHours = weekSessions.reduce((sum, session) => sum + (session.actual_minutes ?? 0), 0) / 60;
  const weekCompletion = percent(
    weekSessions.filter((session) => session.completed).length,
    weekSessions.length
  );

  const monthPlannedHours = monthSessions.reduce((sum, session) => sum + session.planned_minutes, 0) / 60;
  const monthDoneHours = monthSessions.reduce((sum, session) => sum + (session.actual_minutes ?? 0), 0) / 60;
  const monthCompletion = percent(
    monthSessions.filter((session) => session.completed).length,
    monthSessions.length
  );

  const weekDates = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);
    return toIsoDate(date);
  });

  const dailyRows = weekDates.map((dateKey) => {
    const sessions = weekSessions.filter((session) => session.session_date === dateKey);
    const planned = sessions.reduce((sum, session) => sum + session.planned_minutes, 0) / 60;
    const done = sessions.reduce((sum, session) => sum + (session.actual_minutes ?? 0), 0) / 60;
    const completion = percent(
      sessions.filter((session) => session.completed).length,
      sessions.length
    );

    return {
      dateKey,
      planned,
      done,
      completion
    };
  });

  const spentByCategory = new Map<string, number>();
  for (const expense of monthExpenses) {
    const key = expense.category_id ?? "";
    spentByCategory.set(key, (spentByCategory.get(key) ?? 0) + Number(expense.amount));
  }

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

  const monthSpent = monthExpenses.reduce((sum, entry) => sum + Number(entry.amount), 0);
  const monthLimit = categoriesWithMetrics.reduce((sum, category) => sum + (category.limit ?? 0), 0);
  const overLimitCount = categoriesWithMetrics.filter((category) => category.overBy > 0).length;

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-2 py-6">
          <h1 className="text-4xl font-bold tracking-tight text-[#0c1d3c]">Analysis</h1>
          <p className="text-base text-[#4a5f83]">Weekly and monthly productivity hours, plus spending control.</p>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-wide text-[#4a5f83]">Week done</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-[#0c1d3c]">{weekDoneHours.toFixed(1)}h</p>
            <p className="text-xs text-[#4a5f83]">Planned {weekPlannedHours.toFixed(1)}h · {weekCompletion}% complete</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-wide text-[#4a5f83]">Month done</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-[#0c1d3c]">{monthDoneHours.toFixed(1)}h</p>
            <p className="text-xs text-[#4a5f83]">Planned {monthPlannedHours.toFixed(1)}h · {monthCompletion}% complete</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-wide text-[#4a5f83]">Month spent</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-rose-700">{money(monthSpent, account.currencyCode)}</p>
            <p className="text-xs text-[#4a5f83]">Across {categories.length} expense categories</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-wide text-[#4a5f83]">Limits status</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-amber-700">{overLimitCount} over limit</p>
            <p className="text-xs text-[#4a5f83]">
              {monthLimit > 0
                ? `Global limit ${money(monthLimit, account.currencyCode)}`
                : "Set monthly limits in Finance"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Weekly productivity by day</CardTitle>
          </CardHeader>
          <CardContent>
            {dailyRows.some((row) => row.planned > 0 || row.done > 0) ? (
              <div className="space-y-3">
                {dailyRows.map((row) => {
                  const width = row.planned > 0 ? Math.min((row.done / row.planned) * 100, 100) : 0;
                  return (
                    <div key={row.dateKey} className="rounded-lg border border-[#c7d3e8] p-3">
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-[#0c1d3c]">{formatDayLabel(row.dateKey)}</p>
                        <p className="text-xs text-[#4a5f83]">
                          {row.done.toFixed(1)}h / {row.planned.toFixed(1)}h · {row.completion}%
                        </p>
                      </div>
                      <div className="h-2 rounded-full bg-[#e1e8f6]">
                        <div className="h-2 rounded-full bg-[#0b1f3b]" style={{ width: `${width}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-[#4a5f83]">No habit sessions for this week.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Expense category limits</CardTitle>
          </CardHeader>
          <CardContent>
            {categoriesWithMetrics.length > 0 ? (
              <div className="space-y-3">
                {categoriesWithMetrics.map((category) => (
                  <div key={category.id} className="rounded-lg border border-[#c7d3e8] p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-[#0c1d3c]">{category.name}</p>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          category.overBy > 0 ? "bg-rose-100 text-rose-700" : "bg-[#dbe5f7] text-[#23406d]"
                        }`}
                      >
                        {category.overBy > 0 ? "Over limit" : "On track"}
                      </span>
                    </div>
                    <p className="text-xs text-[#4a5f83]">
                      {money(category.spent, account.currencyCode)}
                      {category.limit !== null ? ` / ${money(category.limit, account.currencyCode)}` : " (no limit)"}
                    </p>
                    {category.limit !== null ? (
                      <div className="mt-2 h-2 rounded-full bg-[#e1e8f6]">
                        <div
                          className={`h-2 rounded-full ${category.overBy > 0 ? "bg-rose-600" : "bg-[#0b1f3b]"}`}
                          style={{ width: `${category.ratio}%` }}
                        />
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[#4a5f83]">No expense categories yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
