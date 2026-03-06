import { SubmitButton } from "@/components/forms/submit-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { requireAppContext } from "@/lib/server-context";
import { toDateInputValue } from "@/lib/utils";

import {
  createDebtAction,
  createDebtPaymentAction,
  createLedgerEntryAction,
  createSubscriptionAction
} from "./actions";

function money(amount: number, currencyCode: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 2
  }).format(amount);
}

export default async function FinancePage() {
  const { supabase, account } = await requireAppContext();

  const [categoriesRes, ledgerRes, debtsRes, subscriptionsRes] = await Promise.all([
    supabase.from("finance_categories").select("id, name, kind").eq("account_id", account.accountId).order("name"),
    supabase
      .from("ledger_entries")
      .select("id, amount, entry_type, occurred_on, notes, category_id")
      .eq("account_id", account.accountId)
      .order("occurred_on", { ascending: false })
      .limit(15),
    supabase
      .from("debts")
      .select("id, name, type, principal, remaining_balance, status, due_date")
      .eq("account_id", account.accountId)
      .order("created_at", { ascending: false }),
    supabase
      .from("subscriptions")
      .select("id, name, amount, recurrence, next_due_date, is_active")
      .eq("account_id", account.accountId)
      .order("next_due_date", { ascending: true })
  ]);

  const categories = categoriesRes.data ?? [];
  const ledgerEntries = ledgerRes.data ?? [];
  const debts = debtsRes.data ?? [];
  const subscriptions = subscriptionsRes.data ?? [];

  const openDebtTotal = debts
    .filter((debt) => debt.status === "open")
    .reduce((acc, debt) => acc + Number(debt.remaining_balance ?? debt.principal ?? 0), 0);

  const monthlyIncome = ledgerEntries
    .filter((entry) => entry.entry_type === "income")
    .reduce((acc, entry) => acc + Number(entry.amount), 0);

  const monthlyExpense = ledgerEntries
    .filter((entry) => entry.entry_type === "expense")
    .reduce((acc, entry) => acc + Number(entry.amount), 0);

  return (
    <div className="space-y-6">
      <SectionHeader title="Finance" description="Track daily cashflow, debt obligations, and recurring subscriptions." />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Income (recent)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-emerald-700">{money(monthlyIncome, account.currencyCode)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Expenses (recent)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-rose-700">{money(monthlyExpense, account.currencyCode)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Open debt</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-amber-700">{money(openDebtTotal, account.currencyCode)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Add ledger entry</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createLedgerEntryAction} className="grid gap-3 sm:grid-cols-2">
              <select
                name="entryType"
                defaultValue="expense"
                className="h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none transition focus:border-blue-400"
              >
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>

              <select
                name="categoryId"
                className="h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none transition focus:border-blue-400"
              >
                <option value="">No category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>

              <input
                name="amount"
                type="number"
                min={0}
                step="0.01"
                required
                placeholder="Amount"
                className="h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none transition focus:border-blue-400"
              />

              <input
                name="occurredOn"
                type="date"
                required
                defaultValue={toDateInputValue(new Date())}
                className="h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none transition focus:border-blue-400"
              />

              <input
                name="notes"
                placeholder="Notes"
                className="h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none transition focus:border-blue-400 sm:col-span-2"
              />

              <div className="sm:col-span-2">
                <SubmitButton label="Save entry" pendingLabel="Saving..." />
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Add debt</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createDebtAction} className="grid gap-3 sm:grid-cols-2">
              <select
                name="type"
                defaultValue="owing"
                className="h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none transition focus:border-blue-400"
              >
                <option value="owing">I owe</option>
                <option value="owed">Owed to me</option>
              </select>

              <input
                name="name"
                required
                placeholder="Debt name"
                className="h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none transition focus:border-blue-400"
              />

              <input
                name="principal"
                type="number"
                min={0}
                step="0.01"
                required
                placeholder="Principal"
                className="h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none transition focus:border-blue-400"
              />

              <input
                name="remainingBalance"
                type="number"
                min={0}
                step="0.01"
                placeholder="Remaining balance"
                className="h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none transition focus:border-blue-400"
              />

              <input
                name="apr"
                type="number"
                min={0}
                step="0.001"
                placeholder="APR %"
                className="h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none transition focus:border-blue-400"
              />

              <input
                name="dueDate"
                type="date"
                className="h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none transition focus:border-blue-400"
              />

              <div className="sm:col-span-2">
                <SubmitButton label="Save debt" pendingLabel="Saving..." />
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Debt payment</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createDebtPaymentAction} className="grid gap-3 sm:grid-cols-2">
              <select
                name="debtId"
                required
                className="h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none transition focus:border-blue-400 sm:col-span-2"
              >
                <option value="">Choose debt</option>
                {debts
                  .filter((debt) => debt.status === "open")
                  .map((debt) => (
                    <option key={debt.id} value={debt.id}>
                      {debt.name}
                    </option>
                  ))}
              </select>

              <input
                name="amount"
                type="number"
                min={0}
                step="0.01"
                required
                placeholder="Amount"
                className="h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none transition focus:border-blue-400"
              />

              <input
                name="paidAt"
                type="date"
                required
                defaultValue={toDateInputValue(new Date())}
                className="h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none transition focus:border-blue-400"
              />

              <input
                name="method"
                placeholder="Method"
                className="h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none transition focus:border-blue-400"
              />

              <input
                name="notes"
                placeholder="Notes"
                className="h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none transition focus:border-blue-400"
              />

              <div className="sm:col-span-2">
                <SubmitButton label="Record payment" pendingLabel="Saving..." />
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Add subscription</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createSubscriptionAction} className="grid gap-3 sm:grid-cols-2">
              <input
                name="name"
                required
                placeholder="Subscription name"
                className="h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none transition focus:border-blue-400 sm:col-span-2"
              />

              <input
                name="amount"
                type="number"
                min={0}
                step="0.01"
                required
                placeholder="Amount"
                className="h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none transition focus:border-blue-400"
              />

              <select
                name="recurrence"
                defaultValue="monthly"
                className="h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none transition focus:border-blue-400"
              >
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>

              <input
                name="nextDueDate"
                type="date"
                className="h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none transition focus:border-blue-400"
              />

              <input
                name="notes"
                placeholder="Notes"
                className="h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none transition focus:border-blue-400"
              />

              <div className="sm:col-span-2">
                <SubmitButton label="Save subscription" pendingLabel="Saving..." />
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent ledger</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {ledgerEntries.length > 0 ? (
              ledgerEntries.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{entry.notes || "Ledger entry"}</p>
                    <p className="text-xs text-slate-500">{entry.occurred_on}</p>
                  </div>
                  <p className={`text-sm font-semibold ${entry.entry_type === "income" ? "text-emerald-700" : "text-rose-700"}`}>
                    {entry.entry_type === "income" ? "+" : "-"}
                    {money(Number(entry.amount), account.currencyCode)}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">No entries yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Subscriptions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {subscriptions.length > 0 ? (
              subscriptions.map((subscription) => (
                <div key={subscription.id} className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{subscription.name}</p>
                    <p className="text-xs text-slate-500">Due {subscription.next_due_date ?? "TBD"}</p>
                  </div>
                  <p className="text-sm font-semibold text-slate-700">
                    {money(Number(subscription.amount), account.currencyCode)} / {subscription.recurrence}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">No subscriptions yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
