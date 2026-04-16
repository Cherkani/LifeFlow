"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { RedirectResult } from "@/lib/action-with-state";
import { requireAppContext } from "@/lib/server-context";

const dateInputSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date");

const createCategorySchema = z.object({
  name: z.string().trim().min(2).max(120),
  monthlyLimit: z.union([z.literal(""), z.coerce.number().min(0).max(100000000)]).optional(),
  imageUrl: z.string().trim().optional()
});

const updateCategorySchema = z.object({
  categoryId: z.string().uuid(),
  name: z.string().trim().min(2).max(120),
  monthlyLimit: z.union([z.literal(""), z.coerce.number().min(0).max(100000000)]).optional(),
  imageUrl: z.string().trim().optional()
});

const createExpenseSchema = z.object({
  categoryId: z.string().uuid(),
  amount: z.coerce.number().positive().max(100000000),
  occurredOn: dateInputSchema,
  notes: z.string().max(1000).optional()
});

const subscriptionSchema = z.object({
  name: z.string().trim().min(2).max(140),
  amount: z.coerce.number().positive().max(100000000),
  recurrence: z.enum(["monthly", "yearly"]),
  nextDueDate: z.union([z.literal(""), dateInputSchema]).optional(),
  endDate: z.union([z.literal(""), dateInputSchema]).optional(),
  notes: z.preprocess((v) => (v === null || v === "" ? undefined : v), z.string().max(1000).optional()),
  isActive: z.union([z.literal("true"), z.literal("false")]).optional()
});

const updateSubscriptionSchema = subscriptionSchema.extend({
  subscriptionId: z.string().uuid()
});

const subscriptionIdSchema = z.object({
  subscriptionId: z.string().uuid()
});

const updateExpenseSchema = z.object({
  expenseId: z.string().uuid(),
  categoryId: z.string().uuid(),
  amount: z.coerce.number().positive().max(100000000),
  occurredOn: dateInputSchema,
  notes: z.string().max(1000).optional()
});

const deleteExpenseSchema = z.object({
  expenseId: z.string().uuid()
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
  method: z.preprocess((v) => (v === null || v === "" ? undefined : v), z.string().max(120).optional()),
  notes: z.preprocess((v) => (v === null || v === "" ? undefined : v), z.string().max(1000).optional())
});

const deleteDebtSchema = z.object({
  debtId: z.string().uuid()
});

function getSafeReturnPath(raw: FormDataEntryValue | null) {
  const value = typeof raw === "string" ? raw.trim() : "";
  return value.startsWith("/finance") ? value : "/finance";
}

export async function createExpenseCategoryAction(formData: FormData) {
  const returnPath = getSafeReturnPath(formData.get("returnPath"));
  const payload = createCategorySchema.safeParse({
    name: formData.get("name"),
    monthlyLimit: formData.get("monthlyLimit"),
    imageUrl: formData.get("imageUrl")
  });

  if (!payload.success) {
    return { redirectTo: returnPath };
  }

  const { supabase, account } = await requireAppContext();
  const monthlyLimit =
    payload.data.monthlyLimit === "" || typeof payload.data.monthlyLimit === "undefined"
      ? null
      : payload.data.monthlyLimit.toFixed(2);

  await supabase.from("finance_categories").insert({
    account_id: account.accountId,
    name: payload.data.name,
    kind: "expense",
    monthly_limit: monthlyLimit,
    image_url: payload.data.imageUrl && URL.canParse(payload.data.imageUrl) ? payload.data.imageUrl : null
  });

  revalidatePath("/finance", "layout");
  return { redirectTo: returnPath };
}

