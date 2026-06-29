import { CalendarDays } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type ContributionDay = {
  dateKey: string;
  completedTasks: number;
  doneMinutes: number;
  score: number;
};

type ContributionHeatmapProps = {
  title: string;
  subtitle: string;
  days: ContributionDay[];
};

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric"
  });
}

function getLevel(score: number, maxScore: number) {
  if (score <= 0 || maxScore <= 0) return 0;
  const ratio = score / maxScore;
  if (ratio >= 0.75) return 4;
  if (ratio >= 0.5) return 3;
  if (ratio >= 0.25) return 2;
  return 1;
}

function levelClass(level: number) {
  if (level === 4) return "bg-emerald-500";
  if (level === 3) return "bg-emerald-700";
  if (level === 2) return "bg-emerald-900/80";
  if (level === 1) return "bg-emerald-950/50";
  return "bg-[var(--app-panel-bg-soft)]";
}

export function ContributionHeatmap({ title, subtitle, days }: ContributionHeatmapProps) {
  const totalTasks = days.reduce((sum, day) => sum + day.completedTasks, 0);
  const totalMinutes = days.reduce((sum, day) => sum + day.doneMinutes, 0);
  const activeDays = days.filter((day) => day.score > 0).length;
  const maxScore = Math.max(...days.map((day) => day.score), 0);

  return (
    <Card className="border-[var(--app-panel-border)] bg-[var(--app-panel-bg)]">
      <CardHeader className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-[var(--app-text-strong)]">
              <CalendarDays size={18} />
              {title}
            </CardTitle>
            <p className="mt-1 text-sm text-[var(--app-text-muted)]">{subtitle}</p>
          </div>
          <p className="text-sm font-semibold text-[var(--app-text-strong)]">
            {activeDays} active day{activeDays !== 1 ? "s" : ""}
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-[var(--app-panel-border-strong)] bg-[var(--app-btn-secondary-bg)] p-3">
            <p className="text-xs font-medium text-[var(--app-text-muted)]">Completed tasks</p>
            <p className="mt-1 text-2xl font-bold text-[var(--app-text-strong)]">{totalTasks}</p>
          </div>
          <div className="rounded-xl border border-[var(--app-panel-border-strong)] bg-[var(--app-btn-secondary-bg)] p-3">
            <p className="text-xs font-medium text-[var(--app-text-muted)]">Logged minutes</p>
            <p className="mt-1 text-2xl font-bold text-[var(--app-text-strong)]">{totalMinutes}</p>
          </div>
          <div className="rounded-xl border border-[var(--app-panel-border-strong)] bg-[var(--app-btn-secondary-bg)] p-3">
            <p className="text-xs font-medium text-[var(--app-text-muted)]">Best day score</p>
            <p className="mt-1 text-2xl font-bold text-[var(--app-text-strong)]">{maxScore}</p>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-[var(--app-panel-border-strong)] bg-[var(--app-btn-secondary-bg)] p-3">
          <div className="flex min-w-max flex-col flex-wrap gap-1" style={{ maxHeight: "108px" }}>
            {days.map((day) => {
              const level = getLevel(day.score, maxScore);
              return (
                <div
                  key={day.dateKey}
                  title={`${formatDate(day.dateKey)}: ${day.completedTasks} completed, ${day.doneMinutes} min`}
                  className={`size-3 rounded-[3px] border border-black/5 ${levelClass(level)}`}
                />
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-[var(--app-text-muted)]">
          <span>Each square is one day. Darker means more completed tasks and logged minutes.</span>
          <span className="inline-flex items-center gap-1">
            Less
            {[0, 1, 2, 3, 4].map((level) => (
              <span key={level} className={`size-3 rounded-[3px] border border-black/5 ${levelClass(level)}`} />
            ))}
            More
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
