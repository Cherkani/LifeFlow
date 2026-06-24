import type { LifeOptionData } from "@/lib/queries/life";

export type LifeScope = "all" | "phase" | "project" | "unlinked";

export type LifeFilter = {
  scope: LifeScope;
  phaseId: string | null;
  projectId: string | null;
};

type CookieReader = { get: (name: string) => { value: string } | undefined };

export function resolveLifeFilter(
  cookies: CookieReader,
  accountId: string,
  options: LifeOptionData
): LifeFilter {
  const phaseCookie = cookies.get(`lifeflow-phase-${accountId}`);
  const savedPhaseId = phaseCookie?.value ?? null;
  const phaseId = options.phases.some((phase) => phase.id === savedPhaseId)
    ? savedPhaseId
    : phaseCookie
      ? null
      : options.phases.find((phase) => phase.status === "current")?.id ?? null;
  const savedProjectId = cookies.get(`lifeflow-project-${accountId}`)?.value ?? null;
  const project = options.projects.find((item) => item.id === savedProjectId);
  const projectId = project && (!phaseId || !project.phase_id || project.phase_id === phaseId) ? project.id : null;
  const rawScope = cookies.get(`lifeflow-scope-${accountId}`)?.value;
  const scope: LifeScope = rawScope === "phase" || rawScope === "project" || rawScope === "unlinked" ? rawScope : "all";

  return {
    scope: scope === "phase" && !phaseId ? "all" : scope === "project" && !projectId ? "all" : scope,
    phaseId,
    projectId
  };
}

export function matchesLifeFilter(
  item: { phase_id?: string | null; project_id?: string | null },
  filter: LifeFilter
) {
  if (filter.scope === "phase") return item.phase_id === filter.phaseId;
  if (filter.scope === "project") return item.project_id === filter.projectId;
  if (filter.scope === "unlinked") return !item.phase_id && !item.project_id;
  return true;
}
