"use client";

import { phaseForDay, type CyclePhase } from "@/lib/cycle-calculations";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";

const PHASE_COLORS: Record<CyclePhase, string> = {
  menstrual: "#fda4af",
  follicular: "#7dd3fc",
  ovulation: "#fde047",
  luteal: "#c4b5fd"
};

const PHASE_STROKES: Record<CyclePhase, string> = {
  menstrual: "#fb7185",
  follicular: "#38bdf8",
  ovulation: "#facc15",
  luteal: "#a78bfa"
};

type CyclePhaseRingProps = {
  dayInCycle: number;
  cycleLength: number;
  size?: number;
};

type SegmentData = {
  day: number;
  phase: CyclePhase;
  value: number;
  isCurrent: boolean;
};

function CycleLabel({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  day,
  isCurrent,
  fontSize
}: {
  cx: number;
  cy: number;
  midAngle: number;
  innerRadius: number;
  outerRadius: number;
  day: number;
  isCurrent: boolean;
  fontSize: number;
}) {
  const RADIAN = Math.PI / 180;
  const r = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + r * Math.cos(-midAngle * RADIAN);
  const y = cy + r * Math.sin(-midAngle * RADIAN);
  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      dominantBaseline="middle"
      fontSize={fontSize}
      fontWeight={isCurrent ? 700 : 500}
      fill={isCurrent ? "#3a4868" : "#4a5f83"}
      className="select-none"
    >
      {day}
    </text>
  );
}

export function CyclePhaseRing({
  dayInCycle,
  cycleLength,
  size = 200
}: CyclePhaseRingProps) {
  const segments: SegmentData[] = Array.from({ length: Math.min(cycleLength, 35) }, (_, i) => {
    const day = i + 1;
    const phase = phaseForDay(day, cycleLength);
    const isCurrent = day === Math.min(dayInCycle, cycleLength);
    return { day, phase, value: 1, isCurrent };
  });

  const fontSize = cycleLength <= 28 ? 10 : cycleLength <= 35 ? 9 : 8;
  const outerRadius = (size - 24) / 2;
  const innerRadius = outerRadius - 12;

  return (
    <div className="relative inline-flex flex-col items-center">
      <div style={{ width: size, height: size }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={segments}
              dataKey="value"
              cx="50%"
              cy="50%"
              innerRadius={innerRadius}
              outerRadius={outerRadius}
              paddingAngle={1}
              startAngle={90}
              endAngle={-270}
              labelLine={false}
              label={({ cx, cy, midAngle, innerRadius, outerRadius, payload }) => (
                <CycleLabel
                  cx={cx ?? 0}
                  cy={cy ?? 0}
                  midAngle={midAngle ?? 0}
                  innerRadius={innerRadius ?? 0}
                  outerRadius={outerRadius ?? 0}
                  day={payload?.day ?? 0}
                  isCurrent={payload?.isCurrent ?? false}
                  fontSize={fontSize}
                />
              )}
            >
              {segments.map((entry, index) => (
                <Cell
                  key={index}
                  fill={entry.isCurrent ? PHASE_STROKES[entry.phase] : PHASE_COLORS[entry.phase]}
                  stroke={entry.isCurrent ? PHASE_STROKES[entry.phase] : "transparent"}
                  strokeWidth={entry.isCurrent ? 2 : 0}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-xs font-medium text-[#4a5f83]">
        Day {dayInCycle > 0 ? dayInCycle : "?"} of {cycleLength}
      </p>
    </div>
  );
}
