"use client";

import { useState } from "react";
import Image from "next/image";
import { CalendarDays, CheckSquare, Clock3, ListTodo, Square } from "lucide-react";

import { addCompensationSessionFormAction } from "@/app/(app)/habits/actions";
import { CompleteSessionForm } from "@/app/(app)/habits/complete-session-form";
import { ActionForm } from "@/components/forms/action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ModalShell } from "@/components/ui/modal-shell";
import { Progress } from "@/components/ui/progress";
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

type CalendarEvent = {
  id: string;
  title: string | null;
  details: string | null;
  event_date: string | null;
  event_time: string | null;
  event_type: string;
};

type Objective = { id: string; title: string; image_url: string | null };
type Category = {
  id: string;
  title: string;
  objective_id: string | null;
  type: "time_tracking" | "fixed_protocol" | "count" | "custom";
};

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

function renderTaskThumb(habitTitle: string, objectiveImageUrl: string | null) {
  const fallbackInitial = habitTitle.slice(0, 1).toUpperCase();
  if (objectiveImageUrl) {
    return (
      <div className="relative size-10 shrink-0 overflow-hidden rounded-md border border-[var(--app-panel-border-strong)] bg-[var(--app-panel-bg)]">
        <Image src={objectiveImageUrl} alt={habitTitle} fill sizes="40px" className="object-cover" />
      </div>
    );
  }

  return (
    <div className="flex size-10 shrink-0 items-center justify-center rounded-md border border-dashed border-[var(--app-panel-border-strong)] bg-[var(--app-panel-bg-soft)] text-xs font-semibold uppercase text-[var(--app-btn-secondary-fg)]">
      {fallbackInitial}
    </div>
  );
}

