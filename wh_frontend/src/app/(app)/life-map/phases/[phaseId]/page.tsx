import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { ArrowLeft, BookOpen, BriefcaseBusiness, CalendarDays, CircleDollarSign, NotebookPen, Target } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ActionForm } from "@/components/forms/action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { updateLifePhaseFormAction } from "@/app/(app)/life-map/actions";
import { getLifePageData, type LifePhaseRow } from "@/lib/queries/life";
import { requireAppContext } from "@/lib/server-context";
import { formatMoneyDhs } from "@/lib/utils";

type PageProps = {
  params: Promise<{ phaseId: string }>;
};

const phaseTypeLabels: Record<LifePhaseRow["phase_type"], string> = {
  school: "School",
  study: "Study",
  internship: "Internship",
  job: "Job",
  freelance: "Freelance",
  project: "Project season",
  career_growth: "Career growth",
  travel: "Travel",
  custom: "Custom"
};

const phaseStatusLabels: Record<LifePhaseRow["status"], string> = {
  past: "Past",
  current: "Current",
  planned: "Planned",
  archived: "Archived"
};

function money(value: string | number | null | undefined) {
  return formatMoneyDhs(Number(value ?? 0));
}

function formatDateRange(phase: LifePhaseRow) {
  if (!phase.start_date && !phase.end_date) return "No dates yet";
  if (phase.start_date && !phase.end_date) return `${phase.start_date} to now`;
  if (!phase.start_date && phase.end_date) return `Until ${phase.end_date}`;
  return `${phase.start_date} to ${phase.end_date}`;
}

function percent(done: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((done / total) * 100);
}

