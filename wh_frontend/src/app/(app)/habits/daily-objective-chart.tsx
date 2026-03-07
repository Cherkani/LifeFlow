"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

type DailyObjectivePoint = {
  day: string;
  plannedMinutes: number;
  doneWithinPlan: number;
  remainingMinutes: number;
  overrunMinutes: number;
  doneMinutes: number;
};

type DailyObjectiveChartProps = {
  data: DailyObjectivePoint[];
};

function formatHoursFromMinutes(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes.toString().padStart(2, "0")}m`;
}

export function DailyObjectiveChart({ data }: DailyObjectiveChartProps) {
  return (
    <div className="rounded-xl border border-[#d7e0f1] bg-[#f8fbff] p-4">
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 12, bottom: 8, left: 0 }}>
            <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#d7e0f1" />
            <XAxis dataKey="day" tick={{ fontSize: 12, fill: "#4a5f83" }} axisLine={false} tickLine={false} />
            <YAxis
              tick={{ fontSize: 11, fill: "#6b7da1" }}
              tickFormatter={(value) => formatHoursFromMinutes(value as number)}
              width={60}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              cursor={{ fill: "#edf3ff" }}
              formatter={(value, name) => [formatHoursFromMinutes(Number(value ?? 0)), String(name)]}
              labelFormatter={(label) => `${label}`}
            />
            <Legend />
            <Bar dataKey="doneWithinPlan" stackId="time" name="Done" fill="#d8bb6a" radius={[4, 4, 0, 0]} />
            <Bar dataKey="remainingMinutes" stackId="time" name="Remaining" fill="#d39a6a" />
            <Bar dataKey="overrunMinutes" stackId="time" name="Overrun" fill="#9a6fe8" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-[#4a5f83] md:grid-cols-4">
        {data.map((day) => (
          <div key={day.day} className="rounded-md border border-[#d7e0f1] bg-white px-2 py-1">
            <span className="font-medium">{day.day}</span>: {formatHoursFromMinutes(day.doneMinutes)} / {formatHoursFromMinutes(day.plannedMinutes)}
          </div>
        ))}
      </div>
    </div>
  );
}
