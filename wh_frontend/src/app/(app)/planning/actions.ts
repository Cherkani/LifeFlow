"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireAppContext } from "@/lib/server-context";

const dateInputSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date");

const createTemplateSchema = z.object({
  name: z.string().trim().min(2, "Template name is required").max(140)
});

const updateTemplateSchema = z.object({
  templateId: z.string().uuid(),
  name: z.string().trim().min(2, "Template name is required").max(140)
});

const generateWeekSchema = z.object({
  templateId: z.string().uuid(),
  weekStartDate: dateInputSchema
});

function getSafeReturnPath(raw: FormDataEntryValue | null) {
  const value = typeof raw === "string" ? raw.trim() : "";
  return value.startsWith("/planning") ? value : "/planning";
}

function redirectToPath(path: string): never {
  redirect(path as Parameters<typeof redirect>[0]);
}

export async function createTemplateAction(formData: FormData) {
  const returnPath = getSafeReturnPath(formData.get("returnPath"));
  const payload = createTemplateSchema.safeParse({
    name: formData.get("name")
  });

  if (!payload.success) {
    redirectToPath(returnPath);
  }

  const { supabase, account } = await requireAppContext();

  await supabase.from("templates").insert({
    account_id: account.accountId,
    objective_id: null,
    name: payload.data.name
  });

  revalidatePath("/planning");
  redirectToPath(returnPath);
}

type TemplateTaskPayload = {
  dayOfWeek: number;
  title: string;
  objectiveId: string;
  plannedMinutes: number;
  startTime: string | null;
  habitId: string | null;
};

function parseTasksPayload(formData: FormData, options?: { allowExistingHabitIds?: boolean }) {
  const tasksPayloadRaw = formData.get("tasksPayload");
  if (typeof tasksPayloadRaw === "string" && tasksPayloadRaw.trim().length > 0) {
    let parsedUnknown: unknown;
    try {
      parsedUnknown = JSON.parse(tasksPayloadRaw);
    } catch {
      return { ok: false as const };
    }

    const rows = Array.isArray(parsedUnknown) ? parsedUnknown : [];
    const normalizedRows = rows
      .map((row) => {
        if (!row || typeof row !== "object" || Array.isArray(row)) {
          return null;
        }

        const item = row as Record<string, unknown>;
        return {
          dayOfWeek: item.dayOfWeek,
          title: typeof item.title === "string" ? item.title.trim() : "",
          objectiveId: typeof item.objectiveId === "string" ? item.objectiveId.trim() : "",
          plannedMinutes: item.plannedMinutes,
          startTime: typeof item.startTime === "string" ? item.startTime.trim() : "",
          habitId: typeof item.habitId === "string" ? item.habitId.trim() : null
        };
      })
      .filter((row): row is { dayOfWeek: unknown; title: string; objectiveId: string; plannedMinutes: unknown; startTime: string; habitId: string | null } => row !== null)
      .filter((row) => row.title.length > 0 || row.objectiveId.length > 0 || row.startTime.length > 0);

    const payloadSchema = z.array(
      z.object({
        dayOfWeek: z.coerce.number().int().min(1).max(7),
        title: z.string().trim().min(1).max(140),
        objectiveId: z.string().uuid(),
        plannedMinutes: z.coerce.number().int().min(0).max(100000),
        startTime: z.union([z.string().trim().max(60), z.literal(""), z.null()]),
        habitId: z.string().uuid().nullable().optional()
      })
    );

    const payload = payloadSchema.safeParse(normalizedRows);
    if (!payload.success || payload.data.length === 0) {
      return { ok: false as const };
    }

    if (!options?.allowExistingHabitIds && payload.data.some((task) => task.habitId)) {
      return { ok: false as const };
    }

    return {
      ok: true as const,
      tasks: payload.data.map((task) => ({
        dayOfWeek: task.dayOfWeek,
        title: task.title,
        objectiveId: task.objectiveId,
        plannedMinutes: task.plannedMinutes,
        startTime:
          typeof task.startTime === "string" && task.startTime.trim().length > 0 ? task.startTime.trim() : null,
        habitId: options?.allowExistingHabitIds ? task.habitId ?? null : null
      }))
    };
  }

  const tasks: TemplateTaskPayload[] = [];

  for (let dayOfWeek = 1; dayOfWeek <= 7; dayOfWeek += 1) {
    const titleRaw = formData.get(`day${dayOfWeek}Task`);
    const objectiveIdRaw = formData.get(`day${dayOfWeek}ObjectiveId`);
    const plannedRaw = formData.get(`day${dayOfWeek}AvgMinutes`);
    const startRaw = formData.get(`day${dayOfWeek}StartTime`);

    const title = typeof titleRaw === "string" ? titleRaw.trim() : "";
    const objectiveId = typeof objectiveIdRaw === "string" ? objectiveIdRaw.trim() : "";
    const plannedInput = typeof plannedRaw === "string" ? plannedRaw.trim() : "";
    const startInput = typeof startRaw === "string" ? startRaw.trim() : "";

    if (!title || !objectiveId || !z.string().uuid().safeParse(objectiveId).success) {
      continue;
    }

    const plannedMinutes =
      plannedInput.length > 0
        ? Number(plannedInput)
        : 0;

    if (!Number.isFinite(plannedMinutes) || plannedMinutes < 0 || plannedMinutes > 100000) {
      return { ok: false as const };
    }

    const startTime = startInput.length > 0 ? startInput : null;

    tasks.push({
      dayOfWeek,
      title,
      objectiveId,
      plannedMinutes: Math.round(plannedMinutes),
      startTime,
      habitId: null
    });
  }

  if (tasks.length === 0) {
    return { ok: false as const };
  }

  return { ok: true as const, tasks };
}

