import { getFinancePageData, getLifeOptions } from "@/lib/queries";
import { cookies } from "next/headers";
import { LifeSummaryBand } from "@/components/life/life-context";
import { requireAppContext } from "@/lib/server-context";
import { endOfIsoWeek, startOfIsoWeek } from "@/lib/utils";
import { matchesLifeFilter, resolveLifeFilter } from "@/lib/life-filter";

import { FinanceModals } from "./finance-modals";

type FinanceSearchParams = Promise<{
  tab?: string;
  period?: string;
  anchor?: string;
}>;

type DebtRow = {
  id: string;
  name: string;
  type: "owed" | "owing";
  principal: number | null;
  remaining_balance: number | null;
  status: "open" | "closed";
  due_date: string | null;
  phase_id: string | null;
  project_id: string | null;
};

type SubscriptionRow = {
  id: string;
  name: string;
  amount: number;
  phase_id: string | null;
  project_id: string | null;
  recurrence: "monthly" | "yearly";
  next_due_date: string | null;
  end_date: string | null;
  notes: string | null;
  is_active: boolean;
};

function getMonthlyEquivalent(amount: number, recurrence: "monthly" | "yearly") {
  return recurrence === "yearly" ? amount / 12 : amount;
}

function isSubscriptionVisibleInRange(subscription: SubscriptionRow, rangeStart: string) {
  if (!subscription.is_active) return false;
  if (subscription.end_date && subscription.end_date < rangeStart) return false;
  return true;
}

