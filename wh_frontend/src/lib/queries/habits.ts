import type { Supabase } from "./types";

export type HabitsPageData = {
  objectives: Array<{ id: string; title: string; image_url: string | null }>;
  categories: Array<{ id: string; title: string; objective_id: string | null }>;
  templates: Array<{ id: string; name: string }>;
  currentWeek: { id: string; template_id: string } | null;
};

export async function getHabitsPageData(
  supabase: Supabase,
  accountId: string,
  weekStartIso: string
): Promise<HabitsPageData> {
  const [objectivesRes, categoriesRes, templatesRes, currentWeekRes] = await Promise.all([
    supabase.from("habit_objectives").select("id, title, image_url").eq("account_id", accountId),
    supabase.from("habits").select("id, title, objective_id").eq("account_id", accountId).eq("is_active", true),
    supabase.from("templates").select("id, name").eq("account_id", accountId).order("created_at", { ascending: false }),
    supabase
      .from("weeks")
      .select("id, template_id")
      .eq("account_id", accountId)
      .eq("week_start_date", weekStartIso)
      .maybeSingle()
  ]);
  return {
    objectives: (objectivesRes.data ?? []) as HabitsPageData["objectives"],
    categories: (categoriesRes.data ?? []) as HabitsPageData["categories"],
    templates: (templatesRes.data ?? []) as HabitsPageData["templates"],
    currentWeek: currentWeekRes.data as HabitsPageData["currentWeek"]
  };
}

export async function getTemplateEntriesOrder(
  supabase: Supabase,
  templateId: string
) {
  return supabase
    .from("template_entries")
    .select("habit_id, day_of_week")
    .eq("template_id", templateId)
    .order("created_at", { ascending: true });
}

export async function getWeekSessions(
  supabase: Supabase,
  habitIds: string[],
  weekStartIso: string,
  weekEndIso: string
) {
  if (habitIds.length === 0) {
    return { data: [] };
  }
  return supabase
    .from("habit_sessions")
    .select("id, habit_id, session_date, planned_minutes, minimum_minutes, actual_minutes, completed")
    .in("habit_id", habitIds)
    .gte("session_date", weekStartIso)
    .lte("session_date", weekEndIso)
    .order("session_date", { ascending: true });
}

export async function getMonthSessions(
  supabase: Supabase,
  habitIds: string[],
  monthStart: string,
  monthEnd: string
) {
  if (habitIds.length === 0) {
    return { data: [] };
  }
  return supabase
    .from("habit_sessions")
    .select("id, actual_minutes, planned_minutes, completed")
    .in("habit_id", habitIds)
    .gte("session_date", monthStart)
    .lte("session_date", monthEnd);
}
