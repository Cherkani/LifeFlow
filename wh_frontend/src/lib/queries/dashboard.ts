import type { Supabase } from "./types";

export async function getDashboardCounts(supabase: Supabase, accountId: string) {
  const [phasesRes, projectsRes, objectivesRes, templatesRes] = await Promise.all([
    supabase.from("life_phases").select("id", { count: "exact", head: true }).eq("account_id", accountId),
    supabase.from("life_projects").select("id", { count: "exact", head: true }).eq("account_id", accountId),
    supabase.from("habit_objectives").select("id", { count: "exact", head: true }).eq("account_id", accountId),
    supabase.from("templates").select("id", { count: "exact", head: true }).eq("account_id", accountId)
  ]);
  return {
    phasesCount: phasesRes.count ?? 0,
    projectsCount: projectsRes.count ?? 0,
    objectivesCount: objectivesRes.count ?? 0,
    templatesCount: templatesRes.count ?? 0
  };
}
