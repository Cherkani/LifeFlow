import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { ArrowLeft, BookOpen, CalendarDays, CircleDollarSign, GitBranch, NotebookPen, Target } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getLifePageData, type LifeProjectRow } from "@/lib/queries/life";
import { requireAppContext } from "@/lib/server-context";
import { formatMoneyDhs } from "@/lib/utils";

type PageProps = {
  params: Promise<{ projectId: string }>;
};

const projectStatusLabels: Record<LifeProjectRow["status"], string> = {
  idea: "Idea",
  active: "Active",
  paused: "Paused",
  completed: "Completed",
  archived: "Archived"
};

function money(value: string | number | null | undefined) {
  return formatMoneyDhs(Number(value ?? 0));
}

function percent(done: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((done / total) * 100);
}

export default async function ProjectDetailPage({ params }: PageProps) {
  const { projectId } = await params;
  const { supabase, account } = await requireAppContext();
  const data = await getLifePageData(supabase, account.accountId);
  const project = data.projects.find((item) => item.id === projectId);

  if (!project) notFound();

  const phase = data.phases.find((item) => item.id === project.phase_id);
  const goals = data.goals.filter((goal) => goal.project_id === project.id);
  const tasks = data.tasks.filter((task) => task.project_id === project.id);
  const taskIds = new Set(tasks.map((task) => task.id));
  const sessions = data.sessions.filter((session) => taskIds.has(session.habit_id));
  const finance = data.financeEntries.filter((entry) => entry.project_id === project.id);
  const events = data.events.filter((event) => event.project_id === project.id);
  const notes = data.knowledgeSpaces.filter((space) => space.project_id === project.id);
  const links = data.links.filter((link) => link.source_id === project.id || link.target_id === project.id);

  const income = finance.filter((entry) => entry.entry_type === "income").reduce((sum, entry) => sum + Number(entry.amount), 0);
  const spending = finance.filter((entry) => entry.entry_type === "expense").reduce((sum, entry) => sum + Number(entry.amount), 0);
  const completedSessions = sessions.filter((session) => session.completed).length;
  const taskCompletion = percent(completedSessions, sessions.length);
  const blendedProgress = Math.round((project.progress + taskCompletion) / 2);

  return (
    <div className="space-y-6">
      <Link href={phase ? `/life-map?phase=${phase.id}` : "/life-map"} className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--app-text-muted)] hover:text-[var(--app-text-strong)]">
        <ArrowLeft size={16} />
        Back to Life Map
      </Link>

      <Card className="overflow-hidden">
        <CardHeader className="border-b border-[var(--app-panel-border-strong)] bg-[var(--app-panel-bg-soft)]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-3xl">{project.name}</CardTitle>
              <p className="mt-2 text-sm text-[var(--app-text-muted)]">
                {phase ? `Inside ${phase.title}` : "No phase connected"} · {project.start_date ?? "No start date"}
              </p>
            </div>
            <Badge variant="secondary">{projectStatusLabels[project.status]}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 py-6">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label="Manual progress" value={`${project.progress}%`} />
            <Stat label="Task execution" value={`${taskCompletion}%`} />
            <Stat label="Money net" value={money(income - spending)} />
            <Stat label="Linked notes" value={notes.length.toString()} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="Project Story" icon={<BookOpen size={16} />}>
              <p className="text-sm leading-6 text-[var(--app-text-muted)]">
                {project.description || project.outcome || "Add the project idea, result, lessons, and next milestone."}
              </p>
              {project.outcome ? <p className="mt-3 text-sm font-semibold text-[var(--app-text-strong)]">Outcome: {project.outcome}</p> : null}
            </Panel>
            <Panel title="Progress" icon={<Target size={16} />}>
              <ProgressLine label="Manual progress" value={project.progress} />
              <ProgressLine label="Daily task completion" value={taskCompletion} />
              <ProgressLine label="Blended project signal" value={blendedProgress} />
            </Panel>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <ListPanel title="Objectives" icon={<Target size={16} />} rows={goals.map((goal) => goal.title)} />
            <ListPanel title="Daily Tasks" icon={<NotebookPen size={16} />} rows={tasks.map((task) => task.title)} />
            <ListPanel title="Money" icon={<CircleDollarSign size={16} />} rows={finance.map((entry) => `${entry.entry_type}: ${money(entry.amount)} · ${entry.occurred_on}`)} />
            <ListPanel title="Events" icon={<CalendarDays size={16} />} rows={events.map((event) => `${event.title}${event.event_date ? ` · ${event.event_date}` : ""}`)} />
            <ListPanel title="Notes" icon={<BookOpen size={16} />} rows={notes.map((note) => note.title)} />
            <ListPanel title="Connection Graph" icon={<GitBranch size={16} />} rows={links.map((link) => `${link.source_type} to ${link.target_type}`)} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--app-panel-border-strong)] bg-[var(--app-panel-bg-soft)] p-3">
      <p className="text-xs uppercase text-[var(--app-text-muted)]">{label}</p>
      <p className="mt-1 text-lg font-semibold text-[var(--app-text-strong)]">{value}</p>
    </div>
  );
}

function Panel({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <Card className="border-[var(--app-panel-border-strong)] bg-[var(--app-panel-bg-soft)] shadow-none">
      <CardContent className="py-4">
        <p className="mb-3 flex items-center gap-2 font-semibold text-[var(--app-text-strong)]">{icon}{title}</p>
        {children}
      </CardContent>
    </Card>
  );
}

function ProgressLine({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-[var(--app-text-muted)]">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <Progress value={value} />
    </div>
  );
}

function ListPanel({ title, icon, rows }: { title: string; icon: ReactNode; rows: string[] }) {
  return (
    <Panel title={title} icon={icon}>
      <div className="space-y-2">
        {rows.slice(0, 8).map((row, index) => (
          <p key={`${row}-${index}`} className="rounded-md bg-[var(--app-panel-bg)] px-2 py-1 text-sm text-[var(--app-text-muted)]">
            {row}
          </p>
        ))}
        {rows.length === 0 ? <p className="text-sm text-[var(--app-text-muted)]">Nothing connected yet.</p> : null}
      </div>
    </Panel>
  );
}
