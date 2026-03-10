"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { RedirectResult } from "@/lib/action-with-state";
import { requireAppContext } from "@/lib/server-context";

const dateInputSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date");

const createObjectiveSchema = z.object({
  title: z.string().trim().min(2, "Objective title is required").max(160),
  description: z.string().trim().max(1200).optional(),
  imageUrl: z.string().trim().optional()
});

const updateObjectiveSchema = z.object({
  objectiveId: z.string().uuid(),
  title: z.string().trim().min(2, "Objective title is required").max(160),
  description: z.string().trim().max(1200).optional(),
  imageUrl: z.string().trim().optional()
});

const createHabitSchema = z.object({
  objectiveId: z.string().uuid(),
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

const toggleSessionSchema = z.object({
  sessionId: z.string().uuid(),
  completed: z.enum(["on"]).optional()
});

const completeSessionSchema = z.object({
  sessionId: z.string().uuid(),
  completed: z.enum(["on"]).optional(),
  actualMinutes: z.union([z.literal(""), z.coerce.number().int().min(0).max(100000)]).optional()
});

const generateWeekSchema = z.object({
  templateId: z.string().uuid(),
  weekStartDate: dateInputSchema
});

const addCompensationSessionSchema = z.object({
  habitId: z.string().uuid().optional(),
  sessionDate: dateInputSchema,
  doneMinutes: z.coerce.number().int().min(1).max(100000)
});

const syncWeekSchema = z.object({
  weekStartDate: dateInputSchema
});

function getSafeReturnPath(raw: FormDataEntryValue | null) {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (value.startsWith("/habits") || value.startsWith("/planning")) {
    return value;
  }
  return "/habits";
}

export async function createObjectiveAction(formData: FormData) {
  const returnPath = getSafeReturnPath(formData.get("returnPath"));
  const payload = createObjectiveSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    imageUrl: formData.get("imageUrl")
  });

  if (!payload.success) {
    return { redirectTo: returnPath };
  }

  const { supabase, account } = await requireAppContext();

  await supabase.from("habit_objectives").insert({
    account_id: account.accountId,
    title: payload.data.title,
    description: payload.data.description?.trim() ? payload.data.description : null,
    image_url: payload.data.imageUrl && URL.canParse(payload.data.imageUrl) ? payload.data.imageUrl : null
  });

  revalidatePath(returnPath.split("?")[0] || "/habits");
  return { redirectTo: returnPath };
}

export async function updateObjectiveAction(formData: FormData) {
  const returnPath = getSafeReturnPath(formData.get("returnPath"));
  const payload = updateObjectiveSchema.safeParse({
    objectiveId: formData.get("objectiveId"),
    title: formData.get("title"),
    description: formData.get("description"),
    imageUrl: formData.get("imageUrl")
  });

  if (!payload.success) {
    return { redirectTo: returnPath };
  }

  const { supabase, account } = await requireAppContext();

  const { error } = await supabase
    .from("habit_objectives")
    .update({
      title: payload.data.title,
      description: payload.data.description?.trim() ? payload.data.description : null,
      image_url: payload.data.imageUrl && URL.canParse(payload.data.imageUrl) ? payload.data.imageUrl : null
    })
    .eq("id", payload.data.objectiveId)
    .eq("account_id", account.accountId);

  if (error) {
    return { redirectTo: returnPath };
  }

  revalidatePath(returnPath.split("?")[0] || "/habits");
  return { redirectTo: returnPath };
}

export async function createObjectiveFormAction(
  _prevState: RedirectResult | null,
  formData: FormData
): Promise<RedirectResult | null> {
  return createObjectiveAction(formData);
}

export async function updateObjectiveFormAction(
  _prevState: RedirectResult | null,
  formData: FormData
): Promise<RedirectResult | null> {
  return updateObjectiveAction(formData);
}

export async function createHabitAction(formData: FormData) {
  const returnPath = getSafeReturnPath(formData.get("returnPath"));
  const payload = createHabitSchema.safeParse({
    objectiveId: formData.get("objectiveId"),
    title: formData.get("title"),
    type: formData.get("type"),
    weeklyTargetMinutes: formData.get("weeklyTargetMinutes"),
    minimumMinutes: formData.get("minimumMinutes")
  });

  if (!payload.success) {
    return { redirectTo: returnPath };
  }

  const { supabase, account } = await requireAppContext();

  await supabase.from("habits").insert({
    account_id: account.accountId,
    objective_id: payload.data.objectiveId,
    title: payload.data.title,
    type: payload.data.type,
    weekly_target_minutes: payload.data.weeklyTargetMinutes ?? null,
    minimum_minutes: payload.data.minimumMinutes ?? null,
    is_active: true,
    metadata: {}
  });

  revalidatePath(returnPath.split("?")[0] || "/habits");
  return { redirectTo: returnPath };
}