export async function createExpenseAction(formData: FormData) {
  const returnPath = getSafeReturnPath(formData.get("returnPath"));
  const payload = createExpenseSchema.safeParse({
    categoryId: formData.get("categoryId"),
    amount: formData.get("amount"),
    occurredOn: formData.get("occurredOn"),
    notes: formData.get("notes")
  });

  if (!payload.success) {
    return { redirectTo: returnPath };
  }

  const { supabase, user, account } = await requireAppContext();
  await supabase.from("ledger_entries").insert({
    account_id: account.accountId,
    category_id: payload.data.categoryId,
    entry_type: "expense",
    amount: payload.data.amount.toFixed(2),
    currency_code: account.currencyCode,
    occurred_on: payload.data.occurredOn,
    notes: payload.data.notes?.trim() || null,
    created_by: user.id
  });

  revalidatePath("/finance", "layout");
  return { redirectTo: returnPath };
}

export async function updateExpenseAction(formData: FormData) {
  const returnPath = getSafeReturnPath(formData.get("returnPath"));
  const payload = updateExpenseSchema.safeParse({
    expenseId: formData.get("expenseId"),
    categoryId: formData.get("categoryId"),
    amount: formData.get("amount"),
    occurredOn: formData.get("occurredOn"),
    notes: formData.get("notes")
  });

  if (!payload.success) {
    return { redirectTo: returnPath };
  }

  const { supabase, account } = await requireAppContext();
  await supabase
    .from("ledger_entries")
    .update({
      category_id: payload.data.categoryId,
      amount: payload.data.amount.toFixed(2),
      occurred_on: payload.data.occurredOn,
      notes: payload.data.notes?.trim() || null
    })
    .eq("account_id", account.accountId)
    .eq("id", payload.data.expenseId)
    .eq("entry_type", "expense");

  revalidatePath("/finance", "layout");
  return { redirectTo: returnPath };
}

export async function createSubscriptionAction(formData: FormData) {
  const returnPath = getSafeReturnPath(formData.get("returnPath"));
  const payload = subscriptionSchema.safeParse({
    name: formData.get("name"),
    amount: formData.get("amount"),
    recurrence: formData.get("recurrence"),
    nextDueDate: formData.get("nextDueDate"),
    endDate: formData.get("endDate"),
    notes: formData.get("notes"),
    isActive: formData.get("isActive")
  });

  if (!payload.success) {
    return { redirectTo: returnPath };
  }

  const { supabase, account } = await requireAppContext();
  await supabase.from("subscriptions").insert({
    account_id: account.accountId,
    name: payload.data.name,
    amount: payload.data.amount.toFixed(2),
    currency_code: account.currencyCode,
    recurrence: payload.data.recurrence,
    next_due_date: payload.data.nextDueDate === "" ? null : payload.data.nextDueDate,
    end_date: payload.data.endDate === "" ? null : payload.data.endDate,
    notes: payload.data.notes?.trim() || null,
    is_active: payload.data.isActive !== "false"
  });

  revalidatePath("/finance", "layout");
  return { redirectTo: returnPath };
}

export async function updateSubscriptionAction(formData: FormData) {
  const returnPath = getSafeReturnPath(formData.get("returnPath"));
  const payload = updateSubscriptionSchema.safeParse({
    subscriptionId: formData.get("subscriptionId"),
    name: formData.get("name"),
    amount: formData.get("amount"),
    recurrence: formData.get("recurrence"),
    nextDueDate: formData.get("nextDueDate"),
    endDate: formData.get("endDate"),
    notes: formData.get("notes"),
    isActive: formData.get("isActive")
  });

  if (!payload.success) {
    return { redirectTo: returnPath };
  }

  const { supabase, account } = await requireAppContext();
  await supabase
    .from("subscriptions")
    .update({
      name: payload.data.name,
      amount: payload.data.amount.toFixed(2),
      recurrence: payload.data.recurrence,
      next_due_date: payload.data.nextDueDate === "" ? null : payload.data.nextDueDate,
      end_date: payload.data.endDate === "" ? null : payload.data.endDate,
      notes: payload.data.notes?.trim() || null,
      is_active: payload.data.isActive !== "false"
    })
    .eq("account_id", account.accountId)
    .eq("id", payload.data.subscriptionId);

  revalidatePath("/finance", "layout");
  return { redirectTo: returnPath };
}