export async function createTemplateWithDailyTasksAction(formData: FormData) {
  const returnPath = getSafeReturnPath(formData.get("returnPath"));
  const payload = createTemplateSchema.safeParse({
    name: formData.get("name")
  });

  if (!payload.success) {
    redirectToPath(returnPath);
  }

  const parsedTasks = parseTasksPayload(formData);
  if (!parsedTasks.ok) {
    redirectToPath(returnPath);
  }

  const { supabase, account } = await requireAppContext();
  const { data: template } = await supabase
    .from("templates")
    .insert({
      account_id: account.accountId,
      objective_id: null,
      name: payload.data.name
    })
    .select("id")
    .single();

  if (!template?.id) {
    redirectToPath(returnPath);
  }

  for (const task of parsedTasks.tasks) {
    const metadata: Record<string, string> = {};
    if (task.startTime) {
      metadata.preferred_start_time = task.startTime;
    }
    const { data: habit } = await supabase
      .from("habits")
      .insert({
        account_id: account.accountId,
        objective_id: task.objectiveId,
        title: task.title,
        type: "time_tracking",
        weekly_target_minutes: null,
        minimum_minutes: task.plannedMinutes,
        is_active: true,
        metadata
      })
      .select("id")
      .single();

    if (!habit?.id) {
      continue;
    }

    await supabase.from("template_entries").insert({
      template_id: template.id,
      habit_id: habit.id,
      day_of_week: task.dayOfWeek,
      planned_minutes: task.plannedMinutes,
      minimum_minutes: task.plannedMinutes,
      is_required: true
    });
  }

  revalidatePath("/planning");
  revalidatePath("/habits");
  revalidatePath("/dashboard");
  revalidatePath("/analytics");
  redirectToPath(returnPath);
}

