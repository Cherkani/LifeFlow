import type { Supabase } from "./types";

export type TaskHabitRow = { id: string; title: string };

export async function getTasksHabits(supabase: Supabase, accountId: string): Promise<TaskHabitRow[]> {
  const { data } = await supabase
    .from("habits")
    .select("id, title")
    .eq("account_id", accountId)
    .eq("is_active", true);
  return (data ?? []) as TaskHabitRow[];
}

export type TaskSessionRow = {
  id: string;
  habit_id: string;
  session_date: string;
  planned_minutes: number;
  completed: boolean;
  notes: string | null;
};

export async function getTasksSessions(
  supabase: Supabase,
  habitIds: string[]
): Promise<TaskSessionRow[]> {
  if (habitIds.length === 0) {
    return [];
  }
  const { data } = await supabase
    .from("habit_sessions")
    .select("id, habit_id, session_date, planned_minutes, completed, notes")
    .in("habit_id", habitIds)
    .order("session_date", { ascending: true })
    .limit(50);
  return (data ?? []) as TaskSessionRow[];
}
