"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { GitBranch, Layers3 } from "lucide-react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { LifeScope } from "@/lib/life-filter";
import type { LifeOptionData } from "@/lib/queries/life";

type CurrentLifeContextValue = {
  phases: LifeOptionData["phases"];
  projects: LifeOptionData["projects"];
  activePhaseId: string | null;
  activeProjectId: string | null;
  scope: LifeScope;
  setActivePhaseId: (id: string | null) => void;
  setActiveProjectId: (id: string | null) => void;
  setScope: (scope: LifeScope) => void;
};

const CurrentLifeContext = createContext<CurrentLifeContextValue | null>(null);

function cookieName(kind: "phase" | "project", accountId: string) {
  return `lifeflow-${kind}-${accountId}`;
}

function persistCookie(name: string, value: string | null) {
  document.cookie = `${name}=${value ?? "__none__"}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
}

export function CurrentLifeContextProvider({
  children,
  accountId,
  phases,
  projects,
  initialPhaseId,
  initialProjectId,
  initialScope
}: {
  children: ReactNode;
  accountId: string;
  phases: LifeOptionData["phases"];
  projects: LifeOptionData["projects"];
  initialPhaseId: string | null;
  initialProjectId: string | null;
  initialScope: LifeScope;
}) {
  const router = useRouter();
  const [activePhaseId, setPhase] = useState<string | null>(initialPhaseId);
  const [activeProjectId, setProject] = useState<string | null>(initialProjectId);
  const [scope, setScopeState] = useState<LifeScope>(initialScope);

  useEffect(() => {
    setPhase(initialPhaseId);
    setProject(initialProjectId);
    setScopeState(initialScope);
  }, [initialPhaseId, initialProjectId, initialScope]);

  function persist(phaseId: string | null, projectId: string | null) {
    persistCookie(cookieName("phase", accountId), phaseId);
    persistCookie(cookieName("project", accountId), projectId);
  }

  function setActivePhaseId(id: string | null) {
    const nextPhaseId = id && phases.some((phase) => phase.id === id) ? id : null;
    const activeProject = projects.find((project) => project.id === activeProjectId);
    const nextProjectId = activeProject && (!nextPhaseId || !activeProject.phase_id || activeProject.phase_id === nextPhaseId)
      ? activeProject.id
      : null;
    setPhase(nextPhaseId);
    setProject(nextProjectId);
    persist(nextPhaseId, nextProjectId);
    router.refresh();
  }

  function setActiveProjectId(id: string | null) {
    const project = id ? projects.find((item) => item.id === id) : null;
    const nextProjectId = project?.id ?? null;
    const nextPhaseId = project?.phase_id ?? activePhaseId;
    setPhase(nextPhaseId);
    setProject(nextProjectId);
    persist(nextPhaseId, nextProjectId);
    router.refresh();
  }

  function setScope(nextScope: LifeScope) {
    const validScope = nextScope === "phase" && !activePhaseId
      ? "all"
      : nextScope === "project" && !activeProjectId
        ? "all"
        : nextScope;
    setScopeState(validScope);
    if (validScope === "all") {
      document.cookie = `lifeflow-scope-${accountId}=; path=/; max-age=0; samesite=lax`;
    } else {
      persistCookie(`lifeflow-scope-${accountId}`, validScope);
    }
    router.refresh();
  }

  const value = { phases, projects, activePhaseId, activeProjectId, scope, setActivePhaseId, setActiveProjectId, setScope };

  return <CurrentLifeContext.Provider value={value}>{children}</CurrentLifeContext.Provider>;
}

export function useCurrentLifeContext() {
  const value = useContext(CurrentLifeContext);
  if (!value) {
    throw new Error("useCurrentLifeContext must be used inside CurrentLifeContextProvider");
  }
  return value;
}

export function CurrentLifeContextSelector({ compact = false }: { compact?: boolean }) {
  const { phases, projects, activePhaseId, activeProjectId, setActivePhaseId, setActiveProjectId } = useCurrentLifeContext();
  const selectablePhases = phases.filter((phase) => phase.status !== "archived");
  const visibleProjects = projects.filter(
    (project) => project.status !== "archived" && project.status !== "completed" && (!activePhaseId || !project.phase_id || project.phase_id === activePhaseId)
  );

  return (
    <div className="flex min-w-0 items-center gap-2" aria-label="Current life context">
      <label className="relative min-w-0">
        <GitBranch className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[var(--app-text-muted)]" size={14} />
        <span className="sr-only">Current phase</span>
        <select
          value={activePhaseId ?? ""}
          onChange={(event) => setActivePhaseId(event.target.value || null)}
          className="h-9 max-w-44 rounded-lg border border-[var(--app-panel-border-strong)] bg-[var(--app-panel-bg)] py-1 pl-7 pr-7 text-xs font-medium text-[var(--app-text-strong)]"
          title="Current life phase"
        >
          <option value="">No current phase</option>
          {selectablePhases.map((phase) => <option key={phase.id} value={phase.id}>{phase.title}</option>)}
        </select>
      </label>
      {!compact ? (
        <label className="relative min-w-0">
          <Layers3 className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[var(--app-text-muted)]" size={14} />
          <span className="sr-only">Current project</span>
          <select
            value={activeProjectId ?? ""}
            onChange={(event) => setActiveProjectId(event.target.value || null)}
            className="h-9 max-w-48 rounded-lg border border-[var(--app-panel-border-strong)] bg-[var(--app-panel-bg)] py-1 pl-7 pr-7 text-xs font-medium text-[var(--app-text-strong)]"
            title="Current life project"
          >
            <option value="">No current project</option>
            {visibleProjects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
          </select>
        </label>
      ) : null}
    </div>
  );
}

export function CurrentLifeMiniSummary({
  title,
  description,
  stats
}: {
  title: string;
  description: string;
  stats: Array<{ label: string; value: string | number }>;
}) {
  const { phases, projects, activePhaseId, activeProjectId, scope, setScope } = useCurrentLifeContext();
  const phase = phases.find((item) => item.id === activePhaseId);
  const project = projects.find((item) => item.id === activeProjectId);

  return (
    <Card className="border-[var(--app-panel-border)] bg-[var(--app-panel-bg-soft)] shadow-none">
      <CardContent className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <GitBranch size={15} className="shrink-0 text-[var(--app-text-muted)]" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[var(--app-text-strong)]">{title}</p>
            <p className="hidden truncate text-xs text-[var(--app-text-muted)] lg:block">{description}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {phase ? <Badge variant="secondary">{phase.title}</Badge> : <Badge variant="warning">Unlinked context</Badge>}
          {project ? <Badge variant="secondary">{project.name}</Badge> : null}
          {stats.map((stat) => <Badge key={stat.label}>{stat.label}: {stat.value}</Badge>)}
          <div className="ml-1 inline-flex rounded-lg border border-[var(--app-panel-border)] bg-[var(--app-panel-bg)] p-0.5">
            {(["all", "phase", "project", "unlinked"] as const).map((item) => (
              <button
                key={item}
                type="button"
                disabled={(item === "phase" && !activePhaseId) || (item === "project" && !activeProjectId)}
                onClick={() => setScope(item)}
                className={`rounded-md px-2 py-1 text-[11px] font-medium capitalize transition ${scope === item ? "bg-[var(--app-btn-primary-bg)] text-[var(--app-btn-primary-fg)]" : "text-[var(--app-text-muted)] hover:bg-[var(--app-panel-bg-soft)] disabled:opacity-40"}`}
              >
                {item === "phase" ? "Current phase" : item === "project" ? "Current project" : item}
              </button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