function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseAnchorDate(raw: string | undefined) {
  if (typeof raw === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return new Date(`${raw}T00:00:00`);
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function parsePeriod(raw: string | undefined): "day" | "week" | "month" {
  if (raw === "week") return "week";
  if (raw === "month") return "month";
  return "day";
}

function parseTab(raw: string | undefined): "expenses" | "subscriptions" | "debts" {
  if (raw === "subscriptions") return "subscriptions";
  if (raw === "debts") return "debts";
  return "expenses";
}

export default async function FinancePage({
  searchParams
}: {
  searchParams: FinanceSearchParams;
}) {
  const params = await searchParams;
  const tab = parseTab(params.tab);
  const period = parsePeriod(params.period);
  const anchorDate = parseAnchorDate(params.anchor);
  const anchorIso = toIsoDate(anchorDate);
  const rangeStartDate =
    period === "week"
      ? startOfIsoWeek(anchorDate)
      : period === "month"
        ? new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1)
        : anchorDate;
  const rangeEndDate =
    period === "week"
      ? endOfIsoWeek(anchorDate)
      : period === "month"
        ? new Date(anchorDate.getFullYear(), anchorDate.getMonth() + 1, 0)
        : anchorDate;
  const rangeStart = toIsoDate(rangeStartDate);
  const rangeEnd = toIsoDate(rangeEndDate);
  const previousAnchorDate = new Date(anchorDate);
  previousAnchorDate.setDate(previousAnchorDate.getDate() - (period === "week" ? 7 : period === "month" ? 30 : 1));
  const nextAnchorDate = new Date(anchorDate);
  nextAnchorDate.setDate(nextAnchorDate.getDate() + (period === "week" ? 7 : period === "month" ? 30 : 1));

  const { supabase, account } = await requireAppContext();
  const financeData = await getFinancePageData(
    supabase,
    account.accountId,
    rangeStart,
    rangeEnd,
    period
  );
  const lifeOptions = await getLifeOptions(supabase, account.accountId);
  const lifeFilter = resolveLifeFilter(await cookies(), account.accountId, lifeOptions);
  const categories = financeData.categories;
  const categoryUsageCounts = new Map<string, number>();
  for (const row of financeData.categoryUsage) {
    if (!row.category_id) continue;
    categoryUsageCounts.set(row.category_id, (categoryUsageCounts.get(row.category_id) ?? 0) + 1);
  }
  const periodExpenses = financeData.periodExpenses.filter((item) => matchesLifeFilter(item, lifeFilter));
  const recentExpenses = financeData.recentExpenses.filter((item) => matchesLifeFilter(item, lifeFilter));
  const periodIncome = financeData.periodIncome.filter((item) => matchesLifeFilter(item, lifeFilter));
  const subscriptions = financeData.subscriptions.map((subscription) => ({
    id: subscription.id,
    name: subscription.name,
    amount: Number(subscription.amount),
    phase_id: subscription.phase_id,
    project_id: subscription.project_id,
    recurrence: subscription.recurrence,
    next_due_date: subscription.next_due_date,
    end_date: subscription.end_date,
    notes: subscription.notes,
    is_active: subscription.is_active
  })) as SubscriptionRow[];
  const subscriptionsInContext = subscriptions.filter((subscription) => matchesLifeFilter(subscription, lifeFilter));
  const debts = (financeData.debts as unknown as DebtRow[]).filter((debt) => matchesLifeFilter(debt, lifeFilter));
  const debtIdsInContext = new Set(debts.map((debt) => debt.id));
  const payments = financeData.payments.filter((payment) => debtIdsInContext.has(payment.debt_id));

  const categoryNameById: Record<string, string> = {};
  for (const c of categories) {
    categoryNameById[c.id] = c.name;
  }
  const debtNameById: Record<string, string> = {};
  for (const d of debts) {
    debtNameById[d.id] = d.name;
  }

  const periodDays =
    period === "week" ? 7 : period === "month" ? rangeEndDate.getDate() - rangeStartDate.getDate() + 1 : 1;
  const timelineDates = Array.from({ length: periodDays }, (_, index) => {
    const date = new Date(rangeStartDate);
    date.setDate(rangeStartDate.getDate() + index);
    return date;
  });
  const budgetFactor = timelineDates.reduce((sum, date) => {
    const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    return sum + 1 / daysInMonth;
  }, 0);

  const spentByCategory = new Map<string, number>();
  const spentByDay = new Map<string, number>();
  for (const expense of periodExpenses) {
    const categoryKey = expense.category_id ?? "";
    const spentAmount = Number(expense.amount);
    spentByCategory.set(categoryKey, (spentByCategory.get(categoryKey) ?? 0) + spentAmount);
    spentByDay.set(expense.occurred_on, (spentByDay.get(expense.occurred_on) ?? 0) + spentAmount);
  }

  const totalSpent = periodExpenses.reduce((sum, entry) => sum + Number(entry.amount), 0);
  const periodIncomeTotal = periodIncome.reduce((sum, entry) => sum + Number(entry.amount), 0);
  const netCashFlow = periodIncomeTotal - totalSpent;
  const savingsRate = periodIncomeTotal > 0 ? (netCashFlow / periodIncomeTotal) * 100 : null;
  const averageDaySpend = periodDays > 0 ? totalSpent / periodDays : 0;
  const topDay = [...spentByDay.entries()].sort((a, b) => b[1] - a[1])[0];

  const categoryMetrics = categories.map((category) => {
    const spent = spentByCategory.get(category.id) ?? 0;
    const monthlyLimit = category.monthly_limit ? Number(category.monthly_limit) : 0;
    const periodLimit = monthlyLimit * budgetFactor;
    const remaining = periodLimit - spent;
    return {
      id: category.id,
      name: category.name,
      spent,
      limit: monthlyLimit,
      periodLimit,
      remaining,
      utilization: periodLimit > 0 ? (spent / periodLimit) * 100 : 0,
      over: periodLimit > 0 && spent > periodLimit
    };
  });
  const overLimitCount = categoryMetrics.filter((row) => row.over).length;

  const periodBudget = categoryMetrics.reduce((sum, entry) => sum + entry.periodLimit, 0);
  const budgetRemaining = periodBudget - totalSpent;
  const budgetUtilization = periodBudget > 0 ? (totalSpent / periodBudget) * 100 : 0;
  const categoryLimitById = new Map(categoryMetrics.map((entry) => [entry.id, entry.periodLimit]));
  const unbudgetedSpend = periodExpenses.reduce((sum, expense) => {
    const limit = expense.category_id ? categoryLimitById.get(expense.category_id) ?? 0 : 0;
    return limit > 0 ? sum : sum + Number(expense.amount);
  }, 0);

  const dailyChartData = timelineDates.map((date) => {
    const key = toIsoDate(date);
    return {
      day:
        period === "week"
          ? date.toLocaleDateString("en-US", { weekday: "short" })
          : date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      amount: Number((spentByDay.get(key) ?? 0).toFixed(2))
    };
  });

  const categoryChartData = [...categoryMetrics]
    .sort((a, b) => b.spent - a.spent)
    .slice(0, 8)
    .map((row) => ({
      name: row.name,
      spent: Number(row.spent.toFixed(2)),
      limit: Number(row.periodLimit.toFixed(2))
    }));

  const incomeByDay = new Map<string, number>();
  for (const income of periodIncome) {
    incomeByDay.set(income.occurred_on, (incomeByDay.get(income.occurred_on) ?? 0) + Number(income.amount));
  }
  const debtPaymentByDay = new Map<string, number>();
  for (const payment of payments) {
    debtPaymentByDay.set(payment.paid_at, (debtPaymentByDay.get(payment.paid_at) ?? 0) + Number(payment.amount));
  }
  let runningNet = 0;
  const cashFlowData = timelineDates.map((date) => {
    const key = toIsoDate(date);
    const income = incomeByDay.get(key) ?? 0;
    const expense = (spentByDay.get(key) ?? 0) + (debtPaymentByDay.get(key) ?? 0);
    const net = income - expense;
    runningNet += net;
    return {
      day:
        period === "week"
          ? date.toLocaleDateString("en-US", { weekday: "short" })
          : date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      income: Number(income.toFixed(2)),
      expense: Number(expense.toFixed(2)),
      net: Number(net.toFixed(2)),
      cumulative: Number(runningNet.toFixed(2))
    };
  });

  const activeSubscriptions = subscriptionsInContext.filter((subscription) => subscription.is_active);
  const visibleSubscriptions = subscriptionsInContext.filter((subscription) =>
    isSubscriptionVisibleInRange(subscription, rangeStart)
  );
  const dueSubscriptions = activeSubscriptions.filter((subscription) => {
    return Boolean(
      subscription.next_due_date &&
        subscription.next_due_date >= rangeStart &&
        subscription.next_due_date <= rangeEnd &&
        (!subscription.end_date || subscription.end_date >= subscription.next_due_date)
    );
  });
  const recurringMonthlyCost = visibleSubscriptions.reduce(
    (sum, subscription) => sum + getMonthlyEquivalent(subscription.amount, subscription.recurrence),
    0
  );
  const dueSubscriptionsTotal = dueSubscriptions.reduce((sum, subscription) => sum + subscription.amount, 0);
  const nextSubscription = [...activeSubscriptions]
    .filter((subscription) => Boolean(subscription.next_due_date))
    .sort((a, b) => (a.next_due_date ?? "").localeCompare(b.next_due_date ?? ""))[0];
  const subscriptionDueChartData = timelineDates.map((date) => {
    const key = toIsoDate(date);
    const dueAmount = dueSubscriptions
      .filter((subscription) => subscription.next_due_date === key)
      .reduce((sum, subscription) => sum + subscription.amount, 0);
    return {
      day:
        period === "week"
          ? date.toLocaleDateString("en-US", { weekday: "short" })
          : date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      amount: Number(dueAmount.toFixed(2))
    };
  });

  const openDebts = debts.filter((d) => d.status === "open");
  const openDebtTotal = openDebts.reduce(
    (sum, debt) => sum + Number(debt.remaining_balance ?? debt.principal ?? 0),
    0
  );
  const periodPaymentsTotal = payments
    .filter((p) => p.paid_at >= rangeStart && p.paid_at <= rangeEnd)
    .reduce((sum, p) => sum + Number(p.amount), 0);
  const actualOutputTotal = totalSpent + periodPaymentsTotal;
  const committedOutputTotal = actualOutputTotal + dueSubscriptionsTotal;
  const netAfterDebtPayments = periodIncomeTotal - actualOutputTotal;
  const netAfterCommittedOutput = periodIncomeTotal - committedOutputTotal;
  const subscriptionBudgetPressure = periodBudget > 0 ? (dueSubscriptionsTotal / periodBudget) * 100 : null;

  const categoriesForClient = categories.map((c) => ({
    id: c.id,
    name: c.name,
    monthly_limit: c.monthly_limit ? Number(c.monthly_limit) : null,
    image_url: c.image_url,
    entry_count: categoryUsageCounts.get(c.id) ?? 0
  }));

  const recentExpensesForClient = recentExpenses.map((e) => ({
    id: e.id,
    category_id: e.category_id,
    phase_id: e.phase_id,
    project_id: e.project_id,
    amount: Number(e.amount),
    occurred_on: e.occurred_on,
    notes: e.notes
  }));
  const periodIncomeForClient = periodIncome.map((entry) => ({
    id: entry.id,
    amount: Number(entry.amount),
    occurred_on: entry.occurred_on,
    notes: entry.notes
  }));

  const paymentsForClient = payments.map((p) => ({
    id: p.id,
    debt_id: p.debt_id,
    amount: Number(p.amount),
    paid_at: p.paid_at,
    method: p.method,
    notes: p.notes
  }));
  const periodExpensesForClient = periodExpenses.map((e) => ({
    id: e.id,
    category_id: e.category_id,
    phase_id: e.phase_id,
    project_id: e.project_id,
    amount: Number(e.amount),
    occurred_on: e.occurred_on
  }));

  return (
    <div className="finance-theme space-y-6">
      <LifeSummaryBand
        title="Money attached to life chapters"
        description="Expenses and income become part of the story when they connect to a phase or project."
        phases={lifeOptions.phases}
        projects={lifeOptions.projects}
        stats={[
          { label: "linked entries", value: periodExpenses.filter((entry) => entry.phase_id || entry.project_id).length },
          { label: "unlinked spend", value: periodExpenses.filter((entry) => !entry.phase_id && !entry.project_id).length }
        ]}
      />

      <FinanceModals
        tab={tab}
        period={period}
        anchorIso={anchorIso}
        categories={categoriesForClient}
        openDebts={openDebts}
        categoryMetrics={categoryMetrics}
        categoryNameById={categoryNameById}
        debtNameById={debtNameById}
        recentExpenses={recentExpensesForClient}
        periodIncome={periodIncomeForClient}
        periodIncomeTotal={periodIncomeTotal}
        netCashFlow={netCashFlow}
        savingsRate={savingsRate}
        periodBudget={periodBudget}
        budgetRemaining={budgetRemaining}
        budgetUtilization={budgetUtilization}
        unbudgetedSpend={unbudgetedSpend}
        periodExpenses={periodExpensesForClient}
        payments={paymentsForClient}
        debts={debts}
        dailyChartData={dailyChartData}
        categoryChartData={categoryChartData}
        cashFlowData={cashFlowData}
        subscriptions={subscriptionsInContext}
        subscriptionDueChartData={subscriptionDueChartData}
        totalSpent={totalSpent}
        averageDaySpend={averageDaySpend}
        topDay={topDay}
        overLimitCount={overLimitCount}
        activeSubscriptionCount={visibleSubscriptions.length}
        recurringMonthlyCost={recurringMonthlyCost}
        dueSubscriptionsTotal={dueSubscriptionsTotal}
        subscriptionBudgetPressure={subscriptionBudgetPressure}
        nextSubscription={nextSubscription}
        openDebtTotal={openDebtTotal}
        periodPaymentsTotal={periodPaymentsTotal}
        actualOutputTotal={actualOutputTotal}
        committedOutputTotal={committedOutputTotal}
        netAfterDebtPayments={netAfterDebtPayments}
        netAfterCommittedOutput={netAfterCommittedOutput}
        rangeStartIso={rangeStart}
        rangeEndIso={rangeEnd}
        lifePhases={lifeOptions.phases}
        lifeProjects={lifeOptions.projects}
        previousAnchorIso={toIsoDate(previousAnchorDate)}
        nextAnchorIso={toIsoDate(nextAnchorDate)}
      />
    </div>
  );
}
