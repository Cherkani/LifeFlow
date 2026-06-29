"use client";

import { useMemo, useState, useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowDownRight, ArrowUpRight, Check, Pencil, Plus, Trash2, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { Route } from "next";

import { FinanceCharts } from "@/app/(app)/finance/finance-charts";
import { FinanceReport } from "@/app/(app)/finance/finance-report";
import {
  closeDebtAction,
  createDebtFormAction,
  createDebtPaymentFormAction,
  createExpenseCategoryFormAction,
  createExpenseFormAction,
  createIncomeFormAction,
  createIncomeSourceFormAction,
  createSubscriptionFormAction,
  deleteExpenseCategoryFormAction,
  deleteDebtFormAction,
  deleteExpenseFormAction,
  deleteIncomeSourceFormAction,
  deleteSubscriptionFormAction,
  toggleIncomeSourceActiveFormAction,
  toggleSubscriptionActiveFormAction,
  updateExpenseCategoryFormAction,
  updateExpenseFormAction,
  updateIncomeSourceFormAction,
  updateSubscriptionFormAction
} from "@/app/(app)/finance/actions";
import { ActionForm } from "@/components/forms/action-form";
import { PexelsImagePicker } from "@/components/forms/pexels-image-picker";
import { SubmitButton } from "@/components/forms/submit-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ModalShell } from "@/components/ui/modal-shell";
import { Progress } from "@/components/ui/progress";
import { SectionHeader } from "@/components/ui/section-header";
import { Select } from "@/components/ui/select";
import { formatMoneyDhs } from "@/lib/utils";

type DebtRow = {
  id: string;
  name: string;
  type: "owed" | "owing";
  principal: number | null;
  remaining_balance: number | null;
  status: "open" | "closed";
  due_date: string | null;
};

type PaymentRow = {
  id: string;
  debt_id: string;
  amount: number;
  paid_at: string;
  method: string | null;
  notes: string | null;
};

type CategoryRow = {
  id: string;
  name: string;
  monthly_limit: number | null;
  image_url: string | null;
  entry_count: number;
};

type ExpenseRow = {
  id: string;
  category_id: string | null;
  amount: number;
  occurred_on: string;
  notes: string | null;
};

type IncomeRow = { id: string; amount: number; occurred_on: string; notes: string | null };
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

type PeriodExpenseRow = {
  id: string;
  category_id: string | null;
  amount: number;
  occurred_on: string;
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

function toDateInputValue(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function enumerateIsoDates(rangeStartIso: string, rangeEndIso: string) {
  const dates: string[] = [];
  const start = new Date(`${rangeStartIso}T00:00:00`);
  const end = new Date(`${rangeEndIso}T00:00:00`);
  for (let cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
    dates.push(toDateInputValue(cursor));
  }
  return dates;
}

function formatDayLabel(isoDate: string, period: "day" | "week" | "month") {
  const date = new Date(`${isoDate}T00:00:00`);
  if (period === "week") {
    return date.toLocaleDateString("en-US", { weekday: "short" });
  }
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function buildFinanceHref(options?: {
  modal?: string;
  tab?: string;
  mode?: string;
  period?: "day" | "week" | "month";
  anchor?: string;
}) {
  const query = new URLSearchParams();
  if (options?.tab) query.set("tab", options.tab);
  if (options?.period) query.set("period", options.period);
  if (options?.anchor) query.set("anchor", options.anchor);
  if (options?.modal) query.set("modal", options.modal);
  if (options?.mode) query.set("mode", options.mode);
  const queryValue = query.toString();
  return queryValue.length > 0 ? `/finance?${queryValue}` : "/finance";
}

type FinanceModalsProps = {
  tab: "expenses" | "income" | "subscriptions" | "debts";
  period: "day" | "week" | "month";
  anchorIso: string;
  categories: CategoryRow[];
  openDebts: DebtRow[];
  categoryMetrics: Array<{ id: string; name: string; spent: number; limit: number; periodLimit: number; remaining: number; utilization: number; over: boolean }>;
  categoryNameById: Record<string, string>;
  debtNameById: Record<string, string>;
  recentExpenses: ExpenseRow[];
  periodIncome: IncomeRow[];
  incomeSources: IncomeSourceRow[];
  sourceIncomeOccurrences: Array<{ sourceId: string; name: string; amount: number; occurred_on: string; notes: string | null }>;
  sourceIncomeTotal: number;
  recurringIncomeMonthly: number;
  activeIncomeSourceCount: number;
  expiredIncomeSourceCount: number;
  nextIncomeSource:
    | { sourceId: string; name: string; amount: number; occurred_on: string; notes: string | null }
    | undefined;
  periodIncomeTotal: number;
  netCashFlow: number;
  savingsRate: number | null;
  periodBudget: number;
  budgetRemaining: number;
  budgetUtilization: number;
  unbudgetedSpend: number;
  periodExpenses: PeriodExpenseRow[];
  subscriptions: SubscriptionRow[];
  payments: PaymentRow[];
  debts: DebtRow[];
  dailyChartData: Array<{ day: string; amount: number }>;
  categoryChartData: Array<{ name: string; spent: number; limit: number }>;
  cashFlowData: Array<{ day: string; income: number; expense: number; net: number; cumulative: number }>;
  subscriptionDueChartData: Array<{ day: string; amount: number }>;
  totalSpent: number;
  averageDaySpend: number;
  topDay: [string, number] | undefined;
  overLimitCount: number;
  activeSubscriptionCount: number;
  expiredSubscriptionCount: number;
  recurringMonthlyCost: number;
  dueSubscriptionsTotal: number;
  subscriptionBudgetPressure: number | null;
  nextSubscription:
    | {
        id: string;
        name: string;
        amount: number;
        recurrence: "monthly" | "yearly";
        next_due_date: string | null;
        end_date: string | null;
        notes: string | null;
        is_active: boolean;
      }
    | undefined;
  openDebtTotal: number;
  periodPaymentsTotal: number;
  actualOutputTotal: number;
  committedOutputTotal: number;
  netAfterDebtPayments: number;
  netAfterCommittedOutput: number;
  rangeStartIso: string;
  rangeEndIso: string;
  previousAnchorIso: string;
  nextAnchorIso: string;
};

function DebtPayRow({
  debt,
  baseHref,
  selectedDateIso
}: {
  debt: DebtRow;
  baseHref: string;
  selectedDateIso: string;
}) {
  const balance = Number(debt.remaining_balance ?? debt.principal ?? 0);
  const principal = Number(debt.principal ?? balance);
  const alreadyZero = debt.status === "open" && balance <= 0;
  const isClosed = debt.status === "closed";
  const isOwed = debt.type === "owed"; // money owed TO me
  const progress = principal > 0 ? Math.max(0, Math.min(100, ((principal - balance) / principal) * 100)) : 100;

  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(balance.toFixed(2));
  const [paidAt, setPaidAt] = useState(selectedDateIso);
  const [state, formAction] = useActionState(createDebtPaymentFormAction, null);
  const [closeState, closeFormAction] = useActionState(closeDebtAction, null);
  const router = useRouter();

  useEffect(() => {
    if (state?.redirectTo || closeState?.redirectTo) {
      setOpen(false);
      setPaidAt(selectedDateIso);
      router.refresh();
    }
  }, [state, closeState, router, selectedDateIso]);

  return (
    <div className={[
      "rounded-xl border p-4 transition-all",
      isClosed
        ? "border-[#e2e8f0] bg-[#f8fafc] opacity-60"
        : "border-[#c7d3e8] bg-white shadow-sm"
    ].join(" ")}>

      {/* Main row */}
      <div className="flex items-start justify-between gap-3">
        {/* Direction indicator + info */}
        <div className="flex items-start gap-3 min-w-0">
          <div className={[
            "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold",
            isOwed
              ? "bg-emerald-100 text-emerald-700"
              : "bg-rose-100 text-rose-700"
          ].join(" ")}>
            {isOwed ? <ArrowDownRight size={16} /> : <ArrowUpRight size={16} />}
          </div>
          <div className="min-w-0">
            <p className={["font-semibold truncate", isClosed ? "text-slate-400 line-through" : "text-[#0c1d3c]"].join(" ")}>
              {debt.name}
            </p>
            <p className="text-xs text-[#4a5f83] mt-0.5">
              {isOwed ? "Owes you" : "You owe"}
              {debt.due_date ? ` · due ${debt.due_date}` : ""}
            </p>
          </div>
        </div>

        {/* Amount + actions */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="text-right">
            <p className={[
              "font-semibold tabular-nums",
              isClosed ? "text-slate-400" : isOwed ? "text-emerald-700" : "text-rose-600"
            ].join(" ")}>
              {formatMoneyDhs(alreadyZero ? principal : balance)}
            </p>
          </div>

          {/* Action buttons */}
          {!isClosed && !alreadyZero && !open && (
            <button
              type="button"
              onClick={() => {
                setAmount(balance.toFixed(2));
                setPaidAt(selectedDateIso);
                setOpen(true);
              }}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 transition hover:bg-emerald-100"
              title="Record payment"
            >
              <Check size={15} />
            </button>
          )}
          {alreadyZero && (
            <form action={closeFormAction}>
              <input type="hidden" name="returnPath" value={baseHref} />
              <input type="hidden" name="debtId" value={debt.id} />
              <button
                type="submit"
                className="inline-flex h-8 items-center gap-1 rounded-lg bg-emerald-50 px-2.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
              >
                <Check size={13} /> Close
              </button>
            </form>
          )}
          {isClosed && (
            <ActionForm action={deleteDebtFormAction} className="inline" refreshOnly>
              <input type="hidden" name="returnPath" value={baseHref} />
              <input type="hidden" name="debtId" value={debt.id} />
              <button
                type="submit"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-500 transition hover:bg-rose-100"
                title="Remove"
              >
                <Trash2 size={14} />
              </button>
            </ActionForm>
          )}
        </div>
      </div>

      {/* Progress bar (open debts with partial payment only) */}
      {!isClosed && principal > 0 && progress > 0 && (
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full" style={{ backgroundColor: "var(--app-panel-border)" }}>
          <div
            className="h-full rounded-full bg-emerald-500 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Payment form */}
      {open && (
        <form action={formAction} className="mt-3 flex flex-wrap items-center gap-2 border-t pt-3" style={{ borderColor: "var(--app-panel-border)" }}>
          <input type="hidden" name="returnPath" value={baseHref} />
          <input type="hidden" name="debtId" value={debt.id} />
          <div className="relative flex-1">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs" style={{ color: "var(--app-text-muted)" }}>Dhs</span>
            <input
              name="amount"
              type="number"
              min="0.01"
              step="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="h-9 w-full rounded-lg border border-[#c7d3e8] bg-white pl-10 pr-3 text-sm font-semibold text-[#0c1d3c] focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>
          <input
            name="paidAt"
            type="date"
            required
            value={paidAt}
            onChange={(e) => setPaidAt(e.target.value)}
            className="h-9 rounded-lg border border-[#c7d3e8] bg-white px-3 text-sm text-[#0c1d3c] focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />
          <button
            type="submit"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-emerald-600 px-4 text-xs font-semibold text-white transition hover:bg-emerald-700"
          >
            <Check size={13} /> Confirm
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#e2e8f0] text-[#94a3b8] transition hover:bg-[#f1f5f9]"
          >
            <X size={14} />
          </button>
        </form>
      )}
    </div>
  );
}

export function FinanceModals({
  tab,
  period,
  anchorIso,
  categories,
  openDebts,
  categoryMetrics,
  categoryNameById,
  debtNameById,
  recentExpenses,
  periodIncome,
  incomeSources,
  sourceIncomeOccurrences,
  sourceIncomeTotal,
  recurringIncomeMonthly,
  activeIncomeSourceCount,
  expiredIncomeSourceCount,
  nextIncomeSource,
  periodIncomeTotal,
  netCashFlow,
  savingsRate,
  periodBudget,
  budgetRemaining,
  budgetUtilization,
  unbudgetedSpend,
  periodExpenses,
  subscriptions,
  payments,
  debts,
  dailyChartData,
  categoryChartData,
  cashFlowData,
  subscriptionDueChartData,
  totalSpent,
  averageDaySpend,
  topDay,
  overLimitCount,
  activeSubscriptionCount,
  expiredSubscriptionCount,
  recurringMonthlyCost,
  dueSubscriptionsTotal,
  subscriptionBudgetPressure,
  nextSubscription,
  openDebtTotal,
  periodPaymentsTotal,
  actualOutputTotal,
  committedOutputTotal,
  netAfterDebtPayments,
  netAfterCommittedOutput,
  rangeStartIso,
  rangeEndIso,
  previousAnchorIso,
  nextAnchorIso
}: FinanceModalsProps) {
  const todayIso = toDateInputValue(new Date());
  const [activeModal, setActiveModal] = useState<
    "expense" | "income" | "income-source" | "edit-income-source" | "edit-expense" | "debt-entry" | "expense-category" | "edit-category" | "subscription" | "edit-subscription" | null
  >(null);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingIncomeSourceId, setEditingIncomeSourceId] = useState<string | null>(null);
  const [editingSubscriptionId, setEditingSubscriptionId] = useState<string | null>(null);
  const [deletingExpenseId, setDeletingExpenseId] = useState<string | null>(null);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [recentSearch, setRecentSearch] = useState("");

  const editingExpense = editingExpenseId ? recentExpenses.find((e) => e.id === editingExpenseId) ?? null : null;

  const baseHref = buildFinanceHref({ tab, period, anchor: anchorIso });
  const editingCategory = editingCategoryId ? categories.find((c) => c.id === editingCategoryId) : null;
  const editingIncomeSource = editingIncomeSourceId
    ? incomeSources.find((source) => source.id === editingIncomeSourceId) ?? null
    : null;
  const editingSubscription = editingSubscriptionId
    ? subscriptions.find((subscription) => subscription.id === editingSubscriptionId) ?? null
    : null;
  const activeCategoryName = activeCategoryId ? categoryNameById[activeCategoryId] ?? null : null;

  const timelineDates = useMemo(() => enumerateIsoDates(rangeStartIso, rangeEndIso), [rangeStartIso, rangeEndIso]);
  const filteredDailyChartData = useMemo(() => {
    if (!activeCategoryId) {
      return dailyChartData;
    }
    const totals = new Map<string, number>();
    for (const expense of periodExpenses) {
      if (expense.category_id !== activeCategoryId) continue;
      totals.set(expense.occurred_on, (totals.get(expense.occurred_on) ?? 0) + Number(expense.amount));
    }
    return timelineDates.map((isoDate) => ({
      day: formatDayLabel(isoDate, period),
      amount: Number((totals.get(isoDate) ?? 0).toFixed(2))
    }));
  }, [activeCategoryId, dailyChartData, periodExpenses, timelineDates, period]);

  const filteredCategoryChartData = useMemo(() => {
    if (!activeCategoryId) {
      return categoryChartData;
    }
    const category = categoryMetrics.find((entry) => entry.id === activeCategoryId);
    if (!category) {
      return categoryChartData;
    }
    return [
      {
        name: category.name,
        spent: Number(category.spent.toFixed(2)),
        limit: Number(category.limit.toFixed(2))
      }
    ];
  }, [activeCategoryId, categoryChartData, categoryMetrics]);

  const normalizedSearch = recentSearch.trim().toLowerCase();
  const filteredRecentExpenses = useMemo(() => {
    const categoryFiltered = activeCategoryId
      ? recentExpenses.filter((entry) => entry.category_id === activeCategoryId)
      : recentExpenses;
    if (!normalizedSearch) {
      return categoryFiltered;
    }
    return categoryFiltered.filter((entry) => {
      const categoryLabel = (categoryNameById[entry.category_id ?? ""] ?? "Expense").toLowerCase();
      const note = (entry.notes ?? "").toLowerCase();
      return (
        categoryLabel.includes(normalizedSearch) ||
        note.includes(normalizedSearch) ||
        entry.occurred_on.includes(normalizedSearch)
      );
    });
  }, [activeCategoryId, recentExpenses, normalizedSearch, categoryNameById]);

  const closeModal = () => {
    setActiveModal(null);
    setEditingCategoryId(null);
    setEditingExpenseId(null);
    setEditingIncomeSourceId(null);
    setEditingSubscriptionId(null);
    setActiveCategoryId(null);
  };

  const tabActions =
    tab === "expenses" ? (
      <>
        <button
          type="button"
          onClick={() => setActiveModal("expense")}
          className="inline-flex items-center gap-2 rounded-lg bg-[#0b1f3b] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#102a52]"
        >
          <Plus size={16} />
          Add Expense
        </button>
        <button
          type="button"
          onClick={() => setActiveModal("expense-category")}
          className="inline-flex items-center gap-2 rounded-lg border border-[#c7d3e8] bg-[#edf3ff] px-3 py-2 text-sm font-semibold text-[#23406d] transition hover:bg-[#e3ebf9]"
        >
          <Plus size={16} />
          Category
        </button>
      </>
    ) : tab === "income" ? (
      <>
        <button
          type="button"
          onClick={() => setActiveModal("income")}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800"
        >
          <Plus size={16} />
          Add Income
        </button>
        <button
          type="button"
          onClick={() => setActiveModal("income-source")}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-100 px-3 py-2 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-200"
        >
          <Plus size={16} />
          Income Source
        </button>
      </>
    ) : tab === "subscriptions" ? (
      <button
        type="button"
        onClick={() => setActiveModal("subscription")}
        className="inline-flex items-center gap-2 rounded-lg bg-[#2563eb] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#1d4ed8]"
      >
        <Plus size={16} />
        Subscription
      </button>
    ) : (
      <button
        type="button"
        onClick={() => setActiveModal("debt-entry")}
        className="inline-flex items-center gap-2 rounded-lg bg-[#1e3a6d] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#274881]"
      >
        <Plus size={16} />
        Debt Entry
      </button>
    );

  return (
    <>
      <SectionHeader
        title="Finance Command"
        description="Track monthly spending with rich charts and manage debt operations in one place."
        action={
          <div className="flex flex-wrap gap-2">
            {tabActions}
          </div>
        }
      />

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
          <div className="inline-flex rounded-lg border border-[var(--app-panel-border)] bg-[var(--app-panel-bg-soft)] p-1">
            <Link
              href={buildFinanceHref({ tab: "expenses", period, anchor: anchorIso }) as Route}
              className={[
                "rounded-md px-3 py-1.5 text-sm font-semibold transition-colors",
                tab === "expenses"
                  ? "bg-[var(--app-btn-primary-bg)] text-[var(--app-btn-primary-fg)] shadow-sm"
                  : "text-[var(--app-btn-secondary-fg)] hover:bg-[var(--app-btn-secondary-bg)]"
              ].join(" ")}
            >
              Expenses
            </Link>
            <Link
              href={buildFinanceHref({ tab: "income", period, anchor: anchorIso }) as Route}
              className={[
                "rounded-md px-3 py-1.5 text-sm font-semibold transition-colors",
                tab === "income"
                  ? "bg-[var(--app-btn-primary-bg)] text-[var(--app-btn-primary-fg)] shadow-sm"
                  : "text-[var(--app-btn-secondary-fg)] hover:bg-[var(--app-btn-secondary-bg)]"
              ].join(" ")}
            >
              Income
            </Link>
            <Link
              href={buildFinanceHref({ tab: "subscriptions", period, anchor: anchorIso }) as Route}
              className={[
                "rounded-md px-3 py-1.5 text-sm font-semibold transition-colors",
                tab === "subscriptions"
                  ? "bg-[var(--app-btn-primary-bg)] text-[var(--app-btn-primary-fg)] shadow-sm"
                  : "text-[var(--app-btn-secondary-fg)] hover:bg-[var(--app-btn-secondary-bg)]"
              ].join(" ")}
            >
              Subscriptions
            </Link>
            <Link
              href={buildFinanceHref({ tab: "debts", period, anchor: anchorIso }) as Route}
              className={[
                "rounded-md px-3 py-1.5 text-sm font-semibold transition-colors",
                tab === "debts"
                  ? "bg-[var(--app-btn-primary-bg)] text-[var(--app-btn-primary-fg)] shadow-sm"
                  : "text-[var(--app-btn-secondary-fg)] hover:bg-[var(--app-btn-secondary-bg)]"
              ].join(" ")}
            >
              Debts
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-lg border border-[#c7d3e8] bg-white p-1">
              <Link
                href={buildFinanceHref({ tab, period: "day", anchor: anchorIso }) as Route}
                className={["rounded-md px-3 py-1.5 text-sm font-semibold", period === "day" ? "bg-[#0b1f3b] text-white" : "text-[#23406d]"].join(" ")}
              >
                Day
              </Link>
              <Link
                href={buildFinanceHref({ tab, period: "week", anchor: anchorIso }) as Route}
                className={["rounded-md px-3 py-1.5 text-sm font-semibold", period === "week" ? "bg-[#0b1f3b] text-white" : "text-[#23406d]"].join(" ")}
              >
                Week
              </Link>
              <Link
                href={buildFinanceHref({ tab, period: "month", anchor: anchorIso }) as Route}
                className={["rounded-md px-3 py-1.5 text-sm font-semibold", period === "month" ? "bg-[#0b1f3b] text-white" : "text-[#23406d]"].join(" ")}
              >
                Month
              </Link>
            </div>
            <Link
              href={buildFinanceHref({ tab, period, anchor: previousAnchorIso }) as Route}
              className="inline-flex size-9 items-center justify-center rounded-lg border border-[#c7d3e8] bg-[#edf3ff] text-[#23406d]"
            >
              <ArrowDownRight size={16} />
            </Link>
            <p className="text-sm font-semibold text-[#0c1d3c]">
              {period === "day"
                ? new Date(`${anchorIso}T00:00:00`).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric"
                  })
                : `${new Date(`${rangeStartIso}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${new Date(`${rangeEndIso}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`}
            </p>
            <Link
              href={buildFinanceHref({ tab, period, anchor: nextAnchorIso }) as Route}
              className="inline-flex size-9 items-center justify-center rounded-lg border border-[#c7d3e8] bg-[#edf3ff] text-[#23406d]"
            >
              <ArrowUpRight size={16} />
            </Link>
            <Link
              href={buildFinanceHref({ tab, period, anchor: todayIso }) as Route}
              className={[
                "inline-flex h-9 items-center justify-center rounded-lg border px-3 text-sm font-semibold transition",
                anchorIso === todayIso
                  ? "border-[#0b1f3b] bg-[#0b1f3b] text-white"
                  : "border-[#c7d3e8] bg-[#edf3ff] text-[#23406d] hover:bg-[#e3ebf9]"
              ].join(" ")}
            >
              Today
            </Link>
          </div>
        </CardContent>
      </Card>

      {tab === "expenses" ? (
        <>
          <FinanceReport
            expenses={totalSpent}
            averageDaySpend={averageDaySpend}
            topSpendDayLabel={topDay ? `${topDay[0]} · ${formatMoneyDhs(topDay[1])}` : "No data"}
            recurringMonthlyCost={recurringMonthlyCost}
            dueSubscriptionsTotal={dueSubscriptionsTotal}
          />

          {categories.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Filter by category</CardTitle>
                <p className="text-sm text-[#4a5f83]">
                  {activeCategoryName ? `Showing data for ${activeCategoryName}` : "Showing all categories"}
                </p>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveCategoryId(null)}
                    className={[
                      "rounded-full border px-3 py-1 text-sm font-medium transition",
                      activeCategoryId === null
                        ? "border-[#0b1f3b] bg-[#0b1f3b] text-white"
                        : "border-[#c7d3e8] bg-white text-[#23406d] hover:bg-[#f2f6ff]"
                    ].join(" ")}
                  >
                    All categories
                  </button>
                  {categories.map((category) => (
                    <button
                      type="button"
                      key={category.id}
                      onClick={() =>
                        setActiveCategoryId((current) => (current === category.id ? null : category.id))
                      }
                      className={[
                        "rounded-full border px-3 py-1 text-sm font-medium transition",
                        activeCategoryId === category.id
                          ? "border-[#0b1f3b] bg-[#0b1f3b] text-white"
                          : "border-[#c7d3e8] bg-white text-[#23406d] hover:bg-[#f2f6ff]"
                      ].join(" ")}
                    >
                      {category.name}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle>
                Recent expenses{activeCategoryName ? ` · ${activeCategoryName}` : ""}
              </CardTitle>
              <Input
                value={recentSearch}
                onChange={(event) => setRecentSearch(event.target.value)}
                placeholder="Search notes or category"
                className="w-full max-w-xs"
              />
            </CardHeader>
            <CardContent>
              {filteredRecentExpenses.length > 0 ? (
                <div className="space-y-3">
                  {filteredRecentExpenses.map((entry) => (
                    <div key={entry.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#c7d3e8] bg-[#f8fbff] p-3">
                      <div>
                        <p className="text-sm font-semibold text-[#0c1d3c]">
                          {categoryNameById[entry.category_id ?? ""] ?? "Expense"}
                        </p>
                        <p className="text-xs text-[#4a5f83]">
                          {entry.occurred_on}
                          {entry.notes ? ` · ${entry.notes}` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="danger">-{formatMoneyDhs(Number(entry.amount))}</Badge>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingExpenseId(entry.id);
                            setActiveModal("edit-expense");
                          }}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#c7d3e8] bg-white text-[#23406d] transition hover:bg-[#edf3ff]"
                          aria-label="Edit expense"
                        >
                          <Pencil size={14} />
                        </button>
                        <ActionForm action={deleteExpenseFormAction} className="inline">
                          <input type="hidden" name="returnPath" value={baseHref} />
                          <input type="hidden" name="expenseId" value={entry.id} />
                          <button
                            type="button"
                            onClick={() => setDeletingExpenseId(entry.id)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#fecaca] bg-[#fef2f2] text-[#b91c1c] transition hover:bg-[#fee2e2]"
                            aria-label="Delete expense"
                          >
                            <Trash2 size={14} />
                          </button>
                        </ActionForm>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[#4a5f83]">
                  {activeCategoryName ? `No expenses recorded in ${activeCategoryName}.` : "No expenses yet."}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Category limits (monthly)</CardTitle>
            </CardHeader>
            <CardContent>
              {categories.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {categoryMetrics.map((category) => {
                    const categoryMeta = categories.find((entry) => entry.id === category.id);
                    return (
                      <div key={category.id} className="relative space-y-3 rounded-lg border border-[#c7d3e8] bg-[#f8fbff] p-3">
                        {categoryMeta?.image_url ? (
                          <div className="relative h-24 w-full overflow-hidden rounded-md border border-[#d7e0f1] bg-white">
                            <Image src={categoryMeta.image_url} alt={category.name} fill className="object-cover" />
                          </div>
                        ) : (
                          <div className="flex h-24 items-center justify-center rounded-md border border-dashed border-[#d7e0f1] text-xs text-[#4a5f83]">
                            No image
                          </div>
                        )}
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-[#0c1d3c]">{category.name}</p>
                            <p className="text-[11px] text-[#4a5f83]">
                              {category.limit > 0 ? `${formatMoneyDhs(category.limit)} monthly limit` : "No limit set"}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {categoryMeta?.entry_count === 0 ? (
                              <ActionForm action={deleteExpenseCategoryFormAction} refreshOnly>
                                <input type="hidden" name="returnPath" value={baseHref} />
                                <input type="hidden" name="categoryId" value={category.id} />
                                <button
                                  type="submit"
                                  className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[#fecaca] bg-[#fef2f2] text-[#b91c1c] transition hover:bg-[#fee2e2]"
                                  aria-label="Delete category"
                                  title="Delete empty category"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </ActionForm>
                            ) : (
                              <button
                                type="button"
                                disabled
                                className="inline-flex h-7 w-7 cursor-not-allowed items-center justify-center rounded-md border border-[#e2e8f0] bg-[#f8fafc] text-[#94a3b8]"
                                aria-label="Delete unavailable"
                                title={`Delete unavailable: ${categoryMeta?.entry_count ?? 0} linked expense record${(categoryMeta?.entry_count ?? 0) !== 1 ? "s" : ""}`}
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setEditingCategoryId(category.id);
                                setActiveModal("edit-category");
                              }}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[#c7d3e8] bg-white text-[#0c1d3c] transition hover:bg-[#f8fbff]"
                              aria-label="Edit category"
                            >
                              <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path
                                  d="m3 11 9-9 3 3-9 9H3v-3Z"
                                  stroke="currentColor"
                                  strokeWidth="1.2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                                <path d="M12 3l1 1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={category.over ? "danger" : "secondary"}>{formatMoneyDhs(category.spent)} spent</Badge>
                          <Badge variant="secondary">{category.periodLimit > 0 ? `${formatMoneyDhs(category.periodLimit)} allowance` : "Untracked"}</Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-[#4a5f83]">No expense categories yet.</p>
              )}
            </CardContent>
          </Card>

          <FinanceCharts
            dailyExpenses={filteredDailyChartData}
            categories={filteredCategoryChartData}
            subscriptions={subscriptionDueChartData}
            cashFlow={cashFlowData}
            mode="expenses"
          />

          <Card className={periodBudget > 0 && budgetRemaining < 0 ? "border-rose-200" : "border-emerald-200"}>
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle>Budget health</CardTitle>
                  <p className="mt-1 text-sm text-[var(--app-text-muted)]">Monthly category limits are prorated to the selected dates.</p>
                </div>
                <Badge variant={periodBudget <= 0 ? "warning" : budgetRemaining < 0 ? "danger" : "secondary"}>
                  {periodBudget <= 0 ? "No budget configured" : budgetRemaining < 0 ? "Over budget" : "Within budget"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg bg-[var(--app-panel-bg-soft)] p-3">
                  <p className="text-xs uppercase text-[var(--app-text-muted)]">Period allowance</p>
                  <p className="mt-1 text-lg font-semibold text-[var(--app-text-strong)]">{formatMoneyDhs(periodBudget)}</p>
                </div>
                <div className="rounded-lg bg-[var(--app-panel-bg-soft)] p-3">
                  <p className="text-xs uppercase text-[var(--app-text-muted)]">{budgetRemaining < 0 ? "Over by" : "Remaining"}</p>
                  <p className={`mt-1 text-lg font-semibold ${budgetRemaining < 0 ? "text-rose-700" : "text-[var(--app-text-strong)]"}`}>{formatMoneyDhs(Math.abs(budgetRemaining))}</p>
                </div>
                <div className="rounded-lg bg-[var(--app-panel-bg-soft)] p-3">
                  <p className="text-xs uppercase text-[var(--app-text-muted)]">Budget used</p>
                  <p className={`mt-1 text-lg font-semibold ${budgetRemaining < 0 ? "text-rose-700" : "text-[var(--app-text-strong)]"}`}>
                    {periodBudget > 0 ? `${budgetUtilization.toFixed(1)}%` : "—"}
                  </p>
                </div>
                <div className="rounded-lg bg-[var(--app-panel-bg-soft)] p-3">
                  <p className="text-xs uppercase text-[var(--app-text-muted)]">Unbudgeted spend</p>
                  <p className={`mt-1 text-lg font-semibold ${unbudgetedSpend > 0 ? "text-rose-700" : "text-[var(--app-text-strong)]"}`}>{formatMoneyDhs(unbudgetedSpend)}</p>
                </div>
              </div>
              {periodBudget > 0 ? <Progress value={Math.min(Math.max(budgetUtilization, 0), 100)} /> : null}
              {unbudgetedSpend > 0 ? (
                <p className="flex items-center gap-2 text-sm text-amber-700">
                  <AlertTriangle size={15} />
                  Some spending belongs to categories without a monthly limit.
                </p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Budget variance by category</CardTitle>
            </CardHeader>
            <CardContent>
              {categoryMetrics.filter((category) => category.periodLimit > 0 && category.name.trim().toLowerCase() !== "subscriptions").length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[620px] text-left text-sm">
                    <thead className="border-b border-[var(--app-panel-border)] text-xs uppercase text-[var(--app-text-muted)]">
                      <tr>
                        <th className="py-2 pr-3">Category</th>
                        <th className="px-3 py-2">Spent</th>
                        <th className="px-3 py-2">Allowance</th>
                        <th className="px-3 py-2">Variance</th>
                        <th className="pl-3 py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...categoryMetrics]
                        .filter((category) => category.periodLimit > 0 && category.name.trim().toLowerCase() !== "subscriptions")
                        .sort((a, b) => b.utilization - a.utilization)
                        .map((category) => (
                          <tr key={category.id} className="border-b border-[var(--app-panel-border)] last:border-0">
                            <td className="py-3 pr-3 font-medium text-[var(--app-text-strong)]">{category.name}</td>
                            <td className="px-3 py-3">{formatMoneyDhs(category.spent)}</td>
                            <td className="px-3 py-3">{formatMoneyDhs(category.periodLimit)}</td>
                            <td className={`px-3 py-3 font-medium ${category.remaining < 0 ? "text-rose-700" : "text-emerald-700"}`}>
                              {category.remaining < 0 ? "−" : "+"}
                              {formatMoneyDhs(Math.abs(category.remaining))}
                            </td>
                            <td className="py-3 pl-3">
                              <Badge variant={category.over ? "danger" : category.utilization >= 80 ? "warning" : "secondary"}>
                                {category.utilization.toFixed(0)}%
                              </Badge>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-[var(--app-text-muted)]">Set monthly category limits to unlock budget variance reporting.</p>
              )}
            </CardContent>
          </Card>
        </>
      ) : tab === "income" ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Card>
              <CardContent className="py-4">
                <p className="text-xs font-medium uppercase tracking-wide text-[var(--app-text-muted)]">Income</p>
                <p className="mt-1 text-2xl font-semibold text-emerald-700">{formatMoneyDhs(periodIncomeTotal)}</p>
                <p className="mt-1 text-xs text-[var(--app-text-muted)]">Money received in this period</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4">
                <p className="text-xs font-medium uppercase tracking-wide text-[var(--app-text-muted)]">Recurring / month</p>
                <p className="mt-1 text-2xl font-semibold text-emerald-700">{formatMoneyDhs(recurringIncomeMonthly)}</p>
                <p className="mt-1 text-xs text-[var(--app-text-muted)]">Recurring income sources active in this period</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4">
                <p className="text-xs font-medium uppercase tracking-wide text-[var(--app-text-muted)]">Scheduled in range</p>
                <p className="mt-1 text-2xl font-semibold text-emerald-700">{formatMoneyDhs(sourceIncomeTotal)}</p>
                <p className="mt-1 text-xs text-[var(--app-text-muted)]">Calculated from recurring income sources in this period</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4">
                <p className="text-xs font-medium uppercase tracking-wide text-[var(--app-text-muted)]">Active sources</p>
                <p className="mt-1 text-2xl font-semibold text-[#0c1d3c]">{activeIncomeSourceCount}</p>
                <p className="mt-1 text-xs text-[var(--app-text-muted)]">
                  {expiredIncomeSourceCount > 0
                    ? `${expiredIncomeSourceCount} ended source${expiredIncomeSourceCount === 1 ? "" : "s"} excluded`
                    : "No ended sources hidden in this range"}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <Card>
              <CardContent className="py-4">
                <p className="text-xs font-medium uppercase tracking-wide text-[var(--app-text-muted)]">Next payout</p>
                <p className="mt-1 text-2xl font-semibold text-[#0c1d3c]">
                  {nextIncomeSource ? `${nextIncomeSource.name} · ${nextIncomeSource.occurred_on}` : "No payout"}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4">
                <p className="text-xs font-medium uppercase tracking-wide text-[var(--app-text-muted)]">Net cash flow</p>
                <p className={`mt-1 text-2xl font-semibold ${netCashFlow >= 0 ? "text-emerald-700" : "text-rose-700"}`}>{formatMoneyDhs(netCashFlow)}</p>
                <p className="mt-1 text-xs text-[var(--app-text-muted)]">Income minus expenses in this period</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4">
                <p className="text-xs font-medium uppercase tracking-wide text-[var(--app-text-muted)]">Savings rate</p>
                <p className={`mt-1 text-2xl font-semibold ${savingsRate !== null && savingsRate >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                  {savingsRate === null ? "No income" : `${savingsRate.toFixed(1)}%`}
                </p>
                <p className="mt-1 text-xs text-[var(--app-text-muted)]">Based on income versus expenses</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle>Income sources</CardTitle></CardHeader>
            <CardContent>
              {incomeSources.length > 0 ? (
                <div className="space-y-3">
                  {[...incomeSources]
                    .sort((a, b) => {
                      const aCurrent = a.is_active && (!a.end_date || a.end_date >= rangeStartIso) ? 1 : 0;
                      const bCurrent = b.is_active && (!b.end_date || b.end_date >= rangeStartIso) ? 1 : 0;
                      if (aCurrent !== bCurrent) return bCurrent - aCurrent;
                      return a.start_date.localeCompare(b.start_date);
                    })
                    .map((source) => (
                      <div
                        key={source.id}
                        className={[
                          "flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3",
                          source.is_active && (!source.end_date || source.end_date >= rangeStartIso)
                            ? "border-emerald-200 bg-emerald-50/40"
                            : "border-[#e2e8f0] bg-[#f8fafc] opacity-70"
                        ].join(" ")}
                      >
                        <div>
                          <p className="text-sm font-semibold text-[#0c1d3c]">{source.name}</p>
                          <p className="text-xs text-[#4a5f83]">
                            {formatMoneyDhs(source.amount)} / {source.recurrence}
                            {` · starts ${source.start_date}`}
                            {source.end_date ? ` · ends ${source.end_date}` : ""}
                            {source.notes ? ` · ${source.notes}` : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={source.is_active && (!source.end_date || source.end_date >= rangeStartIso) ? "secondary" : "default"}>
                            {source.is_active
                              ? source.end_date && source.end_date < rangeStartIso
                                ? "Ended"
                                : "Active"
                              : "Inactive"}
                          </Badge>
                          <ActionForm action={toggleIncomeSourceActiveFormAction} className="inline" refreshOnly>
                            <input type="hidden" name="returnPath" value={baseHref} />
                            <input type="hidden" name="incomeSourceId" value={source.id} />
                            <button
                              type="submit"
                              className="inline-flex h-8 items-center justify-center rounded-md border border-[#c7d3e8] bg-white px-3 text-xs font-semibold text-[#23406d] transition hover:bg-[#edf3ff]"
                            >
                              {source.is_active ? "Pause" : "Activate"}
                            </button>
                          </ActionForm>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingIncomeSourceId(source.id);
                              setActiveModal("edit-income-source");
                            }}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#c7d3e8] bg-white text-[#23406d] transition hover:bg-[#edf3ff]"
                            aria-label="Edit income source"
                          >
                            <Pencil size={14} />
                          </button>
                          <ActionForm action={deleteIncomeSourceFormAction} className="inline" refreshOnly>
                            <input type="hidden" name="returnPath" value={baseHref} />
                            <input type="hidden" name="incomeSourceId" value={source.id} />
                            <button
                              type="submit"
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#fecaca] bg-[#fef2f2] text-[#b91c1c] transition hover:bg-[#fee2e2]"
                              aria-label="Delete income source"
                            >
                              <Trash2 size={14} />
                            </button>
                          </ActionForm>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-sm text-[#4a5f83]">No recurring income sources yet.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Calculated source income in this period</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {sourceIncomeOccurrences.length > 0 ? (
                sourceIncomeOccurrences
                  .slice()
                  .sort((a, b) => b.occurred_on.localeCompare(a.occurred_on))
                  .map((entry) => (
                    <div key={`${entry.sourceId}-${entry.occurred_on}`} className="flex items-center justify-between gap-3 rounded-lg border border-emerald-100 bg-emerald-50/60 px-3 py-2">
                      <div>
                        <p className="text-sm font-medium text-[#0c1d3c]">{entry.name}</p>
                        <p className="text-xs text-slate-500">
                          {entry.occurred_on}
                          {entry.notes ? ` · ${entry.notes}` : ""}
                        </p>
                      </div>
                      <Badge variant="secondary">+{formatMoneyDhs(entry.amount)}</Badge>
                    </div>
                  ))
              ) : (
                <p className="text-sm text-[#4a5f83]">No recurring income falls inside this selection.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Manual income entries in this period</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {periodIncome.length > 0 ? (
                periodIncome.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between gap-3 rounded-lg border border-emerald-100 bg-emerald-50/60 px-3 py-2">
                    <div>
                      <p className="text-sm font-medium text-[#0c1d3c]">{entry.notes || "Income"}</p>
                      <p className="text-xs text-slate-500">{entry.occurred_on}</p>
                    </div>
                    <Badge variant="secondary">+{formatMoneyDhs(entry.amount)}</Badge>
                  </div>
                ))
              ) : (
                <p className="text-sm text-[#4a5f83]">No income recorded in this selection.</p>
              )}
            </CardContent>
          </Card>

          <FinanceCharts cashFlow={cashFlowData} mode="income" />
        </>
      ) : tab === "subscriptions" ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm uppercase tracking-wide text-slate-500">Recurring / month</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold text-[#2563eb]">{formatMoneyDhs(recurringMonthlyCost)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm uppercase tracking-wide text-slate-500">Due in range</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold text-[#0c1d3c]">{formatMoneyDhs(dueSubscriptionsTotal)}</p>
                {subscriptionBudgetPressure !== null ? (
                  <p className="mt-1 text-xs text-[#4a5f83]">{subscriptionBudgetPressure.toFixed(0)}% of period budget allowance</p>
                ) : null}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm uppercase tracking-wide text-slate-500">Active in period</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold text-[#0c1d3c]">{activeSubscriptionCount}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm uppercase tracking-wide text-slate-500">Next visible due</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold text-[#0c1d3c]">
                  {nextSubscription?.next_due_date
                    ? `${nextSubscription.name} · ${nextSubscription.next_due_date}`
                    : "No current due date"}
                </p>
                {expiredSubscriptionCount > 0 ? (
                  <p className="mt-1 text-xs text-[#4a5f83]">{expiredSubscriptionCount} expired subscription{expiredSubscriptionCount === 1 ? "" : "s"} hidden from current totals.</p>
                ) : null}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Subscription due dates</CardTitle>
              <p className="text-sm text-[#4a5f83]">
                Expired subscriptions stop contributing after their end date.
              </p>
            </CardHeader>
            <CardContent>
              <FinanceCharts
                subscriptions={subscriptionDueChartData}
                mode="subscriptions"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Subscriptions</CardTitle>
            </CardHeader>
            <CardContent>
              {subscriptions.length > 0 ? (
                <div className="space-y-3">
                  {[...subscriptions]
                    .sort((a, b) => {
                      const aCurrent = a.is_active && (!a.end_date || a.end_date >= rangeStartIso) ? 1 : 0;
                      const bCurrent = b.is_active && (!b.end_date || b.end_date >= rangeStartIso) ? 1 : 0;
                      if (aCurrent !== bCurrent) return bCurrent - aCurrent;
                      return (a.next_due_date ?? "").localeCompare(b.next_due_date ?? "");
                    })
                    .map((subscription) => (
                    <div
                      key={subscription.id}
                      className={[
                        "flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3",
                        subscription.is_active && (!subscription.end_date || subscription.end_date >= rangeStartIso)
                          ? "border-[#c7d3e8] bg-[#f8fbff]"
                          : "border-[#e2e8f0] bg-[#f8fafc] opacity-70"
                      ].join(" ")}
                    >
                      <div>
                        <p className="text-sm font-semibold text-[#0c1d3c]">{subscription.name}</p>
                        <p className="text-xs text-[#4a5f83]">
                          {formatMoneyDhs(subscription.amount)} / {subscription.recurrence}
                          {subscription.next_due_date ? ` · next ${subscription.next_due_date}` : ""}
                          {subscription.end_date ? ` · expires ${subscription.end_date}` : ""}
                          {subscription.notes ? ` · ${subscription.notes}` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={subscription.is_active && (!subscription.end_date || subscription.end_date >= rangeStartIso) ? "secondary" : "default"}>
                          {subscription.is_active
                            ? subscription.end_date && subscription.end_date < rangeStartIso
                              ? "Expired"
                              : "Active"
                            : "Inactive"}
                        </Badge>
                        <ActionForm action={toggleSubscriptionActiveFormAction} className="inline" refreshOnly>
                          <input type="hidden" name="returnPath" value={baseHref} />
                          <input type="hidden" name="subscriptionId" value={subscription.id} />
                          <button
                            type="submit"
                            className="inline-flex h-8 items-center justify-center rounded-md border border-[#c7d3e8] bg-white px-3 text-xs font-semibold text-[#23406d] transition hover:bg-[#edf3ff]"
                          >
                            {subscription.is_active ? "Pause" : "Activate"}
                          </button>
                        </ActionForm>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingSubscriptionId(subscription.id);
                            setActiveModal("edit-subscription");
                          }}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#c7d3e8] bg-white text-[#23406d] transition hover:bg-[#edf3ff]"
                          aria-label="Edit subscription"
                        >
                          <Pencil size={14} />
                        </button>
                        <ActionForm action={deleteSubscriptionFormAction} className="inline" refreshOnly>
                          <input type="hidden" name="returnPath" value={baseHref} />
                          <input type="hidden" name="subscriptionId" value={subscription.id} />
                          <button
                            type="submit"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#fecaca] bg-[#fef2f2] text-[#b91c1c] transition hover:bg-[#fee2e2]"
                            aria-label="Delete subscription"
                          >
                            <Trash2 size={14} />
                          </button>
                        </ActionForm>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[#4a5f83]">No subscriptions yet.</p>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        <>
          {/* Summary strip */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-[#e8eef8] bg-white p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Open debt</p>
              <p className="mt-1 text-xl font-bold text-rose-600">{formatMoneyDhs(openDebtTotal)}</p>
            </div>
            <div className="rounded-xl border border-[#e8eef8] bg-white p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Lines</p>
              <p className="mt-1 text-xl font-bold text-[#0c1d3c]">{openDebts.length}</p>
            </div>
            <div className="rounded-xl border border-[#e8eef8] bg-white p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Paid</p>
              <p className="mt-1 text-xl font-bold text-emerald-600">{formatMoneyDhs(periodPaymentsTotal)}</p>
            </div>
          </div>

          {/* Debt list */}
          {debts.length > 0 ? (
            <div className="space-y-2">
              {debts.map((debt) => (
                <DebtPayRow key={debt.id} debt={debt} baseHref={baseHref} selectedDateIso={anchorIso} />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-[#c7d3e8] py-10 text-center">
              <p className="text-sm text-[#94a3b8]">No debts yet. Add one with the button above.</p>
            </div>
          )}

          {/* Recent payments */}
          {payments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Recent payments</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {payments.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between gap-3 rounded-lg bg-[#f8fafc] px-3 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                        <Check size={13} />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-[#0c1d3c]">{debtNameById[payment.debt_id] ?? "Payment"}</p>
                        <p className="text-xs text-slate-400">
                          {payment.paid_at}{payment.method ? ` · ${payment.method}` : ""}
                        </p>
                      </div>
                    </div>
                    <p className="shrink-0 text-sm font-semibold text-emerald-700">{formatMoneyDhs(Number(payment.amount))}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Expense category modal */}
      {activeModal === "expense-category" ? (
        <ModalShell title="Create Expense Category" description="Set monthly spending cap per category." onClose={closeModal}>
          <ActionForm action={createExpenseCategoryFormAction} className="space-y-4" onSuccess={closeModal}>
            <input type="hidden" name="returnPath" value={baseHref} />
            <div className="space-y-2">
              <Label htmlFor="categoryName">Category name</Label>
              <Input id="categoryName" name="name" required placeholder="e.g. Food, Transport, Shopping" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="monthlyLimit">Monthly limit (optional)</Label>
              <Input id="monthlyLimit" name="monthlyLimit" type="number" min={0} step="0.01" placeholder="0.00" />
            </div>
            <PexelsImagePicker inputName="imageUrl" label="Category image (optional)" />
            <SubmitButton label="Save category" pendingLabel="Saving..." className="w-full sm:w-auto" />
          </ActionForm>
        </ModalShell>
      ) : null}

      {/* Add expense modal */}
      {activeModal === "expense" ? (
        <ModalShell title="Add Expense" description="Record what you spent." onClose={closeModal}>
          {categories.length === 0 ? (
            <p className="text-sm text-[#4a5f83]">Create expense category first.</p>
          ) : (
            <ActionForm action={createExpenseFormAction} className="space-y-4" onSuccess={closeModal}>
              <input type="hidden" name="returnPath" value={baseHref} />
              <div className="space-y-2">
                <Label htmlFor="categoryId">Category</Label>
                <Select id="categoryId" name="categoryId" required>
                  <option value="">Choose category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount</Label>
                  <Input id="amount" name="amount" type="number" min={0} step="0.01" required placeholder="0.00" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="occurredOn">Date</Label>
                  <Input id="occurredOn" name="occurredOn" type="date" required defaultValue={anchorIso} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Note (optional)</Label>
                <Input id="notes" name="notes" placeholder="What was this expense?" />
              </div>
              <SubmitButton label="Save expense" pendingLabel="Saving..." className="w-full sm:w-auto" />
            </ActionForm>
          )}
        </ModalShell>
      ) : null}

      {activeModal === "income" ? (
        <ModalShell title="Add Income" description="Record income in the current life chapter." onClose={closeModal}>
          <ActionForm action={createIncomeFormAction} className="space-y-4" onSuccess={closeModal}>
            <input type="hidden" name="returnPath" value={baseHref} />
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="incomeAmount">Amount</Label>
                <Input id="incomeAmount" name="amount" type="number" min={0} step="0.01" required placeholder="0.00" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="incomeOccurredOn">Date</Label>
                <Input id="incomeOccurredOn" name="occurredOn" type="date" required defaultValue={anchorIso} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="incomeNotes">Source or note (optional)</Label>
              <Input id="incomeNotes" name="notes" placeholder="e.g. Salary, freelance invoice" />
            </div>
            <SubmitButton label="Save income" pendingLabel="Saving..." className="w-full sm:w-auto" />
          </ActionForm>
        </ModalShell>
      ) : null}

      {activeModal === "income-source" ? (
        <ModalShell title="Add income source" description="Create a recurring income stream with a start date and optional end date." onClose={closeModal}>
          <ActionForm action={createIncomeSourceFormAction} className="space-y-4" onSuccess={closeModal}>
            <input type="hidden" name="returnPath" value={baseHref} />
            <input type="hidden" name="isActive" value="true" />
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="incomeSourceName">Source name</Label>
                <Input id="incomeSourceName" name="name" required placeholder="Salary, client retainer, stipend..." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="incomeSourceAmount">Amount</Label>
                <Input id="incomeSourceAmount" name="amount" type="number" min={0.01} step="0.01" required placeholder="0.00" />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="incomeSourceRecurrence">Recurrence</Label>
                <Select id="incomeSourceRecurrence" name="recurrence" defaultValue="monthly">
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="incomeSourceStartDate">Start date</Label>
                <Input id="incomeSourceStartDate" name="startDate" type="date" required defaultValue={anchorIso} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="incomeSourceEndDate">End date (optional)</Label>
                <Input id="incomeSourceEndDate" name="endDate" type="date" />
                <p className="text-xs text-[#4a5f83]">Leave blank if this income source continues indefinitely.</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="incomeSourceNotes">Notes</Label>
              <Input id="incomeSourceNotes" name="notes" placeholder="Optional note" />
            </div>
            <SubmitButton label="Save income source" pendingLabel="Saving..." className="w-full sm:w-auto" />
          </ActionForm>
        </ModalShell>
      ) : null}

      {deletingExpenseId ? (
        <ModalShell
          title="Delete this expense?"
          description="This action cannot be undone."
          onClose={() => setDeletingExpenseId(null)}
        >
          <ActionForm
            action={deleteExpenseFormAction}
            className="flex items-center justify-end gap-2"
            onSuccess={() => setDeletingExpenseId(null)}
          >
            <input type="hidden" name="returnPath" value={baseHref} />
            <input type="hidden" name="expenseId" value={deletingExpenseId} />
            <button
              type="button"
              onClick={() => setDeletingExpenseId(null)}
              className="inline-flex h-10 items-center justify-center rounded-lg border border-[var(--app-panel-border)] bg-[var(--app-btn-secondary-bg)] px-4 py-2 text-sm font-medium text-[var(--app-btn-secondary-fg)] transition hover:bg-[var(--app-btn-secondary-hover)]"
            >
              Cancel
            </button>
            <SubmitButton
              label="Delete"
              pendingLabel="Deleting..."
              className="h-10 rounded-lg border border-[var(--app-panel-border)] bg-[var(--ui-badge-danger-bg)] px-4 py-2 text-sm font-medium text-[var(--ui-badge-danger-fg)] hover:brightness-95"
            />
          </ActionForm>
        </ModalShell>
      ) : null}

      {/* Edit expense modal */}
      {activeModal === "edit-expense" && editingExpense ? (
        <ModalShell title="Edit Expense" description="Update amount, category, date, or notes." onClose={closeModal}>
          {categories.length === 0 ? (
            <p className="text-sm text-[#4a5f83]">No categories available.</p>
          ) : (
            <ActionForm action={updateExpenseFormAction} className="space-y-4" onSuccess={closeModal}>
              <input type="hidden" name="returnPath" value={baseHref} />
              <input type="hidden" name="expenseId" value={editingExpense.id} />
              <div className="space-y-2">
                <Label htmlFor="editCategoryId">Category</Label>
                <Select id="editCategoryId" name="categoryId" required defaultValue={editingExpense.category_id ?? ""}>
                  <option value="">Choose category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="editAmount">Amount</Label>
                  <Input
                    id="editAmount"
                    name="amount"
                    type="number"
                    min={0}
                    step="0.01"
                    required
                    defaultValue={editingExpense.amount}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editOccurredOn">Date</Label>
                  <Input id="editOccurredOn" name="occurredOn" type="date" required defaultValue={editingExpense.occurred_on} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="editNotes">Note (optional)</Label>
                <Input id="editNotes" name="notes" placeholder="What was this expense?" defaultValue={editingExpense.notes ?? ""} />
              </div>
              <SubmitButton label="Save changes" pendingLabel="Saving..." className="w-full sm:w-auto" />
            </ActionForm>
          )}
        </ModalShell>
      ) : null}

      {activeModal === "edit-income-source" && editingIncomeSource ? (
        <ModalShell title="Edit income source" description="Update amount, recurrence, and the active date range for this source." onClose={closeModal}>
          <ActionForm action={updateIncomeSourceFormAction} className="space-y-4" onSuccess={closeModal}>
            <input type="hidden" name="returnPath" value={baseHref} />
            <input type="hidden" name="incomeSourceId" value={editingIncomeSource.id} />
            <input type="hidden" name="isActive" value={editingIncomeSource.is_active ? "true" : "false"} />
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="editIncomeSourceName">Source name</Label>
                <Input id="editIncomeSourceName" name="name" defaultValue={editingIncomeSource.name} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editIncomeSourceAmount">Amount</Label>
                <Input id="editIncomeSourceAmount" name="amount" type="number" min={0.01} step="0.01" required defaultValue={editingIncomeSource.amount} />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="editIncomeSourceRecurrence">Recurrence</Label>
                <Select id="editIncomeSourceRecurrence" name="recurrence" defaultValue={editingIncomeSource.recurrence}>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="editIncomeSourceStartDate">Start date</Label>
                <Input id="editIncomeSourceStartDate" name="startDate" type="date" required defaultValue={editingIncomeSource.start_date} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editIncomeSourceEndDate">End date (optional)</Label>
                <Input id="editIncomeSourceEndDate" name="endDate" type="date" defaultValue={editingIncomeSource.end_date ?? ""} />
                <p className="text-xs text-[#4a5f83]">Leave blank if this income source continues indefinitely.</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="editIncomeSourceNotes">Notes</Label>
              <Input id="editIncomeSourceNotes" name="notes" defaultValue={editingIncomeSource.notes ?? ""} />
            </div>
            <SubmitButton label="Save changes" pendingLabel="Saving..." className="w-full sm:w-auto" />
          </ActionForm>
        </ModalShell>
      ) : null}

      {/* Debt entry modal */}
      {activeModal === "debt-entry" ? (
        <ModalShell title="New Debt" description="Add a debt you owe or that is owed to you." onClose={closeModal}>
          <ActionForm action={createDebtFormAction} className="space-y-4" onSuccess={closeModal}>
            <input type="hidden" name="returnPath" value={baseHref} />
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="debtType">Type</Label>
                <Select id="debtType" name="type" defaultValue="owed">
                  <option value="owed">Owed to me</option>
                  <option value="owing">I owe</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="debtName">Name</Label>
                <Input id="debtName" name="name" required placeholder="Debt name" />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="principal">Amount</Label>
                <Input id="principal" name="principal" type="number" min={0} step="0.01" required placeholder="0.00" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dueDate">Due date (optional)</Label>
                <Input id="dueDate" name="dueDate" type="date" />
              </div>
            </div>
            <SubmitButton label="Save debt" pendingLabel="Saving..." className="w-full sm:w-auto" />
          </ActionForm>
        </ModalShell>
      ) : null}

      {/* Edit category modal */}
      {activeModal === "edit-category" && editingCategory ? (
        <ModalShell title="Edit category" description="Update category name and monthly limit." onClose={closeModal}>
          <ActionForm action={updateExpenseCategoryFormAction} className="space-y-4" onSuccess={closeModal}>
            <input type="hidden" name="returnPath" value={baseHref} />
            <input type="hidden" name="categoryId" value={editingCategory.id} />
            <div className="space-y-2">
              <Label htmlFor="editCategoryName">Name</Label>
              <Input id="editCategoryName" name="name" defaultValue={editingCategory.name} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editCategoryLimit">Monthly limit</Label>
              <Input
                id="editCategoryLimit"
                name="monthlyLimit"
                type="number"
                min={0}
                step={0.01}
                defaultValue={editingCategory.monthly_limit ?? ""}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editCategoryImage">Image URL</Label>
              <PexelsImagePicker inputName="imageUrl" label="Category image" defaultValue={editingCategory.image_url ?? ""} />
            </div>
            <SubmitButton label="Save changes" pendingLabel="Saving..." className="w-full sm:w-auto" />
          </ActionForm>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#d7e0f1] pt-4">
            <div className="text-xs text-[#4a5f83]">
              {editingCategory.entry_count === 0
                ? "This category is empty and can be deleted."
                : `Delete unavailable: ${editingCategory.entry_count} expense record${editingCategory.entry_count !== 1 ? "s" : ""} linked.`}
            </div>
            {editingCategory.entry_count === 0 ? (
              <ActionForm action={deleteExpenseCategoryFormAction} onSuccess={closeModal} refreshOnly>
                <input type="hidden" name="returnPath" value={baseHref} />
                <input type="hidden" name="categoryId" value={editingCategory.id} />
                <SubmitButton
                  label="Delete category"
                  pendingLabel="Deleting..."
                  className="h-10 rounded-lg border border-[#fecaca] bg-[#fef2f2] px-4 py-2 text-sm font-medium text-[#b91c1c] hover:bg-[#fee2e2]"
                />
              </ActionForm>
            ) : null}
          </div>
        </ModalShell>
      ) : null}

      {activeModal === "subscription" ? (
        <ModalShell title="Add subscription" description="Track recurring monthly or yearly bills. End date is optional for subscriptions that keep going." onClose={closeModal}>
          <ActionForm action={createSubscriptionFormAction} className="space-y-4" onSuccess={closeModal}>
            <input type="hidden" name="returnPath" value={baseHref} />
            <input type="hidden" name="isActive" value="true" />
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="subscriptionName">Name</Label>
                <Input id="subscriptionName" name="name" required placeholder="Netflix, SaaS, Gym..." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="subscriptionAmount">Amount</Label>
                <Input id="subscriptionAmount" name="amount" type="number" min={0.01} step="0.01" required placeholder="0.00" />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="subscriptionRecurrence">Recurrence</Label>
                <Select id="subscriptionRecurrence" name="recurrence" defaultValue="monthly">
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="subscriptionNextDueDate">Next due date</Label>
                <Input id="subscriptionNextDueDate" name="nextDueDate" type="date" defaultValue={anchorIso} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="subscriptionEndDate">End date (optional)</Label>
                <Input id="subscriptionEndDate" name="endDate" type="date" />
                <p className="text-xs text-[#4a5f83]">Leave blank if this subscription does not expire.</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="subscriptionNotes">Notes</Label>
              <Input id="subscriptionNotes" name="notes" placeholder="Optional note" />
            </div>
            <SubmitButton label="Save subscription" pendingLabel="Saving..." className="w-full sm:w-auto" />
          </ActionForm>
        </ModalShell>
      ) : null}

      {activeModal === "edit-subscription" && editingSubscription ? (
        <ModalShell title="Edit subscription" description="Update recurring bill details. End date is optional for subscriptions that continue indefinitely." onClose={closeModal}>
          <ActionForm action={updateSubscriptionFormAction} className="space-y-4" onSuccess={closeModal}>
            <input type="hidden" name="returnPath" value={baseHref} />
            <input type="hidden" name="subscriptionId" value={editingSubscription.id} />
            <input type="hidden" name="isActive" value={editingSubscription.is_active ? "true" : "false"} />
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="editSubscriptionName">Name</Label>
                <Input id="editSubscriptionName" name="name" defaultValue={editingSubscription.name} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editSubscriptionAmount">Amount</Label>
                <Input
                  id="editSubscriptionAmount"
                  name="amount"
                  type="number"
                  min={0.01}
                  step="0.01"
                  required
                  defaultValue={editingSubscription.amount}
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="editSubscriptionRecurrence">Recurrence</Label>
                <Select id="editSubscriptionRecurrence" name="recurrence" defaultValue={editingSubscription.recurrence}>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="editSubscriptionNextDueDate">Next due date</Label>
                <Input
                  id="editSubscriptionNextDueDate"
                  name="nextDueDate"
                  type="date"
                  defaultValue={editingSubscription.next_due_date ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editSubscriptionEndDate">End date (optional)</Label>
                <Input
                  id="editSubscriptionEndDate"
                  name="endDate"
                  type="date"
                  defaultValue={editingSubscription.end_date ?? ""}
                />
                <p className="text-xs text-[#4a5f83]">Leave blank if this subscription does not expire.</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="editSubscriptionNotes">Notes</Label>
              <Input id="editSubscriptionNotes" name="notes" defaultValue={editingSubscription.notes ?? ""} />
            </div>
            <SubmitButton label="Save changes" pendingLabel="Saving..." className="w-full sm:w-auto" />
          </ActionForm>
        </ModalShell>
      ) : null}
    </>
  );
}
