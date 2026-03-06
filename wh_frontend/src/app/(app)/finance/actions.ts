"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAppContext } from "@/lib/server-context";

const dateInputSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date");

const ledgerSchema = z.object({
  categoryId: z.preprocess((value) => (value === "" || value === null ? undefined : value), z.string().uuid().optional()),
  entryType: z.enum(["income", "expense"]),
  amount: z.coerce.number().positive().max(100000000),
  occurredOn: dateInputSchema,
  notes: z.string().max(1000).optional()
});

const debtSchema = z.object({
  type: z.enum(["owed", "owing"]),
  name: z.string().trim().min(2).max(140),
  principal: z.coerce.number().positive().max(100000000),
  apr: z.union([z.literal(""), z.coerce.number().min(0).max(100)]).optional(),
  dueDate: z.union([z.literal(""), dateInputSchema]).optional(),
  remainingBalance: z.union([z.literal(""), z.coerce.number().min(0).max(100000000)]).optional()
});

const debtPaymentSchema = z.object({
  debtId: z.string().uuid(),
  amount: z.coerce.number().positive().max(100000000),
  paidAt: dateInputSchema,
  method: z.string().max(120).optional(),
  notes: z.string().max(1000).optional()
});

const subscriptionSchema = z.object({
  name: z.string().trim().min(2).max(140),
  amount: z.coerce.number().positive().max(100000000),
  recurrence: z.enum(["monthly", "yearly"]),
  nextDueDate: z.union([z.literal(""), dateInputSchema]).optional(),
  notes: z.string().max(1000).optional()
});

export async function createLedgerEntryAction(formData: FormData) {
  const payload = ledgerSchema.safeParse({
    categoryId: formData.get("categoryId"),
    entryType: formData.get("entryType"),
    amount: formData.get("amount"),
    occurredOn: formData.get("occurredOn"),
    notes: formData.get("notes")
  });

  if (!payload.success) {
    return;
  }

  const { supabase, user, account } = await requireAppContext();

  await supabase.from("ledger_entries").insert({
    account_id: account.accountId,
    category_id: payload.data.categoryId || null,
    entry_type: payload.data.entryType,
    amount: payload.data.amount.toFixed(2),
    currency_code: account.currencyCode,
    occurred_on: payload.data.occurredOn,
    notes: payload.data.notes?.trim() || null,
    created_by: user.id
  });

  revalidatePath("/finance");
  revalidatePath("/dashboard");
  revalidatePath("/analytics");
}

export async function createDebtAction(formData: FormData) {
  const payload = debtSchema.safeParse({
    type: formData.get("type"),
    name: formData.get("name"),
    principal: formData.get("principal"),
    apr: formData.get("apr"),
    dueDate: formData.get("dueDate"),
    remainingBalance: formData.get("remainingBalance")
  });

  if (!payload.success) {
    return;
  }

  const { supabase, user, account } = await requireAppContext();

  await supabase.from("debts").insert({
    account_id: account.accountId,
    type: payload.data.type,
    name: payload.data.name,
    principal: payload.data.principal.toFixed(2),
    apr: payload.data.apr === "" || typeof payload.data.apr === "undefined" ? null : payload.data.apr.toFixed(3),
    due_date: payload.data.dueDate === "" ? null : payload.data.dueDate,
    status: "open",
    remaining_balance:
      payload.data.remainingBalance === "" || typeof payload.data.remainingBalance === "undefined"
        ? payload.data.principal.toFixed(2)
        : payload.data.remainingBalance.toFixed(2),
    created_by: user.id
  });

  revalidatePath("/finance");
  revalidatePath("/dashboard");
  revalidatePath("/analytics");
}

export async function createDebtPaymentAction(formData: FormData) {
  const payload = debtPaymentSchema.safeParse({
    debtId: formData.get("debtId"),
    amount: formData.get("amount"),
    paidAt: formData.get("paidAt"),
    method: formData.get("method"),
    notes: formData.get("notes")
  });

  if (!payload.success) {
    return;
  }

  const { supabase, user, account } = await requireAppContext();

  await supabase.from("debt_payments").insert({
    account_id: account.accountId,
    debt_id: payload.data.debtId,
    amount: payload.data.amount.toFixed(2),
    paid_at: payload.data.paidAt,
    method: payload.data.method?.trim() || null,
    notes: payload.data.notes?.trim() || null,
    created_by: user.id
  });

  const { data: debt } = await supabase
    .from("debts")
    .select("remaining_balance, principal")
    .eq("id", payload.data.debtId)
    .maybeSingle();

  if (debt) {
    const previous = Number(debt.remaining_balance ?? debt.principal ?? 0);
    const nextBalance = Math.max(previous - payload.data.amount, 0);

    await supabase
      .from("debts")
      .update({
        remaining_balance: nextBalance.toFixed(2),
        status: nextBalance === 0 ? "closed" : "open"
      })
      .eq("id", payload.data.debtId);
  }

  revalidatePath("/finance");
  revalidatePath("/dashboard");
  revalidatePath("/analytics");
}

export async function createSubscriptionAction(formData: FormData) {
  const payload = subscriptionSchema.safeParse({
    name: formData.get("name"),
    amount: formData.get("amount"),
    recurrence: formData.get("recurrence"),
    nextDueDate: formData.get("nextDueDate"),
    notes: formData.get("notes")
  });

  if (!payload.success) {
    return;
  }

  const { supabase, account } = await requireAppContext();

  await supabase.from("subscriptions").insert({
    account_id: account.accountId,
    name: payload.data.name,
    amount: payload.data.amount.toFixed(2),
    currency_code: account.currencyCode,
    recurrence: payload.data.recurrence,
    next_due_date: payload.data.nextDueDate === "" ? null : payload.data.nextDueDate,
    notes: payload.data.notes?.trim() || null,
    is_active: true
  });

  revalidatePath("/finance");
  revalidatePath("/dashboard");
}
