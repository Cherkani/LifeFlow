"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { RedirectResult } from "@/lib/action-with-state";
import { getOwnedObjectiveContext, resolveOwnedLifeContext } from "@/lib/life-context-server";
import { requireAppContext } from "@/lib/server-context";

const optionalDateSchema = z.preprocess(
  (value) => (typeof value === "string" ? value.trim() : ""),
  z
    .union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date")])
    .transform((value) => (value === "" ? null : value))
);

const optionalUuidSchema = z.preprocess(
  (value) => (typeof value === "string" ? value.trim() : ""),
  z.union([z.literal(""), z.string().uuid()]).transform((value) => (value === "" ? null : value))
);

const optionalMoneySchema = z.preprocess((value) => {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : value;
}, z.union([z.null(), z.number().min(0).max(100000000)]));

const createPhaseSchema = z.object({
  title: z.string().trim().min(2).max(160),
  phaseType: z.enum(["school", "study", "internship", "job", "freelance", "project", "career_growth", "travel", "custom"]),
  status: z.enum(["past", "current", "planned", "archived"]),
  startDate: optionalDateSchema,
  endDate: optionalDateSchema,
  incomeSource: z.string().trim().max(160).optional(),
  monthlyIncome: optionalMoneySchema,
  monthlySpending: optionalMoneySchema,
  summary: z.string().trim().max(2000).optional(),
  imageUrl: z.string().trim().optional()
});

const createProjectSchema = z.object({
  phaseId: optionalUuidSchema,
  name: z.string().trim().min(2).max(160),
  description: z.string().trim().max(2000).optional(),
  status: z.enum(["idea", "active", "paused", "completed", "archived"]),
  startDate: optionalDateSchema,
  endDate: optionalDateSchema,
  progress: z.coerce.number().int().min(0).max(100),
  outcome: z.string().trim().max(2000).optional(),
  imageUrl: z.string().trim().optional()
});

const updatePhaseSchema = createPhaseSchema.extend({ phaseId: z.string().uuid() });
const updateProjectSchema = createProjectSchema.extend({ projectId: z.string().uuid() });

const createObjectiveSchema = z.object({
  phaseId: optionalUuidSchema,
  projectId: optionalUuidSchema,
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().max(1200).optional()
});

const createTaskSchema = z.object({
  objectiveId: z.string().uuid(),
  phaseId: optionalUuidSchema,
  projectId: optionalUuidSchema,
  title: z.string().trim().min(2).max(140),
  minimumMinutes: z.union([z.literal(""), z.coerce.number().int().min(0).max(100000)]).optional(),
  weeklyTargetMinutes: z.union([z.literal(""), z.coerce.number().int().min(0).max(100000)]).optional()
});

const attachSchema = z.object({
  entityType: z.enum(["goal", "task", "finance_entry", "event", "knowledge_space"]),
  entityId: z.string().uuid(),
  phaseId: optionalUuidSchema,
  projectId: optionalUuidSchema,
  returnPath: z.string().trim().optional()
});

function getSafeReturnPath(raw: FormDataEntryValue | string | null | undefined) {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (value.startsWith("/life-map") || value.startsWith("/dashboard")) {
    return value;
  }
  return "/life-map";
}

