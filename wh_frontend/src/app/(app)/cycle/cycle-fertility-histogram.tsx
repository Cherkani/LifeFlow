"use client";

import { conceptionProbability } from "@/lib/cycle-calculations";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type CycleFertilityHistogramProps = {
  dayInCycle: number;
  cycleLength: number;
  ovulationDayInCycle: number;
};

type FertilityPoint = {
  day: number;
  probability: number;
  isCurrent: boolean;
};

function barColor(probability: number, isCurrent: boolean): string {
  if (isCurrent) return "#4a5f83";
  if (probability >= 27) return "#f59e0b";
  if (probability >= 16) return "#fbbf24";
  if (probability >= 10) return "#fde68a";
  return "#e5e7eb";
}

export function CycleFertilityHistogram({
  dayInCycle,
  cycleLength,
  ovulationDayInCycle
}: CycleFertilityHistogramProps) {
  const data: FertilityPoint[] = Array.from({ length: Math.min(cycleLength, 35) }, (_, i) => {
    const day = i + 1;
    const probability = conceptionProbability(day, ovulationDayInCycle);
    const isCurrent = day === Math.min(dayInCycle, cycleLength);
    return { day, probability, isCurrent };
  });

  return (
    <div className="h-full min-h-[140px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: 0 }}>
          <XAxis
            dataKey="day"
            tick={{ fill: "var(--chart-axis)", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            interval={cycleLength <= 28 ? 0 : 1}
          />
          <YAxis
            domain={[0, 40]}
            tick={{ fill: "var(--chart-axis-muted)", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${v}%`}
            width={28}
          />
          <Tooltip
            formatter={(value) => [`${Number(value ?? 0)}%`, "Chance to conceive"]}
            labelFormatter={(label) => `Day ${label}`}
            contentStyle={{
              backgroundColor: "var(--chart-tooltip-bg)",
              border: "1px solid var(--chart-tooltip-border)",
              color: "var(--chart-tooltip-text)",
              borderRadius: "8px",
              fontSize: "12px"
            }}
          />
          <Bar dataKey="probability" radius={[2, 2, 0, 0]} maxBarSize={24}>
            {data.map((entry, index) => (
              <Cell key={index} fill={barColor(entry.probability, entry.isCurrent)} stroke={entry.isCurrent ? "#4a5f83" : "transparent"} strokeWidth={2} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
