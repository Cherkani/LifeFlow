import { Plus } from "lucide-react";

import { SubmitButton } from "@/components/forms/submit-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ModalShell } from "@/components/ui/modal-shell";
import { SectionHeader } from "@/components/ui/section-header";
import { Select } from "@/components/ui/select";
import { requireAppContext } from "@/lib/server-context";
import { toDateInputValue } from "@/lib/utils";

import {
  createDebtAction,
  createDebtPaymentAction,
  createExpenseAction,
  createExpenseCategoryAction
} from "./actions";

type FinanceSearchParams = Promise<{
  modal?: string;
}>;

function money(amount: number, currencyCode: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 2
  }).format(amount);
}

function buildFinanceHref(modal?: string) {
  return modal ? `/finance?modal=${encodeURIComponent(modal)}` : "/finance";
}

export default async function FinancePage({
  searchParams
}: {
  searchParams: FinanceSearchParams;
}) {
  const params = await searchParams;
  const modal = params.modal?.trim();
  const { supabase, account } = await requireAppContext();
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  const monthEnd = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().slice(0, 10);

  const [categoriesRes, monthExpensesRes, recentExpensesRes, debtsRes] = await Promise.all([
    supabase
      .from("finance_categories")
      .select("id, name, monthly_limit")
      .eq("account_id", account.accountId)
      .eq("kind", "expense")
      .order("name"),
    supabase
      .from("ledger_entries")
      .select("id, amount, category_id")
      .eq("account_id", account.accountId)
      .eq("entry_type", "expense")
      .gte("occurred_on", monthStart)
      .lte("occurred_on", monthEnd),
    supabase
      .from("ledger_entries")
      .select("id, amount, category_id, occurred_on, notes")
      .eq("account_id", account.accountId)
      .eq("entry_type", "expense")
      .order("occurred_on", { ascending: false })
      .limit(20),
    supabase
      .from("debts")
      .select("id, name, type, principal, remaining_balance, status, due_date")
      .eq("account_id", account.accountId)
      .order("created_at", { ascending: false })
  ]);

  const categories = categoriesRes.data ?? [];
  const monthExpenses = monthExpensesRes.data ?? [];
  const recentExpenses = recentExpensesRes.data ?? [];
  const debts = debtsRes.data ?? [];

  const spentByCategory = new Map<string, number>();
  for (const expense of monthExpenses) {
    const previous = spentByCategory.get(expense.category_id ?? "") ?? 0;
    spentByCategory.set(expense.category_id ?? "", previous + Number(expense.amount));
  }

  const categoryNameById = new Map(categories.map((category) => [category.id, category.name]));
  const totalSpent = monthExpenses.reduce((sum, entry) => sum + Number(entry.amount), 0);
  const openDebtTotal = debts
    .filter((debt) => debt.status === "open")
    .reduce((sum, debt) => sum + Number(debt.remaining_balance ?? debt.principal ?? 0), 0);

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Finance"
        description="Track only spending and debt. Control monthly category limits."
        action={
          <div className="flex flex-wrap gap-2">
            <a
              href={buildFinanceHref("expense-category")}
              className="inline-flex items-center gap-2 rounded-lg bg-[#0b1f3b] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#102a52]"
            >
              <Plus size={16} />
              Expense Category
            </a>
            <a
              href={buildFinanceHref("expense")}
              className="inline-flex items-center gap-2 rounded-lg bg-[#1e3a6d] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#274881]"
            >
              <Plus size={16} />
              Expense
            </a>
            <a
              href={buildFinanceHref("debt")}
              className="inline-flex items-center gap-2 rounded-lg border border-[#c7d3e8] bg-[#edf3ff] px-3 py-2 text-sm font-semibold text-[#23406d] transition hover:bg-[#e3ebf9]"
            >
              <Plus size={16} />
              Debt
            </a>
            <a
              href={buildFinanceHref("debt-payment")}
              className="inline-flex items-center gap-2 rounded-lg border border-[#c7d3e8] bg-[#edf3ff] px-3 py-2 text-sm font-semibold text-[#23406d] transition hover:bg-[#e3ebf9]"
            >
              <Plus size={16} />
              Debt Payment
            </a>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-wide text-slate-500">This month spent</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-rose-700">{money(totalSpent, account.currencyCode)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-wide text-slate-500">Open debt</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-amber-700">{money(openDebtTotal, account.currencyCode)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Category limits (monthly)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {categories.length > 0 ? (
            categories.map((category) => {
              const spent = spentByCategory.get(category.id) ?? 0;
              const limit = category.monthly_limit ? Number(category.monthly_limit) : null;
              const overLimit = limit !== null && spent > limit;

              return (
                <div key={category.id} className="rounded-lg border border-[#c7d3e8] p-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-[#0c1d3c]">{category.name}</p>
                    <div className="flex items-center gap-2">
                      <Badge variant={overLimit ? "danger" : "secondary"}>{money(spent, account.currencyCode)} spent</Badge>
                      <Badge variant="secondary">{limit !== null ? `${money(limit, account.currencyCode)} limit` : "No limit"}</Badge>
                    </div>
                  </div>
                  {limit !== null ? (
                    <p className="mt-1 text-xs text-[#4a5f83]">{overLimit ? "Limit exceeded this month." : "Within monthly limit."}</p>
                  ) : null}
                </div>
              );
            })
          ) : (
            <p className="text-sm text-[#4a5f83]">No expense categories yet.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent expenses</CardTitle>
        </CardHeader>
        <CardContent>
          {recentExpenses.length > 0 ? (
            <div className="space-y-3">
              {recentExpenses.map((entry) => (
                <div key={entry.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#c7d3e8] p-3">
                  <div>
                    <p className="text-sm font-semibold text-[#0c1d3c]">{entry.notes || "Expense"}</p>
                    <p className="text-xs text-[#4a5f83]">{entry.occurred_on} · {categoryNameById.get(entry.category_id ?? "") ?? "No category"}</p>
                  </div>
                  <Badge variant="danger">-{money(Number(entry.amount), account.currencyCode)}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[#4a5f83]">No expenses yet.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Debts</CardTitle>
        </CardHeader>
        <CardContent>
          {debts.length > 0 ? (
            <div className="space-y-3">
              {debts.map((debt) => (
                <div key={debt.id} className="flex items-center justify-between gap-3 rounded-lg border border-[#c7d3e8] p-3">
                  <div>
                    <p className="text-sm font-semibold text-[#0c1d3c]">{debt.name}</p>
                    <p className="text-xs text-[#4a5f83]">{debt.status} · {debt.type}</p>
                  </div>
                  <Badge variant="warning">{money(Number(debt.remaining_balance ?? debt.principal ?? 0), account.currencyCode)}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[#4a5f83]">No debts yet.</p>
          )}
        </CardContent>
      </Card>

      {modal === "expense-category" ? (
        <ModalShell title="Create Expense Category" description="Set monthly spending cap per category." closeHref={buildFinanceHref()}>
          <form action={createExpenseCategoryAction} className="space-y-4">
            <input type="hidden" name="returnPath" value="/finance" />
            <div className="space-y-2">
              <Label htmlFor="categoryName">Category name</Label>
              <Input id="categoryName" name="name" required placeholder="e.g. Food, Transport, Shopping" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="monthlyLimit">Monthly limit (optional)</Label>
              <Input id="monthlyLimit" name="monthlyLimit" type="number" min={0} step="0.01" placeholder="0.00" />
            </div>
            <SubmitButton label="Save category" pendingLabel="Saving..." className="w-full sm:w-auto" />
          </form>
        </ModalShell>
      ) : null}

      {modal === "expense" ? (
        <ModalShell title="Add Expense" description="Record what you spent." closeHref={buildFinanceHref()}>
          {categories.length === 0 ? (
            <p className="text-sm text-[#4a5f83]">Create expense category first.</p>
          ) : (
            <form action={createExpenseAction} className="space-y-4">
              <input type="hidden" name="returnPath" value="/finance" />
              <div className="space-y-2">
                <Label htmlFor="categoryId">Category</Label>
                <Select id="categoryId" name="categoryId" required>
                  <option value="">Choose category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount</Label>
                  <Input id="amount" name="amount" type="number" min={0} step="0.01" required placeholder="0.00" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="occurredOn">Date</Label>
                  <Input id="occurredOn" name="occurredOn" type="date" required defaultValue={toDateInputValue(new Date())} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Note (optional)</Label>
                <Input id="notes" name="notes" placeholder="What was this expense?" />
              </div>
              <SubmitButton label="Save expense" pendingLabel="Saving..." className="w-full sm:w-auto" />
            </form>
          )}
        </ModalShell>
      ) : null}

      {modal === "debt" ? (
        <ModalShell title="Add Debt" description="Track debt only." closeHref={buildFinanceHref()}>
          <form action={createDebtAction} className="space-y-4">
            <input type="hidden" name="returnPath" value="/finance" />
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="debtType">Type</Label>
                <Select id="debtType" name="type" defaultValue="owing">
                  <option value="owing">I owe</option>
                  <option value="owed">Owed to me</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="debtName">Name</Label>
                <Input id="debtName" name="name" required placeholder="Debt name" />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="principal">Principal</Label>
                <Input id="principal" name="principal" type="number" min={0} step="0.01" required placeholder="0.00" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="remainingBalance">Remaining</Label>
                <Input id="remainingBalance" name="remainingBalance" type="number" min={0} step="0.01" placeholder="0.00" />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="apr">APR % (optional)</Label>
                <Input id="apr" name="apr" type="number" min={0} step="0.001" placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dueDate">Due date (optional)</Label>
                <Input id="dueDate" name="dueDate" type="date" />
              </div>
            </div>
            <SubmitButton label="Save debt" pendingLabel="Saving..." className="w-full sm:w-auto" />
          </form>
        </ModalShell>
      ) : null}

      {modal === "debt-payment" ? (
        <ModalShell title="Record Debt Payment" description="Track payment against open debt." closeHref={buildFinanceHref()}>
          {debts.filter((debt) => debt.status === "open").length === 0 ? (
            <p className="text-sm text-[#4a5f83]">No open debts available.</p>
          ) : (
            <form action={createDebtPaymentAction} className="space-y-4">
              <input type="hidden" name="returnPath" value="/finance" />
              <div className="space-y-2">
                <Label htmlFor="debtId">Debt</Label>
                <Select id="debtId" name="debtId" required>
                  <option value="">Choose debt</option>
                  {debts
                    .filter((debt) => debt.status === "open")
                    .map((debt) => (
                      <option key={debt.id} value={debt.id}>
                        {debt.name}
                      </option>
                    ))}
                </Select>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="paymentAmount">Amount</Label>
                  <Input id="paymentAmount" name="amount" type="number" min={0} step="0.01" required placeholder="0.00" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="paidAt">Date</Label>
                  <Input id="paidAt" name="paidAt" type="date" required defaultValue={toDateInputValue(new Date())} />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="method">Method (optional)</Label>
                  <Input id="method" name="method" placeholder="Optional" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="paymentNotes">Notes (optional)</Label>
                  <Input id="paymentNotes" name="notes" placeholder="Optional" />
                </div>
              </div>
              <SubmitButton label="Record payment" pendingLabel="Saving..." className="w-full sm:w-auto" />
            </form>
          )}
        </ModalShell>
      ) : null}
    </div>
  );
}