export async function deleteSubscriptionAction(formData: FormData) {
  const returnPath = getSafeReturnPath(formData.get("returnPath"));
  const payload = subscriptionIdSchema.safeParse({
    subscriptionId: formData.get("subscriptionId")
  });

  if (!payload.success) {
    return { redirectTo: returnPath };
  }

  const { supabase, account } = await requireAppContext();
  await supabase
    .from("subscriptions")
    .delete()
    .eq("account_id", account.accountId)
    .eq("id", payload.data.subscriptionId);

  revalidatePath("/finance", "layout");
  return { redirectTo: returnPath };
}

export async function toggleSubscriptionActiveAction(formData: FormData) {
  const returnPath = getSafeReturnPath(formData.get("returnPath"));
  const payload = subscriptionIdSchema.safeParse({
    subscriptionId: formData.get("subscriptionId")
  });

  if (!payload.success) {
    return { redirectTo: returnPath };
  }

  const { supabase, account } = await requireAppContext();
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("is_active")
    .eq("account_id", account.accountId)
    .eq("id", payload.data.subscriptionId)
    .maybeSingle();

  if (subscription) {
    await supabase
      .from("subscriptions")
      .update({ is_active: !subscription.is_active })
      .eq("account_id", account.accountId)
      .eq("id", payload.data.subscriptionId);
  }

  revalidatePath("/finance", "layout");
  return { redirectTo: returnPath };
}

export async function deleteExpenseAction(formData: FormData) {
  const returnPath = getSafeReturnPath(formData.get("returnPath"));
  const payload = deleteExpenseSchema.safeParse({
    expenseId: formData.get("expenseId")
  });

  if (!payload.success) {
    return { redirectTo: returnPath };
  }

  const { supabase, account } = await requireAppContext();
  await supabase
    .from("ledger_entries")
    .delete()
    .eq("account_id", account.accountId)
    .eq("id", payload.data.expenseId)
    .eq("entry_type", "expense");

  revalidatePath("/finance", "layout");
  return { redirectTo: returnPath };
}

export async function createDebtAction(formData: FormData) {
  const returnPath = getSafeReturnPath(formData.get("returnPath"));
  const payload = debtSchema.safeParse({
    type: formData.get("type"),
    name: formData.get("name"),
    principal: formData.get("principal"),
    apr: formData.get("apr"),
    dueDate: formData.get("dueDate"),
    remainingBalance: formData.get("remainingBalance")
  });

  if (!payload.success) {
    return { redirectTo: returnPath };
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

  revalidatePath("/finance", "layout");
  return { redirectTo: returnPath };
}

export async function createDebtPaymentAction(formData: FormData) {
  const returnPath = getSafeReturnPath(formData.get("returnPath"));
  const payload = debtPaymentSchema.safeParse({
    debtId: formData.get("debtId"),
    amount: formData.get("amount"),
    paidAt: formData.get("paidAt"),
    method: formData.get("method"),
    notes: formData.get("notes")
  });

  if (!payload.success) {
    return { redirectTo: returnPath };
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
        status: nextBalance <= 0 ? "closed" : "open"
      })
      .eq("id", payload.data.debtId);
  }

  revalidatePath("/finance", "layout");
  return { redirectTo: returnPath };
}

export async function updateExpenseCategoryAction(formData: FormData) {
  const returnPath = getSafeReturnPath(formData.get("returnPath"));
  const payload = updateCategorySchema.safeParse({
    categoryId: formData.get("categoryId"),
    name: formData.get("name"),
    monthlyLimit: formData.get("monthlyLimit"),
    imageUrl: formData.get("imageUrl")
  });

  if (!payload.success) {
    return { redirectTo: returnPath };
  }

  const { supabase, account } = await requireAppContext();
  const monthlyLimit =
    payload.data.monthlyLimit === "" || typeof payload.data.monthlyLimit === "undefined"
      ? null
      : payload.data.monthlyLimit.toFixed(2);

  await supabase
    .from("finance_categories")
    .update({
      name: payload.data.name,
      monthly_limit: monthlyLimit,
      image_url:
        payload.data.imageUrl && payload.data.imageUrl.trim().length > 0 && URL.canParse(payload.data.imageUrl)
          ? payload.data.imageUrl.trim()
          : null
    })
    .eq("account_id", account.accountId)
    .eq("id", payload.data.categoryId);

  revalidatePath("/finance", "layout");
  return { redirectTo: returnPath };
}

