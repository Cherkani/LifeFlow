"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

type WeeklyPoint = {
  day: string;
  plannedHours: number;
  doneHours: number;
  completion: number;
};

type MonthlyPoint = {
  day: string;
  plannedHours: number;
  doneHours: number;
  expense: number;
};

type ExpenseCategoryPoint = {
  name: string;
  spent: number;
};

type AnalyticsChartsProps = {
  weekly: WeeklyPoint[];
  monthly: MonthlyPoint[];
  expenseCategories: ExpenseCategoryPoint[];
  currencyCode: string;
};

const pieColors = ["#0b1f3b", "#274881", "#4f6fa8", "#7e9ac8", "#a7bde0", "#d7e2f5"];

function money(amount: number, currencyCode: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 2
  }).format(amount);
}

export function AnalyticsCharts({ weekly, monthly, expenseCategories, currencyCode }: AnalyticsChartsProps) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-xl border border-[#c7d3e8] bg-[#f8fbff] p-4">
          <p className="mb-3 text-sm font-semibold text-[#0c1d3c]">Weekly Planned vs Done (Hours)</p>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekly}>
                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#d7e0f1" />
                <XAxis dataKey="day" tick={{ fill: "#4a5f83", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#6b7da1", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(value, name) => [Number(value ?? 0).toFixed(1), String(name)]} />
                <Legend />
                <Bar dataKey="plannedHours" name="Planned" fill="#d39a6a" radius={[6, 6, 0, 0]} />
                <Bar dataKey="doneHours" name="Done" fill="#0b1f3b" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-[#c7d3e8] bg-[#f8fbff] p-4">
          <p className="mb-3 text-sm font-semibold text-[#0c1d3c]">Weekly Completion % by Day</p>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weekly}>
                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#d7e0f1" />
                <XAxis dataKey="day" tick={{ fill: "#4a5f83", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fill: "#6b7da1", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(value) => [`${Number(value ?? 0)}%`, "Completion"]} />
                <Line type="monotone" dataKey="completion" stroke="#0b1f3b" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <div className="rounded-xl border border-[#c7d3e8] bg-[#f8fbff] p-4">
          <p className="mb-3 text-sm font-semibold text-[#0c1d3c]">Monthly Trend (Hours + Expenses)</p>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthly}>
                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#d7e0f1" />
                <XAxis dataKey="day" tick={{ fill: "#4a5f83", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="left" tick={{ fill: "#6b7da1", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="right" orientation="right" tick={{ fill: "#6b7da1", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(value, name) => {
                    if (String(name) === "Expense") {
                      return [money(Number(value ?? 0), currencyCode), "Expense"];
                    }
                    return [Number(value ?? 0).toFixed(1), String(name)];
                  }}
                />
                <Legend />
                <Area yAxisId="left" type="monotone" dataKey="plannedHours" name="Planned Hours" stroke="#d39a6a" fill="#efd0b6" fillOpacity={0.8} />
                <Area yAxisId="left" type="monotone" dataKey="doneHours" name="Done Hours" stroke="#0b1f3b" fill="#c8d6f0" fillOpacity={0.9} />
                <Line yAxisId="right" type="monotone" dataKey="expense" name="Expense" stroke="#8d3d3d" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-[#c7d3e8] bg-[#f8fbff] p-4">
          <p className="mb-3 text-sm font-semibold text-[#0c1d3c]">Expense Split by Category</p>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip formatter={(value) => [money(Number(value ?? 0), currencyCode), "Spent"]} />
                <Legend />
                <Pie data={expenseCategories} dataKey="spent" nameKey="name" innerRadius={55} outerRadius={95} paddingAngle={2}>
                  {expenseCategories.map((entry, index) => (
                    <Cell key={entry.name} fill={pieColors[index % pieColors.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
