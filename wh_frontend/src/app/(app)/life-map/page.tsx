import Link from "next/link";
import type { Route } from "next";
import type { ReactNode } from "react";
import {
  BookOpen,
  BriefcaseBusiness,
  CalendarDays,
  Circle,
  CircleCheck,
  CircleDollarSign,
  Flag,
  GitBranch,
  NotebookPen,
  Plus,
  Target,
  WalletCards
} from "lucide-react";

import {
  attachLifeEntityFormAction,
  createLifeObjectiveFormAction,
  createLifePhaseFormAction,
  createLifeProjectFormAction,
  createLifeTaskFormAction
} from "@/app/(app)/life-map/actions";
import { ActionForm } from "@/components/forms/action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { getLifePageData, type LifePhaseRow, type LifeProjectRow } from "@/lib/queries/life";
import { requireAppContext } from "@/lib/server-context";
import { cn, formatMoneyDhs } from "@/lib/utils";

type LifeMapSearchParams = Promise<{
  phase?: string;
}>;

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

function monthKey(iso: string | null) {
  return iso ? iso.slice(0, 7) : "No date";
}

function formatDateRange(phase: LifePhaseRow) {
  if (!phase.start_date && !phase.end_date) return "No dates yet";
  if (phase.start_date && !phase.end_date) return `${phase.start_date} to now`;
  if (!phase.start_date && phase.end_date) return `Until ${phase.end_date}`;
  return `${phase.start_date} to ${phase.end_date}`;
}

function completionPercent(done: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((done / total) * 100);
}

function buildReturnPath(phaseId?: string | null) {
  return phaseId ? `/life-map?phase=${phaseId}` : "/life-map";
}

