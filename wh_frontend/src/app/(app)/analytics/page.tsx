import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard } from "@/components/ui/metric-card";
import { SectionHeader } from "@/components/ui/section-header";
import { requireAppContext } from "@/lib/server-context";
import { endOfIsoWeek, startOfIsoWeek, startOfMonth } from "@/lib/utils";

function percentage(numerator: number, denominator: number) {
  if (denominator === 0) {
    return 0;
  }

  return Math.round((numerator / denominator) * 100);
}

function money(amount: number, currencyCode: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 0
  }).format(amount);
}

export default async function AnalyticsPage() {
  const { supabase, account } = await requireAppContext();

  const now = new Date();
  const weekStart = startOfIsoWeek(now).toISOString().slice(0, 10);
  const weekEnd = endOfIsoWeek(now).toISOString().slice(0, 10);
  const monthStart = startOfMonth(now).toISOString().slice(0, 10);

  const [sessionsRes, ledgerRes, debtsRes, subscriptionsRes] = await Promise.all([
    supabase
      .from("habit_sessions")
      .select("id, planned_minutes, actual_minutes, completed, rating, session_date")
      .gte("session_date", weekStart)
      .lte("session_date", weekEnd),
    supabase
      .from("ledger_entries")
      .select("id, amount, entry_type, occurred_on")
      .eq("account_id", account.accountId)
      .gte("occurred_on", monthStart),
    supabase
      .from("debts")
      .select("id, name, remaining_balance, principal, status")
      .eq("account_id", account.accountId)
      .order("created_at", { ascending: false }),
    supabase
      .from("subscriptions")
      .select("id, name, amount, recurrence, next_due_date")
      .eq("account_id", account.accountId)
      .eq("is_active", true)
      .order("next_due_date", { ascending: true })
      .limit(5)
  ]);

  const sessions = sessionsRes.data ?? [];
  const ledgerEntries = ledgerRes.data ?? [];
  const debts = debtsRes.data ?? [];
  const subscriptions = subscriptionsRes.data ?? [];

  const plannedMinutes = sessions.reduce((acc, session) => acc + (session.planned_minutes ?? 0), 0);
  const actualMinutes = sessions.reduce((acc, session) => acc + (session.actual_minutes ?? 0), 0);
  const completedCount = sessions.filter((session) => session.completed).length;

  const ratings = sessions.map((session) => session.rating).filter((rating): rating is number => typeof rating === "number");
  const averageRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;

  const incomes = ledgerEntries.filter((entry) => entry.entry_type === "income").reduce((acc, entry) => acc + Number(entry.amount), 0);
  const expenses = ledgerEntries.filter((entry) => entry.entry_type === "expense").reduce((acc, entry) => acc + Number(entry.amount), 0);

  const openDebts = debts.filter((debt) => debt.status === "open");
  const openDebtTotal = openDebts.reduce((acc, debt) => acc + Number(debt.remaining_balance ?? debt.principal ?? 0), 0);

  const completionRate = percentage(completedCount, sessions.length);
  const executionRate = percentage(actualMinutes, plannedMinutes);

  return (
    <div className="space-y-6">
      <SectionHeader title="Analytics" description="Measure execution quality, financial pressure, and system consistency." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Session completion" value={`${completionRate}%`} hint={`${completedCount} of ${sessions.length} completed`} />
        <MetricCard label="Execution minutes" value={`${executionRate}%`} hint={`${actualMinutes}/${plannedMinutes} min`} />
        <MetricCard label="Avg session rating" value={averageRating ? averageRating.toFixed(1) : "-"} hint="Self-rated session quality" />
        <MetricCard label="Cashflow" value={money(incomes - expenses, account.currencyCode)} hint="Income minus expenses" />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Weekly execution bars</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
                <span>Planned minutes</span>
                <span>{plannedMinutes} min</span>
              </div>
              <div className="h-3 rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-slate-300" style={{ width: "100%" }} />
              </div>
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
                <span>Actual minutes</span>
                <span>{actualMinutes} min</span>
              </div>
              <div className="h-3 rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-blue-600" style={{ width: `${Math.min(executionRate, 100)}%` }} />
              </div>
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
                <span>Completion rate</span>
                <span>{completionRate}%</span>
              </div>
              <div className="h-3 rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-emerald-500" style={{ width: `${completionRate}%` }} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Financial risk</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl bg-amber-50 px-3 py-2">
              <p className="text-xs uppercase tracking-wide text-amber-600">Open debt balance</p>
              <p className="text-lg font-semibold text-amber-700">{money(openDebtTotal, account.currencyCode)}</p>
            </div>
            <div className="rounded-xl bg-slate-50 px-3 py-2">
              <p className="text-xs uppercase tracking-wide text-slate-500">Monthly expenses</p>
              <p className="text-lg font-semibold text-slate-800">{money(expenses, account.currencyCode)}</p>
            </div>
            <div className="rounded-xl bg-emerald-50 px-3 py-2">
              <p className="text-xs uppercase tracking-wide text-emerald-600">Monthly incomes</p>
              <p className="text-lg font-semibold text-emerald-700">{money(incomes, account.currencyCode)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Open debts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {openDebts.length > 0 ? (
              openDebts.map((debt) => (
                <div key={debt.id} className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2">
                  <p className="text-sm font-medium text-slate-900">{debt.name}</p>
                  <p className="text-sm text-slate-700">{money(Number(debt.remaining_balance ?? debt.principal ?? 0), account.currencyCode)}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">No open debt.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming subscriptions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {subscriptions.length > 0 ? (
              subscriptions.map((subscription) => (
                <div key={subscription.id} className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{subscription.name}</p>
                    <p className="text-xs text-slate-500">Due {subscription.next_due_date ?? "TBD"}</p>
                  </div>
                  <p className="text-sm text-slate-700">
                    {money(Number(subscription.amount), account.currencyCode)} / {subscription.recurrence}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">No subscriptions due.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
