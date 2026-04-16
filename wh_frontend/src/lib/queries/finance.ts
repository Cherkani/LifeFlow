import type { Supabase } from "./types";

export type FinancePageData = {
  categories: Array<{ id: string; name: string; monthly_limit: string | null; image_url: string | null }>;
  periodExpenses: Array<{ id: string; amount: string; category_id: string | null; occurred_on: string }>;
  recentExpenses: Array<{ id: string; amount: string; category_id: string | null; occurred_on: string; notes: string | null }>;
  subscriptions: Array<{
    id: string;
    name: string;
    amount: string;
    recurrence: "monthly" | "yearly";
    next_due_date: string | null;
    end_date: string | null;
    notes: string | null;
    is_active: boolean;
  }>;
  debts: Array<{ id: string; name: string; type: string; principal: string; remaining_balance: string | null; status: string; due_date: string | null }>;
  payments: Array<{ id: string; debt_id: string; amount: string; paid_at: string; method: string | null; notes: string | null }>;
};

export async function getFinancePageData(
  supabase: Supabase,
  accountId: string,
  rangeStart: string,
  rangeEnd: string,
  period: "day" | "week" | "month"
): Promise<FinancePageData> {
  const [categoriesRes, monthExpensesRes, recentExpensesRes, subscriptionsRes, debtsRes, paymentsRes] = await Promise.all([
    supabase
      .from("finance_categories")
      .select("id, name, monthly_limit, image_url")
      .eq("account_id", accountId)
      .eq("kind", "expense")
      .order("name"),
    supabase
      .from("ledger_entries")
      .select("id, amount, category_id, occurred_on")
      .eq("account_id", accountId)
      .eq("entry_type", "expense")
      .gte("occurred_on", rangeStart)
      .lte("occurred_on", rangeEnd),
    supabase
      .from("ledger_entries")
      .select("id, amount, category_id, occurred_on, notes")
      .eq("account_id", accountId)
      .eq("entry_type", "expense")
      .gte("occurred_on", rangeStart)
      .lte("occurred_on", rangeEnd)
      .order("occurred_on", { ascending: false })
      .limit(period === "week" ? 200 : 50),
    supabase
      .from("subscriptions")
      .select("id, name, amount, recurrence, next_due_date, end_date, notes, is_active")
      .eq("account_id", accountId)
      .order("is_active", { ascending: false })
      .order("next_due_date", { ascending: true, nullsFirst: false })
      .order("name"),
    supabase
      .from("debts")
      .select("id, name, type, principal, remaining_balance, status, due_date")
      .eq("account_id", accountId)
      .order("created_at", { ascending: false }),
    supabase
      .from("debt_payments")
      .select("id, debt_id, amount, paid_at, method, notes")
      .eq("account_id", accountId)
      .order("paid_at", { ascending: false })
      .limit(30)
  ]);
  return {
    categories: (categoriesRes.data ?? []) as FinancePageData["categories"],
    periodExpenses: (monthExpensesRes.data ?? []) as FinancePageData["periodExpenses"],
    recentExpenses: (recentExpensesRes.data ?? []) as FinancePageData["recentExpenses"],
    subscriptions: (subscriptionsRes.data ?? []) as FinancePageData["subscriptions"],
    debts: (debtsRes.data ?? []) as FinancePageData["debts"],
    payments: (paymentsRes.data ?? []) as FinancePageData["payments"]
  };
}
