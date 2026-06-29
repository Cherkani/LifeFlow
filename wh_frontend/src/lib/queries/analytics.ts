import type { Supabase } from "./types";

export type AnalyticsCategoryRow = { id: string; name: string; monthly_limit: string | null };
export type AnalyticsExpenseRow = { id: string; category_id: string | null; project_id: string | null; amount: string; occurred_on: string };
export type AnalyticsIncomeRow = { id: string; project_id: string | null; amount: string; occurred_on: string };
export type AnalyticsHabitRow = {
  id: string;
  title: string;
  objective_id: string | null;
  type: "time_tracking" | "fixed_protocol" | "count" | "custom";
};
export type AnalyticsObjectiveRow = {
  id: string;
  title: string;
  measurement_mode: "quantitative" | "qualitative";
  project_id: string | null;
};
export type AnalyticsProjectRow = { id: string; name: string; status: string };
export type AnalyticsCalendarDoneRow = {
  id: string;
  event_date: string | null;
  completed_on: string | null;
  objective_id: string | null;
  habit_session_id: string | null;
};

export type AnalyticsInitialData = {
  habits: AnalyticsHabitRow[];
  objectives: AnalyticsObjectiveRow[];
  projects: AnalyticsProjectRow[];
  categories: AnalyticsCategoryRow[];
  monthExpenses: AnalyticsExpenseRow[];
  monthIncome: AnalyticsIncomeRow[];
  monthCalendarDone: AnalyticsCalendarDoneRow[];
};

export async function getAnalyticsInitialData(
  supabase: Supabase,
  accountId: string,
  monthStartIso: string,
  monthEndIso: string
): Promise<AnalyticsInitialData> {
  const [habitsRes, objectivesRes, projectsRes, categoriesRes, monthExpensesRes, monthIncomeRes, monthCalendarDoneRes] = await Promise.all([
    supabase.from("habits").select("id, title, objective_id, type").eq("account_id", accountId).eq("is_active", true),
    supabase
      .from("habit_objectives")
      .select("id, title, measurement_mode, project_id")
      .eq("account_id", accountId)
      .order("title"),
    supabase.from("life_projects").select("id, name, status").eq("account_id", accountId).order("name"),
    supabase
      .from("finance_categories")
      .select("id, name, monthly_limit")
      .eq("account_id", accountId)
      .eq("kind", "expense")
      .order("name"),
    supabase
      .from("ledger_entries")
      .select("id, category_id, project_id, amount, occurred_on")
      .eq("account_id", accountId)
      .eq("entry_type", "expense")
      .gte("occurred_on", monthStartIso)
      .lte("occurred_on", monthEndIso),
    supabase
      .from("ledger_entries")
      .select("id, project_id, amount, occurred_on")
      .eq("account_id", accountId)
      .eq("entry_type", "income")
      .gte("occurred_on", monthStartIso)
      .lte("occurred_on", monthEndIso),
    supabase
      .from("calendar_events")
      .select("id, event_date, completed_on, objective_id, habit_session_id")
      .eq("account_id", accountId)
      .not("completed_at", "is", null)
      .gte("completed_on", monthStartIso)
      .lte("completed_on", monthEndIso)
  ]);
  return {
    habits: (habitsRes.data ?? []) as AnalyticsHabitRow[],
    objectives: ((objectivesRes.data ?? []) as Array<AnalyticsObjectiveRow & { measurement_mode?: "quantitative" | "qualitative" | null }>).map((objective) => ({
      ...objective,
      measurement_mode: objective.measurement_mode ?? "quantitative"
    })),
    projects: (projectsRes.data ?? []) as AnalyticsProjectRow[],
    categories: (categoriesRes.data ?? []) as AnalyticsCategoryRow[],
    monthExpenses: (monthExpensesRes.data ?? []) as AnalyticsExpenseRow[],
    monthIncome: (monthIncomeRes.data ?? []) as AnalyticsIncomeRow[],
    monthCalendarDone: (monthCalendarDoneRes.data ?? []) as AnalyticsCalendarDoneRow[]
  };
}

export type AnalyticsSessionRow = {
  id: string;
  habit_id: string;
  session_date: string;
  planned_minutes: number;
  actual_minutes: number | null;
  completed: boolean;
};

export async function getAnalyticsSessions(
  supabase: Supabase,
  habitIds: string[],
  weekStartIso: string,
  weekEndIso: string,
  previousWeekStartIso: string,
  previousWeekEndIso: string,
  monthStartIso: string,
  monthEndIso: string
): Promise<{
  weekSessions: AnalyticsSessionRow[];
  previousWeekSessions: AnalyticsSessionRow[];
  monthSessions: AnalyticsSessionRow[];
}> {
  if (habitIds.length === 0) {
    return {
      weekSessions: [],
      previousWeekSessions: [],
      monthSessions: []
    };
  }
  const [weekSessionsRes, previousWeekSessionsRes, monthSessionsRes] = await Promise.all([
    supabase
      .from("habit_sessions")
      .select("id, habit_id, session_date, planned_minutes, actual_minutes, completed")
      .in("habit_id", habitIds)
      .gte("session_date", weekStartIso)
      .lte("session_date", weekEndIso)
      .order("session_date", { ascending: true }),
    supabase
      .from("habit_sessions")
      .select("id, habit_id, session_date, planned_minutes, actual_minutes, completed")
      .in("habit_id", habitIds)
      .gte("session_date", previousWeekStartIso)
      .lte("session_date", previousWeekEndIso),
    supabase
      .from("habit_sessions")
      .select("id, habit_id, session_date, planned_minutes, actual_minutes, completed")
      .in("habit_id", habitIds)
      .gte("session_date", monthStartIso)
      .lte("session_date", monthEndIso)
  ]);
  return {
    weekSessions: (weekSessionsRes.data ?? []) as AnalyticsSessionRow[],
    previousWeekSessions: (previousWeekSessionsRes.data ?? []) as AnalyticsSessionRow[],
    monthSessions: (monthSessionsRes.data ?? []) as AnalyticsSessionRow[]
  };
}
