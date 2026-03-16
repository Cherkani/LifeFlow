"use client";

import { useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Pencil, Plus, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { Route } from "next";

import { FinanceCharts } from "@/app/(app)/finance/finance-charts";
import {
  createDebtFormAction,
  createDebtPaymentFormAction,
  createExpenseCategoryFormAction,
  createExpenseFormAction,
  deleteExpenseFormAction,
  updateExpenseCategoryFormAction,
  updateExpenseFormAction
} from "@/app/(app)/finance/actions";
import { ActionForm } from "@/components/forms/action-form";
import { PexelsImagePicker } from "@/components/forms/pexels-image-picker";
import { SubmitButton } from "@/components/forms/submit-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ModalShell } from "@/components/ui/modal-shell";
import { SectionHeader } from "@/components/ui/section-header";
import { Select } from "@/components/ui/select";

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
};

type ExpenseRow = {
  id: string;
  category_id: string | null;
  amount: number;
  occurred_on: string;
  notes: string | null;
};

type PeriodExpenseRow = {
  id: string;
  category_id: string | null;
  amount: number;
  occurred_on: string;
};

function money(amount: number, currencyCode: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 2
  }).format(amount);
}

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
    dates.push(cursor.toISOString().slice(0, 10));
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
  tab: "expenses" | "debts";
  period: "day" | "week" | "month";
  anchorIso: string;
  categories: CategoryRow[];
  openDebts: DebtRow[];
  categoryMetrics: Array<{ id: string; name: string; spent: number; limit: number; over: boolean }>;
  categoryNameById: Record<string, string>;
  debtNameById: Record<string, string>;
  recentExpenses: ExpenseRow[];
  periodExpenses: PeriodExpenseRow[];
  payments: PaymentRow[];
  debts: DebtRow[];
  dailyChartData: Array<{ day: string; amount: number }>;
  categoryChartData: Array<{ name: string; spent: number; limit: number }>;
  totalSpent: number;
  averageDaySpend: number;
  topDay: [string, number] | undefined;
  overLimitCount: number;
  openDebtTotal: number;
  periodPaymentsTotal: number;
  rangeStartIso: string;
  rangeEndIso: string;
  previousAnchorIso: string;
  nextAnchorIso: string;
  currencyCode: string;
};

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
  periodExpenses,
  payments,
  debts,
  dailyChartData,
  categoryChartData,
  totalSpent,
  averageDaySpend,
  topDay,
  overLimitCount,
  openDebtTotal,
  periodPaymentsTotal,
  rangeStartIso,
  rangeEndIso,
  previousAnchorIso,
  nextAnchorIso,
  currencyCode
}: FinanceModalsProps) {
  const [activeModal, setActiveModal] = useState<
    "expense" | "edit-expense" | "debt-entry" | "expense-category" | "edit-category" | null
  >(null);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [debtEntryMode, setDebtEntryMode] = useState<"debt" | "payment">("debt");
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [recentSearch, setRecentSearch] = useState("");

  const editingExpense = editingExpenseId ? recentExpenses.find((e) => e.id === editingExpenseId) ?? null : null;

  const baseHref = buildFinanceHref({ tab, period, anchor: anchorIso });
  const editingCategory = editingCategoryId ? categories.find((c) => c.id === editingCategoryId) : null;
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
    setActiveCategoryId(null);
  };

  return (
    <>
      <SectionHeader
        title="Finance Command"
        description="Track monthly spending with rich charts and manage debt operations in one place."
        action={
          <div className="flex flex-wrap gap-2">
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
              onClick={() => {
                setDebtEntryMode("debt");
                setActiveModal("debt-entry");
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-[#1e3a6d] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#274881]"
            >
              <Plus size={16} />
              Debt Entry
            </button>
            <button
              type="button"
              onClick={() => setActiveModal("expense-category")}
              className="inline-flex items-center gap-2 rounded-lg border border-[#c7d3e8] bg-[#edf3ff] px-3 py-2 text-sm font-semibold text-[#23406d] transition hover:bg-[#e3ebf9]"
            >
              <Plus size={16} />
              Category
            </button>
          </div>
        }
      />

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
          <div className="inline-flex rounded-lg border border-[#c7d3e8] bg-white p-1">
            <Link
              href={buildFinanceHref({ tab: "expenses", period, anchor: anchorIso }) as Route}
              className={[
                "rounded-md px-3 py-1.5 text-sm font-semibold",
                tab === "expenses" ? "bg-[#0b1f3b] text-white" : "text-[#23406d]"
              ].join(" ")}
            >
              Expenses
            </Link>
            <Link
              href={buildFinanceHref({ tab: "debts", period, anchor: anchorIso }) as Route}
              className={[
                "rounded-md px-3 py-1.5 text-sm font-semibold",
                tab === "debts" ? "bg-[#0b1f3b] text-white" : "text-[#23406d]"
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
          </div>
        </CardContent>
      </Card>

      {tab === "expenses" ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm uppercase tracking-wide text-slate-500">Period spent</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold text-rose-700">{money(totalSpent, currencyCode)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm uppercase tracking-wide text-slate-500">Average / day</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold text-[#0c1d3c]">{money(averageDaySpend, currencyCode)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm uppercase tracking-wide text-slate-500">Top spend day in period</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold text-[#0c1d3c]">
                  {topDay ? `${topDay[0]} · ${money(topDay[1], currencyCode)}` : "No data"}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm uppercase tracking-wide text-slate-500">Over-limit categories</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold text-amber-700">{overLimitCount}</p>
              </CardContent>
            </Card>
          </div>

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

          <FinanceCharts
            dailyExpenses={filteredDailyChartData}
            categories={filteredCategoryChartData}
            currencyCode={currencyCode}
          />

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
                        <Badge variant="danger">-{money(Number(entry.amount), currencyCode)}</Badge>
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
                            type="submit"
                            onClick={(e) => {
                              if (!confirm("Delete this expense?")) e.preventDefault();
                            }}
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
                              {category.limit > 0 ? `${money(category.limit, currencyCode)} limit` : "No limit set"}
                            </p>
                          </div>
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
                        <div className="flex items-center gap-2">
                          <Badge variant={category.over ? "danger" : "secondary"}>{money(category.spent, currencyCode)} spent</Badge>
                          <Badge variant="secondary">{category.limit > 0 ? "Tracked" : "Untracked"}</Badge>
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
        </>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm uppercase tracking-wide text-slate-500">Open debt</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold text-amber-700">{money(openDebtTotal, currencyCode)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm uppercase tracking-wide text-slate-500">Open debt lines</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold text-[#0c1d3c]">{openDebts.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm uppercase tracking-wide text-slate-500">Payments in period</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold text-emerald-700">{money(periodPaymentsTotal, currencyCode)}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Debt lines</CardTitle>
            </CardHeader>
            <CardContent>
              {debts.length > 0 ? (
                <div className="space-y-3">
                  {debts.map((debt) => (
                    <div key={debt.id} className="rounded-lg border border-[#c7d3e8] bg-[#f8fbff] p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-[#0c1d3c]">{debt.name}</p>
                          <p className="text-xs text-[#4a5f83]">
                            {debt.type} · {debt.status}
                            {debt.due_date ? ` · due ${debt.due_date}` : ""}
                          </p>
                        </div>
                        <Badge variant={debt.status === "open" ? "warning" : "secondary"}>
                          {money(Number(debt.remaining_balance ?? debt.principal ?? 0), currencyCode)}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[#4a5f83]">No debts yet.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent debt payments</CardTitle>
            </CardHeader>
            <CardContent>
              {payments.length > 0 ? (
                <div className="space-y-3">
                  {payments.map((payment) => (
                    <div key={payment.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#c7d3e8] bg-[#f8fbff] p-3">
                      <div>
                        <p className="text-sm font-semibold text-[#0c1d3c]">{debtNameById[payment.debt_id] ?? "Debt payment"}</p>
                        <p className="text-xs text-[#4a5f83]">
                          {payment.paid_at}
                          {payment.method ? ` · ${payment.method}` : ""}
                        </p>
                      </div>
                      <Badge variant="secondary">{money(Number(payment.amount), currencyCode)}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[#4a5f83]">No debt payments yet.</p>
              )}
            </CardContent>
          </Card>
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
                  <Input id="occurredOn" name="occurredOn" type="date" required defaultValue={toDateInputValue(new Date())} />
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

      {/* Debt entry modal */}
      {activeModal === "debt-entry" ? (
        <ModalShell title="Debt Entry" description="Create debt or record a payment in one place." onClose={closeModal}>
          <div className="mb-4 inline-flex rounded-lg border border-[#c7d3e8] bg-white p-1">
            <button
              type="button"
              onClick={() => setDebtEntryMode("debt")}
              className={["rounded-md px-3 py-1.5 text-sm font-semibold", debtEntryMode === "debt" ? "bg-[#0b1f3b] text-white" : "text-[#23406d]"].join(" ")}
            >
              New debt
            </button>
            <button
              type="button"
              onClick={() => setDebtEntryMode("payment")}
              className={["rounded-md px-3 py-1.5 text-sm font-semibold", debtEntryMode === "payment" ? "bg-[#0b1f3b] text-white" : "text-[#23406d]"].join(" ")}
            >
              Payment
            </button>
          </div>

          {debtEntryMode === "debt" ? (
            <ActionForm action={createDebtFormAction} className="space-y-4" onSuccess={closeModal}>
              <input type="hidden" name="returnPath" value={baseHref} />
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="debtType">Type</Label>
                  <Select id="debtType" name="type" defaultValue="owing">
                    <option value="owing">I owe</option>
                    <option value="owed">Owed to me</option>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="debtName">Name</Label>
                  <Input id="debtName" name="name" required placeholder="Debt name" />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="principal">Principal</Label>
                  <Input id="principal" name="principal" type="number" min={0} step="0.01" required placeholder="0.00" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="remainingBalance">Remaining</Label>
                  <Input id="remainingBalance" name="remainingBalance" type="number" min={0} step="0.01" placeholder="0.00" />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="apr">APR % (optional)</Label>
                  <Input id="apr" name="apr" type="number" min={0} step="0.001" placeholder="0" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dueDate">Due date (optional)</Label>
                  <Input id="dueDate" name="dueDate" type="date" />
                </div>
              </div>
              <SubmitButton label="Save debt" pendingLabel="Saving..." className="w-full sm:w-auto" />
            </ActionForm>
          ) : openDebts.length === 0 ? (
            <p className="text-sm text-[#4a5f83]">No open debts available.</p>
          ) : (
            <ActionForm action={createDebtPaymentFormAction} className="space-y-4" onSuccess={closeModal}>
              <input type="hidden" name="returnPath" value={baseHref} />
              <div className="space-y-2">
                <Label htmlFor="debtId">Debt</Label>
                <Select id="debtId" name="debtId" required>
                  <option value="">Choose debt</option>
                  {openDebts.map((debt) => (
                    <option key={debt.id} value={debt.id}>
                      {debt.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="paymentAmount">Amount</Label>
                  <Input id="paymentAmount" name="amount" type="number" min={0} step="0.01" required placeholder="0.00" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="paidAt">Date</Label>
                  <Input id="paidAt" name="paidAt" type="date" required defaultValue={toDateInputValue(new Date())} />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="method">Method (optional)</Label>
                  <Input id="method" name="method" placeholder="Optional" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="paymentNotes">Notes (optional)</Label>
                  <Input id="paymentNotes" name="notes" placeholder="Optional" />
                </div>
              </div>
              <SubmitButton label="Record payment" pendingLabel="Saving..." className="w-full sm:w-auto" />
            </ActionForm>
          )}
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
        </ModalShell>
      ) : null}
    </>
  );
}
