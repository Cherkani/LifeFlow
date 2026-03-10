import type { Supabase } from "./types";

export async function getDashboardCounts(supabase: Supabase, accountId: string) {
  const [objectivesRes, templatesRes] = await Promise.all([
    supabase.from("habit_objectives").select("id", { count: "exact", head: true }).eq("account_id", accountId),
    supabase.from("templates").select("id", { count: "exact", head: true }).eq("account_id", accountId)
  ]);
  return {
    objectivesCount: objectivesRes.count ?? 0,
    templatesCount: templatesRes.count ?? 0
  };
}
