import { MetricCard } from "@/components/ui/metric-card";
import { SectionHeader } from "@/components/ui/section-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAppContext } from "@/lib/server-context";
import { endOfIsoWeek, startOfIsoWeek, startOfMonth } from "@/lib/utils";

type WeekSession = {
  id: string;
  planned_minutes: number;
  actual_minutes: number | null;
  completed: boolean;
  habit_id: string;
};

type UpcomingSession = {
  id: string;
  habit_id: string;
  session_date: string;
  planned_minutes: number;
  minimum_minutes: number;
};

function money(amount: number, currencyCode: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 0
  }).format(amount);
}

export default async function DashboardPage() {
  const { supabase, account } = await requireAppContext();

  const now = new Date();
  const weekStart = startOfIsoWeek(now).toISOString().slice(0, 10);
  const weekEnd = endOfIsoWeek(now).toISOString().slice(0, 10);
  const monthStart = startOfMonth(now).toISOString().slice(0, 10);

  const habitsRes = await supabase
    .from("habits")
    .select("id, title")
    .eq("account_id", account.accountId)
    .eq("is_active", true);
  const habits = habitsRes.data ?? [];
  const habitIds = habits.map((habit) => habit.id);

  const [spaceCountRes, ledgerRes, debtRes, upcomingSubsRes] = await Promise.all([
    supabase
      .from("knowledge_spaces")
      .select("id", { count: "exact", head: true })
      .eq("account_id", account.accountId),
    supabase
      .from("ledger_entries")
      .select("id, amount, entry_type")
      .eq("account_id", account.accountId)
      .gte("occurred_on", monthStart),
    supabase
      .from("debts")
      .select("id, remaining_balance, principal, status")
      .eq("account_id", account.accountId)
      .eq("status", "open"),
    supabase
      .from("subscriptions")
      .select("id, name, amount, recurrence, next_due_date")
      .eq("account_id", account.accountId)
      .eq("is_active", true)
      .order("next_due_date", { ascending: true })
      .limit(5)
  ]);

  const weekSessionsRes =
    habitIds.length > 0
      ? await supabase
          .from("habit_sessions")
          .select("id, planned_minutes, actual_minutes, completed, habit_id")
          .in("habit_id", habitIds)
          .gte("session_date", weekStart)
          .lte("session_date", weekEnd)
      : { data: [] };

  const upcomingSessionsRes =
    habitIds.length > 0
      ? await supabase
          .from("habit_sessions")
          .select("id, habit_id, session_date, planned_minutes, minimum_minutes")
          .in("habit_id", habitIds)
          .gte("session_date", weekStart)
          .lte("session_date", weekEnd)
          .order("session_date", { ascending: true })
          .limit(8)
      : { data: [] };

  const weekSessions = (weekSessionsRes.data ?? []) as WeekSession[];
  const upcomingSessions = (upcomingSessionsRes.data ?? []) as UpcomingSession[];
  const plannedMinutes = weekSessions.reduce((acc, session) => acc + (session.planned_minutes ?? 0), 0);
  const actualMinutes = weekSessions.reduce((acc, session) => acc + (session.actual_minutes ?? 0), 0);
  const completedSessions = weekSessions.filter((session) => session.completed).length;

  const ledgerEntries = ledgerRes.data ?? [];
  const monthlyIncome = ledgerEntries
    .filter((entry) => entry.entry_type === "income")
    .reduce((acc, entry) => acc + Number(entry.amount), 0);
  const monthlyExpense = ledgerEntries
    .filter((entry) => entry.entry_type === "expense")
    .reduce((acc, entry) => acc + Number(entry.amount), 0);

  const openDebt = (debtRes.data ?? []).reduce(
    (acc, debt) => acc + Number(debt.remaining_balance ?? debt.principal ?? 0),
    0
  );
  const habitNameById = new Map(habits.map((habit) => [habit.id, habit.title]));

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Dashboard"
        description="A quick command center for your weekly rhythm and financial health."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Active habits" value={String(habits.length)} hint="Focused execution set" />
        <MetricCard
          label="Weekly completion"
          value={`${completedSessions}/${weekSessions.length}`}
          hint="Completed habit sessions"
        />
        <MetricCard
          label="Planned vs actual"
          value={`${actualMinutes}/${plannedMinutes} min`}
          hint="Current ISO week"
        />
        <MetricCard label="Knowledge spaces" value={String(spaceCountRes.count ?? 0)} hint="Strategic areas" />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Week sessions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {upcomingSessions.length > 0 ? (
              upcomingSessions.map((session) => (
                <div
                  key={session.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900">{habitNameById.get(session.habit_id) ?? "Habit"}</p>
                    <p className="text-xs text-slate-500">{session.session_date}</p>
                  </div>
                  <p className="text-xs font-medium text-slate-600">
                    {session.planned_minutes} planned / {session.minimum_minutes} minimum
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">No sessions planned for this week yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Finance pulse</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl bg-emerald-50 px-3 py-2">
              <p className="text-xs uppercase tracking-wide text-emerald-600">Income this month</p>
              <p className="text-lg font-semibold text-emerald-700">{money(monthlyIncome, account.currencyCode)}</p>
            </div>
            <div className="rounded-xl bg-rose-50 px-3 py-2">
              <p className="text-xs uppercase tracking-wide text-rose-600">Expenses this month</p>
              <p className="text-lg font-semibold text-rose-700">{money(monthlyExpense, account.currencyCode)}</p>
            </div>
            <div className="rounded-xl bg-amber-50 px-3 py-2">
              <p className="text-xs uppercase tracking-wide text-amber-600">Open debt</p>
              <p className="text-lg font-semibold text-amber-700">{money(openDebt, account.currencyCode)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upcoming subscriptions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {upcomingSubsRes.data && upcomingSubsRes.data.length > 0 ? (
            upcomingSubsRes.data.map((subscription) => (
              <div key={subscription.id} className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2">
                <div>
                  <p className="text-sm font-medium text-slate-900">{subscription.name}</p>
                  <p className="text-xs text-slate-500">Due {subscription.next_due_date ?? "TBD"}</p>
                </div>
                <p className="text-sm font-medium text-slate-700">
                  {money(Number(subscription.amount), account.currencyCode)} / {subscription.recurrence}
                </p>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-500">No active subscriptions tracked yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
