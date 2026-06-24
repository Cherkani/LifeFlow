import type { Supabase } from "@/lib/queries/types";

export type OwnedLifeContext = {
  phaseId: string | null;
  projectId: string | null;
};

/**
 * Validates context against the active account. A project is authoritative for
 * its phase, so callers cannot persist a mismatched phase/project pair.
 */
export async function resolveOwnedLifeContext(
  supabase: Supabase,
  accountId: string,
  requestedPhaseId: string | null | undefined,
  requestedProjectId: string | null | undefined
): Promise<OwnedLifeContext | null> {
  if (requestedProjectId) {
    const { data } = await supabase
      .from("life_projects")
      .select("id, phase_id")
      .eq("account_id", accountId)
      .eq("id", requestedProjectId)
      .maybeSingle();

    const project = data as { id: string; phase_id: string | null } | null;
    return project ? { phaseId: project.phase_id, projectId: project.id } : null;
  }

  if (requestedPhaseId) {
    const { data } = await supabase
      .from("life_phases")
      .select("id")
      .eq("account_id", accountId)
      .eq("id", requestedPhaseId)
      .maybeSingle();

    const phase = data as { id: string } | null;
    return phase ? { phaseId: phase.id, projectId: null } : null;
  }

  return { phaseId: null, projectId: null };
}

export async function getOwnedObjectiveContext(
  supabase: Supabase,
  accountId: string,
  objectiveId: string
): Promise<{ id: string; phase_id: string | null; project_id: string | null } | null> {
  const { data } = await supabase
    .from("habit_objectives")
    .select("id, phase_id, project_id")
    .eq("account_id", accountId)
    .eq("id", objectiveId)
    .maybeSingle();
  return data as { id: string; phase_id: string | null; project_id: string | null } | null;
}
