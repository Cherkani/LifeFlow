import type { Supabase } from "./types";

export type AnalyticsCategoryRow = { id: string; name: string; monthly_limit: string | null };
export type AnalyticsExpenseRow = { id: string; category_id: string | null; amount: string; occurred_on: string };

export type AnalyticsInitialData = {
  habitIds: string[];
  categories: AnalyticsCategoryRow[];
  monthExpenses: AnalyticsExpenseRow[];
};

export async function getAnalyticsInitialData(
  supabase: Supabase,
  accountId: string,
  monthStartIso: string,
  monthEndIso: string
): Promise<AnalyticsInitialData> {
  const [habitsRes, categoriesRes, monthExpensesRes] = await Promise.all([
    supabase.from("habits").select("id").eq("account_id", accountId).eq("is_active", true),
    supabase
      .from("finance_categories")
      .select("id, name, monthly_limit")
      .eq("account_id", accountId)
      .eq("kind", "expense")
      .order("name"),
    supabase
      .from("ledger_entries")
      .select("id, category_id, amount, occurred_on")
      .eq("account_id", accountId)
      .eq("entry_type", "expense")
      .gte("occurred_on", monthStartIso)
      .lte("occurred_on", monthEndIso)
  ]);
  const habitIds = ((habitsRes.data ?? []) as Array<{ id: string }>).map((h) => h.id);
  return {
    habitIds,
    categories: (categoriesRes.data ?? []) as AnalyticsCategoryRow[],
    monthExpenses: (monthExpensesRes.data ?? []) as AnalyticsExpenseRow[]
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