export default async function LifeMapPage({ searchParams }: { searchParams: LifeMapSearchParams }) {
  const params = await searchParams;
  const { supabase, account } = await requireAppContext();
  const data = await getLifePageData(supabase, account.accountId);

  const selectedPhase =
    data.phases.find((phase) => phase.id === params.phase) ??
    data.phases.find((phase) => phase.status === "current") ??
    data.phases[0] ??
    null;
  const selectedPhaseId = selectedPhase?.id ?? null;
  const returnPath = buildReturnPath(selectedPhaseId);

  const projectsForPhase = data.projects.filter((project) => project.phase_id === selectedPhaseId);
  const goalsForPhase = data.goals.filter((goal) => goal.phase_id === selectedPhaseId);
  const tasksForPhase = data.tasks.filter((task) => task.phase_id === selectedPhaseId);
  const taskIdsForPhase = new Set(tasksForPhase.map((task) => task.id));
  const sessionsForPhase = data.sessions.filter((session) => taskIdsForPhase.has(session.habit_id));
  const completedSessions = sessionsForPhase.filter((session) => session.completed).length;
  const financeForPhase = data.financeEntries.filter((entry) => entry.phase_id === selectedPhaseId);
  const eventsForPhase = data.events.filter((event) => event.phase_id === selectedPhaseId);
  const spacesForPhase = data.knowledgeSpaces.filter((space) => space.phase_id === selectedPhaseId);

  const phaseIncome = financeForPhase
    .filter((entry) => entry.entry_type === "income")
    .reduce((sum, entry) => sum + Number(entry.amount), 0);
  const phaseSpend = financeForPhase
    .filter((entry) => entry.entry_type === "expense")
    .reduce((sum, entry) => sum + Number(entry.amount), 0);
  const plannedMonthlyIncome = Number(selectedPhase?.monthly_income ?? 0);
  const plannedMonthlySpend = Number(selectedPhase?.monthly_spending ?? 0);

  const projectProgress =
    projectsForPhase.length > 0
      ? Math.round(projectsForPhase.reduce((sum, project) => sum + project.progress, 0) / projectsForPhase.length)
      : 0;
  const executionProgress = completionPercent(completedSessions, sessionsForPhase.length);

  const financeByMonth = [...data.financeEntries]
    .reduce<Record<string, { income: number; expense: number }>>((acc, entry) => {
      const key = monthKey(entry.occurred_on);
      const current = acc[key] ?? { income: 0, expense: 0 };
      current[entry.entry_type] += Number(entry.amount);
      acc[key] = current;
      return acc;
    }, {});
  const monthlyRows = Object.entries(financeByMonth)
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 6);

  const unlinkedGoals = data.goals.filter((goal) => !goal.phase_id && !goal.project_id).slice(0, 6);
  const unlinkedTasks = data.tasks.filter((task) => !task.phase_id && !task.project_id).slice(0, 6);
  const unlinkedMoney = data.financeEntries.filter((entry) => !entry.phase_id && !entry.project_id).slice(0, 6);
  const unlinkedEvents = data.events.filter((event) => !event.phase_id && !event.project_id).slice(0, 6);
  const unlinkedSpaces = data.knowledgeSpaces.filter((space) => !space.phase_id && !space.project_id).slice(0, 6);

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-[var(--app-panel-border)] bg-[var(--app-panel-bg)] shadow-[0_20px_42px_rgba(7,13,26,0.16)]">
        <CardContent className="grid gap-6 py-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-lg border border-[var(--app-panel-border-strong)] bg-[var(--app-panel-bg-soft)] px-3 py-1 text-xs font-semibold uppercase text-[var(--app-text-muted)]">
              <GitBranch size={14} />
              LifeFlow map
            </div>
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-[var(--app-text-strong)]">Your life, connected end to end.</h1>
              <p className="mt-2 max-w-3xl text-sm text-[var(--app-text-muted)]">
                Build chapters like school, internship, job, and projects, then connect each one to money, objectives, daily tasks, notes, and events.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-4">
              <Metric icon={Flag} label="Phases" value={data.phases.length.toString()} />
              <Metric icon={BriefcaseBusiness} label="Projects" value={data.projects.length.toString()} />
              <Metric icon={Target} label="Objectives" value={data.goals.length.toString()} />
              <Metric icon={CircleCheck} label="Task sessions" value={data.sessions.length.toString()} />
            </div>
          </div>
          <div className="rounded-lg border border-[var(--app-panel-border-strong)] bg-[var(--app-panel-bg-soft)] p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-[var(--app-text-strong)]">
              <WalletCards size={16} />
              Recent money rhythm
            </p>
            <div className="mt-4 space-y-3">
              {monthlyRows.length > 0 ? (
                monthlyRows.map(([key, row]) => {
                  const max = Math.max(row.income, row.expense, 1);
                  return (
                    <div key={key} className="space-y-1">
                      <div className="flex items-center justify-between text-xs text-[var(--app-text-muted)]">
                        <span>{key}</span>
                        <span>{money(row.income - row.expense)} net</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Bar value={row.income} max={max} className="bg-emerald-500" />
                        <Bar value={row.expense} max={max} className="bg-rose-500" />
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-[var(--app-text-muted)]">Add income or expenses to see monthly history.</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.45fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Circle size={18} />
                Chapter Path
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.phases.length > 0 ? (
                <div className="space-y-3">
                  {data.phases.map((phase, index) => (
                    <Link
                      key={phase.id}
                      href={`/life-map?phase=${phase.id}` as Route}
                      className={cn(
                        "grid grid-cols-[44px_1fr_auto] items-center gap-3 rounded-lg border p-3 transition",
                        selectedPhaseId === phase.id
                          ? "border-[var(--app-btn-primary-bg)] bg-[var(--app-btn-secondary-bg)]"
                          : "border-[var(--app-panel-border-strong)] bg-[var(--app-panel-bg-soft)] hover:bg-[var(--app-btn-secondary-bg)]"
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-11 items-center justify-center rounded-full text-sm font-bold text-white",
                          phase.status === "current"
                            ? "bg-emerald-600"
                            : phase.status === "past"
                              ? "bg-[#4f74b8]"
                              : phase.status === "planned"
                                ? "bg-amber-500"
                                : "bg-slate-500"
                        )}
                      >
                        {index + 1}
                      </span>
                      <span>
                        <span className="block font-semibold text-[var(--app-text-strong)]">{phase.title}</span>
                        <span className="text-xs text-[var(--app-text-muted)]">{phaseTypeLabels[phase.phase_type]} · {formatDateRange(phase)}</span>
                      </span>
                      <Badge variant={phase.status === "current" ? "secondary" : "default"}>{phaseStatusLabels[phase.status]}</Badge>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[var(--app-text-muted)]">Create your first phase to begin the life map.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus size={18} />
                Add Phase
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ActionForm action={createLifePhaseFormAction} className="space-y-3">
                <input type="hidden" name="returnPath" value={returnPath} />
                <Field label="Title" id="phaseTitle">
                  <Input id="phaseTitle" name="title" placeholder="School, Internship, First Job..." required />
                </Field>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Type" id="phaseType">
                    <Select id="phaseType" name="phaseType" defaultValue="custom">
                      {Object.entries(phaseTypeLabels).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Status" id="phaseStatus">
                    <Select id="phaseStatus" name="status" defaultValue="current">
                      {Object.entries(phaseStatusLabels).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </Select>
                  </Field>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Start" id="phaseStart">
                    <Input id="phaseStart" name="startDate" type="date" />
                  </Field>
                  <Field label="End" id="phaseEnd">
                    <Input id="phaseEnd" name="endDate" type="date" />
                  </Field>
                </div>
                <Field label="Income source" id="incomeSource">
                  <Input id="incomeSource" name="incomeSource" placeholder="Parents, internship, salary..." />
                </Field>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Monthly income" id="monthlyIncome">
                    <Input id="monthlyIncome" name="monthlyIncome" type="number" min="0" step="0.01" />
                  </Field>
                  <Field label="Monthly spending" id="monthlySpending">
                    <Input id="monthlySpending" name="monthlySpending" type="number" min="0" step="0.01" />
                  </Field>
                </div>
                <Field label="Story" id="phaseSummary">
                  <Textarea id="phaseSummary" name="summary" rows={4} placeholder="What was this chapter about?" />
                </Field>
                <SubmitButton label="Create phase" pendingLabel="Creating..." className="w-full" />
              </ActionForm>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {selectedPhase ? (
            <Card className="overflow-hidden">
              <CardHeader className="border-b border-[var(--app-panel-border-strong)] bg-[var(--app-panel-bg-soft)]">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-2xl">{selectedPhase.title}</CardTitle>
                    <p className="mt-1 text-sm text-[var(--app-text-muted)]">{phaseTypeLabels[selectedPhase.phase_type]} · {formatDateRange(selectedPhase)}</p>
                  </div>
                  <Badge variant="secondary">{phaseStatusLabels[selectedPhase.status]}</Badge>
                </div>
                <Link
                  href={`/life-map/phases/${selectedPhase.id}` as Route}
                  className="inline-flex text-sm font-semibold text-[var(--app-btn-primary-bg)] hover:underline"
                >
                  Open full phase history
                </Link>
              </CardHeader>
              <CardContent className="space-y-6 py-6">
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <Metric icon={CircleDollarSign} label="Planned income" value={money(plannedMonthlyIncome)} />
                  <Metric icon={WalletCards} label="Planned spend" value={money(plannedMonthlySpend)} />
                  <Metric icon={Target} label="Objectives" value={goalsForPhase.length.toString()} />
                  <Metric icon={NotebookPen} label="Daily tasks" value={tasksForPhase.length.toString()} />
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <Card className="border-[var(--app-panel-border-strong)] bg-[var(--app-panel-bg-soft)] shadow-none">
                    <CardContent className="space-y-3 py-4">
                      <p className="font-semibold text-[var(--app-text-strong)]">Progress rings</p>
                      <ProgressLine label="Project progress" value={projectProgress} />
                      <ProgressLine label="Execution completion" value={executionProgress} />
                      <ProgressLine label="Money retention" value={plannedMonthlyIncome > 0 ? Math.max(0, Math.min(100, Math.round(((plannedMonthlyIncome - plannedMonthlySpend) / plannedMonthlyIncome) * 100))) : 0} />
                    </CardContent>
                  </Card>
                  <Card className="border-[var(--app-panel-border-strong)] bg-[var(--app-panel-bg-soft)] shadow-none">
                    <CardContent className="space-y-3 py-4">
                      <p className="font-semibold text-[var(--app-text-strong)]">Money story</p>
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <MiniStat label="Earned" value={money(phaseIncome)} />
                        <MiniStat label="Spent" value={money(phaseSpend)} />
                        <MiniStat label="Net" value={money(phaseIncome - phaseSpend)} />
                      </div>
                      <p className="text-sm text-[var(--app-text-muted)]">
                        {selectedPhase.income_source ? `Source: ${selectedPhase.income_source}` : "Add an income source to remember how this phase was funded."}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <section className="space-y-3">
                  <h2 className="flex items-center gap-2 text-lg font-semibold text-[var(--app-text-strong)]">
                    <BriefcaseBusiness size={18} />
                    Projects
                  </h2>
                  <div className="grid gap-3 md:grid-cols-2">
                    {projectsForPhase.map((project) => (
                      <Card key={project.id} className="border-[var(--app-panel-border-strong)] bg-[var(--app-panel-bg-soft)] shadow-none">
                        <CardContent className="space-y-3 py-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <Link href={`/life-map/projects/${project.id}` as Route} className="font-semibold text-[var(--app-text-strong)] hover:underline">
                                {project.name}
                              </Link>
                              <p className="text-xs text-[var(--app-text-muted)]">{projectStatusLabels[project.status]}</p>
                            </div>
                            <Badge variant="default">{project.progress}%</Badge>
                          </div>
                          <Progress value={project.progress} />
                          <p className="line-clamp-3 text-sm text-[var(--app-text-muted)]">{project.description || project.outcome || "No project story yet."}</p>
                        </CardContent>
                      </Card>
                    ))}
                    {projectsForPhase.length === 0 ? (
                      <p className="text-sm text-[var(--app-text-muted)]">No projects connected to this phase yet.</p>
                    ) : null}
                  </div>
                </section>

                <section className="grid gap-4 lg:grid-cols-3">
                  <ConnectionList title="Objectives" icon={Target} rows={goalsForPhase.map((goal) => goal.title)} />
                  <ConnectionList title="Daily Tasks" icon={NotebookPen} rows={tasksForPhase.map((task) => task.title)} />
                  <ConnectionList title="Notes" icon={BookOpen} rows={spacesForPhase.map((space) => space.title)} />
                  <ConnectionList title="Events" icon={CalendarDays} rows={eventsForPhase.map((event) => event.title)} />
                  <ConnectionList title="Money" icon={CircleDollarSign} rows={financeForPhase.map((entry) => `${entry.entry_type}: ${money(entry.amount)} · ${entry.occurred_on}`)} />
                </section>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-6">
                <p className="text-sm text-[var(--app-text-muted)]">Create a life phase to unlock phase details.</p>
              </CardContent>
            </Card>
          )}

          <section className="grid gap-6 lg:grid-cols-2">
            <CreateProjectForm phases={data.phases} selectedPhaseId={selectedPhaseId} returnPath={returnPath} />
            <CreateObjectiveAndTaskForm
              phases={data.phases}
              projects={data.projects}
              goals={data.goals}
              selectedPhaseId={selectedPhaseId}
              returnPath={returnPath}
            />
          </section>

          {selectedPhase ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GitBranch size={18} />
                  Connect Existing Life Pieces
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <AttachRows title="Unlinked objectives" entityType="goal" rows={unlinkedGoals.map((goal) => ({ id: goal.id, label: goal.title }))} phases={data.phases} projects={data.projects} selectedPhaseId={selectedPhaseId} returnPath={returnPath} />
                <AttachRows title="Unlinked daily tasks" entityType="task" rows={unlinkedTasks.map((task) => ({ id: task.id, label: task.title }))} phases={data.phases} projects={data.projects} selectedPhaseId={selectedPhaseId} returnPath={returnPath} />
                <AttachRows title="Unlinked money" entityType="finance_entry" rows={unlinkedMoney.map((entry) => ({ id: entry.id, label: `${entry.entry_type}: ${money(entry.amount)} · ${entry.occurred_on}` }))} phases={data.phases} projects={data.projects} selectedPhaseId={selectedPhaseId} returnPath={returnPath} />
                <AttachRows title="Unlinked events" entityType="event" rows={unlinkedEvents.map((event) => ({ id: event.id, label: `${event.title}${event.event_date ? ` · ${event.event_date}` : ""}` }))} phases={data.phases} projects={data.projects} selectedPhaseId={selectedPhaseId} returnPath={returnPath} />
                <AttachRows title="Unlinked notes" entityType="knowledge_space" rows={unlinkedSpaces.map((space) => ({ id: space.id, label: space.title }))} phases={data.phases} projects={data.projects} selectedPhaseId={selectedPhaseId} returnPath={returnPath} />
              </CardContent>
            </Card>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function Field({ label, id, children }: { label: string; id: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof Flag; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--app-panel-border-strong)] bg-[var(--app-panel-bg-soft)] p-3">
      <p className="flex items-center gap-2 text-xs uppercase text-[var(--app-text-muted)]">
        <Icon size={14} />
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold text-[var(--app-text-strong)]">{value}</p>
    </div>
  );
}

function Bar({ value, max, className }: { value: number; max: number; className: string }) {
  return (
    <div className="h-2 rounded-full bg-[var(--app-panel-border)]">
      <div className={cn("h-full rounded-full", className)} style={{ width: `${Math.max(4, Math.round((value / max) * 100))}%` }} />
    </div>
  );
}

function ProgressLine({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-[var(--app-text-muted)]">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <Progress value={value} />
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--app-panel-border-strong)] bg-[var(--app-panel-bg)] p-2">
      <p className="text-xs text-[var(--app-text-muted)]">{label}</p>
      <p className="font-semibold text-[var(--app-text-strong)]">{value}</p>
    </div>
  );
}

function ConnectionList({ title, icon: Icon, rows }: { title: string; icon: typeof Flag; rows: string[] }) {
  return (
    <Card className="border-[var(--app-panel-border-strong)] bg-[var(--app-panel-bg-soft)] shadow-none">
      <CardContent className="py-4">
        <p className="mb-3 flex items-center gap-2 font-semibold text-[var(--app-text-strong)]">
          <Icon size={16} />
          {title}
        </p>
        <div className="space-y-2">
          {rows.slice(0, 5).map((row, index) => (
            <p key={`${row}-${index}`} className="rounded-md bg-[var(--app-panel-bg)] px-2 py-1 text-sm text-[var(--app-text-muted)]">
              {row}
            </p>
          ))}
          {rows.length === 0 ? <p className="text-sm text-[var(--app-text-muted)]">Nothing linked yet.</p> : null}
        </div>
      </CardContent>
    </Card>
  );
}

function PhaseSelect({ phases, selectedPhaseId }: { phases: LifePhaseRow[]; selectedPhaseId: string | null }) {
  return (
    <Select name="phaseId" defaultValue={selectedPhaseId ?? ""}>
      <option value="">No phase</option>
      {phases.map((phase) => (
        <option key={phase.id} value={phase.id}>{phase.title}</option>
      ))}
    </Select>
  );
}

function ProjectSelect({ projects }: { projects: LifeProjectRow[] }) {
  return (
    <Select name="projectId" defaultValue="">
      <option value="">No project</option>
      {projects.map((project) => (
        <option key={project.id} value={project.id}>{project.name}</option>
      ))}
    </Select>
  );
}

function CreateProjectForm({ phases, selectedPhaseId, returnPath }: { phases: LifePhaseRow[]; selectedPhaseId: string | null; returnPath: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BriefcaseBusiness size={18} />
          Add Project
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ActionForm action={createLifeProjectFormAction} className="space-y-3">
          <input type="hidden" name="returnPath" value={returnPath} />
          <Field label="Project name" id="projectName">
            <Input id="projectName" name="name" placeholder="Portfolio, SaaS app, learning sprint..." required />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Phase" id="projectPhase">
              <PhaseSelect phases={phases} selectedPhaseId={selectedPhaseId} />
            </Field>
            <Field label="Status" id="projectStatus">
              <Select id="projectStatus" name="status" defaultValue="active">
                {Object.entries(projectStatusLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Start" id="projectStart">
              <Input id="projectStart" name="startDate" type="date" />
            </Field>
            <Field label="End" id="projectEnd">
              <Input id="projectEnd" name="endDate" type="date" />
            </Field>
            <Field label="Progress" id="projectProgress">
              <Input id="projectProgress" name="progress" type="number" min="0" max="100" defaultValue="0" />
            </Field>
          </div>
          <Field label="Description" id="projectDescription">
            <Textarea id="projectDescription" name="description" rows={3} />
          </Field>
          <Field label="Outcome" id="projectOutcome">
            <Textarea id="projectOutcome" name="outcome" rows={2} />
          </Field>
          <SubmitButton label="Create project" pendingLabel="Creating..." className="w-full" />
        </ActionForm>
      </CardContent>
    </Card>
  );
}

function CreateObjectiveAndTaskForm({
  phases,
  projects,
  goals,
  selectedPhaseId,
  returnPath
}: {
  phases: LifePhaseRow[];
  projects: LifeProjectRow[];
  goals: Array<{ id: string; title: string }>;
  selectedPhaseId: string | null;
  returnPath: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target size={18} />
          Objective And Daily Task
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <ActionForm action={createLifeObjectiveFormAction} className="space-y-3">
          <input type="hidden" name="returnPath" value={returnPath} />
          <Field label="Objective title" id="objectiveTitle">
            <Input id="objectiveTitle" name="title" placeholder="Become stronger backend engineer" required />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Phase" id="objectivePhase">
              <PhaseSelect phases={phases} selectedPhaseId={selectedPhaseId} />
            </Field>
            <Field label="Project" id="objectiveProject">
              <ProjectSelect projects={projects} />
            </Field>
          </div>
          <Field label="Description" id="objectiveDescription">
            <Textarea id="objectiveDescription" name="description" rows={2} />
          </Field>
          <SubmitButton label="Create objective" pendingLabel="Creating..." className="w-full" />
        </ActionForm>

        <div className="h-px bg-[var(--app-panel-border-strong)]" />

        <ActionForm action={createLifeTaskFormAction} className="space-y-3">
          <input type="hidden" name="returnPath" value={returnPath} />
          <Field label="Inside objective" id="taskObjective">
            <Select id="taskObjective" name="objectiveId" required>
              <option value="">Choose objective</option>
              {goals.map((goal) => (
                <option key={goal.id} value={goal.id}>{goal.title}</option>
              ))}
            </Select>
          </Field>
          <Field label="Daily task" id="taskTitle">
            <Input id="taskTitle" name="title" placeholder="Study system design 60 min" required />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Phase" id="taskPhase">
              <PhaseSelect phases={phases} selectedPhaseId={selectedPhaseId} />
            </Field>
            <Field label="Project" id="taskProject">
              <ProjectSelect projects={projects} />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Minimum minutes" id="minimumMinutes">
              <Input id="minimumMinutes" name="minimumMinutes" type="number" min="0" />
            </Field>
            <Field label="Weekly target" id="weeklyTargetMinutes">
              <Input id="weeklyTargetMinutes" name="weeklyTargetMinutes" type="number" min="0" />
            </Field>
          </div>
          <SubmitButton label="Create daily task" pendingLabel="Creating..." className="w-full" />
        </ActionForm>
      </CardContent>
    </Card>
  );
}

function AttachRows({
  title,
  entityType,
  rows,
  phases,
  projects,
  selectedPhaseId,
  returnPath
}: {
  title: string;
  entityType: "goal" | "task" | "finance_entry" | "event" | "knowledge_space";
  rows: Array<{ id: string; label: string }>;
  phases: LifePhaseRow[];
  projects: LifeProjectRow[];
  selectedPhaseId: string | null;
  returnPath: string;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-[var(--app-text-strong)]">{title}</p>
      {rows.length > 0 ? (
        <div className="space-y-2">
          {rows.map((row) => (
            <ActionForm key={row.id} action={attachLifeEntityFormAction} className="grid gap-2 rounded-lg border border-[var(--app-panel-border-strong)] bg-[var(--app-panel-bg-soft)] p-2 md:grid-cols-[1fr_160px_160px_auto] md:items-center">
              <input type="hidden" name="returnPath" value={returnPath} />
              <input type="hidden" name="entityType" value={entityType} />
              <input type="hidden" name="entityId" value={row.id} />
              <p className="text-sm text-[var(--app-text-muted)]">{row.label}</p>
              <PhaseSelect phases={phases} selectedPhaseId={selectedPhaseId} />
              <ProjectSelect projects={projects} />
              <SubmitButton label="Attach" pendingLabel="..." className="h-9" />
            </ActionForm>
          ))}
        </div>
      ) : (
        <p className="text-sm text-[var(--app-text-muted)]">Everything visible here is already connected.</p>
      )}
    </div>
  );
}
