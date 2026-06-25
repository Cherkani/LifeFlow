import type { Supabase } from "./types";

export type PlanningObjectiveRow = { id: string; title: string; description: string | null; image_url: string | null };
export type PlanningTaskRow = { id: string; title: string; objective_id: string | null; metadata: unknown };
export type PlanningTemplateRow = { id: string; name: string; objective_id: string | null };
export type PlanningWeekRow = { id: string; template_id: string; week_start_date: string };

export type PlanningData = {
  objectives: PlanningObjectiveRow[];
  tasks: PlanningTaskRow[];
  templates: PlanningTemplateRow[];
  weeks: PlanningWeekRow[];
};

export async function getPlanningData(supabase: Supabase, accountId: string): Promise<PlanningData> {
  const [objectivesRes, tasksRes, templatesRes, weeksRes] = await Promise.all([
    supabase
      .from("habit_objectives")
      .select("id, title, description, image_url")
      .eq("account_id", accountId)
      .order("created_at", { ascending: false }),
    supabase
      .from("habits")
      .select("id, title, objective_id, metadata")
      .eq("account_id", accountId)
      .eq("is_active", true)
      .order("created_at", { ascending: false }),
    supabase
      .from("templates")
      .select("id, name, objective_id")
      .eq("account_id", accountId)
      .order("created_at", { ascending: false }),
    supabase
      .from("weeks")
      .select("id, template_id, week_start_date")
      .eq("account_id", accountId)
      .order("week_start_date", { ascending: true })
  ]);
  return {
    objectives: (objectivesRes.data ?? []) as PlanningObjectiveRow[],
    tasks: (tasksRes.data ?? []) as PlanningTaskRow[],
    templates: (templatesRes.data ?? []) as PlanningTemplateRow[],
    weeks: (weeksRes.data ?? []) as PlanningWeekRow[]
  };
}

export async function getPlanningTemplateEntries(
  supabase: Supabase,
  templateIds: string[]
) {
  if (templateIds.length === 0) {
    return { data: [] };
  }
  return supabase
    .from("template_entries")
    .select("id, template_id, habit_id, day_of_week, planned_minutes, minimum_minutes, is_required")
    .in("template_id", templateIds)
    .order("day_of_week", { ascending: true });
}

export async function getPlanningSessions(
  supabase: Supabase,
  habitIds: string[],
  firstWeekIso: string,
  lastWeekIso: string
) {
  if (habitIds.length === 0) {
    return { data: [] as Array<{ session_date: string; completed: boolean }> };
  }
  return supabase
    .from("habit_sessions")
    .select("session_date, completed")
    .in("habit_id", habitIds)
    .gte("session_date", firstWeekIso)
    .lte("session_date", lastWeekIso);
}
