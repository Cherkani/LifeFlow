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

function money(amount: number, currencyCode: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 0
  }).format(amount);
}

export function FinanceCharts({ dailyExpenses, categories, currencyCode }: FinanceChartsProps) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <div className="rounded-xl border border-[#c7d3e8] bg-[#f8fbff] p-4">
        <p className="mb-3 text-sm font-semibold text-[#0c1d3c]">Daily expenses histogram</p>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dailyExpenses}>
              <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#d7e0f1" />
              <XAxis dataKey="day" tick={{ fill: "#4a5f83", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fill: "#6b7da1", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => money(Number(value ?? 0), currencyCode)}
              />
              <Tooltip formatter={(value) => [money(Number(value ?? 0), currencyCode), "Spent"]} />
              <Legend />
              <Bar dataKey="amount" name="Spent" fill="#8d3d3d" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-xl border border-[#c7d3e8] bg-[#f8fbff] p-4">
        <p className="mb-3 text-sm font-semibold text-[#0c1d3c]">Category spend vs limit</p>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={categories}>
              <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#d7e0f1" />
              <XAxis dataKey="name" tick={{ fill: "#4a5f83", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fill: "#6b7da1", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => money(Number(value ?? 0), currencyCode)}
              />
              <Tooltip
                formatter={(value, name) => [
                  money(Number(value ?? 0), currencyCode),
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