type ExecutionBoardProps = {
  weekDates: string[];
  sessionsByDate: Record<string, Session[]>;
  calendarEventsByDate: Record<string, CalendarEvent[]>;
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
  calendarEventsByDate,
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
  const mobileFocusDate = weekDates.includes(todayKey) ? todayKey : weekDates[0] ?? null;

  const allSessions = Object.values(sessionsByDate).flat();
  const selectedSession = selectedSessionId ? allSessions.find((s) => s.id === selectedSessionId) ?? null : null;
  const selectedLogDay = selectedLogDate && weekDates.includes(selectedLogDate) ? selectedLogDate : null;

  return (
    <>
      <Card className="border-[var(--app-panel-border)] bg-[var(--app-panel-bg)]">
        <CardHeader>
          <CardTitle className="text-[var(--app-text-strong)]">Execution Board (7 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-7">
            {weekDates.map((dateKey) => {
              const daySessions = sessionsByDate[dateKey] ?? [];
              const timedDaySessions = daySessions.filter((session) => categoryById[session.habit_id]?.type === "time_tracking");
              const nonTimedDaySessions = daySessions.filter((session) => categoryById[session.habit_id]?.type !== "time_tracking");
              const dayCalendarEvents = calendarEventsByDate[dateKey] ?? [];
              const dayPlannedMinutes = timedDaySessions.reduce((sum, s) => sum + s.planned_minutes, 0);
              const dayDoneMinutes = timedDaySessions.reduce((sum, s) => sum + (s.actual_minutes ?? 0), 0);
              const completedTasks = daySessions.filter((session) => session.completed).length;
              const totalTasks = daySessions.length;
              const dayProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
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
              const orderedTimedSessions = orderedDaySessions.filter((session) => categoryById[session.habit_id]?.type === "time_tracking");
              const orderedNonTimedSessions = orderedDaySessions.filter((session) => categoryById[session.habit_id]?.type !== "time_tracking");
              const isCurrentDay = dateKey === todayKey;

              return (
                <div
                  key={dateKey}
                  className={[
                    dateKey === mobileFocusDate ? "flex" : "hidden md:flex",
                    "min-h-[380px] flex-col rounded-xl border p-2",
                    isCurrentDay
                      ? "border-[#c6ba86] bg-[color-mix(in_srgb,var(--app-panel-bg-soft)_78%,#eedf9c_22%)]"
                      : "border-[var(--app-panel-border-strong)] bg-[var(--app-panel-bg-soft)]"
                  ].join(" ")}
                >
                  <div className="rounded-lg border border-[var(--app-panel-border-strong)] bg-[var(--app-panel-bg)] px-3 py-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-[11px] font-semibold uppercase text-[var(--app-text-muted)]">{weekDay}</p>
                        <p className="text-xl font-semibold leading-none text-[var(--app-text-strong)]">{dayNumber(dateKey)}</p>
                      </div>
                      {categories.length > 0 ? (
                        <button
                          type="button"
                          onClick={() => setSelectedLogDate(dateKey)}
                          className="inline-flex h-7 items-center justify-center rounded-md border border-[var(--app-panel-border-strong)] bg-[var(--app-btn-secondary-bg)] px-2 text-xs font-medium text-[var(--app-btn-secondary-fg)] transition hover:bg-[var(--app-btn-secondary-hover)]"
                        >
                          + Add
                        </button>
                      ) : null}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-1">
                      <Badge variant={dayProgress >= 100 ? "default" : "warning"} className="px-2 py-0 text-[10px]">
                        {completedTasks}/{totalTasks} tasks
                      </Badge>
                      {nonTimedDaySessions.length > 0 ? (
                        <Badge variant="secondary" className="bg-[var(--app-chip-bg)] px-2 py-0 text-[10px] text-[var(--app-chip-fg)]">
                          {nonTimedDaySessions.length} no-time
                        </Badge>
                      ) : null}
                      {dayCalendarEvents.length > 0 ? (
                        <Badge variant="secondary" className="bg-[var(--app-chip-bg)] px-2 py-0 text-[10px] text-[var(--app-chip-fg)]">
                          {dayCalendarEvents.length} calendar
                        </Badge>
                      ) : null}
                      <Badge variant="secondary" className="bg-[var(--app-chip-bg)] px-2 py-0 text-[10px] text-[var(--app-chip-fg)]">
                        {formatMinutesLabel(dayDoneMinutes)} done
                      </Badge>
                      <Badge variant="secondary" className="bg-[var(--app-chip-bg)] px-2 py-0 text-[10px] text-[var(--app-chip-fg)]">
                        {formatMinutesLabel(dayPlannedMinutes)} planned
                      </Badge>
                    </div>
                    <Progress
                      value={dayProgress}
                      className="mt-2 h-1.5 bg-[var(--app-panel-bg-soft)]"
                      barClassName={dayProgress >= 100 ? "bg-emerald-600" : "bg-[#23406d]"}
                    />
                  </div>

                  <div className="mt-2 flex flex-1 flex-col gap-2">
                    {orderedTimedSessions.length > 0 ? (
                      <>
                        <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--app-text-muted)]">
                          <Clock3 size={12} />
                          Timed
                        </p>
                        {orderedTimedSessions.map((session) => {
                          const habit = categoryById[session.habit_id];
                          const objective = objectiveById[habit?.objective_id ?? ""];
                          const habitTitle = habit?.title ?? "Task";
                          return (
                            <button
                              key={session.id}
                              type="button"
                              onClick={() => setSelectedSessionId(session.id)}
                              className="flex w-full items-center justify-between gap-2 rounded-md border border-[var(--app-panel-border-strong)] bg-[var(--app-panel-bg)] px-2 py-2 text-left transition hover:bg-[var(--app-panel-bg-soft)]"
                            >
                              <div className="flex flex-1 items-center gap-2 overflow-hidden">
                                {renderTaskThumb(habitTitle, objective?.image_url ?? null)}
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-xs font-semibold text-[var(--app-text-strong)]">{habitTitle}</p>
                                  <p className="text-[10px] text-[var(--app-text-muted)]">
                                    {formatMinutesLabel(session.actual_minutes ?? 0)} / {formatMinutesLabel(session.planned_minutes)}
                                  </p>
                                </div>
                              </div>
                              {session.completed ? (
                                <CheckSquare size={16} className="shrink-0 text-emerald-600" />
                              ) : (
                                <Square size={16} className="shrink-0 text-[var(--app-text-muted)]" />
                              )}
                            </button>
                          );
                        })}
                      </>
                    ) : null}

                    {orderedNonTimedSessions.length > 0 ? (
                      <>
                        <p className="mt-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--app-text-muted)]">
                          <ListTodo size={12} />
                          No-Time Tasks
                        </p>
                        {orderedNonTimedSessions.map((session) => {
                          const habit = categoryById[session.habit_id];
                          const objective = objectiveById[habit?.objective_id ?? ""];
                          const habitTitle = habit?.title ?? "Task";
                          return (
                            <button
                              key={session.id}
                              type="button"
                              onClick={() => setSelectedSessionId(session.id)}
                              className="flex w-full items-center justify-between gap-2 rounded-md border border-[var(--app-panel-border-strong)] bg-[color-mix(in_srgb,var(--app-panel-bg)_88%,#f1f5f9_12%)] px-2 py-2 text-left transition hover:bg-[var(--app-panel-bg-soft)]"
                            >
                              <div className="flex flex-1 items-center gap-2 overflow-hidden">
                                {renderTaskThumb(habitTitle, objective?.image_url ?? null)}
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-xs font-semibold text-[var(--app-text-strong)]">{habitTitle}</p>
                                  <p className="text-[10px] capitalize text-[var(--app-text-muted)]">{habit?.type.replace("_", " ")}</p>
                                </div>
                              </div>
                              {session.completed ? (
                                <CheckSquare size={16} className="shrink-0 text-emerald-600" />
                              ) : (
                                <Square size={16} className="shrink-0 text-[var(--app-text-muted)]" />
                              )}
                            </button>
                          );
                        })}
                      </>
                    ) : null}

                    {dayCalendarEvents.length > 0 ? (
                      <>
                        <p className="mt-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--app-text-muted)]">
                          <CalendarDays size={12} />
                          Calendar
                        </p>
                        {dayCalendarEvents.map((event) => (
                          <div
                            key={event.id}
                            className="rounded-md border border-[var(--app-panel-border-strong)] bg-[color-mix(in_srgb,var(--app-panel-bg)_82%,#dbeafe_18%)] px-2 py-2"
                          >
                            <p className="truncate text-xs font-semibold text-[var(--app-text-strong)]">{event.title || "Calendar item"}</p>
                            <p className="text-[10px] uppercase tracking-wide text-[var(--app-text-muted)]">
                              {event.event_type}
                              {event.event_time ? ` · ${event.event_time}` : ""}
                            </p>
                            {event.details ? <p className="mt-1 text-[10px] text-[var(--app-text-muted)]">{event.details}</p> : null}
                          </div>
                        ))}
                      </>
                    ) : null}

                    {orderedTimedSessions.length === 0 && orderedNonTimedSessions.length === 0 && dayCalendarEvents.length === 0 ? (
                      <div className="flex flex-1 items-center justify-center rounded-md border border-dashed border-[var(--app-panel-border-strong)] text-center">
                        <p className="text-xs italic text-[var(--app-text-muted)]">No tasks assigned</p>
                      </div>
                    ) : null}
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
          description={
            categoryById[selectedSession.habit_id]?.type === "time_tracking"
              ? "Check/uncheck and set minutes done for this day."
              : "Mark this task complete without tracking time."
          }
          onClose={() => setSelectedSessionId(null)}
        >
          <CompleteSessionForm
            session={selectedSession}
            habitTitle={categoryById[selectedSession.habit_id]?.title ?? "Task"}
            requiresMinutes={categoryById[selectedSession.habit_id]?.type === "time_tracking"}
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
              <p className="text-xs font-medium text-[var(--app-text-muted)]">Objective</p>
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
              <p className="text-xs font-medium text-[var(--app-text-muted)]">Task title</p>
              <Input name="newTaskTitle" placeholder="e.g. Extra cardio" required />
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium text-[var(--app-text-muted)]">Minutes done</p>
              <Input name="doneMinutes" type="number" min={1} defaultValue={30} required />
            </div>
            <div className="flex items-center gap-2">
              <SubmitButton label="Save work log" pendingLabel="Saving..." className="sm:w-auto" />
              <button
                type="button"
                onClick={() => setSelectedLogDate(null)}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-[var(--app-panel-border-strong)] bg-[var(--app-btn-secondary-bg)] px-4 py-2 text-sm font-medium text-[var(--app-btn-secondary-fg)] transition hover:bg-[var(--app-btn-secondary-hover)]"
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
