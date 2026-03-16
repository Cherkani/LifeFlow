"use client";

import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { TooltipContentProps } from "recharts";
import type { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent";

import { formatHoursFromMinutes } from "@/app/(app)/habits/chart-utils";
import { HalfDonutChart } from "@/app/(app)/habits/half-donut-chart";

type CategoryObjectivePoint = {
  objectiveId: string;
  label: string;
  plannedMinutes: number;
  doneWithinPlan: number;
  remainingMinutes: number;
  overrunMinutes: number;
  doneMinutes: number;
};

type CategoryObjectiveChartProps = {
  data: CategoryObjectivePoint[];
};

const donutColors = ["#9a6fe8", "#d8bb6a", "#4a90e2", "#ef8f6c", "#6bd5b1", "#f2c94c", "#c986f7"];
const barColors = {
  done: "#d8bb6a",
  remaining: "#d39a6a",
  overrun: "#9a6fe8"
} as const;

function CategoryChartTooltip({ active, payload, label }: TooltipContentProps<ValueType, NameType>) {
  if (!active || !payload?.length) return null;
  const done = payload.find((item) => item.dataKey === "doneWithinPlan");
  const remaining = payload.find((item) => item.dataKey === "remainingMinutes");
  const overrun = payload.find((item) => item.dataKey === "overrunMinutes");
  const plannedValue = Number((done?.payload as CategoryObjectivePoint)?.plannedMinutes ?? 0);
  const doneValue = Number(done?.value ?? 0);
  const remainingValue = Number(remaining?.value ?? 0);
  const overrunValue = Number(overrun?.value ?? 0);
  const completion = plannedValue > 0 ? Math.round((Math.min(doneValue, plannedValue) / plannedValue) * 100) : doneValue > 0 ? 100 : 0;

  return (
    <div className="rounded-lg border border-[#d7e0f1] bg-white px-3 py-2 text-xs text-[#1f2b4d] shadow-lg">
      <p className="font-semibold">{label}</p>
      <p className="text-[11px] uppercase text-[#6b7da1]">Completion {completion}%</p>
      <div className="mt-1 space-y-1">
        <p className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1 font-medium">
            <span className="inline-block size-2.5 rounded-full" style={{ background: barColors.done }} />
            Done
          </span>
          <span>{formatHoursFromMinutes(doneValue)}</span>
        </p>
        <p className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1 font-medium">
            <span className="inline-block size-2.5 rounded-full" style={{ background: barColors.remaining }} />
            Remaining
          </span>
          <span>{formatHoursFromMinutes(remainingValue)}</span>
        </p>
        <p className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1 font-medium">
            <span className="inline-block size-2.5 rounded-full" style={{ background: barColors.overrun }} />
            Overrun
          </span>
          <span>{formatHoursFromMinutes(overrunValue)}</span>
        </p>
      </div>
    </div>
  );
}

export function CategoryObjectiveChart({ data }: CategoryObjectiveChartProps) {
  const objectiveIds = useMemo(() => Array.from(new Set(data.map((item) => item.objectiveId))), [data]);
  const [selectedObjectives, setSelectedObjectives] = useState<string[]>(objectiveIds);

  useEffect(() => {
    setSelectedObjectives(objectiveIds);
  }, [objectiveIds]);

  const toggleObjective = (objectiveId: string) => {
    setSelectedObjectives((previous) => {
      if (previous.includes(objectiveId)) {
        return previous.filter((id) => id !== objectiveId);
      }
      return [...previous, objectiveId];
    });
  };
  const allSelected = selectedObjectives.length === objectiveIds.length && selectedObjectives.length > 0;
  const toggleAll = () => {
    setSelectedObjectives(allSelected ? [] : objectiveIds);
  };

  const filteredData = useMemo(() => {
    if (selectedObjectives.length === 0) {
      return [];
    }
    return data.filter((item) => selectedObjectives.includes(item.objectiveId));
  }, [data, selectedObjectives]);
  const totalDoneAcrossFiltered = filteredData.reduce((sum, entry) => sum + entry.doneMinutes, 0);
  const selectionTotals = useMemo(() => {
    return filteredData.reduce(
      (acc, entry) => {
        acc.plannedMinutes += entry.plannedMinutes;
        acc.doneMinutes += entry.doneMinutes;
        acc.overrunMinutes += entry.overrunMinutes;
        return acc;
      },
      { plannedMinutes: 0, doneMinutes: 0, overrunMinutes: 0 }
    );
  }, [filteredData]);
  const selectionCompletion =
    selectionTotals.plannedMinutes > 0
      ? Math.round((Math.min(selectionTotals.doneMinutes, selectionTotals.plannedMinutes) / selectionTotals.plannedMinutes) * 100)
      : selectionTotals.doneMinutes > 0
        ? 100
        : 0;
  const topObjective =
    filteredData.length > 0 ? filteredData.reduce((prev, current) => (current.doneMinutes > prev.doneMinutes ? current : prev)) : null;

  const emptyState =
    data.length === 0
      ? "No category work logged for this week yet."
      : "Select at least one objective to compare.";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-xs text-[#4a5f83]">
        <span className="font-medium">Objectives:</span>
        {objectiveIds.length === 0 ? (
          <span className="text-[#8e9bb8]">Nothing to filter yet.</span>
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
            {objectiveIds.map((objectiveId) => {
              const label = data.find((item) => item.objectiveId === objectiveId)?.label ?? objectiveId;
              const isActive = selectedObjectives.includes(objectiveId);
              return (
                <button
                  key={objectiveId}
                  type="button"
                  className={[
                    "rounded-full border px-2.5 py-1 font-semibold transition",
                    isActive ? "border-[#3b4b7a] bg-white text-[#1f2b4d]" : "border-[#c7d3e8] bg-[#edf3ff] text-[#4a5f83]"
                  ].join(" ")}
                  onClick={() => toggleObjective(objectiveId)}
                >
                  {label}
                </button>
              );
            })}
          </>
        )}
      </div>

      {filteredData.length === 0 ? (
        <p className="text-sm text-[#4a5f83]">{emptyState}</p>
      ) : (
        <div className="flex flex-col gap-4 md:flex-row">
          <div className="flex w-full flex-1 flex-col rounded-xl border border-[#d7e0f1] bg-[#f8fbff] p-4">
            <div className="mb-3 grid gap-2 text-xs text-[#1f2b4d] sm:grid-cols-4">
              <div className="rounded-lg border border-[#d7e0f1] bg-white p-3">
                <p className="text-[11px] uppercase text-[#6b7da1]">Planned</p>
                <p className="text-lg font-semibold">{formatHoursFromMinutes(selectionTotals.plannedMinutes)}</p>
              </div>
              <div className="rounded-lg border border-[#d7e0f1] bg-white p-3">
                <p className="text-[11px] uppercase text-[#6b7da1]">Done</p>
                <p className="text-lg font-semibold">{formatHoursFromMinutes(selectionTotals.doneMinutes)}</p>
              </div>
              <div className="rounded-lg border border-[#d7e0f1] bg-white p-3">
                <p className="text-[11px] uppercase text-[#6b7da1]">Overrun</p>
                <p className="text-lg font-semibold">{formatHoursFromMinutes(selectionTotals.overrunMinutes)}</p>
              </div>
              <div className="rounded-lg border border-[#d7e0f1] bg-white p-3">
                <p className="text-[11px] uppercase text-[#6b7da1]">Completion</p>
                <p className="text-lg font-semibold">{selectionCompletion}%</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={filteredData}
                layout="vertical"
                margin={{
                  top: 8,
                  right: 20,
                  bottom: 8,
                  left: 40
                }}
              >
                <CartesianGrid strokeDasharray="4 4" horizontal={false} stroke="#d7e0f1" />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: "#6b7da1" }}
                  tickFormatter={(value) => formatHoursFromMinutes(value as number)}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis dataKey="label" type="category" tick={{ fontSize: 12, fill: "#4a5f83" }} width={120} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: "#edf3ff" }} content={CategoryChartTooltip} />
                <Bar dataKey="doneWithinPlan" stackId="time" name="Done" fill={barColors.done} radius={[0, 4, 4, 0]} />
                <Bar dataKey="remainingMinutes" stackId="time" name="Remaining" fill={barColors.remaining} />
                <Bar dataKey="overrunMinutes" stackId="time" name="Overrun" fill={barColors.overrun} />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-3 text-[11px] font-semibold text-[#4a5f83]">
              <span className="inline-flex items-center gap-1 rounded-full border border-[#d7e0f1] bg-white px-2.5 py-1">
                <span className="inline-block size-2 rounded-full" style={{ background: barColors.done }} />
                Done
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-[#d7e0f1] bg-white px-2.5 py-1">
                <span className="inline-block size-2 rounded-full" style={{ background: barColors.remaining }} />
                Remaining
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-[#d7e0f1] bg-white px-2.5 py-1">
                <span className="inline-block size-2 rounded-full" style={{ background: barColors.overrun }} />
                Overrun
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-[#d7e0f1] bg-[#f8fbff] p-4 md:w-[260px] md:flex-shrink-0">
            <div className="mb-3 space-y-1 text-xs text-[#4a5f83]">
              <p className="font-medium">Done share vs other objectives</p>
              {topObjective ? (
                <p className="text-[11px] uppercase text-[#6b7da1]">
                  Top objective: <span className="text-[#1f2b4d]">{topObjective.label}</span> (
                  {formatHoursFromMinutes(topObjective.doneMinutes)})
                </p>
              ) : null}
            </div>
            {totalDoneAcrossFiltered === 0 ? (
              <p className="text-sm text-[#4a5f83]">No completed minutes yet for the selected objectives.</p>
            ) : (
              <>
                <div className="mx-auto w-full max-w-[220px] md:max-w-full">
                  <div className="h-48 w-full">
                  <HalfDonutChart
                    data={filteredData.map((entry, index) => ({
                      label: entry.label,
                      value: entry.doneMinutes,
                      color: donutColors[index % donutColors.length]
                    }))}
                    totalLabel="Total done"
                    totalValue={formatHoursFromMinutes(totalDoneAcrossFiltered)}
                  />
                  </div>
                </div>
                <div className="mt-3 grid gap-2 text-xs text-[#4a5f83] sm:grid-cols-2">
                  {filteredData.map((objective, index) => {
                    const percentage = totalDoneAcrossFiltered > 0 ? Math.round((objective.doneMinutes / totalDoneAcrossFiltered) * 100) : 0;
                    return (
                      <div key={objective.objectiveId} className="flex items-center gap-2 rounded-lg border border-[#d7e0f1] bg-white p-2">
                        <span className="inline-block size-3 rounded-full" style={{ backgroundColor: donutColors[index % donutColors.length] }} />
                        <div>
                          <p className="font-semibold text-[#1f2b4d]">{objective.label}</p>
                          <p>
                            {percentage}% • {formatHoursFromMinutes(objective.doneMinutes)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
