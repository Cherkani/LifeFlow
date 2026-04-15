"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import { formatMoneyDhs } from "@/lib/utils";

type DailyExpensePoint = {
  day: string;
  amount: number;
};

type CategoryPoint = {
  name: string;
  spent: number;
  limit: number;
};

type FinanceChartsProps = {
  dailyExpenses: DailyExpensePoint[];
  categories: CategoryPoint[];
  currencyCode: string;
};

export function FinanceCharts({ dailyExpenses, categories, currencyCode }: FinanceChartsProps) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <div className="rounded-xl border border-[var(--app-panel-border)] bg-[var(--app-panel-bg-soft)] p-4">
        <p className="mb-3 text-sm font-semibold text-[var(--app-text-strong)]">Daily expenses histogram</p>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dailyExpenses}>
              <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="var(--chart-grid)" />
              <XAxis dataKey="day" tick={{ fill: "var(--chart-axis)", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fill: "var(--chart-axis-muted)", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value) => formatMoneyDhs(Number(value ?? 0))}
                />
              <Tooltip formatter={(value) => [formatMoneyDhs(Number(value ?? 0)), "Spent"]} />
              <Legend />
              <Bar dataKey="amount" name="Spent" fill="#8d3d3d" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-xl border border-[var(--app-panel-border)] bg-[var(--app-panel-bg-soft)] p-4">
        <p className="mb-3 text-sm font-semibold text-[var(--app-text-strong)]">Category spend vs limit</p>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={categories}>
              <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="var(--chart-grid)" />
              <XAxis dataKey="name" tick={{ fill: "var(--chart-axis)", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fill: "var(--chart-axis-muted)", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value) => formatMoneyDhs(Number(value ?? 0))}
                />
              <Tooltip
                formatter={(value, name) => [
                  formatMoneyDhs(Number(value ?? 0)),
                  String(name) === "spent" ? "Spent" : "Limit"
                ]}
              />
              <Legend />
              <Bar dataKey="spent" name="Spent" fill="#0b1f3b" radius={[6, 6, 0, 0]} />
              <Line type="monotone" dataKey="limit" name="Limit" stroke="#d39a6a" strokeWidth={3} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
