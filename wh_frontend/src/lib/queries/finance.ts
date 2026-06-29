import type { Supabase } from "./types";

export type FinancePageData = {
  categories: Array<{ id: string; name: string; monthly_limit: string | null; image_url: string | null }>;
  categoryUsage: Array<{ category_id: string | null }>;
  periodExpenses: Array<{ id: string; amount: string; category_id: string | null; project_id: string | null; occurred_on: string }>;
  recentExpenses: Array<{ id: string; amount: string; category_id: string | null; project_id: string | null; occurred_on: string; notes: string | null }>;
  periodIncome: Array<{ id: string; amount: string; project_id: string | null; occurred_on: string; notes: string | null }>;
  incomeSources: Array<{
    id: string;
    name: string;
    amount: string;
    recurrence: "monthly" | "yearly";
    start_date: string;
    end_date: string | null;
    notes: string | null;
    is_active: boolean;
    project_id: string | null;
  }>;
  subscriptions: Array<{
    id: string;
    name: string;
    amount: string;
    recurrence: "monthly" | "yearly";
    next_due_date: string | null;
    end_date: string | null;
    notes: string | null;
    is_active: boolean;
    project_id: string | null;
  }>;
  debts: Array<{
    id: string;
    name: string;
    type: string;
    principal: string;
    remaining_balance: string | null;
    status: string;
    due_date: string | null;
    project_id: string | null;
  }>;
  payments: Array<{ id: string; debt_id: string; amount: string; paid_at: string; method: string | null; notes: string | null; project_expense_id: string | null }>;
  projects: Array<{
    id: string;
    name: string;
    description: string | null;
    status: "idea" | "active" | "paused" | "completed" | "archived";
    start_date: string | null;
    end_date: string | null;
    progress: number;
    outcome: string | null;
    image_url: string | null;
  }>;
  objectives: Array<{ id: string; title: string; project_id: string | null; image_url: string | null }>;
  knowledgeSpaces: Array<{ id: string; title: string; project_id: string | null }>;
  projectHabits: Array<{ id: string; objective_id: string | null; project_id: string | null }>;
  projectSessions: Array<{ habit_id: string; session_date: string; actual_minutes: number | null; completed: boolean }>;
};

export async function getFinancePageData(
  supabase: Supabase,
  accountId: string,
  rangeStart: string,
  rangeEnd: string,
  period: "day" | "week" | "month"
): Promise<FinancePageData> {
  const [
    categoriesRes,
    categoryUsageRes,
    monthExpensesRes,
    recentExpensesRes,
    periodIncomeRes,
    incomeSourcesRes,
    subscriptionsRes,
    debtsRes,
    paymentsRes,
    projectsRes,
    objectivesRes,
    knowledgeSpacesRes,
    projectHabitsRes
  ] = await Promise.all([
    supabase
      .from("finance_categories")
      .select("id, name, monthly_limit, image_url")
      .eq("account_id", accountId)
      .eq("kind", "expense")
      .order("name"),
    supabase
      .from("ledger_entries")
      .select("category_id")
      .eq("account_id", accountId)
      .eq("entry_type", "expense")
      .not("category_id", "is", null),
    supabase
      .from("ledger_entries")
      .select("id, amount, category_id, project_id, occurred_on")
      .eq("account_id", accountId)
      .eq("entry_type", "expense")
      .gte("occurred_on", rangeStart)
      .lte("occurred_on", rangeEnd),
    supabase
      .from("ledger_entries")
      .select("id, amount, category_id, project_id, occurred_on, notes")
      .eq("account_id", accountId)
      .eq("entry_type", "expense")
      .gte("occurred_on", rangeStart)
      .lte("occurred_on", rangeEnd)
      .order("occurred_on", { ascending: false })
      .limit(period === "week" ? 200 : 50),
    supabase
      .from("ledger_entries")
      .select("id, amount, project_id, occurred_on, notes")
      .eq("account_id", accountId)
      .eq("entry_type", "income")
      .gte("occurred_on", rangeStart)
      .lte("occurred_on", rangeEnd)
      .order("occurred_on", { ascending: false })
      .limit(period === "week" ? 200 : 50),
    supabase
      .from("income_sources")
      .select("id, name, amount, recurrence, start_date, end_date, notes, is_active, project_id")
      .eq("account_id", accountId)
      .order("is_active", { ascending: false })
      .order("start_date", { ascending: true })
      .order("name"),
    supabase
      .from("subscriptions")
      .select("id, name, amount, recurrence, next_due_date, end_date, notes, is_active, project_id")
      .eq("account_id", accountId)
      .order("is_active", { ascending: false })
      .order("next_due_date", { ascending: true, nullsFirst: false })
      .order("name"),
    supabase
      .from("debts")
      .select("id, name, type, principal, remaining_balance, status, due_date, project_id")
      .eq("account_id", accountId)
      .order("created_at", { ascending: false }),
    supabase
      .from("debt_payments")
      .select("id, debt_id, amount, paid_at, method, notes, project_expense_id")
      .eq("account_id", accountId)
      .gte("paid_at", rangeStart)
      .lte("paid_at", rangeEnd)
      .order("paid_at", { ascending: false })
      .limit(period === "week" ? 200 : 80),
    supabase
      .from("life_projects")
      .select("id, name, description, status, start_date, end_date, progress, outcome, image_url")
      .eq("account_id", accountId)
      .order("created_at", { ascending: false }),
    supabase
      .from("habit_objectives")
      .select("id, title, project_id, image_url")
      .eq("account_id", accountId)
      .order("title"),
    supabase
      .from("knowledge_spaces")
      .select("id, title, project_id")
      .eq("account_id", accountId)
      .not("project_id", "is", null)
      .order("title"),
    supabase
      .from("habits")
      .select("id, objective_id, project_id")
      .eq("account_id", accountId)
  ]);
  const projectHabits = (projectHabitsRes.data ?? []) as FinancePageData["projectHabits"];
  const habitIds = projectHabits.map((habit) => habit.id);
  const projectSessionsRes =
    habitIds.length > 0
      ? await supabase
          .from("habit_sessions")
          .select("habit_id, session_date, actual_minutes, completed")
          .in("habit_id", habitIds)
          .gte("session_date", rangeStart)
          .lte("session_date", rangeEnd)
      : { data: [] };
  return {
    categories: (categoriesRes.data ?? []) as FinancePageData["categories"],
    categoryUsage: (categoryUsageRes.data ?? []) as FinancePageData["categoryUsage"],
    periodExpenses: (monthExpensesRes.data ?? []) as FinancePageData["periodExpenses"],
    recentExpenses: (recentExpensesRes.data ?? []) as FinancePageData["recentExpenses"],
    periodIncome: (periodIncomeRes.data ?? []) as FinancePageData["periodIncome"],
    incomeSources: (incomeSourcesRes.data ?? []) as FinancePageData["incomeSources"],
    subscriptions: (subscriptionsRes.data ?? []) as FinancePageData["subscriptions"],
    debts: (debtsRes.data ?? []) as FinancePageData["debts"],
    payments: (paymentsRes.data ?? []) as FinancePageData["payments"],
    projects: (projectsRes.data ?? []) as FinancePageData["projects"],
    objectives: (objectivesRes.data ?? []) as FinancePageData["objectives"],
    knowledgeSpaces: (knowledgeSpacesRes.data ?? []) as FinancePageData["knowledgeSpaces"],
    projectHabits,
    projectSessions: (projectSessionsRes.data ?? []) as FinancePageData["projectSessions"]
  };
}
