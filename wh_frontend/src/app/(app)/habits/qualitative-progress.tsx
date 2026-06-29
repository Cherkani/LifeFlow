import { CalendarDays, CheckCircle2, Flag, ListTodo } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export type QualitativeDayProgress = {
  dateKey: string;
  label: string;
  taskTotal: number;
  taskCompleted: number;
  calendarEvents: number;
  calendarTodos: number;
  calendarMilestones: number;
};

export type QualitativeObjectiveProgress = {
  objectiveId: string;
  label: string;
  total: number;
  completed: number;
};

type QualitativeProgressProps = {
  days: QualitativeDayProgress[];
  objectives: QualitativeObjectiveProgress[];
};

function completionPercent(completed: number, total: number) {
  return total > 0 ? Math.round((completed / total) * 100) : 0;
}

export function QualitativeProgress({ days, objectives }: QualitativeProgressProps) {
  const totalTasks = days.reduce((sum, day) => sum + day.taskTotal, 0);
  const completedTasks = days.reduce((sum, day) => sum + day.taskCompleted, 0);
  const calendarTodos = days.reduce((sum, day) => sum + day.calendarTodos, 0);
  const calendarMilestones = days.reduce((sum, day) => sum + day.calendarMilestones, 0);
  const calendarEvents = days.reduce((sum, day) => sum + day.calendarEvents, 0);
  const hasData = totalTasks > 0 || calendarTodos > 0 || calendarMilestones > 0 || calendarEvents > 0;

  return (
    <Card className="border-[var(--app-panel-border)] bg-[var(--app-panel-bg)]">
      <CardHeader className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-[var(--app-text-strong)]">Qualitative Progress</CardTitle>
          <Badge variant="secondary" className="bg-[var(--app-chip-bg)] text-[var(--app-chip-fg)]">
            {completedTasks}/{totalTasks} no-time tasks
          </Badge>
        </div>
        <p className="text-sm text-[var(--app-text-muted)]">
          Checklist, count, custom habits, to-dos, and milestones live here so they do not disappear inside minute charts.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        {!hasData ? (
          <p className="text-sm text-[var(--app-text-muted)]">
            No qualitative habits or calendar items for this week yet.
          </p>
        ) : (
          <>
            <div className="grid gap-3 md:grid-cols-4">
              <div className="rounded-xl border border-[var(--app-panel-border-strong)] bg-[var(--app-btn-secondary-bg)] p-3">
                <p className="text-xs font-medium text-[var(--app-text-muted)]">No-time completion</p>
                <p className="mt-1 text-2xl font-bold text-[var(--app-text-strong)]">{completionPercent(completedTasks, totalTasks)}%</p>
              </div>
              <div className="rounded-xl border border-[var(--app-panel-border-strong)] bg-[var(--app-btn-secondary-bg)] p-3">
                <p className="flex items-center gap-1 text-xs font-medium text-[var(--app-text-muted)]">
                  <ListTodo size={13} /> Calendar to-dos
                </p>
                <p className="mt-1 text-2xl font-bold text-[var(--app-text-strong)]">{calendarTodos}</p>
              </div>
              <div className="rounded-xl border border-[var(--app-panel-border-strong)] bg-[var(--app-btn-secondary-bg)] p-3">
                <p className="flex items-center gap-1 text-xs font-medium text-[var(--app-text-muted)]">
                  <Flag size={13} /> Milestones
                </p>
                <p className="mt-1 text-2xl font-bold text-[var(--app-text-strong)]">{calendarMilestones}</p>
              </div>
              <div className="rounded-xl border border-[var(--app-panel-border-strong)] bg-[var(--app-btn-secondary-bg)] p-3">
                <p className="flex items-center gap-1 text-xs font-medium text-[var(--app-text-muted)]">
                  <CalendarDays size={13} /> Events
                </p>
                <p className="mt-1 text-2xl font-bold text-[var(--app-text-strong)]">{calendarEvents}</p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold text-[var(--app-text-strong)]">Daily qualitative bars</p>
              <div className="grid gap-2 md:grid-cols-7">
                {days.map((day) => {
                  const percent = completionPercent(day.taskCompleted, day.taskTotal);
                  const calendarCount = day.calendarEvents + day.calendarTodos + day.calendarMilestones;

                  return (
                    <div key={day.dateKey} className="rounded-xl border border-[var(--app-panel-border-strong)] bg-[var(--app-btn-secondary-bg)] p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-[var(--app-text-strong)]">{day.label}</p>
                          <p className="text-[11px] text-[var(--app-text-muted)]">{day.dateKey.slice(5)}</p>
                        </div>
                        <span className="text-xs font-semibold text-[var(--app-text-strong)]">
                          {day.taskCompleted}/{day.taskTotal}
                        </span>
                      </div>
                      <Progress value={percent} className="mt-3 h-2 bg-white/60" barClassName={percent >= 100 ? "bg-emerald-600" : "bg-[#23406d]"} />
                      {calendarCount > 0 ? (
                        <div className="mt-3 flex flex-wrap gap-1">
                          {day.calendarTodos > 0 ? <Badge variant="secondary">Todo {day.calendarTodos}</Badge> : null}
                          {day.calendarMilestones > 0 ? <Badge variant="secondary">Milestone {day.calendarMilestones}</Badge> : null}
                          {day.calendarEvents > 0 ? <Badge variant="secondary">Event {day.calendarEvents}</Badge> : null}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold text-[var(--app-text-strong)]">Qualitative by objective</p>
              {objectives.length === 0 ? (
                <p className="text-sm text-[var(--app-text-muted)]">No qualitative objective work for this week yet.</p>
              ) : (
                <div className="grid gap-2 md:grid-cols-2">
                  {objectives.map((objective) => {
                    const percent = completionPercent(objective.completed, objective.total);

                    return (
                      <div key={objective.objectiveId} className="rounded-xl border border-[var(--app-panel-border-strong)] bg-[var(--app-btn-secondary-bg)] p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-[var(--app-text-strong)]">{objective.label}</p>
                          <span className="flex items-center gap-1 text-xs font-semibold text-[var(--app-text-muted)]">
                            <CheckCircle2 size={13} /> {objective.completed}/{objective.total}
                          </span>
                        </div>
                        <Progress value={percent} className="mt-3 bg-white/60" barClassName={percent >= 100 ? "bg-emerald-600" : "bg-[#23406d]"} />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
