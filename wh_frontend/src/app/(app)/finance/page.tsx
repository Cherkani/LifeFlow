import { getFinancePageData } from "@/lib/queries";
import { LifeSummaryBand } from "@/components/life/life-context";
import { requireAppContext } from "@/lib/server-context";
import { endOfIsoWeek, startOfIsoWeek } from "@/lib/utils";

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
};

type SubscriptionRow = {
  id: string;
  name: string;
  amount: number;
  recurrence: "monthly" | "yearly";
  next_due_date: string | null;
  end_date: string | null;
  notes: string | null;
  is_active: boolean;
};

type IncomeSourceRow = {
  id: string;
  name: string;
  amount: number;
  recurrence: "monthly" | "yearly";
  start_date: string;
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

function isIncomeSourceVisibleInRange(source: IncomeSourceRow, rangeStart: string, rangeEnd: string) {
  if (!source.is_active) return false;
  if (source.start_date > rangeEnd) return false;
  if (source.end_date && source.end_date < rangeStart) return false;
  return true;
}

function isSubscriptionExpired(subscription: SubscriptionRow, rangeStart: string) {
  return Boolean(subscription.end_date && subscription.end_date < rangeStart);
}

function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function daysInMonth(year: number, monthIndex: number) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function addMonthlyOccurrence(anchorIso: string, offset: number) {
  const [yearRaw, monthRaw, dayRaw] = anchorIso.split("-").map(Number);
  const totalMonths = (monthRaw - 1) + offset;
  const year = yearRaw + Math.floor(totalMonths / 12);
  const monthIndex = ((totalMonths % 12) + 12) % 12;
  const day = Math.min(dayRaw, daysInMonth(year, monthIndex));
  return toIsoDate(new Date(year, monthIndex, day));
}

function addYearlyOccurrence(anchorIso: string, offset: number) {
  const [yearRaw, monthRaw, dayRaw] = anchorIso.split("-").map(Number);
  const year = yearRaw + offset;
  const monthIndex = monthRaw - 1;
  const day = Math.min(dayRaw, daysInMonth(year, monthIndex));
  return toIsoDate(new Date(year, monthIndex, day));
}

function getIncomeSourceOccurrences(source: IncomeSourceRow, rangeStart: string, rangeEnd: string) {
  const occurrences: Array<{ sourceId: string; name: string; amount: number; occurred_on: string; notes: string | null }> = [];

  if (!source.is_active || source.start_date > rangeEnd) {
    return occurrences;
  }

  const maxIterations = source.recurrence === "yearly" ? 200 : 1200;
  for (let index = 0; index < maxIterations; index += 1) {
    const occurred_on =
      source.recurrence === "monthly"
        ? addMonthlyOccurrence(source.start_date, index)
        : addYearlyOccurrence(source.start_date, index);

    if (occurred_on > rangeEnd) {
      break;
    }

    if (source.end_date && occurred_on > source.end_date) {
      break;
    }

    if (occurred_on >= rangeStart) {
      occurrences.push({
        sourceId: source.id,
        name: source.name,
        amount: source.amount,
        occurred_on,
        notes: source.notes
      });
    }
  }

  return occurrences;
}

function getSubscriptionOccurrences(subscription: SubscriptionRow, rangeStart: string, rangeEnd: string) {
  const occurrences: Array<{ subscriptionId: string; name: string; amount: number; due_on: string }> = [];

  if (!subscription.is_active || !subscription.next_due_date || subscription.next_due_date > rangeEnd) {
    return occurrences;
  }

  const maxIterations = subscription.recurrence === "yearly" ? 200 : 1200;
  for (let index = 0; index < maxIterations; index += 1) {
    const due_on =
      subscription.recurrence === "monthly"
        ? addMonthlyOccurrence(subscription.next_due_date, index)
        : addYearlyOccurrence(subscription.next_due_date, index);

    if (due_on > rangeEnd) {
      break;
    }

    if (subscription.end_date && due_on > subscription.end_date) {
      break;
    }

    if (due_on >= rangeStart) {
      occurrences.push({
        subscriptionId: subscription.id,
        name: subscription.name,
        amount: subscription.amount,
        due_on
      });
    }
  }

  return occurrences;
}

function getNextSubscriptionOccurrence(subscription: SubscriptionRow, rangeStart: string) {
  if (!subscription.is_active || !subscription.next_due_date) {
    return null;
  }

  const maxIterations = subscription.recurrence === "yearly" ? 200 : 1200;
  for (let index = 0; index < maxIterations; index += 1) {
    const due_on =
      subscription.recurrence === "monthly"
        ? addMonthlyOccurrence(subscription.next_due_date, index)
        : addYearlyOccurrence(subscription.next_due_date, index);

    if (subscription.end_date && due_on > subscription.end_date) {
      break;
    }

    if (due_on >= rangeStart) {
      return {
        subscriptionId: subscription.id,
        name: subscription.name,
        amount: subscription.amount,
        due_on
      };
    }
  }

  return null;
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

function parseTab(raw: string | undefined): "expenses" | "income" | "subscriptions" | "debts" {
  if (raw === "income") return "income";
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
  const categories = financeData.categories;
  const categoryUsageCounts = new Map<string, number>();
  for (const row of financeData.categoryUsage) {
    if (!row.category_id) continue;
    categoryUsageCounts.set(row.category_id, (categoryUsageCounts.get(row.category_id) ?? 0) + 1);
  }
  const periodExpenses = financeData.periodExpenses;
  const recentExpenses = financeData.recentExpenses;
  const periodIncome = financeData.periodIncome;
  const incomeSources = financeData.incomeSources.map((source) => ({
    id: source.id,
    name: source.name,
    amount: Number(source.amount),
    recurrence: source.recurrence,
    start_date: source.start_date,
    end_date: source.end_date,
    notes: source.notes,
    is_active: source.is_active
  })) as IncomeSourceRow[];
  const subscriptions = financeData.subscriptions.map((subscription) => ({
    id: subscription.id,
    name: subscription.name,
    amount: Number(subscription.amount),
    recurrence: subscription.recurrence,
    next_due_date: subscription.next_due_date,
    end_date: subscription.end_date,
    notes: subscription.notes,
    is_active: subscription.is_active
  })) as SubscriptionRow[];
  const debts = financeData.debts as unknown as DebtRow[];
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
  const visibleIncomeSources = incomeSources.filter((source) => isIncomeSourceVisibleInRange(source, rangeStart, rangeEnd));
  const sourceIncomeOccurrences = visibleIncomeSources.flatMap((source) => getIncomeSourceOccurrences(source, rangeStart, rangeEnd));
  const sourceIncomeTotal = sourceIncomeOccurrences.reduce((sum, entry) => sum + entry.amount, 0);
  const manualIncomeTotal = periodIncome.reduce((sum, entry) => sum + Number(entry.amount), 0);
  const periodIncomeTotal = manualIncomeTotal + sourceIncomeTotal;
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
  for (const occurrence of sourceIncomeOccurrences) {
    incomeByDay.set(occurrence.occurred_on, (incomeByDay.get(occurrence.occurred_on) ?? 0) + occurrence.amount);
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

  const activeSubscriptions = subscriptions.filter((subscription) => subscription.is_active);
  const visibleSubscriptions = subscriptions.filter((subscription) =>
    isSubscriptionVisibleInRange(subscription, rangeStart)
  );
  const dueSubscriptionOccurrences = activeSubscriptions.flatMap((subscription) =>
    getSubscriptionOccurrences(subscription, rangeStart, rangeEnd)
  );
  const recurringMonthlyCost = visibleSubscriptions.reduce(
    (sum, subscription) => sum + getMonthlyEquivalent(subscription.amount, subscription.recurrence),
    0
  );
  const dueSubscriptionsTotal = dueSubscriptionOccurrences.reduce((sum, subscription) => sum + subscription.amount, 0);
  const nextSubscription = visibleSubscriptions
    .map((subscription) => getNextSubscriptionOccurrence(subscription, rangeStart))
    .filter((subscription): subscription is NonNullable<typeof subscription> => Boolean(subscription))
    .sort((a, b) => a.due_on.localeCompare(b.due_on))[0];
  const expiredSubscriptionCount = subscriptions.filter((subscription) => isSubscriptionExpired(subscription, rangeStart)).length;
  const subscriptionDueChartData = timelineDates.map((date) => {
    const key = toIsoDate(date);
    const dueAmount = dueSubscriptionOccurrences
      .filter((subscription) => subscription.due_on === key)
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
  const incomeSourcesForClient = incomeSources.map((source) => ({
    id: source.id,
    name: source.name,
    amount: source.amount,
    recurrence: source.recurrence,
    start_date: source.start_date,
    end_date: source.end_date,
    notes: source.notes,
    is_active: source.is_active
  }));
  const nextIncomeSource = sourceIncomeOccurrences
    .slice()
    .sort((a, b) => a.occurred_on.localeCompare(b.occurred_on))[0];
  const expiredIncomeSourceCount = incomeSources.filter((source) => Boolean(source.end_date && source.end_date < rangeStart)).length;
  const periodExpensesForClient = periodExpenses.map((e) => ({
    id: e.id,
    category_id: e.category_id,
    amount: Number(e.amount),
    occurred_on: e.occurred_on
  }));

  return (
    <div className="finance-theme space-y-6">
      <LifeSummaryBand
        title="Finance"
        description="Track spending, income, subscriptions, debts, and payments by period."
        stats={[
          { label: "expenses", value: periodExpenses.length },
          { label: "income", value: periodIncome.length }
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
        incomeSources={incomeSourcesForClient}
        sourceIncomeOccurrences={sourceIncomeOccurrences}
        sourceIncomeTotal={sourceIncomeTotal}
        recurringIncomeMonthly={visibleIncomeSources.reduce((sum, source) => sum + getMonthlyEquivalent(source.amount, source.recurrence), 0)}
        activeIncomeSourceCount={visibleIncomeSources.length}
        expiredIncomeSourceCount={expiredIncomeSourceCount}
        nextIncomeSource={nextIncomeSource}
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
        subscriptions={subscriptions}
        subscriptionDueChartData={subscriptionDueChartData}
        totalSpent={totalSpent}
        averageDaySpend={averageDaySpend}
        topDay={topDay}
        overLimitCount={overLimitCount}
        activeSubscriptionCount={visibleSubscriptions.length}
        expiredSubscriptionCount={expiredSubscriptionCount}
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
        previousAnchorIso={toIsoDate(previousAnchorDate)}
        nextAnchorIso={toIsoDate(nextAnchorDate)}
      />
    </div>
  );
}
