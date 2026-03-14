"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { RedirectResult } from "@/lib/action-with-state";
import { OVULATION_METHODS } from "@/lib/cycle-constants";
import { requireAppContext } from "@/lib/server-context";

const CYCLE_PATH = "/cycle";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date");

const logPeriodSchema = z.object({
  periodStart: dateSchema,
  periodEnd: dateSchema
});

const logDailySchema = z.object({
  logDate: dateSchema,
  flowIntensity: z.enum(["spotting", "light", "medium", "heavy"]).optional().nullable(),
  symptoms: z.string().optional(),
  moods: z.string().optional(),
  notes: z.string().trim().max(500).optional()
});

const deletePeriodSchema = z.object({
  periodId: z.string().uuid()
});

const confirmOvulationSchema = z.object({
  confirmDate: dateSchema,
  method: z.enum(OVULATION_METHODS).optional(),
  notes: z.string().trim().max(240).optional()
});

export async function logPeriodFormAction(
  _prevState: RedirectResult | null,
  formData: FormData
): Promise<RedirectResult | null> {
  const payload = logPeriodSchema.safeParse({
    periodStart: formData.get("periodStart"),
    periodEnd: formData.get("periodEnd")
  });

  if (!payload.success) {
    return { redirectTo: CYCLE_PATH };
  }

  const { periodStart, periodEnd } = payload.data;
  if (periodStart > periodEnd) {
    return { redirectTo: CYCLE_PATH };
  }

  const { supabase, user } = await requireAppContext();
  await supabase.from("period_cycles").insert({
    user_id: user.id,
    period_start: periodStart,
    period_end: periodEnd
  });

  revalidatePath(CYCLE_PATH);
  return { redirectTo: CYCLE_PATH };
}

export async function logPeriodAction(formData: FormData) {
  return logPeriodFormAction(null, formData);
}

export async function deletePeriodFormAction(
  _prevState: RedirectResult | null,
  formData: FormData
): Promise<RedirectResult | null> {
  const payload = deletePeriodSchema.safeParse({
    periodId: formData.get("periodId")
  });

  if (!payload.success) {
    return { redirectTo: CYCLE_PATH };
  }

  const { supabase, user } = await requireAppContext();
  await supabase
    .from("period_cycles")
    .delete()
    .eq("id", payload.data.periodId)
    .eq("user_id", user.id);

  revalidatePath(CYCLE_PATH);
  return { redirectTo: CYCLE_PATH };
}

export async function upsertDailyLogFormAction(
  _prevState: RedirectResult | null,
  formData: FormData
): Promise<RedirectResult | null> {
  const rawSymptoms = formData.get("symptoms");
  const symptomsArr =
    typeof rawSymptoms === "string" && rawSymptoms.trim()
      ? rawSymptoms
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
  const rawMoods = formData.get("moods");
  const moodArr =
    typeof rawMoods === "string" && rawMoods.trim()
      ? rawMoods
          .split(",")
          .map((m) => m.trim().toLowerCase())
          .filter(Boolean)
      : [];

  const payload = logDailySchema.safeParse({
    logDate: formData.get("logDate"),
    flowIntensity: formData.get("flowIntensity") || null,
    symptoms: formData.get("symptoms"),
    moods: formData.get("moods"),
    notes: formData.get("notes")
  });

  if (!payload.success) {
    return { redirectTo: CYCLE_PATH };
  }

  const { supabase, user } = await requireAppContext();
  const { logDate, flowIntensity, notes } = payload.data;

  await supabase.from("period_daily_logs").upsert(
    {
      user_id: user.id,
      log_date: logDate,
      flow_intensity: flowIntensity ?? null,
      symptoms: symptomsArr,
      moods: moodArr,
      notes: notes?.trim() || null
    },
    { onConflict: "user_id,log_date" }
  );

  revalidatePath(CYCLE_PATH);
  return { redirectTo: CYCLE_PATH };
}

export async function confirmOvulationFormAction(
  _prevState: RedirectResult | null,
  formData: FormData
): Promise<RedirectResult | null> {
  const payload = confirmOvulationSchema.safeParse({
    confirmDate: formData.get("confirmDate"),
    method: formData.get("method") || "other",
    notes: formData.get("notes")
  });

  if (!payload.success) {
    return { redirectTo: CYCLE_PATH };
  }

  const { supabase, user } = await requireAppContext();
  const { confirmDate, method, notes } = payload.data;

  await supabase.from("ovulation_confirmations").upsert(
    {
      user_id: user.id,
      confirmed_on: confirmDate,
      method: method ?? "other",
      notes: notes ?? null
    },
    { onConflict: "user_id,confirmed_on" }
  );

  revalidatePath(CYCLE_PATH);
  return { redirectTo: CYCLE_PATH };
}
