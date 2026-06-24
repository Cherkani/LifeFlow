"use client";

import { AlertTriangle, ArrowDownRight, ArrowUpRight, CalendarClock, CircleGauge, CreditCard, WalletCards } from "lucide-react";
import type { ReactNode } from "react";

import { FinanceCharts } from "./finance-charts";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatMoneyDhs } from "@/lib/utils";

type CategoryReport = {
  id: string;
  name: string;
  spent: number;
  periodLimit: number;
  remaining: number;
  utilization: number;
  over: boolean;
};

type CashFlowPoint = { day: string; income: number; expense: number; net: number; cumulative: number };

export function FinanceReport({
  income,
  expenses,
  net,
  periodBudget,
  budgetRemaining,
  budgetUtilization,
  savingsRate,
  unbudgetedSpend,
  debtPayments,
  actualOutput,
  committedOutput,
  netAfterDebtPayments,
  netAfterCommittedOutput,
  dueSubscriptions,
  recurringMonthlyCost,
  openDebtTotal,
  categories,
  cashFlow,
  dailyExpenses,
  categoryChart,
  subscriptions
}: {
  income: number;
  expenses: number;
  net: number;
  periodBudget: number;
  budgetRemaining: number;
  budgetUtilization: number;
  savingsRate: number | null;
  unbudgetedSpend: number;
  debtPayments: number;
  actualOutput: number;
  committedOutput: number;
  netAfterDebtPayments: number;
  netAfterCommittedOutput: number;
  dueSubscriptions: number;
  recurringMonthlyCost: number;
  openDebtTotal: number;
  categories: CategoryReport[];
  cashFlow: CashFlowPoint[];
  dailyExpenses: Array<{ day: string; amount: number }>;
  categoryChart: Array<{ name: string; spent: number; limit: number }>;
  subscriptions: Array<{ day: string; amount: number }>;
}) {
  const overBudget = periodBudget > 0 && budgetRemaining < 0;
  const budgetProgress = Math.min(Math.max(budgetUtilization, 0), 100);
  const budgetedCategories = categories.filter((category) => category.periodLimit > 0);
  const committedNetNegative = netAfterCommittedOutput < 0;

  return (
    <section className="space-y-4" aria-label="Income, spending, and budget report">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <ReportCard title="Income" value={formatMoneyDhs(income)} detail="Money received in this period" tone="positive" icon={<ArrowDownRight size={18} />} />
        <ReportCard title="Actual output" value={formatMoneyDhs(actualOutput)} detail={`${formatMoneyDhs(expenses)} expenses + ${formatMoneyDhs(debtPayments)} debt payments`} tone="negative" icon={<ArrowUpRight size={18} />} />
        <ReportCard title="Net after debt" value={formatMoneyDhs(netAfterDebtPayments)} detail={netAfterDebtPayments >= 0 ? "Income covers expenses and debt payments" : "Cash out is above income"} tone={netAfterDebtPayments >= 0 ? "positive" : "negative"} icon={<WalletCards size={18} />} />
        <ReportCard title="Savings rate" value={savingsRate === null ? "No income" : `${savingsRate.toFixed(1)}%`} detail={`Ledger net: ${formatMoneyDhs(net)}`} tone={savingsRate !== null && savingsRate >= 0 ? "positive" : "negative"} icon={<CircleGauge size={18} />} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ReportCard title="Due subscriptions" value={formatMoneyDhs(dueSubscriptions)} detail={`${formatMoneyDhs(recurringMonthlyCost)} recurring monthly run-rate`} tone={dueSubscriptions > 0 ? "negative" : "positive"} icon={<CalendarClock size={18} />} />
        <ReportCard title="Committed output" value={formatMoneyDhs(committedOutput)} detail="Actual output plus subscriptions due in period" tone={committedOutput > income ? "negative" : "positive"} icon={<CreditCard size={18} />} />
        <ReportCard title="Open debt balance" value={formatMoneyDhs(openDebtTotal)} detail="Remaining open liability in this context" tone={openDebtTotal > 0 ? "negative" : "positive"} icon={<AlertTriangle size={18} />} />
      </div>

      <Card className={committedNetNegative ? "border-rose-200" : "border-emerald-200"}>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>Input / output after obligations</CardTitle>
              <p className="mt-1 text-sm text-[var(--app-text-muted)]">Checks income against logged expenses, debt payments, and subscriptions due in this period.</p>
            </div>
            <Badge variant={committedNetNegative ? "danger" : "secondary"}>{committedNetNegative ? "Needs attention" : "Covered"}</Badge>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MiniMetric label="Input" value={formatMoneyDhs(income)} />
          <MiniMetric label="Actual output" value={formatMoneyDhs(actualOutput)} danger={actualOutput > income} />
          <MiniMetric label="Scheduled output" value={formatMoneyDhs(dueSubscriptions)} danger={dueSubscriptions > 0} />
          <MiniMetric label="Net after all" value={formatMoneyDhs(netAfterCommittedOutput)} danger={committedNetNegative} />
        </CardContent>
      </Card>

      <Card className={overBudget ? "border-rose-200" : "border-emerald-200"}>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>Budget health</CardTitle>
              <p className="mt-1 text-sm text-[var(--app-text-muted)]">Monthly category limits are prorated to the selected dates.</p>
            </div>
            <Badge variant={overBudget ? "danger" : periodBudget > 0 ? "secondary" : "warning"}>
              {periodBudget <= 0 ? "No budget configured" : overBudget ? "Over budget" : "Within budget"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MiniMetric label="Period allowance" value={formatMoneyDhs(periodBudget)} />
            <MiniMetric label={overBudget ? "Over by" : "Remaining"} value={formatMoneyDhs(Math.abs(budgetRemaining))} danger={overBudget} />
            <MiniMetric label="Budget used" value={periodBudget > 0 ? `${budgetUtilization.toFixed(1)}%` : "—"} danger={overBudget} />
            <MiniMetric label="Unbudgeted spend" value={formatMoneyDhs(unbudgetedSpend)} danger={unbudgetedSpend > 0} />
          </div>
          {periodBudget > 0 ? <Progress value={budgetProgress} /> : null}
          {unbudgetedSpend > 0 ? (
            <p className="flex items-center gap-2 text-sm text-amber-700"><AlertTriangle size={15} />Some spending belongs to categories without a monthly limit.</p>
          ) : null}
        </CardContent>
      </Card>

      <FinanceCharts dailyExpenses={dailyExpenses} categories={categoryChart} subscriptions={subscriptions} cashFlow={cashFlow} />

      <Card>
        <CardHeader><CardTitle>Budget variance by category</CardTitle></CardHeader>
        <CardContent>
          {budgetedCategories.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-left text-sm">
                <thead className="border-b border-[var(--app-panel-border)] text-xs uppercase text-[var(--app-text-muted)]">
                  <tr><th className="py-2 pr-3">Category</th><th className="px-3 py-2">Spent</th><th className="px-3 py-2">Allowance</th><th className="px-3 py-2">Variance</th><th className="pl-3 py-2">Status</th></tr>
                </thead>
                <tbody>
                  {[...budgetedCategories].sort((a, b) => b.utilization - a.utilization).map((category) => (
                    <tr key={category.id} className="border-b border-[var(--app-panel-border)] last:border-0">
                      <td className="py-3 pr-3 font-medium text-[var(--app-text-strong)]">{category.name}</td>
                      <td className="px-3 py-3">{formatMoneyDhs(category.spent)}</td>
                      <td className="px-3 py-3">{formatMoneyDhs(category.periodLimit)}</td>
                      <td className={`px-3 py-3 font-medium ${category.remaining < 0 ? "text-rose-700" : "text-emerald-700"}`}>{category.remaining < 0 ? "−" : "+"}{formatMoneyDhs(Math.abs(category.remaining))}</td>
                      <td className="py-3 pl-3"><Badge variant={category.over ? "danger" : category.utilization >= 80 ? "warning" : "secondary"}>{category.utilization.toFixed(0)}%</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="text-sm text-[var(--app-text-muted)]">Set monthly category limits to unlock budget variance reporting.</p>}
        </CardContent>
      </Card>
    </section>
  );
}

function ReportCard({ title, value, detail, tone, icon }: { title: string; value: string; detail: string; tone: "positive" | "negative"; icon: ReactNode }) {
  return <Card><CardContent className="py-4"><div className={`mb-3 inline-flex size-9 items-center justify-center rounded-lg ${tone === "positive" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>{icon}</div><p className="text-xs font-medium uppercase tracking-wide text-[var(--app-text-muted)]">{title}</p><p className={`mt-1 text-2xl font-semibold ${tone === "positive" ? "text-emerald-700" : "text-rose-700"}`}>{value}</p><p className="mt-1 text-xs text-[var(--app-text-muted)]">{detail}</p></CardContent></Card>;
}

function MiniMetric({ label, value, danger = false }: { label: string; value: string; danger?: boolean }) {
  return <div className="rounded-lg bg-[var(--app-panel-bg-soft)] p-3"><p className="text-xs uppercase text-[var(--app-text-muted)]">{label}</p><p className={`mt-1 text-lg font-semibold ${danger ? "text-rose-700" : "text-[var(--app-text-strong)]"}`}>{value}</p></div>;
}
