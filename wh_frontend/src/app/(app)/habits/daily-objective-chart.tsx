"use client";

import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { TooltipContentProps } from "recharts";
import type { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent";

import { formatHoursFromMinutes } from "@/app/(app)/habits/chart-utils";

type DailyObjectiveBreakdown = {
  objectiveId: string;
  label: string;
  plannedMinutes: number;
  doneMinutes: number;
  doneWithinPlan: number;
  remainingMinutes: number;
  overrunMinutes: number;
};

type DailyObjectivePoint = {
  day: string;
  plannedMinutes: number;
  doneWithinPlan: number;
  remainingMinutes: number;
  overrunMinutes: number;
  doneMinutes: number;
  objectives: DailyObjectiveBreakdown[];
};

type DailyObjectiveChartProps = {
  data: DailyObjectivePoint[];
};

/* Execution: platform soft; overrun = strong purple. */
const chartColors = {
  done: "#4a6ba3",
  remaining: "#b8c9e4",
  overrun: "#6d4fc2"
} as const;

function DailyChartTooltip({ active, payload, label }: TooltipContentProps<ValueType, NameType>) {
  if (!active || !payload?.length) return null;
  const safePayload = payload.filter((item) => typeof item.value === "number");
  const remaining = safePayload.find((item) => item.dataKey === "remainingMinutes");
  const done = safePayload.find((item) => item.dataKey === "doneWithinPlan");
  const overrun = safePayload.find((item) => item.dataKey === "overrunMinutes");
  const plannedValue = Number((remaining?.payload as DailyObjectivePoint)?.plannedMinutes ?? 0);
  const doneValue = Number((done?.value as number) ?? 0);
  const overrunValue = Number((overrun?.value as number) ?? 0);
  const remainingValue = Number((remaining?.value as number) ?? 0);
  const completion = plannedValue > 0 ? Math.round((Math.min(doneValue, plannedValue) / plannedValue) * 100) : doneValue > 0 ? 100 : 0;

  return (
    <div className="rounded-lg border border-[#d7e0f1] bg-white px-3 py-2 text-xs text-[#1f2b4d] shadow-lg">
      <p className="font-semibold">{label}</p>
      <p className="text-[11px] uppercase text-[#6b7da1]">Completion {completion}%</p>
      <div className="mt-1 space-y-1">
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1 font-medium">
            <span className="inline-block size-2.5 rounded-full" style={{ background: chartColors.done }} />
            Done
          </span>
          <span>{formatHoursFromMinutes(doneValue)}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1 font-medium">
            <span className="inline-block size-2.5 rounded-full" style={{ background: chartColors.remaining }} />
            Remaining
          </span>
          <span>{formatHoursFromMinutes(remainingValue)}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1 font-medium">
            <span className="inline-block size-2.5 rounded-full" style={{ background: chartColors.overrun }} />
            Overrun
          </span>
          <span>{formatHoursFromMinutes(overrunValue)}</span>
        </div>
      </div>
    </div>
  );
}

export function DailyObjectiveChart({ data }: DailyObjectiveChartProps) {
  const objectiveOptions = useMemo(() => {
    const seen = new Map<string, string>();
    data.forEach((day) => {
      day.objectives.forEach((objective) => {
        if (!seen.has(objective.objectiveId)) {
          seen.set(objective.objectiveId, objective.label);
        }
      });
    });
    return Array.from(seen.entries()).map(([id, label]) => ({ id, label }));
  }, [data]);
  const allObjectiveIds = useMemo(() => objectiveOptions.map((option) => option.id), [objectiveOptions]);
  const [selectedObjectives, setSelectedObjectives] = useState<string[]>(allObjectiveIds);

  useEffect(() => {
    setSelectedObjectives(allObjectiveIds);
  }, [allObjectiveIds]);

  const selectedSet = useMemo(() => new Set(selectedObjectives), [selectedObjectives]);
  const chartRows = useMemo(() => {
    return data.map((day) => {
      const contributions =
        selectedSet.size === 0 ? [] : day.objectives.filter((objective) => selectedSet.has(objective.objectiveId));
      const plannedMinutes = contributions.reduce((sum, entry) => sum + entry.plannedMinutes, 0);
      const doneWithinPlan = contributions.reduce((sum, entry) => sum + entry.doneWithinPlan, 0);
      const remainingMinutes = contributions.reduce((sum, entry) => sum + entry.remainingMinutes, 0);
      const overrunMinutes = contributions.reduce((sum, entry) => sum + entry.overrunMinutes, 0);
      const doneMinutes = contributions.reduce((sum, entry) => sum + entry.doneMinutes, 0);
      return {
        day: day.day,
        plannedMinutes,
        doneWithinPlan,
        remainingMinutes,
        overrunMinutes,
        doneMinutes
      };
    });
  }, [data, selectedSet]);

  const selectionTotals = useMemo(() => {
    return chartRows.reduce(
      (acc, row) => {
        acc.plannedMinutes += row.plannedMinutes;
        acc.doneMinutes += row.doneMinutes;
        acc.overrunMinutes += row.overrunMinutes;
        return acc;
      },
      { plannedMinutes: 0, doneMinutes: 0, overrunMinutes: 0 }
    );
  }, [chartRows]);
  const completionRate =
    selectionTotals.plannedMinutes > 0
      ? Math.round((Math.min(selectionTotals.doneMinutes, selectionTotals.plannedMinutes) / selectionTotals.plannedMinutes) * 100)
      : selectionTotals.doneMinutes > 0
        ? 100
        : 0;

  const bestDay = useMemo(() => {
    if (!chartRows.length) return null;
    return chartRows.reduce((prev, current) => (current.doneMinutes > prev.doneMinutes ? current : prev));
  }, [chartRows]);
  const toughestDay = useMemo(() => {
    if (!chartRows.length) return null;
    return chartRows.reduce((prev, current) => (current.doneMinutes < prev.doneMinutes ? current : prev));
  }, [chartRows]);

  const noObjectivesAvailable = objectiveOptions.length === 0;
  const hasSelection = selectedObjectives.length > 0 && !noObjectivesAvailable;
  const handleToggleObjective = (objectiveId: string) => {
    setSelectedObjectives((previous) => {
      if (previous.includes(objectiveId)) {
        return previous.filter((id) => id !== objectiveId);
      }
      return [...previous, objectiveId];
    });
  };
  const allSelected = hasSelection && selectedObjectives.length === allObjectiveIds.length;
  const toggleAll = () => {
    setSelectedObjectives(allSelected ? [] : allObjectiveIds);
  };

  return (
    <div className="rounded-xl border border-[var(--app-panel-border)] bg-[var(--app-panel-bg-soft)] p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-[var(--app-text-muted)]">
        <span className="font-medium">Objectives:</span>
        {noObjectivesAvailable ? (
          <span className="text-[#8e9bb8]">None logged yet.</span>
        ) : (
          <>
            <button
              type="button"
              className={[
                "rounded-full border px-2.5 py-1 font-semibold transition",
                allSelected ? "border-[#3b4b7a] bg-white text-[#1f2b4d]" : "border-[#c7d3e8] bg-[#edf3ff] text-[#4a5f83]"
              ].join(" ")}
              onClick={toggleAll}
            >
              All
            </button>
            {objectiveOptions.map((objective) => {
              const isActive = selectedObjectives.includes(objective.id);
              return (
                <button
                  key={objective.id}
                  type="button"
                  className={[
                    "rounded-full border px-2.5 py-1 font-semibold transition",
                    isActive ? "border-[#3b4b7a] bg-white text-[#1f2b4d]" : "border-[#c7d3e8] bg-[#edf3ff] text-[#4a5f83]"
                  ].join(" ")}
                  onClick={() => handleToggleObjective(objective.id)}
                >
                  {objective.label}
                </button>
              );
            })}
          </>
        )}
      </div>

      {!hasSelection ? (
        <p className="text-sm text-[var(--app-text-muted)]">Select at least one objective to see the per-day breakdown.</p>
      ) : (
        <>
          <div className="mb-3 grid gap-2 text-xs text-[var(--app-text-strong)] md:grid-cols-4">
            <div className="rounded-lg border border-[var(--app-panel-border)] bg-[var(--app-panel-bg)] p-3">
              <p className="text-[11px] uppercase text-[var(--app-text-muted)]">Planned</p>
              <p className="text-lg font-semibold">{formatHoursFromMinutes(selectionTotals.plannedMinutes)}</p>
            </div>
            <div className="rounded-lg border border-[var(--app-panel-border)] bg-[var(--app-panel-bg)] p-3">
              <p className="text-[11px] uppercase text-[var(--app-text-muted)]">Done</p>
              <p className="text-lg font-semibold">{formatHoursFromMinutes(selectionTotals.doneMinutes)}</p>
            </div>
            <div className="rounded-lg border border-[var(--app-panel-border)] bg-[var(--app-panel-bg)] p-3">
              <p className="text-[11px] uppercase text-[var(--app-text-muted)]">Overrun</p>
              <p className="text-lg font-semibold">{formatHoursFromMinutes(selectionTotals.overrunMinutes)}</p>
            </div>
            <div className="rounded-lg border border-[var(--app-panel-border)] bg-[var(--app-panel-bg)] p-3">
              <p className="text-[11px] uppercase text-[var(--app-text-muted)]">Completion</p>
              <p className="text-lg font-semibold">{completionRate}%</p>
            </div>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartRows} margin={{ top: 8, right: 12, bottom: 8, left: 0 }}>
                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="var(--chart-grid)" />
                <XAxis dataKey="day" tick={{ fontSize: 12, fill: "var(--chart-axis)" }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 11, fill: "var(--chart-axis-muted)" }}
                  tickFormatter={(value) => formatHoursFromMinutes(value as number)}
                  width={60}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip cursor={{ fill: "#edf3ff" }} content={DailyChartTooltip} />
                <Bar dataKey="doneWithinPlan" stackId="time" name="Done" fill={chartColors.done} radius={[4, 4, 0, 0]} />
                <Bar dataKey="remainingMinutes" stackId="time" name="Remaining" fill={chartColors.remaining} />
                <Bar dataKey="overrunMinutes" stackId="time" name="Overrun" fill={chartColors.overrun} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-3 text-[11px] font-semibold text-[var(--app-text-muted)]">
            <span className="inline-flex items-center gap-1 rounded-full border border-[var(--app-panel-border)] bg-[var(--app-panel-bg)] px-2.5 py-1">
              <span className="inline-block size-2 rounded-full" style={{ background: chartColors.done }} />
              Done
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-[var(--app-panel-border)] bg-[var(--app-panel-bg)] px-2.5 py-1">
              <span className="inline-block size-2 rounded-full" style={{ background: chartColors.remaining }} />
              Remaining
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-[var(--app-panel-border)] bg-[var(--app-panel-bg)] px-2.5 py-1">
              <span className="inline-block size-2 rounded-full" style={{ background: chartColors.overrun }} />
              Overrun
            </span>
          </div>

          {bestDay && toughestDay ? (
            <div className="mt-3 grid gap-2 text-xs text-[var(--app-text-muted)] md:grid-cols-2">
              <div className="rounded-lg border border-[var(--app-panel-border)] bg-[var(--app-panel-bg)] p-3">
                <p className="text-[11px] uppercase text-[var(--app-text-muted)]">Strongest day</p>
                <p className="font-semibold text-[var(--app-text-strong)]">{bestDay.day}</p>
                <p>
                  {formatHoursFromMinutes(bestDay.doneMinutes)} done / {formatHoursFromMinutes(bestDay.plannedMinutes)} planned
                </p>
              </div>
              <div className="rounded-lg border border-[var(--app-panel-border)] bg-[var(--app-panel-bg)] p-3">
                <p className="text-[11px] uppercase text-[var(--app-text-muted)]">Needs attention</p>
                <p className="font-semibold text-[var(--app-text-strong)]">{toughestDay.day}</p>
                <p>
                  {formatHoursFromMinutes(toughestDay.doneMinutes)} done / {formatHoursFromMinutes(toughestDay.plannedMinutes)} planned
                </p>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
