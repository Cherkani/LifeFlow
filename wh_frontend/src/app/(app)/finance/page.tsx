import { ArrowDownRight, ArrowUpRight, Plus } from "lucide-react";
import Image from "next/image";

import { FinanceCharts } from "@/app/(app)/finance/finance-charts";
import { PexelsImagePicker } from "@/components/forms/pexels-image-picker";
import { SubmitButton } from "@/components/forms/submit-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ModalShell } from "@/components/ui/modal-shell";
import { SectionHeader } from "@/components/ui/section-header";
import { Select } from "@/components/ui/select";
import { requireAppContext } from "@/lib/server-context";
import { endOfIsoWeek, startOfIsoWeek, toDateInputValue } from "@/lib/utils";

import {
  createDebtAction,
  createDebtPaymentAction,
  createExpenseAction,
  createExpenseCategoryAction
} from "./actions";

type FinanceSearchParams = Promise<{
  modal?: string;
  tab?: string;
  mode?: string;
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

type PaymentRow = {
  id: string;
  debt_id: string;
  amount: number;
  paid_at: string;
  method: string | null;
  notes: string | null;
};

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

function parseAnchorDate(raw: string | undefined) {
  if (typeof raw === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return new Date(`${raw}T00:00:00`);
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function parsePeriod(raw: string | undefined) {
  return raw === "week" ? "week" : "day";
}

function buildFinanceHref(options?: { modal?: string; tab?: string; mode?: string; period?: "day" | "week"; anchor?: string }) {
  const query = new URLSearchParams();
  if (options?.tab) query.set("tab", options.tab);
  if (options?.period) query.set("period", options.period);
  if (options?.anchor) query.set("anchor", options.anchor);
  if (options?.modal) query.set("modal", options.modal);
  if (options?.mode) query.set("mode", options.mode);
  const queryValue = query.toString();
  return queryValue.length > 0 ? `/finance?${queryValue}` : "/finance";
}

export default async function FinancePage({
  searchParams
}: {
  searchParams: FinanceSearchParams;
}) {
  const params = await searchParams;
  const tab = params.tab === "debts" ? "debts" : "expenses";
  const modal = params.modal?.trim();
  const mode = params.mode === "payment" ? "payment" : "debt";
  const period = parsePeriod(params.period);
  const anchorDate = parseAnchorDate(params.anchor);
  const rangeStartDate = period === "week" ? startOfIsoWeek(anchorDate) : anchorDate;
  const rangeEndDate = period === "week" ? endOfIsoWeek(anchorDate) : anchorDate;
  const rangeStart = toIsoDate(rangeStartDate);
  const rangeEnd = toIsoDate(rangeEndDate);
  const previousAnchorDate = new Date(anchorDate);
  previousAnchorDate.setDate(previousAnchorDate.getDate() - (period === "week" ? 7 : 1));
  const nextAnchorDate = new Date(anchorDate);
  nextAnchorDate.setDate(nextAnchorDate.getDate() + (period === "week" ? 7 : 1));

  const { supabase, account } = await requireAppContext();
  const [categoriesRes, monthExpensesRes, recentExpensesRes, debtsRes, paymentsRes] = await Promise.all([
    supabase
      .from("finance_categories")
      .select("id, name, monthly_limit, image_url")
      .eq("account_id", account.accountId)
      .eq("kind", "expense")
      .order("name"),
    supabase
      .from("ledger_entries")
      .select("id, amount, category_id, occurred_on")
      .eq("account_id", account.accountId)
      .eq("entry_type", "expense")
      .gte("occurred_on", rangeStart)
      .lte("occurred_on", rangeEnd),
    supabase
      .from("ledger_entries")
      .select("id, amount, category_id, occurred_on, notes")
      .eq("account_id", account.accountId)
      .eq("entry_type", "expense")
      .gte("occurred_on", rangeStart)
      .lte("occurred_on", rangeEnd)
      .order("occurred_on", { ascending: false })
      .limit(period === "week" ? 200 : 50),
    supabase
      .from("debts")
      .select("id, name, type, principal, remaining_balance, status, due_date")
      .eq("account_id", account.accountId)
      .order("created_at", { ascending: false }),
    supabase
      .from("debt_payments")
      .select("id, debt_id, amount, paid_at, method, notes")
      .eq("account_id", account.accountId)
      .order("paid_at", { ascending: false })
      .limit(30)
  ]);

  const categories = categoriesRes.data ?? [];
  const periodExpenses = monthExpensesRes.data ?? [];
  const recentExpenses = recentExpensesRes.data ?? [];
  const debts = (debtsRes.data ?? []) as DebtRow[];
  const payments = (paymentsRes.data ?? []) as PaymentRow[];

  const categoryNameById = new Map(categories.map((category) => [category.id, category.name]));
  const debtNameById = new Map(debts.map((debt) => [debt.id, debt.name]));

  const spentByCategory = new Map<string, number>();
  const spentByDay = new Map<string, number>();
  for (const expense of periodExpenses) {
    const categoryKey = expense.category_id ?? "";
    const spentAmount = Number(expense.amount);
    spentByCategory.set(categoryKey, (spentByCategory.get(categoryKey) ?? 0) + spentAmount);
    spentByDay.set(expense.occurred_on, (spentByDay.get(expense.occurred_on) ?? 0) + spentAmount);
  }

  const totalSpent = periodExpenses.reduce((sum, entry) => sum + Number(entry.amount), 0);
  const periodDays = period === "week" ? 7 : 1;
  const averageDaySpend = periodDays > 0 ? totalSpent / periodDays : 0;
  const topDay = [...spentByDay.entries()].sort((a, b) => b[1] - a[1])[0];

  const categoryMetrics = categories.map((category) => {
    const spent = spentByCategory.get(category.id) ?? 0;
    const limit = category.monthly_limit ? Number(category.monthly_limit) : 0;
    return {
      id: category.id,
      name: category.name,
      spent,
      limit,
      over: limit > 0 && spent > limit
    };
  });
  const overLimitCount = categoryMetrics.filter((row) => row.over).length;

  const timelineDates = Array.from({ length: periodDays }, (_, index) => {
    const date = new Date(rangeStartDate);
    date.setDate(rangeStartDate.getDate() + index);
    return date;
  });

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
      limit: Number(row.limit.toFixed(2))
    }));

  const openDebts = debts.filter((debt) => debt.status === "open");
  const openDebtTotal = openDebts.reduce((sum, debt) => sum + Number(debt.remaining_balance ?? debt.principal ?? 0), 0);
  const periodPaymentsTotal = payments
    .filter((payment) => payment.paid_at >= rangeStart && payment.paid_at <= rangeEnd)
    .reduce((sum, payment) => sum + Number(payment.amount), 0);

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Finance Command"
        description="Track spending with rich charts and manage debt operations in one place."
        action={
          <div className="flex flex-wrap gap-2">
            <a
              href={buildFinanceHref({ tab, period, anchor: toIsoDate(anchorDate), modal: "expense" })}
              className="inline-flex items-center gap-2 rounded-lg bg-[#0b1f3b] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#102a52]"
            >
              <Plus size={16} />
              Add Expense
            </a>
            <a
              href={buildFinanceHref({ tab, period, anchor: toIsoDate(anchorDate), modal: "debt-entry", mode: "debt" })}
              className="inline-flex items-center gap-2 rounded-lg bg-[#1e3a6d] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#274881]"
            >
              <Plus size={16} />
              Debt Entry
            </a>
            <a
              href={buildFinanceHref({ tab, period, anchor: toIsoDate(anchorDate), modal: "expense-category" })}
              className="inline-flex items-center gap-2 rounded-lg border border-[#c7d3e8] bg-[#edf3ff] px-3 py-2 text-sm font-semibold text-[#23406d] transition hover:bg-[#e3ebf9]"
            >
              <Plus size={16} />
              Category
            </a>
          </div>
        }
      />

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
          <div className="inline-flex rounded-lg border border-[#c7d3e8] bg-white p-1">
            <a
              href={buildFinanceHref({ tab: "expenses", period, anchor: toIsoDate(anchorDate) })}
              className={[
                "rounded-md px-3 py-1.5 text-sm font-semibold",
                tab === "expenses" ? "bg-[#0b1f3b] text-white" : "text-[#23406d]"
              ].join(" ")}
            >
              Expenses
            </a>
            <a
              href={buildFinanceHref({ tab: "debts", period, anchor: toIsoDate(anchorDate) })}
              className={[
                "rounded-md px-3 py-1.5 text-sm font-semibold",
                tab === "debts" ? "bg-[#0b1f3b] text-white" : "text-[#23406d]"
              ].join(" ")}
            >
              Debts
            </a>
          </div>

          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-lg border border-[#c7d3e8] bg-white p-1">
              <a
                href={buildFinanceHref({ tab, period: "day", anchor: toIsoDate(anchorDate) })}
                className={["rounded-md px-3 py-1.5 text-sm font-semibold", period === "day" ? "bg-[#0b1f3b] text-white" : "text-[#23406d]"].join(" ")}
              >
                Day
              </a>
              <a
                href={buildFinanceHref({ tab, period: "week", anchor: toIsoDate(anchorDate) })}
                className={["rounded-md px-3 py-1.5 text-sm font-semibold", period === "week" ? "bg-[#0b1f3b] text-white" : "text-[#23406d]"].join(" ")}
              >
                Week
              </a>
            </div>
            <a
              href={buildFinanceHref({ tab, period, anchor: toIsoDate(previousAnchorDate) })}
              className="inline-flex size-9 items-center justify-center rounded-lg border border-[#c7d3e8] bg-[#edf3ff] text-[#23406d]"
            >
              <ArrowDownRight size={16} />
            </a>
            <p className="text-sm font-semibold text-[#0c1d3c]">
              {period === "day"
                ? anchorDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                : `${rangeStartDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${rangeEndDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`}
            </p>
            <a
              href={buildFinanceHref({ tab, period, anchor: toIsoDate(nextAnchorDate) })}
              className="inline-flex size-9 items-center justify-center rounded-lg border border-[#c7d3e8] bg-[#edf3ff] text-[#23406d]"
            >
              <ArrowUpRight size={16} />
            </a>
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
                <p className="text-2xl font-semibold text-rose-700">{money(totalSpent, account.currencyCode)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm uppercase tracking-wide text-slate-500">Average / day</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold text-[#0c1d3c]">{money(averageDaySpend, account.currencyCode)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm uppercase tracking-wide text-slate-500">Top spend day in period</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold text-[#0c1d3c]">
                  {topDay ? `${topDay[0]} · ${money(topDay[1], account.currencyCode)}` : "No data"}
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

          <FinanceCharts
            dailyExpenses={dailyChartData}
            categories={categoryChartData}
            currencyCode={account.currencyCode}
          />

          <Card>
            <CardHeader>
              <CardTitle>Recent expenses</CardTitle>
            </CardHeader>
            <CardContent>
              {recentExpenses.length > 0 ? (
                <div className="space-y-3">
                  {recentExpenses.map((entry) => (
                    <div key={entry.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#c7d3e8] bg-[#f8fbff] p-3">
                      <div>
                        <p className="text-sm font-semibold text-[#0c1d3c]">{entry.notes || "Expense"}</p>
                        <p className="text-xs text-[#4a5f83]">{entry.occurred_on} · {categoryNameById.get(entry.category_id ?? "") ?? "No category"}</p>
                      </div>
                      <Badge variant="danger">-{money(Number(entry.amount), account.currencyCode)}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[#4a5f83]">No expenses yet.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Category limits (monthly)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {categories.length > 0 ? (
                categoryMetrics.map((category) => (
                  <div key={category.id} className="rounded-lg border border-[#c7d3e8] p-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        {categories.find((entry) => entry.id === category.id)?.image_url ? (
                          <div className="relative size-8 overflow-hidden rounded-md border border-[#d7e0f1] bg-white">
                            <Image
                              src={categories.find((entry) => entry.id === category.id)?.image_url as string}
                              alt={category.name}
                              fill
                              className="object-cover"
                            />
                          </div>
                        ) : null}
                        <p className="text-sm font-semibold text-[#0c1d3c]">{category.name}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={category.over ? "danger" : "secondary"}>{money(category.spent, account.currencyCode)} spent</Badge>
                        <Badge variant="secondary">{category.limit > 0 ? `${money(category.limit, account.currencyCode)} limit` : "No limit"}</Badge>
                      </div>
                    </div>
                  </div>
                ))
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
                <p className="text-2xl font-semibold text-amber-700">{money(openDebtTotal, account.currencyCode)}</p>
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
                <p className="text-2xl font-semibold text-emerald-700">{money(periodPaymentsTotal, account.currencyCode)}</p>
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
                          <p className="text-xs text-[#4a5f83]">{debt.type} · {debt.status}{debt.due_date ? ` · due ${debt.due_date}` : ""}</p>
                        </div>
                        <Badge variant={debt.status === "open" ? "warning" : "secondary"}>
                          {money(Number(debt.remaining_balance ?? debt.principal ?? 0), account.currencyCode)}
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
                        <p className="text-sm font-semibold text-[#0c1d3c]">{debtNameById.get(payment.debt_id) ?? "Debt payment"}</p>
                        <p className="text-xs text-[#4a5f83]">{payment.paid_at}{payment.method ? ` · ${payment.method}` : ""}</p>
                      </div>
                      <Badge variant="secondary">{money(Number(payment.amount), account.currencyCode)}</Badge>
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

      {modal === "expense-category" ? (
        <ModalShell title="Create Expense Category" description="Set monthly spending cap per category." closeHref={buildFinanceHref({ tab, period, anchor: toIsoDate(anchorDate) })}>
          <form action={createExpenseCategoryAction} className="space-y-4">
            <input type="hidden" name="returnPath" value={buildFinanceHref({ tab, period, anchor: toIsoDate(anchorDate) })} />
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
          </form>
        </ModalShell>
      ) : null}

      {modal === "expense" ? (
        <ModalShell title="Add Expense" description="Record what you spent." closeHref={buildFinanceHref({ tab, period, anchor: toIsoDate(anchorDate) })}>
          {categories.length === 0 ? (
            <p className="text-sm text-[#4a5f83]">Create expense category first.</p>
          ) : (
            <form action={createExpenseAction} className="space-y-4">
              <input type="hidden" name="returnPath" value={buildFinanceHref({ tab, period, anchor: toIsoDate(anchorDate) })} />
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
            </form>
          )}
        </ModalShell>
      ) : null}

      {modal === "debt-entry" ? (
        <ModalShell title="Debt Entry" description="Create debt or record a payment in one place." closeHref={buildFinanceHref({ tab, period, anchor: toIsoDate(anchorDate) })}>
          <div className="mb-4 inline-flex rounded-lg border border-[#c7d3e8] bg-white p-1">
            <a
              href={buildFinanceHref({ tab, period, anchor: toIsoDate(anchorDate), modal: "debt-entry", mode: "debt" })}
              className={["rounded-md px-3 py-1.5 text-sm font-semibold", mode === "debt" ? "bg-[#0b1f3b] text-white" : "text-[#23406d]"].join(" ")}
            >
              New debt
            </a>
            <a
              href={buildFinanceHref({ tab, period, anchor: toIsoDate(anchorDate), modal: "debt-entry", mode: "payment" })}
              className={["rounded-md px-3 py-1.5 text-sm font-semibold", mode === "payment" ? "bg-[#0b1f3b] text-white" : "text-[#23406d]"].join(" ")}
            >
              Payment
            </a>
          </div>

          {mode === "debt" ? (
            <form action={createDebtAction} className="space-y-4">
              <input type="hidden" name="returnPath" value={buildFinanceHref({ tab, period, anchor: toIsoDate(anchorDate) })} />
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
            </form>
          ) : openDebts.length === 0 ? (
            <p className="text-sm text-[#4a5f83]">No open debts available.</p>
          ) : (
            <form action={createDebtPaymentAction} className="space-y-4">
              <input type="hidden" name="returnPath" value={buildFinanceHref({ tab, period, anchor: toIsoDate(anchorDate) })} />
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
            </form>
          )}
        </ModalShell>
      ) : null}
    </div>
  );
}