export default async function PhaseDetailPage({ params }: PageProps) {
  const { phaseId } = await params;
  const { supabase, account } = await requireAppContext();
  const data = await getLifePageData(supabase, account.accountId);
  const phase = data.phases.find((item) => item.id === phaseId);

  if (!phase) notFound();

  const projects = data.projects.filter((project) => project.phase_id === phase.id);
  const goals = data.goals.filter((goal) => goal.phase_id === phase.id);
  const tasks = data.tasks.filter((task) => task.phase_id === phase.id);
  const taskIds = new Set(tasks.map((task) => task.id));
  const sessions = data.sessions.filter((session) => taskIds.has(session.habit_id));
  const finance = data.financeEntries.filter((entry) => entry.phase_id === phase.id);
  const events = data.events.filter((event) => event.phase_id === phase.id);
  const notes = data.knowledgeSpaces.filter((space) => space.phase_id === phase.id);

  const income = finance.filter((entry) => entry.entry_type === "income").reduce((sum, entry) => sum + Number(entry.amount), 0);
  const spending = finance.filter((entry) => entry.entry_type === "expense").reduce((sum, entry) => sum + Number(entry.amount), 0);
  const completedSessions = sessions.filter((session) => session.completed).length;
  const taskCompletion = percent(completedSessions, sessions.length);
  const projectProgress = projects.length > 0 ? Math.round(projects.reduce((sum, project) => sum + project.progress, 0) / projects.length) : 0;

  return (
    <div className="space-y-6">
      <Link href={`/life-map?phase=${phase.id}`} className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--app-text-muted)] hover:text-[var(--app-text-strong)]">
        <ArrowLeft size={16} />
        Back to Life Map
      </Link>

      <Card className="overflow-hidden">
        <CardHeader className="border-b border-[var(--app-panel-border-strong)] bg-[var(--app-panel-bg-soft)]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-3xl">{phase.title}</CardTitle>
              <p className="mt-2 text-sm text-[var(--app-text-muted)]">{phaseTypeLabels[phase.phase_type]} · {formatDateRange(phase)}</p>
            </div>
            <Badge variant="secondary">{phaseStatusLabels[phase.status]}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 py-6">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label="Earned" value={money(income)} />
            <Stat label="Spent" value={money(spending)} />
            <Stat label="Saved estimate" value={money(income - spending)} />
            <Stat label="Daily task sessions" value={`${completedSessions}/${sessions.length}`} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="Story" icon={<BookOpen size={16} />}>
              <p className="text-sm leading-6 text-[var(--app-text-muted)]">
                {phase.summary || "Add memories, notes, and context as this chapter becomes clearer."}
              </p>
              <p className="mt-3 text-sm text-[var(--app-text-muted)]">
                {phase.income_source ? `Income source: ${phase.income_source}` : "No income source captured yet."}
              </p>
            </Panel>
            <Panel title="Progress" icon={<Target size={16} />}>
              <ProgressLine label="Project progress" value={projectProgress} />
              <ProgressLine label="Daily execution" value={taskCompletion} />
            </Panel>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <ListPanel title="Projects" icon={<BriefcaseBusiness size={16} />} rows={projects.map((project) => project.name)} />
            <ListPanel title="Objectives" icon={<Target size={16} />} rows={goals.map((goal) => goal.title)} />
            <ListPanel title="Daily Tasks" icon={<NotebookPen size={16} />} rows={tasks.map((task) => task.title)} />
            <ListPanel title="Money" icon={<CircleDollarSign size={16} />} rows={finance.map((entry) => `${entry.entry_type}: ${money(entry.amount)} · ${entry.occurred_on}`)} />
            <ListPanel title="Events" icon={<CalendarDays size={16} />} rows={events.map((event) => `${event.title}${event.event_date ? ` · ${event.event_date}` : ""}`)} />
            <ListPanel title="Notes" icon={<BookOpen size={16} />} rows={notes.map((note) => note.title)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Edit or archive this phase</CardTitle>
        </CardHeader>
        <CardContent>
          <ActionForm action={updateLifePhaseFormAction} className="space-y-4">
            <input type="hidden" name="phaseId" value={phase.id} />
            <input type="hidden" name="returnPath" value={`/life-map/phases/${phase.id}`} />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Title" id="editPhaseTitle"><Input id="editPhaseTitle" name="title" required defaultValue={phase.title} /></Field>
              <Field label="Type" id="editPhaseType">
                <Select id="editPhaseType" name="phaseType" defaultValue={phase.phase_type}>
                  {Object.entries(phaseTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </Select>
              </Field>
              <Field label="Status" id="editPhaseStatus">
                <Select id="editPhaseStatus" name="status" defaultValue={phase.status}>
                  {Object.entries(phaseStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </Select>
              </Field>
              <Field label="Income source" id="editPhaseIncomeSource"><Input id="editPhaseIncomeSource" name="incomeSource" defaultValue={phase.income_source ?? ""} /></Field>
              <Field label="Start" id="editPhaseStart"><Input id="editPhaseStart" name="startDate" type="date" defaultValue={phase.start_date ?? ""} /></Field>
              <Field label="End" id="editPhaseEnd"><Input id="editPhaseEnd" name="endDate" type="date" defaultValue={phase.end_date ?? ""} /></Field>
              <Field label="Monthly income estimate" id="editPhaseIncome"><Input id="editPhaseIncome" name="monthlyIncome" type="number" min="0" step="0.01" defaultValue={phase.monthly_income ?? ""} /></Field>
              <Field label="Monthly spending estimate" id="editPhaseSpending"><Input id="editPhaseSpending" name="monthlySpending" type="number" min="0" step="0.01" defaultValue={phase.monthly_spending ?? ""} /></Field>
            </div>
            <Field label="Story" id="editPhaseSummary"><Textarea id="editPhaseSummary" name="summary" rows={4} defaultValue={phase.summary ?? ""} /></Field>
            <Field label="Image URL" id="editPhaseImage"><Input id="editPhaseImage" name="imageUrl" type="url" defaultValue={phase.image_url ?? ""} /></Field>
            <SubmitButton label="Save phase" pendingLabel="Saving..." />
          </ActionForm>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, id, children }: { label: string; id: string; children: ReactNode }) {
  return <div className="space-y-2"><Label htmlFor={id}>{label}</Label>{children}</div>;
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
