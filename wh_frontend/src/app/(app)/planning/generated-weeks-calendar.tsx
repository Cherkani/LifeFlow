"use client";

import { useState } from "react";
import { CheckCircle, CheckCircle2, Circle, ChevronLeft, ChevronRight } from "lucide-react";

type Template = { id: string; name: string };

type GeneratedWeeksCalendarProps = {
  sortedMonths: string[];
  weeksByMonth: Record<string, string[]>;
  assignedWeeksMap: Record<string, { id: string; template_id: string }>;
  completedTasksCountByWeek: Record<string, number>;
  totalTasksCountByWeek: Record<string, number>;
  templates: Template[];
  currentWeekKey: string;
};

const MONTHS_PER_VIEW = 5;

const shadow3d = "0 4px 6px -1px rgba(11, 31, 59, 0.08), 0 10px 20px -5px rgba(11, 31, 59, 0.12), 0 0 0 1px rgba(11, 31, 59, 0.03)";

function getColumnScale(distanceFromCenter: number) {
  if (distanceFromCenter === 0) return 1;
  if (distanceFromCenter === 1) return 0.92;
  return 0.86;
}

function getColumnMarginTop(distanceFromCenter: number) {
  if (distanceFromCenter === 0) return 0;
  if (distanceFromCenter === 1) return 12;
  return 24;
}

