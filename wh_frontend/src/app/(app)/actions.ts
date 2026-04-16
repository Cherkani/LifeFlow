"use server";

import { createHash } from "node:crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import type { RedirectResult } from "@/lib/action-with-state";
import { requireAppContext } from "@/lib/server-context";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const profileSchema = z.object({
  fullName: z.preprocess(
    (v) => (v == null ? "" : String(v).trim()),
    z.string().min(2, "Full name must be at least 2 characters").max(120)
  ),
  timezone: z.preprocess(
    (v) => (v == null ? "" : String(v).trim()),
    z.string().min(2, "Please select a timezone").max(100)
  ),
  cycleTrackingEnabled: z
    .union([z.literal("on"), z.literal("true"), z.null(), z.undefined()])
    .optional()
    .transform((v) => (v === "on" || v === "true")),
  lutealPhaseLength: z
    .preprocess((value) => {
      if (value == null || value === "") return undefined;
      const parsed = Number(value);
      return Number.isNaN(parsed) ? value : parsed;
    }, z.number().int("Luteal length must be whole days").min(8).max(20))
    .optional()
});

const knowledgeUnlockCodeSchema = z
  .object({
    knowledgeUnlockCode: z.preprocess(
      (v) => (v == null ? "" : String(v).trim()),
      z.string().min(4, "Unlock code must be at least 4 characters").max(32, "Unlock code must be 32 characters or less")
    ),
    confirmKnowledgeUnlockCode: z.preprocess(
      (v) => (v == null ? "" : String(v).trim()),
      z.string().min(4, "Please confirm the unlock code").max(32)
    )
  })
  .refine((value) => value.knowledgeUnlockCode === value.confirmKnowledgeUnlockCode, {
    path: ["confirmKnowledgeUnlockCode"],
    message: "Confirmation does not match the unlock code"
  });

function readAccountSettings(settings: unknown) {
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
    return {} as Record<string, unknown>;
  }
  return settings as Record<string, unknown>;
}

export async function signOutAction() {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut({ scope: "global" });
  redirect("/login");
}

export async function updateProfileAction(formData: FormData) {
  const payload = profileSchema.safeParse({
    fullName: formData.get("fullName"),
    timezone: formData.get("timezone"),
    cycleTrackingEnabled: formData.get("cycleTrackingEnabled"),
    lutealPhaseLength: formData.get("lutealPhaseLength")
  });

  if (!payload.success) {
    const first = payload.error.issues[0];
    const msg = first?.path?.length
      ? `${first.path.join(".")}: ${first.message}`
      : first?.message ?? "Invalid profile data";
    return { redirectTo: `/settings?error=${encodeURIComponent(msg)}` };
  }

  const { supabase, user } = await requireAppContext();
  const update: Record<string, unknown> = {
    full_name: payload.data.fullName,
    timezone: payload.data.timezone,
    cycle_tracking_enabled: payload.data.cycleTrackingEnabled ?? false,
    luteal_phase_length: payload.data.lutealPhaseLength ?? 14
  };

  const { error } = await supabase.from("profiles").update(update).eq("id", user.id);

  if (error) {
    const errMsg =
      (error.message || "Update failed") +
      (error.details ? ` (${error.details})` : "") +
      (error.hint ? ` [${error.hint}]` : "");
    return {
      redirectTo: `/settings?error=${encodeURIComponent(errMsg)}`
    };
  }

  revalidatePath("/settings");
  revalidatePath("/", "layout");
  return { redirectTo: "/settings?success=profile-updated&t=" + Date.now() };
}

export async function updateKnowledgeUnlockCodeAction(formData: FormData) {
  const payload = knowledgeUnlockCodeSchema.safeParse({
    knowledgeUnlockCode: formData.get("knowledgeUnlockCode"),
    confirmKnowledgeUnlockCode: formData.get("confirmKnowledgeUnlockCode")
  });

  if (!payload.success) {
    const first = payload.error.issues[0];
    const msg = first?.message ?? "Invalid unlock code";
    return { redirectTo: `/settings?error=${encodeURIComponent(msg)}` };
  }

  const { supabase, account } = await requireAppContext();
  const { data: accountRow, error: accountError } = await supabase
    .from("accounts")
    .select("settings")
    .eq("id", account.accountId)
    .maybeSingle();

  if (accountError) {
    return { redirectTo: `/settings?error=${encodeURIComponent(accountError.message || "Could not load workspace settings")}` };
  }

  const settings = readAccountSettings(accountRow?.settings);
  const nextSettings = {
    ...settings,
    knowledge_unlock_code_hash: createHash("sha256").update(payload.data.knowledgeUnlockCode).digest("hex"),
    knowledge_unlock_code_updated_at: new Date().toISOString()
  };

  const { error } = await supabase
    .from("accounts")
    .update({ settings: nextSettings })
    .eq("id", account.accountId);

  if (error) {
    return { redirectTo: `/settings?error=${encodeURIComponent(error.message || "Could not save unlock code")}` };
  }

  revalidatePath("/settings");
  return { redirectTo: "/settings?success=knowledge-code-updated&t=" + Date.now() };
}

export async function clearKnowledgeUnlockCodeAction() {
  const { supabase, account } = await requireAppContext();
  const { data: accountRow, error: accountError } = await supabase
    .from("accounts")
    .select("settings")
    .eq("id", account.accountId)
    .maybeSingle();

  if (accountError) {
    return { redirectTo: `/settings?error=${encodeURIComponent(accountError.message || "Could not load workspace settings")}` };
  }

  const settings = readAccountSettings(accountRow?.settings);
  const { knowledge_unlock_code_hash: _removedHash, knowledge_unlock_code_updated_at: _removedAt, ...rest } = settings;

  const { error } = await supabase
    .from("accounts")
    .update({ settings: rest })
    .eq("id", account.accountId);

  if (error) {
    return { redirectTo: `/settings?error=${encodeURIComponent(error.message || "Could not clear unlock code")}` };
  }

  revalidatePath("/settings");
  return { redirectTo: "/settings?success=knowledge-code-cleared&t=" + Date.now() };
}

export async function updateProfileFormAction(
  _prevState: RedirectResult | null,
  formData: FormData
): Promise<RedirectResult | null> {
  return updateProfileAction(formData);
}

export async function updateKnowledgeUnlockCodeFormAction(
  _prevState: RedirectResult | null,
  formData: FormData
): Promise<RedirectResult | null> {
  return updateKnowledgeUnlockCodeAction(formData);
}

export async function clearKnowledgeUnlockCodeFormAction(
  _prevState: RedirectResult | null,
  _formData: FormData
): Promise<RedirectResult | null> {
  return clearKnowledgeUnlockCodeAction();
}