export async function updateTemplateWithDailyTasksAction(formData: FormData) {
  const returnPath = getSafeReturnPath(formData.get("returnPath"));
  const payload = updateTemplateSchema.safeParse({
    templateId: formData.get("templateId"),
    name: formData.get("name")
  });

  if (!payload.success) {
    redirectToPath(returnPath);
  }

  const parsedTasks = parseTasksPayload(formData, { allowExistingHabitIds: true });
  if (!parsedTasks.ok) {
    redirectToPath(returnPath);
  }

  const { supabase, account } = await requireAppContext();

  const templateRes = await supabase
    .from("templates")
    .select("id")
    .eq("id", payload.data.templateId)
    .eq("account_id", account.accountId)
    .maybeSingle();

  if (!templateRes.data) {
    redirectToPath(returnPath);
  }

  const { data: existingEntries } = await supabase
    .from("template_entries")
    .select("id, habit_id, day_of_week")
    .eq("template_id", payload.data.templateId);

  const trackedEntryKeys = new Set<string>();
  const existingHabitIds = Array.from(new Set((existingEntries ?? []).map((entry) => entry.habit_id)));
  const existingHabitIdSet = new Set(existingHabitIds);
  const existingHabitsRes =
    existingHabitIds.length > 0
      ? await supabase.from("habits").select("id, metadata").in("id", existingHabitIds)
      : { data: [] as Array<{ id: string; metadata: unknown }> };
  const habitMetadataById = new Map(existingHabitsRes.data?.map((habit) => [habit.id, habit.metadata]));

  for (const task of parsedTasks.tasks) {
    if (task.habitId) {
      const matchingHabitExists = existingHabitIdSet.has(task.habitId);
      if (!matchingHabitExists) {
        redirectToPath(returnPath);
      }

      const previousMetadata = habitMetadataById.get(task.habitId);
      const metadata: Record<string, unknown> =
        previousMetadata && typeof previousMetadata === "object" && !Array.isArray(previousMetadata)
          ? { ...(previousMetadata as Record<string, unknown>) }
          : {};
      if (task.startTime) {
        metadata["preferred_start_time"] = task.startTime;
      } else {
        delete metadata["preferred_start_time"];
      }

      await supabase
        .from("habits")
        .update({
          title: task.title,
          objective_id: task.objectiveId,
          minimum_minutes: task.plannedMinutes,
          metadata
        })
        .eq("id", task.habitId);

      await supabase.from("template_entries").upsert(
        {
          template_id: payload.data.templateId,
          habit_id: task.habitId,
          day_of_week: task.dayOfWeek,
          planned_minutes: task.plannedMinutes,
          minimum_minutes: task.plannedMinutes,
          is_required: true
        },
        {
          onConflict: "template_id,habit_id,day_of_week"
        }
      );

      trackedEntryKeys.add(`${task.habitId}-${task.dayOfWeek}`);
    } else {
      const metadata: Record<string, string> = {};
      if (task.startTime) {
        metadata.preferred_start_time = task.startTime;
      }
      const { data: habit } = await supabase
        .from("habits")
        .insert({
          account_id: account.accountId,
          objective_id: task.objectiveId,
          title: task.title,
          type: "time_tracking",
          weekly_target_minutes: null,
          minimum_minutes: task.plannedMinutes,
          is_active: true,
          metadata
        })
        .select("id")
        .single();

      if (!habit?.id) {
        continue;
      }

      await supabase.from("template_entries").insert({
        template_id: payload.data.templateId,
        habit_id: habit.id,
        day_of_week: task.dayOfWeek,
        planned_minutes: task.plannedMinutes,
        minimum_minutes: task.plannedMinutes,
        is_required: true
      });
    }
  }

  const entriesToRemove =
    existingEntries?.filter((entry) => !trackedEntryKeys.has(`${entry.habit_id}-${entry.day_of_week}`)) ?? [];
  if (entriesToRemove.length > 0) {
    await supabase
      .from("template_entries")
      .delete()
      .in(
        "id",
        entriesToRemove.map((entry) => entry.id)
      );
  }

  await supabase.from("templates").update({ name: payload.data.name }).eq("id", payload.data.templateId);

  revalidatePath("/planning");
  revalidatePath("/habits");
  revalidatePath("/dashboard");
  revalidatePath("/analytics");
  redirectToPath(returnPath);
}

export async function generateWeekAction(formData: FormData) {
  const returnPath = getSafeReturnPath(formData.get("returnPath"));
  const payload = generateWeekSchema.safeParse({
    templateId: formData.get("templateId"),
    weekStartDate: formData.get("weekStartDate")
  });

  if (!payload.success) {
    redirectToPath(returnPath);
  }

  const { supabase, account } = await requireAppContext();

  await supabase.rpc("create_week_from_template", {
    p_account_id: account.accountId,
    p_template_id: payload.data.templateId,
    p_week_start_date: payload.data.weekStartDate
  });

  revalidatePath("/planning");
  revalidatePath("/habits");
  revalidatePath("/dashboard");
  revalidatePath("/analytics");
  redirectToPath(returnPath);
}
