"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAppContext } from "@/lib/server-context";

const dateInputSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date");

const createHabitSchema = z.object({
  title: z.string().trim().min(2, "Habit title is required").max(140),
  type: z.enum(["time_tracking", "fixed_protocol", "count", "custom"]),
  weeklyTargetMinutes: z.coerce.number().int().min(0).max(100000).optional(),
  minimumMinutes: z.coerce.number().int().min(0).max(100000).optional()
});

const planSessionSchema = z.object({
  habitId: z.string().uuid(),
  sessionDate: dateInputSchema,
  plannedMinutes: z.coerce.number().int().min(0).max(100000),
  minimumMinutes: z.coerce.number().int().min(0).max(100000)
});

const updateSessionSchema = z.object({
  sessionId: z.string().uuid(),
  actualMinutes: z.union([z.literal(""), z.coerce.number().int().min(0).max(100000)]).optional(),
  rating: z.union([z.literal(""), z.coerce.number().int().min(1).max(5)]).optional(),
  notes: z.string().max(1500).optional()
});

export async function createHabitAction(formData: FormData) {
  const payload = createHabitSchema.safeParse({
    title: formData.get("title"),
    type: formData.get("type"),
    weeklyTargetMinutes: formData.get("weeklyTargetMinutes"),
    minimumMinutes: formData.get("minimumMinutes")
  });

  if (!payload.success) {
    return;
  }

  const { supabase, account } = await requireAppContext();

  await supabase.from("habits").insert({
    account_id: account.accountId,
    title: payload.data.title,
    type: payload.data.type,
    weekly_target_minutes: payload.data.weeklyTargetMinutes ?? null,
    minimum_minutes: payload.data.minimumMinutes ?? null,
    is_active: true,
    metadata: {}
  });

  revalidatePath("/habits");
}

export async function planSessionAction(formData: FormData) {
  const payload = planSessionSchema.safeParse({
    habitId: formData.get("habitId"),
    sessionDate: formData.get("sessionDate"),
    plannedMinutes: formData.get("plannedMinutes"),
    minimumMinutes: formData.get("minimumMinutes")
  });

  if (!payload.success) {
    return;
  }

  const { supabase } = await requireAppContext();

  await supabase.from("habit_sessions").upsert(
    {
      habit_id: payload.data.habitId,
      session_date: payload.data.sessionDate,
      planned_minutes: payload.data.plannedMinutes,
      minimum_minutes: payload.data.minimumMinutes
    },
    {
      onConflict: "habit_id,session_date"
    }
  );

  revalidatePath("/habits");
}

export async function updateSessionAction(formData: FormData) {
  const payload = updateSessionSchema.safeParse({
    sessionId: formData.get("sessionId"),
    actualMinutes: formData.get("actualMinutes"),
    rating: formData.get("rating"),
    notes: formData.get("notes")
  });

  if (!payload.success) {
    return;
  }

  const actualMinutes = payload.data.actualMinutes === "" ? null : payload.data.actualMinutes;
  const rating = payload.data.rating === "" ? null : payload.data.rating;

  const { supabase } = await requireAppContext();

  await supabase.rpc("update_habit_session", {
    p_session_id: payload.data.sessionId,
    p_actual_minutes: typeof actualMinutes === "number" ? actualMinutes : null,
    p_rating: typeof rating === "number" ? rating : null,
    p_notes: payload.data.notes?.trim() ? payload.data.notes : null
  });

  revalidatePath("/habits");
  revalidatePath("/dashboard");
  revalidatePath("/analytics");
}
