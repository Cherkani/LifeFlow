import Link from "next/link";
import type { Route } from "next";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, CalendarDays, ChartNoAxesCombined, GitBranch, NotebookPen, Repeat, WalletCards } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDashboardCounts } from "@/lib/queries";
import { requireAppContext } from "@/lib/server-context";
type QuickAction = {
  title: string;
  description: string;
  button: string;
  href: "/life-map" | "/planning" | "/habits" | "/events" | "/analytics" | "/finance";
  icon: LucideIcon;
  tone: string;
};

const quickActions: QuickAction[] = [
  {
    title: "Map Your Life",
    description: "Connect phases, projects, money, notes, events, objectives, and daily tasks.",
    button: "Open Life Map",
    href: "/life-map",
    icon: GitBranch,
    tone: "from-[#d2e3db]/45 to-[#eef6f1]/25"
  },
  {
    title: "Plan Your Week",
    description: "Create objectives and templates in a structured planner flow.",
    button: "Open Planner",
    href: "/planning",
    icon: NotebookPen,
    tone: "from-[#c8d8f5]/45 to-[#dbe7fb]/25"
  },
  {
    title: "Execute Daily",
    description: "Track checkboxes and minutes from your assigned weekly template.",
    button: "Open Execution",
    href: "/habits",
    icon: Repeat,
    tone: "from-[#cfdcf6]/45 to-[#e3ecfd]/25"
  },
  {
    title: "Manage Finance",
    description: "Track expenses, debt, and payments with clearer visual controls.",
    button: "Open Finance",
    href: "/finance",
    icon: WalletCards,
    tone: "from-[#e8d5d8]/35 to-[#f2e4ea]/18"
  },
  {
    title: "Analyze Progress",
    description: "Use weekly/monthly charts to evaluate momentum and consistency.",
    button: "Open Analysis",
    href: "/analytics",
    icon: ChartNoAxesCombined,
    tone: "from-[#d2e3db]/35 to-[#e7f1ea]/20"
  }
];

export default async function DashboardPage() {
  const { supabase, account } = await requireAppContext();
  const { phasesCount, projectsCount, objectivesCount, templatesCount } = await getDashboardCounts(supabase, account.accountId);

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-[var(--app-panel-border)] bg-[var(--app-panel-bg)] shadow-[0_20px_40px_rgba(7,13,26,0.18)]">
        <CardContent className="relative space-y-4 py-8">
          <div className="absolute right-0 top-0 h-32 w-32 rounded-bl-full bg-[#3b6db3]/20" />
          <div className="absolute bottom-0 left-0 h-20 w-20 rounded-tr-full bg-[#5b87cb]/18" />
          <h1 className="relative text-4xl font-bold tracking-tight text-[var(--app-text-strong)]">Welcome back to LifeFlow</h1>
          <p className="relative max-w-3xl text-base text-[var(--app-text-muted)]">
            Map your life phases, connect projects to money and tasks, and keep your progress visible from one command center.
          </p>
          <div className="relative grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-lg border border-[var(--app-panel-border-strong)] bg-[var(--app-panel-bg-soft)] p-3">
              <p className="text-xs uppercase tracking-wide text-[var(--app-text-muted)]">Life phases</p>
              <p className="mt-1 text-xl font-semibold text-[var(--app-text-strong)]">{phasesCount}</p>
            </div>
            <div className="rounded-lg border border-[var(--app-panel-border-strong)] bg-[var(--app-panel-bg-soft)] p-3">
              <p className="text-xs uppercase tracking-wide text-[var(--app-text-muted)]">Projects</p>
              <p className="mt-1 text-xl font-semibold text-[var(--app-text-strong)]">{projectsCount}</p>
            </div>
            <div className="rounded-lg border border-[var(--app-panel-border-strong)] bg-[var(--app-panel-bg-soft)] p-3">
              <p className="text-xs uppercase tracking-wide text-[var(--app-text-muted)]">Objectives</p>
              <p className="mt-1 text-xl font-semibold text-[var(--app-text-strong)]">{objectivesCount}</p>
            </div>
            <div className="rounded-lg border border-[var(--app-panel-border-strong)] bg-[var(--app-panel-bg-soft)] p-3">
              <p className="text-xs uppercase tracking-wide text-[var(--app-text-muted)]">Templates</p>
              <p className="mt-1 text-xl font-semibold text-[var(--app-text-strong)]">{templatesCount}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <Card key={action.title} className="overflow-hidden border-[var(--app-panel-border)] bg-[var(--app-panel-bg)] shadow-[0_16px_36px_rgba(7,13,26,0.16)]">
              <CardHeader className={`border-b border-[var(--app-panel-border-strong)] bg-gradient-to-r ${action.tone}`}>
                <CardTitle className="flex items-center gap-2 text-xl text-[var(--app-text-strong)]">
                  <Icon size={20} className="text-[var(--app-btn-secondary-fg)]" />
                  {action.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 py-6">
                <p className="text-sm text-[var(--app-text-muted)]">{action.description}</p>
                <Link
                  href={action.href as Route}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--app-btn-primary-bg)] px-4 py-3 text-sm font-semibold text-[var(--app-btn-primary-fg)] transition hover:bg-[var(--app-btn-primary-hover)]"
                >
                  {action.button}
                  <ArrowRight size={16} />
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <Card className="border-[var(--app-panel-border)] bg-[var(--app-panel-bg)] shadow-[0_16px_34px_rgba(7,13,26,0.14)]">
        <CardHeader>
          <CardTitle className="text-[var(--app-text-strong)]">Quick Access</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            href={"/life-map" as Route}
            className="rounded-lg border border-[var(--app-panel-border-strong)] bg-[var(--app-panel-bg-soft)] p-3 text-sm font-semibold text-[var(--app-text-strong)] transition hover:bg-[var(--app-btn-secondary-bg)]"
          >
            <div className="mb-2 inline-flex size-9 items-center justify-center rounded-lg bg-[var(--app-chip-bg)]">
              <GitBranch size={18} className="text-[var(--app-chip-fg)]" />
            </div>
            Life map
          </Link>
          <Link
            href="/events"
            className="rounded-lg border border-[var(--app-panel-border-strong)] bg-[var(--app-panel-bg-soft)] p-3 text-sm font-semibold text-[var(--app-text-strong)] transition hover:bg-[var(--app-btn-secondary-bg)]"
          >
            <div className="mb-2 inline-flex size-9 items-center justify-center rounded-lg bg-[var(--app-chip-bg)]">
              <CalendarDays size={18} className="text-[var(--app-chip-fg)]" />
            </div>
            Calendar events
          </Link>
          <Link href="/knowledge" className="rounded-lg border border-[var(--app-panel-border-strong)] bg-[var(--app-panel-bg-soft)] p-3 text-sm font-semibold text-[var(--app-text-strong)] transition hover:bg-[var(--app-btn-secondary-bg)]">
            Subject knowledge
          </Link>
          <Link href="/planning" className="rounded-lg border border-[var(--app-panel-border-strong)] bg-[var(--app-panel-bg-soft)] p-3 text-sm font-semibold text-[var(--app-text-strong)] transition hover:bg-[var(--app-btn-secondary-bg)]">
            Objective planner
          </Link>
          <Link href="/habits" className="rounded-lg border border-[var(--app-panel-border-strong)] bg-[var(--app-panel-bg-soft)] p-3 text-sm font-semibold text-[var(--app-text-strong)] transition hover:bg-[var(--app-btn-secondary-bg)]">
            Execution board
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