function normalizeOptionalText(value: string | undefined) {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeOptionalUrl(value: string | undefined) {
  const trimmed = normalizeOptionalText(value);
  return trimmed && URL.canParse(trimmed) ? trimmed : null;
}

export async function createLifePhaseAction(formData: FormData) {
  const returnPath = getSafeReturnPath(formData.get("returnPath"));
  const payload = createPhaseSchema.safeParse({
    title: formData.get("title"),
    phaseType: formData.get("phaseType") || "custom",
    status: formData.get("status") || "current",
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    incomeSource: formData.get("incomeSource"),
    monthlyIncome: formData.get("monthlyIncome"),
    monthlySpending: formData.get("monthlySpending"),
    summary: formData.get("summary"),
    imageUrl: formData.get("imageUrl")
  });

  if (!payload.success) return { redirectTo: returnPath };

  const { supabase, account } = await requireAppContext();
  const { count } = await supabase
    .from("life_phases")
    .select("id", { count: "exact", head: true })
    .eq("account_id", account.accountId);

  await supabase.from("life_phases").insert({
    account_id: account.accountId,
    title: payload.data.title,
    phase_type: payload.data.phaseType,
    status: payload.data.status,
    start_date: payload.data.startDate,
    end_date: payload.data.endDate,
    income_source: normalizeOptionalText(payload.data.incomeSource),
    monthly_income: payload.data.monthlyIncome === null ? null : payload.data.monthlyIncome.toFixed(2),
    monthly_spending: payload.data.monthlySpending === null ? null : payload.data.monthlySpending.toFixed(2),
    currency_code: account.currencyCode,
    summary: normalizeOptionalText(payload.data.summary),
    image_url: normalizeOptionalUrl(payload.data.imageUrl),
    position: count ?? 0
  });

  revalidatePath("/life-map", "layout");
  revalidatePath("/dashboard");
  return { redirectTo: returnPath };
}

export async function createLifeProjectAction(formData: FormData) {
  const returnPath = getSafeReturnPath(formData.get("returnPath"));
  const payload = createProjectSchema.safeParse({
    phaseId: formData.get("phaseId"),
    name: formData.get("name"),
    description: formData.get("description"),
    status: formData.get("status") || "active",
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    progress: formData.get("progress") || 0,
    outcome: formData.get("outcome"),
    imageUrl: formData.get("imageUrl")
  });

  if (!payload.success) return { redirectTo: returnPath };

  const { supabase, account } = await requireAppContext();
  const context = await resolveOwnedLifeContext(supabase, account.accountId, payload.data.phaseId, null);
  if (!context) return { redirectTo: returnPath };
  await supabase.from("life_projects").insert({
      account_id: account.accountId,
      phase_id: context.phaseId,
      name: payload.data.name,
      description: normalizeOptionalText(payload.data.description),
      status: payload.data.status,
      start_date: payload.data.startDate,
      end_date: payload.data.endDate,
      progress: payload.data.progress,
      outcome: normalizeOptionalText(payload.data.outcome),
      image_url: normalizeOptionalUrl(payload.data.imageUrl)
    });

  revalidatePath("/life-map", "layout");
  revalidatePath("/dashboard");
  return { redirectTo: returnPath };
}

export async function updateLifePhaseAction(formData: FormData) {
  const returnPath = getSafeReturnPath(formData.get("returnPath"));
  const payload = updatePhaseSchema.safeParse({
    phaseId: formData.get("phaseId"),
    title: formData.get("title"),
    phaseType: formData.get("phaseType"),
    status: formData.get("status"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    incomeSource: formData.get("incomeSource"),
    monthlyIncome: formData.get("monthlyIncome"),
    monthlySpending: formData.get("monthlySpending"),
    summary: formData.get("summary"),
    imageUrl: formData.get("imageUrl")
  });
  if (!payload.success) return { redirectTo: returnPath };

  const { supabase, account } = await requireAppContext();
  await supabase
    .from("life_phases")
    .update({
      title: payload.data.title,
      phase_type: payload.data.phaseType,
      status: payload.data.status,
      start_date: payload.data.startDate,
      end_date: payload.data.endDate,
      income_source: normalizeOptionalText(payload.data.incomeSource),
      monthly_income: payload.data.monthlyIncome === null ? null : payload.data.monthlyIncome.toFixed(2),
      monthly_spending: payload.data.monthlySpending === null ? null : payload.data.monthlySpending.toFixed(2),
      summary: normalizeOptionalText(payload.data.summary),
      image_url: normalizeOptionalUrl(payload.data.imageUrl)
    })
    .eq("account_id", account.accountId)
    .eq("id", payload.data.phaseId);

  revalidatePath("/life-map", "layout");
  return { redirectTo: returnPath };
}

export async function updateLifeProjectAction(formData: FormData) {
  const returnPath = getSafeReturnPath(formData.get("returnPath"));
  const payload = updateProjectSchema.safeParse({
    projectId: formData.get("projectId"),
    phaseId: formData.get("phaseId"),
    name: formData.get("name"),
    description: formData.get("description"),
    status: formData.get("status"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    progress: formData.get("progress"),
    outcome: formData.get("outcome"),
    imageUrl: formData.get("imageUrl")
  });
  if (!payload.success) return { redirectTo: returnPath };

  const { supabase, account } = await requireAppContext();
  const context = await resolveOwnedLifeContext(supabase, account.accountId, payload.data.phaseId, null);
  if (!context) return { redirectTo: returnPath };
  await supabase
    .from("life_projects")
    .update({
      phase_id: context.phaseId,
      name: payload.data.name,
      description: normalizeOptionalText(payload.data.description),
      status: payload.data.status,
      start_date: payload.data.startDate,
      end_date: payload.data.endDate,
      progress: payload.data.progress,
      outcome: normalizeOptionalText(payload.data.outcome),
      image_url: normalizeOptionalUrl(payload.data.imageUrl)
    })
    .eq("account_id", account.accountId)
    .eq("id", payload.data.projectId);

  // A project owns its phase. Keep denormalized phase columns consistent when
  // the project moves to another chapter.
  await Promise.all([
    supabase.from("habit_objectives").update({ phase_id: context.phaseId }).eq("account_id", account.accountId).eq("project_id", payload.data.projectId),
    supabase.from("habits").update({ phase_id: context.phaseId }).eq("account_id", account.accountId).eq("project_id", payload.data.projectId),
    supabase.from("templates").update({ phase_id: context.phaseId }).eq("account_id", account.accountId).eq("project_id", payload.data.projectId),
    supabase.from("ledger_entries").update({ phase_id: context.phaseId }).eq("account_id", account.accountId).eq("project_id", payload.data.projectId),
    supabase.from("calendar_events").update({ phase_id: context.phaseId }).eq("account_id", account.accountId).eq("project_id", payload.data.projectId),
    supabase.from("knowledge_spaces").update({ phase_id: context.phaseId }).eq("account_id", account.accountId).eq("project_id", payload.data.projectId)
  ]);

  revalidatePath("/life-map", "layout");
  return { redirectTo: returnPath };
}

export async function createLifeObjectiveAction(formData: FormData) {
  const returnPath = getSafeReturnPath(formData.get("returnPath"));
  const payload = createObjectiveSchema.safeParse({
    phaseId: formData.get("phaseId"),
    projectId: formData.get("projectId"),
    title: formData.get("title"),
    description: formData.get("description")
  });

  if (!payload.success) return { redirectTo: returnPath };

  const { supabase, account } = await requireAppContext();
  const context = await resolveOwnedLifeContext(supabase, account.accountId, payload.data.phaseId, payload.data.projectId);
  if (!context) return { redirectTo: returnPath };
  await supabase.from("habit_objectives").insert({
      account_id: account.accountId,
      phase_id: context.phaseId,
      project_id: context.projectId,
      title: payload.data.title,
      description: normalizeOptionalText(payload.data.description)
    });

  revalidatePath("/life-map", "layout");
  revalidatePath("/planning");
  revalidatePath("/habits");
  return { redirectTo: returnPath };
}

export async function createLifeTaskAction(formData: FormData) {
  const returnPath = getSafeReturnPath(formData.get("returnPath"));
  const payload = createTaskSchema.safeParse({
    objectiveId: formData.get("objectiveId"),
    phaseId: formData.get("phaseId"),
    projectId: formData.get("projectId"),
    title: formData.get("title"),
    minimumMinutes: formData.get("minimumMinutes"),
    weeklyTargetMinutes: formData.get("weeklyTargetMinutes")
  });

  if (!payload.success) return { redirectTo: returnPath };

  const { supabase, account } = await requireAppContext();
  const objective = await getOwnedObjectiveContext(supabase, account.accountId, payload.data.objectiveId);
  if (!objective) return { redirectTo: returnPath };
  const hasOverride = Boolean(payload.data.phaseId || payload.data.projectId);
  const context = hasOverride
    ? await resolveOwnedLifeContext(supabase, account.accountId, payload.data.phaseId, payload.data.projectId)
    : { phaseId: objective.phase_id, projectId: objective.project_id };
  if (!context) return { redirectTo: returnPath };
  await supabase.from("habits").insert({
      account_id: account.accountId,
      objective_id: payload.data.objectiveId,
      phase_id: hasOverride ? context.phaseId : null,
      project_id: hasOverride ? context.projectId : null,
      title: payload.data.title,
      type: "time_tracking",
      minimum_minutes: payload.data.minimumMinutes === "" ? null : payload.data.minimumMinutes ?? null,
      weekly_target_minutes: payload.data.weeklyTargetMinutes === "" ? null : payload.data.weeklyTargetMinutes ?? null,
      metadata: {}
    });

  revalidatePath("/life-map", "layout");
  revalidatePath("/planning");
  revalidatePath("/habits");
  return { redirectTo: returnPath };
}

export async function attachLifeEntityAction(formData: FormData) {
  const payload = attachSchema.safeParse({
    entityType: formData.get("entityType"),
    entityId: formData.get("entityId"),
    phaseId: formData.get("phaseId"),
    projectId: formData.get("projectId"),
    returnPath: formData.get("returnPath")
  });
  const returnPath = getSafeReturnPath(formData.get("returnPath"));

  if (!payload.success) return { redirectTo: returnPath };

  const { supabase, account } = await requireAppContext();
  const context = await resolveOwnedLifeContext(supabase, account.accountId, payload.data.phaseId, payload.data.projectId);
  if (!context) return { redirectTo: returnPath };
  const updates = {
    phase_id: context.phaseId,
    project_id: context.projectId
  };

  if (payload.data.entityType === "goal") {
    await supabase.from("habit_objectives").update(updates).eq("account_id", account.accountId).eq("id", payload.data.entityId);
  } else if (payload.data.entityType === "task") {
    await supabase.from("habits").update(updates).eq("account_id", account.accountId).eq("id", payload.data.entityId);
  } else if (payload.data.entityType === "finance_entry") {
    await supabase.from("ledger_entries").update(updates).eq("account_id", account.accountId).eq("id", payload.data.entityId);
  } else if (payload.data.entityType === "event") {
    await supabase.from("calendar_events").update(updates).eq("account_id", account.accountId).eq("id", payload.data.entityId);
  } else if (payload.data.entityType === "knowledge_space") {
    await supabase.from("knowledge_spaces").update(updates).eq("account_id", account.accountId).eq("id", payload.data.entityId);
  }

  revalidatePath("/life-map", "layout");
  revalidatePath("/dashboard");
  revalidatePath("/finance");
  revalidatePath("/events");
  revalidatePath("/knowledge");
  revalidatePath("/planning");
  revalidatePath("/habits");
  return { redirectTo: returnPath };
}

export async function createLifePhaseFormAction(
  _prevState: RedirectResult | null,
  formData: FormData
): Promise<RedirectResult | null> {
  return createLifePhaseAction(formData);
}

export async function createLifeProjectFormAction(
  _prevState: RedirectResult | null,
  formData: FormData
): Promise<RedirectResult | null> {
  return createLifeProjectAction(formData);
}

export async function createLifeObjectiveFormAction(
  _prevState: RedirectResult | null,
  formData: FormData
): Promise<RedirectResult | null> {
  return createLifeObjectiveAction(formData);
}

export async function updateLifePhaseFormAction(
  _prevState: RedirectResult | null,
  formData: FormData
): Promise<RedirectResult | null> {
  return updateLifePhaseAction(formData);
}

export async function updateLifeProjectFormAction(
  _prevState: RedirectResult | null,
  formData: FormData
): Promise<RedirectResult | null> {
  return updateLifeProjectAction(formData);
}

export async function createLifeTaskFormAction(
  _prevState: RedirectResult | null,
  formData: FormData
): Promise<RedirectResult | null> {
  return createLifeTaskAction(formData);
}

export async function attachLifeEntityFormAction(
  _prevState: RedirectResult | null,
  formData: FormData
): Promise<RedirectResult | null> {
  return attachLifeEntityAction(formData);
}