function ShadowMonthColumn({ distanceFromCenter = 2 }: { distanceFromCenter?: number }) {
  const scale = getColumnScale(distanceFromCenter);
  const marginTop = getColumnMarginTop(distanceFromCenter);
  return (
    <div
      className="flex w-40 shrink-0 flex-col gap-3 rounded-xl opacity-40 transition-all duration-200"
      style={{ boxShadow: shadow3d, transform: `scale(${scale})`, transformOrigin: "top center", marginTop: marginTop }}
    >
      <div className="rounded-lg border-2 border-dashed border-[#c7d3e8] bg-[#f0f4fc]/60 px-4 py-3">
        <div className="h-4 w-24 rounded bg-[#d7e0f1]/60" />
      </div>
      <div className="flex flex-col gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-lg border-2 border-dashed border-[#e8eefb] bg-[#fafbff]/60 px-4 py-4"
            style={{ boxShadow: "0 2px 4px rgba(11, 31, 59, 0.06)" }}
          >
            <div className="flex flex-col items-center gap-2">
              <div className="h-7 w-7 rounded-full border-2 border-dashed border-[#b8cae8]" />
              <div className="h-4 w-16 rounded bg-[#d7e0f1]/50" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function GeneratedWeeksCalendar({
  sortedMonths,
  weeksByMonth,
  assignedWeeksMap,
  completedTasksCountByWeek,
  totalTasksCountByWeek,
  templates,
  currentWeekKey
}: GeneratedWeeksCalendarProps) {
  const currentMonthKey = currentWeekKey.slice(0, 7);
  const currentMonthIdx = sortedMonths.indexOf(currentMonthKey);
  const startIdx = currentMonthIdx >= 0 ? Math.max(0, currentMonthIdx - 2) : 0;
  const [monthIndex, setMonthIndex] = useState(startIdx);
  const maxIndex = Math.max(0, sortedMonths.length - MONTHS_PER_VIEW);
  const visibleMonths = sortedMonths.slice(monthIndex, monthIndex + MONTHS_PER_VIEW);
  const canGoPrev = monthIndex > 0;
  const canGoNext = monthIndex < maxIndex;
  const showShadowColumns = sortedMonths.length === 1;

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <div className="flex shrink-0 items-center self-stretch py-4">
          <button
            type="button"
            onClick={() => setMonthIndex((i) => Math.max(0, i - 1))}
            disabled={!canGoPrev}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#c7d3e8] bg-[#edf3ff] text-[#23406d] transition hover:bg-[#e3ebf9] disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Previous months"
          >
            <ChevronLeft size={20} />
          </button>
        </div>

        <div className="min-w-0 flex-1">
          <p className="mb-2 text-center text-xs text-[#4a5f83]">
            {monthIndex + 1}–{Math.min(monthIndex + MONTHS_PER_VIEW, sortedMonths.length)} of {sortedMonths.length} months
          </p>
          <div className="overflow-x-auto px-2">
            <div
              className={`flex min-w-0 items-start gap-3 pb-2 ${showShadowColumns || visibleMonths.length < MONTHS_PER_VIEW ? "justify-center" : ""}`}
            >
          {showShadowColumns ? (
            <>
              <ShadowMonthColumn distanceFromCenter={2} />
              <ShadowMonthColumn distanceFromCenter={1} />
            </>
          ) : null}
          {visibleMonths.map((monthKey, idx) => {
            const [y, m] = monthKey.split("-").map(Number);
            const monthName = new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "short", year: "numeric" });
            const monthWeeks = weeksByMonth[monthKey] ?? [];
            const centerIdx = (visibleMonths.length - 1) / 2;
            const distanceFromCenter = Math.abs(idx - centerIdx);
            const scale = getColumnScale(distanceFromCenter);
            const marginTop = getColumnMarginTop(distanceFromCenter);

            return (
              <div
                key={monthKey}
                className="flex shrink-0 flex-col gap-2 rounded-xl transition-all duration-200"
                style={{ boxShadow: shadow3d, transform: `scale(${scale})`, transformOrigin: "top center", marginTop: marginTop }}
              >
                <h4 className="rounded-t-lg bg-[#f0f4fc] px-2 py-1.5 text-center text-xs font-semibold uppercase tracking-wider text-[#4a5f83]">
                  {monthName}
                </h4>
                <div className="flex flex-col gap-2 p-1">
                  {monthWeeks.map((weekKey) => {
                    const assigned = assignedWeeksMap[weekKey];
                    const tasksDone = completedTasksCountByWeek[weekKey] ?? 0;
                    const totalTasks = totalTasksCountByWeek[weekKey];
                    const hasCompletedTasks = tasksDone > 0;
                    const template = assigned ? templates.find((t) => t.id === assigned.template_id) : null;
                    const isCurrentWeek = weekKey === currentWeekKey;
                    const [startStr] = weekKey.split("T");
                    const startDate = new Date(`${startStr}T00:00:00`);
                    const dayNum = startDate.getDate();
                    const weekLabel = `${startDate.toLocaleDateString("en-US", { month: "short" })} ${dayNum}`;

                    const assignedColStyle = hasCompletedTasks
                      ? "border-emerald-200 bg-emerald-50/90 hover:bg-emerald-50"
                      : "border-amber-200/80 bg-amber-50/70 hover:bg-amber-50/90";
                    const baseClassName = `flex w-28 shrink-0 flex-col items-center gap-1.5 rounded-lg border px-2 py-3 text-center transition ${
                      assigned ? assignedColStyle : "border-[#e8eefb] bg-[#fafbff]"
                    } ${isCurrentWeek ? "ring-2 ring-[#23406d] ring-offset-2" : ""}`;

                    const content = (
                      <>
                        <div className="flex flex-col items-center gap-1">
                          {assigned ? (
                            hasCompletedTasks ? (
                              <CheckCircle2 size={22} className="text-emerald-600" />
                            ) : (
                              <CheckCircle size={22} className="text-amber-500" />
                            )
                          ) : (
                            <Circle size={22} className="text-[#b8cae8]" />
                          )}
                          <p className="text-xs font-semibold text-[#0c1d3c]">{weekLabel}</p>
                        </div>
                        {template ? (
                          <p className="w-full truncate text-[11px] text-[#4a5f83]">{template.name}</p>
                        ) : null}
                        {assigned ? (
                          hasCompletedTasks ? (
                            <p className="text-xs font-bold text-emerald-700">
                              {tasksDone}/{totalTasks ?? tasksDone}
                            </p>
                          ) : totalTasks !== undefined && totalTasks > 0 ? (
                            <p className="text-[11px] text-amber-600">0/{totalTasks}</p>
                          ) : (
                            <p className="text-[11px] text-amber-600">—</p>
                          )
                        ) : (
                          <p className="text-[11px] text-[#9eb3d8]">—</p>
                        )}
                      </>
                    );

                    return assigned ? (
                      <a key={weekKey} href={`/habits?week=${encodeURIComponent(weekKey)}`} className={baseClassName}>
                        {content}
                      </a>
                    ) : (
                      <div key={weekKey} className={baseClassName}>
                        {content}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {showShadowColumns ? (
            <>
              <ShadowMonthColumn distanceFromCenter={1} />
              <ShadowMonthColumn distanceFromCenter={2} />
            </>
          ) : null}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center self-stretch py-4">
          <button
            type="button"
            onClick={() => setMonthIndex((i) => Math.min(maxIndex, i + 1))}
            disabled={!canGoNext}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#c7d3e8] bg-[#edf3ff] text-[#23406d] transition hover:bg-[#e3ebf9] disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Next months"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
