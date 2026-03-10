"use client";

import { useState } from "react";
import Image from "next/image";
import { CheckSquare, Square } from "lucide-react";

import { addCompensationSessionFormAction } from "@/app/(app)/habits/actions";
import { CompleteSessionForm } from "@/app/(app)/habits/complete-session-form";
import { ActionForm } from "@/components/forms/action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ModalShell } from "@/components/ui/modal-shell";
import { Select } from "@/components/ui/select";

type Session = {
  id: string;
  habit_id: string;
  session_date: string;
  planned_minutes: number;
  minimum_minutes: number;
  actual_minutes: number | null;
  completed: boolean;
};

type Objective = { id: string; title: string; image_url: string | null };
type Category = { id: string; title: string; objective_id: string | null };

function weekdayName(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-US", { weekday: "short" });
}

function dayNumber(value: string) {
  return new Date(`${value}T00:00:00`).getDate();
}

function dayHeaderLabel(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric"
  });
}

function formatMinutesLabel(totalMinutes: number) {
  if (totalMinutes <= 0) return "0m";
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

function isoWeekdayIndex(value: string) {
  const day = new Date(`${value}T00:00:00`).getDay();
  return day === 0 ? 7 : day;
}

type ExecutionBoardProps = {
  weekDates: string[];
  sessionsByDate: Record<string, Session[]>;
  templateDayOrder: Record<number, Record<string, number>>;
  categoryById: Record<string, Category>;
  objectiveById: Record<string, Objective>;
  categories: Category[];
  objectives: Objective[];
  todayKey: string;
  weekHref: string;
};

export function ExecutionBoard({
  weekDates,
  sessionsByDate,
  templateDayOrder,
  categoryById,
  objectiveById,
  categories,
  objectives,
  todayKey,
  weekHref
}: ExecutionBoardProps) {
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [selectedLogDate, setSelectedLogDate] = useState<string | null>(null);

  const allSessions = Object.values(sessionsByDate).flat();
  const selectedSession = selectedSessionId ? allSessions.find((s) => s.id === selectedSessionId) ?? null : null;
  const selectedLogDay = selectedLogDate && weekDates.includes(selectedLogDate) ? selectedLogDate : null;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Execution Board (7 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-7">
            {weekDates.map((dateKey) => {
              const daySessions = sessionsByDate[dateKey] ?? [];
              const dayPlannedMinutes = daySessions.reduce((sum, s) => sum + s.planned_minutes, 0);
              const dayDoneMinutes = daySessions.reduce((sum, s) => sum + (s.actual_minutes ?? 0), 0);
              const dayProgress =
                dayPlannedMinutes > 0
                  ? Math.round((Math.min(dayDoneMinutes, dayPlannedMinutes) / dayPlannedMinutes) * 100)
                  : dayDoneMinutes > 0
                    ? 100
                    : 0;
              const weekDay = weekdayName(dateKey);
              const weekDayIndex = isoWeekdayIndex(dateKey);
              const templateOrderForDay = templateDayOrder[weekDayIndex];
              const orderedDaySessions =
                templateOrderForDay && Object.keys(templateOrderForDay).length > 0
                  ? [...daySessions].sort((a, b) => {
                      const orderA = templateOrderForDay[a.habit_id] ?? Number.MAX_SAFE_INTEGER;
                      const orderB = templateOrderForDay[b.habit_id] ?? Number.MAX_SAFE_INTEGER;
                      if (orderA !== orderB) return orderA - orderB;
                      const titleA = categoryById[a.habit_id]?.title ?? "";
                      const titleB = categoryById[b.habit_id]?.title ?? "";
                      return titleA.localeCompare(titleB);
                    })
                  : daySessions;
              const isCurrentDay = dateKey === todayKey;

              return (
                <div
                  key={dateKey}
                  className={[
                    "flex min-h-[340px] flex-col rounded-xl border p-2",
                    isCurrentDay ? "border-[#dccf94] bg-[#f3ebc8]" : "border-[#c7d3e8] bg-[#f8fbff]"
                  ].join(" ")}
                >
                  <div className="rounded-lg border border-[#d7e0f1] bg-white px-3 py-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-[11px] font-semibold uppercase text-[#4a5f83]">{weekDay}</p>
                        <p className="text-xl font-semibold leading-none text-[#0c1d3c]">{dayNumber(dateKey)}</p>
                      </div>
                      {categories.length > 0 ? (
                        <button
                          type="button"
                          onClick={() => setSelectedLogDate(dateKey)}
                          className="inline-flex h-7 items-center justify-center rounded-md border border-[#c7d3e8] bg-[#edf3ff] px-2 text-xs font-medium text-[#23406d] transition hover:bg-[#e3ebf9]"
                        >
                          + Add
                        </button>
                      ) : null}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-1">
                      <Badge variant="secondary" className="px-2 py-0 text-[10px]">
                        {formatMinutesLabel(dayDoneMinutes)} done
                      </Badge>
                      <Badge variant="secondary" className="px-2 py-0 text-[10px]">
                        {formatMinutesLabel(dayPlannedMinutes)} planned
                      </Badge>
                      <Badge variant={dayProgress >= 100 ? "secondary" : "warning"} className="px-2 py-0 text-[10px]">
                        {dayProgress}%
                      </Badge>
                    </div>
                  </div>

                  <div className="mt-2 flex flex-1 flex-col gap-2">
                    {orderedDaySessions.length > 0 ? (
                      orderedDaySessions.map((session) => {
                        const habit = categoryById[session.habit_id];
                        const objective = objectiveById[habit?.objective_id ?? ""];
                        const habitTitle = habit?.title ?? "Task";
                        const objectiveImageUrl = objective?.image_url;
                        const fallbackInitial = habitTitle.slice(0, 1).toUpperCase();
                        return (
                          <button
                            key={session.id}
                            type="button"
                            onClick={() => setSelectedSessionId(session.id)}
                            className="flex w-full items-center justify-between gap-2 rounded-md border border-[#d7e0f1] bg-white px-2 py-2 text-left transition hover:bg-[#f8fbff]"
                          >
                            <div className="flex flex-1 items-center gap-2 overflow-hidden">
                              {objectiveImageUrl ? (
                                <div className="relative size-10 shrink-0 overflow-hidden rounded-md border border-[#d7e0f1] bg-white">
                                  <Image src={objectiveImageUrl} alt={habitTitle} fill sizes="40px" className="object-cover" />
                                </div>
                              ) : (
                                <div className="flex size-10 shrink-0 items-center justify-center rounded-md border border-dashed border-[#d7e0f1] bg-[#f8fbff] text-xs font-semibold uppercase text-[#23406d]">
                                  {fallbackInitial}
                                </div>
                              )}
                              <p className="min-w-0 flex-1 truncate text-xs font-semibold text-[#0c1d3c]">{habitTitle}</p>
                            </div>
                            {session.completed ? (
                              <CheckSquare size={16} className="shrink-0 text-emerald-600" />
                            ) : (
                              <Square size={16} className="shrink-0 text-[#4a5f83]" />
                            )}
                          </button>
                        );
                      })
                    ) : (
                      <div className="flex flex-1 items-center justify-center rounded-md border border-dashed border-[#d7e0f1] text-center">
                        <p className="text-xs italic text-[#6b7da1]">No tasks assigned</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {selectedSession ? (
        <ModalShell
          title="Update Task"
          description="Check/uncheck and set minutes done for this day."
          onClose={() => setSelectedSessionId(null)}
        >
          <CompleteSessionForm
            session={selectedSession}
            habitTitle={categoryById[selectedSession.habit_id]?.title ?? "Task"}
            returnPath={weekHref}
            onClose={() => setSelectedSessionId(null)}
          />
        </ModalShell>
      ) : null}

      {selectedLogDay ? (
        <ModalShell
          title="Add Done Task"
          description={`Log extra work for ${dayHeaderLabel(selectedLogDay)}.`}
          onClose={() => setSelectedLogDate(null)}
        >
          <ActionForm
            action={addCompensationSessionFormAction}
            className="space-y-4"
            onSuccess={() => setSelectedLogDate(null)}
          >
            <input type="hidden" name="returnPath" value={weekHref} />
            <input type="hidden" name="sessionDate" value={selectedLogDay} />
            <div className="space-y-2">
              <p className="text-xs font-medium text-[#4a5f83]">Objective</p>
              <Select name="objectiveId" required defaultValue="">
                <option value="" disabled>
                  Choose objective
                </option>
                {objectives.map((obj) => (
                  <option key={obj.id} value={obj.id}>
                    {obj.title}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium text-[#4a5f83]">Task title</p>
              <Input name="newTaskTitle" placeholder="e.g. Extra cardio" required />
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium text-[#4a5f83]">Minutes done</p>
              <Input name="doneMinutes" type="number" min={1} defaultValue={30} required />
            </div>
            <div className="flex items-center gap-2">
              <SubmitButton label="Save work log" pendingLabel="Saving..." className="sm:w-auto" />
              <button
                type="button"
                onClick={() => setSelectedLogDate(null)}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-[#c7d3e8] bg-[#edf3ff] px-4 py-2 text-sm font-medium text-[#23406d] transition hover:bg-[#e3ebf9]"
              >
                Back
              </button>
            </div>
          </ActionForm>
        </ModalShell>
      ) : null}
    </>
  );
}
