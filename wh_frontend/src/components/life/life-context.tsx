import Link from "next/link";
import type { Route } from "next";
import { GitBranch, Layers3 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CurrentLifeMiniSummary } from "@/components/life/current-life-context";
import type { LifeOptionData } from "@/lib/queries/life";

type LifeContextProps = {
  phases: LifeOptionData["phases"];
  projects: LifeOptionData["projects"];
  activePhaseId?: string | null;
  activeProjectId?: string | null;
  stats?: Array<{ label: string; value: string | number }>;
  emptyLabel?: string;
};

export function LifeContext({
  phases,
  projects,
  activePhaseId,
  activeProjectId,
  stats = [],
  emptyLabel = "No phase or project linked yet"
}: LifeContextProps) {
  const phase = activePhaseId ? phases.find((item) => item.id === activePhaseId) : null;
  const project = activeProjectId ? projects.find((item) => item.id === activeProjectId) : null;

  return (
    <Card className="border-[var(--app-panel-border)] bg-[var(--app-panel-bg-soft)] shadow-none">
      <CardContent className="flex flex-wrap items-center justify-between gap-3 py-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="inline-flex size-8 items-center justify-center rounded-lg bg-[var(--app-btn-secondary-bg)] text-[var(--app-btn-secondary-fg)]">
            <GitBranch size={16} />
          </span>
          {phase ? (
            <Link href={`/life-map?phase=${phase.id}` as Route} className="text-sm font-semibold text-[var(--app-text-strong)] hover:underline">
              {phase.title}
            </Link>
          ) : null}
          {project ? (
            <Link href={`/life-map/projects/${project.id}` as Route} className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--app-text-strong)] hover:underline">
              <Layers3 size={14} />
              {project.name}
            </Link>
          ) : null}
          {!phase && !project ? <span className="text-sm text-[var(--app-text-muted)]">{emptyLabel}</span> : null}
        </div>
        {stats.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            {stats.map((stat) => (
              <Badge key={stat.label} variant="secondary">
                {stat.label}: {stat.value}
              </Badge>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function LifeSummaryBand({
  title,
  description,
  phases,
  projects,
  stats
}: {
  title: string;
  description: string;
  phases: LifeOptionData["phases"];
  projects: LifeOptionData["projects"];
  stats: Array<{ label: string; value: string | number }>;
}) {
  void phases;
  void projects;
  return <CurrentLifeMiniSummary title={title} description={description} stats={stats} />;
}
