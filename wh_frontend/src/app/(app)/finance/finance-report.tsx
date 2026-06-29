"use client";

import { AlertTriangle, ArrowUpRight, CalendarClock } from "lucide-react";
import type { ReactNode } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoneyDhs } from "@/lib/utils";

export function FinanceReport({
  expenses,
  averageDaySpend,
  topSpendDayLabel,
  recurringMonthlyCost,
  dueSubscriptionsTotal
}: {
  expenses: number;
  averageDaySpend: number;
  topSpendDayLabel: string;
  recurringMonthlyCost: number;
  dueSubscriptionsTotal: number;
}) {
  return (
    <section className="space-y-4" aria-label="Spending and budget report">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <ReportCard title="Spent" value={formatMoneyDhs(expenses)} detail="Total expenses in the selected period" tone="negative" icon={<ArrowUpRight size={18} />} />
        <ReportCard title="Subscriptions" value={formatMoneyDhs(recurringMonthlyCost)} detail={`${formatMoneyDhs(dueSubscriptionsTotal)} due in this selected period`} tone="negative" icon={<CalendarClock size={18} />} />
        <ReportCard title="Average / day" value={formatMoneyDhs(averageDaySpend)} detail="Average daily spend in this period" tone="negative" icon={<CalendarClock size={18} />} />
        <ReportCard title="Top spend day" value={topSpendDayLabel} detail="Highest single-day spending in this period" tone="negative" icon={<CalendarClock size={18} />} />
      </div>
    </section>
  );
}

function ReportCard({ title, value, detail, tone, icon }: { title: string; value: string; detail: string; tone: "positive" | "negative"; icon: ReactNode }) {
  return <Card><CardContent className="py-4"><div className={`mb-3 inline-flex size-9 items-center justify-center rounded-lg ${tone === "positive" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>{icon}</div><p className="text-xs font-medium uppercase tracking-wide text-[var(--app-text-muted)]">{title}</p><p className={`mt-1 text-2xl font-semibold ${tone === "positive" ? "text-emerald-700" : "text-rose-700"}`}>{value}</p><p className="mt-1 text-xs text-[var(--app-text-muted)]">{detail}</p></CardContent></Card>;
}