export async function createExpenseCategoryFormAction(
  _prevState: RedirectResult | null,
  formData: FormData
): Promise<RedirectResult | null> {
  return createExpenseCategoryAction(formData);
}

export async function createExpenseFormAction(
  _prevState: RedirectResult | null,
  formData: FormData
): Promise<RedirectResult | null> {
  return createExpenseAction(formData);
}

export async function createSubscriptionFormAction(
  _prevState: RedirectResult | null,
  formData: FormData
): Promise<RedirectResult | null> {
  return createSubscriptionAction(formData);
}

export async function updateExpenseFormAction(
  _prevState: RedirectResult | null,
  formData: FormData
): Promise<RedirectResult | null> {
  return updateExpenseAction(formData);
}

export async function updateSubscriptionFormAction(
  _prevState: RedirectResult | null,
  formData: FormData
): Promise<RedirectResult | null> {
  return updateSubscriptionAction(formData);
}

export async function deleteExpenseFormAction(
  _prevState: RedirectResult | null,
  formData: FormData
): Promise<RedirectResult | null> {
  return deleteExpenseAction(formData);
}

export async function deleteSubscriptionFormAction(
  _prevState: RedirectResult | null,
  formData: FormData
): Promise<RedirectResult | null> {
  return deleteSubscriptionAction(formData);
}

export async function toggleSubscriptionActiveFormAction(
  _prevState: RedirectResult | null,
  formData: FormData
): Promise<RedirectResult | null> {
  return toggleSubscriptionActiveAction(formData);
}

export async function deleteDebtAction(formData: FormData) {
  const returnPath = getSafeReturnPath(formData.get("returnPath"));
  const payload = deleteDebtSchema.safeParse({
    debtId: formData.get("debtId")
  });

  if (!payload.success) {
    return { redirectTo: returnPath };
  }

  const { supabase, account } = await requireAppContext();

  await supabase
    .from("debt_payments")
    .delete()
    .eq("account_id", account.accountId)
    .eq("debt_id", payload.data.debtId);

  await supabase
    .from("debts")
    .delete()
    .eq("account_id", account.accountId)
    .eq("id", payload.data.debtId);

  revalidatePath("/finance", "layout");
  return { redirectTo: returnPath };
}

export async function closeDebtAction(
  _prevState: RedirectResult | null,
  formData: FormData
): Promise<RedirectResult | null> {
  const returnPath = getSafeReturnPath(formData.get("returnPath"));
  const payload = deleteDebtSchema.safeParse({ debtId: formData.get("debtId") });

  if (!payload.success) {
    return { redirectTo: returnPath };
  }

  const { supabase, account } = await requireAppContext();

  await supabase
    .from("debts")
    .update({ status: "closed", remaining_balance: "0.00" })
    .eq("account_id", account.accountId)
    .eq("id", payload.data.debtId);

  revalidatePath("/finance", "layout");
  return { redirectTo: returnPath };
}

export async function createDebtFormAction(
  _prevState: RedirectResult | null,
  formData: FormData
): Promise<RedirectResult | null> {
  return createDebtAction(formData);
}

export async function createDebtPaymentFormAction(
  _prevState: RedirectResult | null,
  formData: FormData
): Promise<RedirectResult | null> {
  return createDebtPaymentAction(formData);
}

export async function deleteDebtFormAction(
  _prevState: RedirectResult | null,
  formData: FormData
): Promise<RedirectResult | null> {
  return deleteDebtAction(formData);
}

export async function updateExpenseCategoryFormAction(
  _prevState: RedirectResult | null,
  formData: FormData
): Promise<RedirectResult | null> {
  return updateExpenseCategoryAction(formData);
}