export async function planSessionAction(formData: FormData) {
  const returnPath = getSafeReturnPath(formData.get("returnPath"));
  const payload = planSessionSchema.safeParse({
    habitId: formData.get("habitId"),
    sessionDate: formData.get("sessionDate"),
    plannedMinutes: formData.get("plannedMinutes"),
    minimumMinutes: formData.get("minimumMinutes")
  });

  if (!payload.success) {
    return { redirectTo: returnPath };
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

  revalidatePath(returnPath.split("?")[0] || "/habits");
  return { redirectTo: returnPath };
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

export async function toggleSessionCompletionAction(formData: FormData) {
  const returnPath = getSafeReturnPath(formData.get("returnPath"));
  const payload = toggleSessionSchema.safeParse({
    sessionId: formData.get("sessionId"),
    completed: formData.get("completed")
  });

  if (!payload.success) {
    return { redirectTo: returnPath };
  }

  const completed = payload.data.completed === "on";
  const { supabase } = await requireAppContext();

  const { data: session } = await supabase
    .from("habit_sessions")
    .select("id, minimum_minutes, actual_minutes")
    .eq("id", payload.data.sessionId)
    .maybeSingle();

  if (!session) {
    return { redirectTo: returnPath };
  }

  await supabase
    .from("habit_sessions")
    .update({
      completed,
      actual_minutes: completed
        ? (session.actual_minutes ?? session.minimum_minutes)
        : (session.actual_minutes ?? null)
    })
    .eq("id", payload.data.sessionId);

  revalidatePath(returnPath.split("?")[0] || "/habits");
  return { redirectTo: returnPath };
}

export async function completeSessionWithHoursAction(formData: FormData) {
  const returnPath = getSafeReturnPath(formData.get("returnPath"));
  const actualMinutesRaw = formData.get("actualMinutes");
  const completedRaw = formData.get("completed");
  const payload = completeSessionSchema.safeParse({
    sessionId: formData.get("sessionId"),
    completed: completedRaw === null ? undefined : completedRaw,
    actualMinutes: actualMinutesRaw === null ? undefined : actualMinutesRaw
  });

  if (!payload.success) {
    return { redirectTo: returnPath };
  }

  const completed = payload.data.completed === "on";
  const minutes =
    payload.data.actualMinutes === "" || typeof payload.data.actualMinutes === "undefined"
      ? null
      : payload.data.actualMinutes;

  const { supabase } = await requireAppContext();
  const { data: session } = await supabase
    .from("habit_sessions")
    .select("id, minimum_minutes, actual_minutes")
    .eq("id", payload.data.sessionId)
    .maybeSingle();

  if (!session) {
    return { redirectTo: returnPath };
  }

  if (completed && (minutes === null || minutes <= 0)) {
    return { redirectTo: returnPath };
  }

  const actualMinutes = completed
    ? (minutes ?? session.minimum_minutes)
    : (minutes ?? null);

  await supabase
    .from("habit_sessions")
    .update({
      completed,
      actual_minutes: actualMinutes
    })
    .eq("id", payload.data.sessionId);

  revalidatePath(returnPath.split("?")[0] || "/habits");
  return { redirectTo: returnPath };
}

export async function generateWeekFromTemplateAction(formData: FormData) {
  const returnPath = getSafeReturnPath(formData.get("returnPath"));
  const payload = generateWeekSchema.safeParse({
    templateId: formData.get("templateId"),
    weekStartDate: formData.get("weekStartDate")
  });

  if (!payload.success) {
    return { redirectTo: returnPath };
  }

  const { supabase, account } = await requireAppContext();
  const { data: existingWeek } = await supabase
    .from("weeks")
    .select("id, template_id")
    .eq("account_id", account.accountId)
    .eq("week_start_date", payload.data.weekStartDate)
    .maybeSingle();

  if (existingWeek?.id) {
    return { redirectTo: returnPath };
  }

  await supabase.rpc("create_week_from_template", {
    p_account_id: account.accountId,
    p_template_id: payload.data.templateId,
    p_week_start_date: payload.data.weekStartDate
  });

  revalidatePath(returnPath.split("?")[0] || "/habits");
  return { redirectTo: returnPath };
}

export async function addCompensationSessionAction(formData: FormData) {
  const returnPath = getSafeReturnPath(formData.get("returnPath"));
  const habitIdRaw = formData.get("habitId");
  const payload = addCompensationSessionSchema.safeParse({
    habitId: typeof habitIdRaw === "string" && habitIdRaw.length > 0 ? habitIdRaw : undefined,
    sessionDate: formData.get("sessionDate"),
    doneMinutes: formData.get("doneMinutes")
  });

  if (!payload.success) {
    return { redirectTo: returnPath };
  }

  const objectiveIdRaw = formData.get("objectiveId");
  const newTaskTitleRaw = formData.get("newTaskTitle");

  const { supabase, account } = await requireAppContext();

  let habitId = payload.data.habitId ?? "";

  if (!habitId) {
    const objectiveId = typeof objectiveIdRaw === "string" && objectiveIdRaw.length > 0 ? objectiveIdRaw : null;
    const newTaskTitle = typeof newTaskTitleRaw === "string" ? newTaskTitleRaw.trim() : "";
    const isObjectiveValid = objectiveId ? z.string().uuid().safeParse(objectiveId).success : false;
    if (!isObjectiveValid || newTaskTitle.length < 2) {
      return { redirectTo: returnPath };
    }

    const { data: newHabit } = await supabase
      .from("habits")
      .insert({
        account_id: account.accountId,
        objective_id: objectiveId,
        title: newTaskTitle,
        type: "time_tracking",
        weekly_target_minutes: null,
        minimum_minutes: null,
        is_active: true,
        metadata: {}
      })
      .select("id")
      .single();

    if (!newHabit?.id) {
      return { redirectTo: returnPath };
    }

    habitId = newHabit.id;
  }

  const { data: existing } = await supabase
    .from("habit_sessions")
    .select("id, actual_minutes, planned_minutes, minimum_minutes")
    .eq("habit_id", habitId)
    .eq("session_date", payload.data.sessionDate)
    .maybeSingle();

  if (existing?.id) {
    const updatedMinutes = (existing.actual_minutes ?? 0) + payload.data.doneMinutes;
    await supabase
      .from("habit_sessions")
      .update({
        actual_minutes: updatedMinutes,
        completed: true
      })
      .eq("id", existing.id);
  } else {
    await supabase.from("habit_sessions").insert({
      habit_id: habitId,
      session_date: payload.data.sessionDate,
      planned_minutes: 0,
      minimum_minutes: 0,
      actual_minutes: payload.data.doneMinutes,
      completed: true
    });
  }

  revalidatePath(returnPath.split("?")[0] || "/habits");
  return { redirectTo: returnPath };
}

export async function completeSessionWithHoursFormAction(
  _prevState: RedirectResult | null,
  formData: FormData
): Promise<RedirectResult | null> {
  return completeSessionWithHoursAction(formData);
}

export async function syncWeekWithTemplateFormAction(
  _prevState: RedirectResult | null,
  formData: FormData
): Promise<RedirectResult | null> {
  return syncWeekWithTemplateAction(formData);
}

export async function generateWeekFromTemplateFormAction(
  _prevState: RedirectResult | null,
  formData: FormData
): Promise<RedirectResult | null> {
  return generateWeekFromTemplateAction(formData);
}

export async function addCompensationSessionFormAction(
  _prevState: RedirectResult | null,
  formData: FormData
): Promise<RedirectResult | null> {
  return addCompensationSessionAction(formData);
}

export async function syncWeekWithTemplateAction(formData: FormData) {
  const returnPath = getSafeReturnPath(formData.get("returnPath"));
  const payload = syncWeekSchema.safeParse({
    weekStartDate: formData.get("weekStartDate")
  });

  if (!payload.success) {
    return { redirectTo: returnPath };
  }

  const { supabase, account } = await requireAppContext();
  const { data: existingWeek } = await supabase
    .from("weeks")
    .select("template_id")
    .eq("account_id", account.accountId)
    .eq("week_start_date", payload.data.weekStartDate)
    .maybeSingle();

  if (!existingWeek?.template_id) {
    return { redirectTo: returnPath };
  }

  const weekStartDate = new Date(`${payload.data.weekStartDate}T00:00:00`);
  const weekEndDate = new Date(weekStartDate);
  weekEndDate.setDate(weekEndDate.getDate() + 6);
  const weekEndIso = weekEndDate.toISOString().slice(0, 10);

  await supabase
    .from("habit_sessions")
    .delete()
    .gte("session_date", payload.data.weekStartDate)
    .lte("session_date", weekEndIso);

  await supabase
    .from("weeks")
    .delete()
    .eq("account_id", account.accountId)
    .eq("week_start_date", payload.data.weekStartDate);

  await supabase.rpc("create_week_from_template", {
    p_account_id: account.accountId,
    p_template_id: existingWeek.template_id,
    p_week_start_date: payload.data.weekStartDate
  });

  revalidatePath(returnPath.split("?")[0] || "/habits");
  return { redirectTo: returnPath };
}
