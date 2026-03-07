"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireAppContext } from "@/lib/server-context";

const dateInputSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date");

const createTemplateSchema = z.object({
  name: z.string().trim().min(2, "Template name is required").max(140)
});

const createTemplateEntrySchema = z.object({
  templateId: z.string().uuid(),
  habitId: z.string().uuid(),
  dayOfWeek: z.coerce.number().int().min(1).max(7),
  plannedMinutes: z.coerce.number().int().min(0).max(100000),
  minimumMinutes: z.coerce.number().int().min(0).max(100000),
  isRequired: z.enum(["yes", "no"])
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

type DailyTemplateTask = {
  dayOfWeek: number;
  title: string;
  objectiveId: string;
  plannedMinutes: number;
  startTime: string | null;
};

function parseDailyTasks(formData: FormData) {
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
          startTime: typeof item.startTime === "string" ? item.startTime.trim() : ""
        };
      })
      .filter((row): row is { dayOfWeek: unknown; title: string; objectiveId: string; plannedMinutes: unknown; startTime: string } =>
        row !== null
      )
      .filter((row) => row.title.length > 0 || row.objectiveId.length > 0 || row.startTime.length > 0);

    const payloadSchema = z.array(
      z.object({
        dayOfWeek: z.coerce.number().int().min(1).max(7),
        title: z.string().trim().min(1).max(140),
        objectiveId: z.string().uuid(),
        plannedMinutes: z.coerce.number().int().min(0).max(100000),
        startTime: z.string().trim().max(60)
      })
    );

    const payload = payloadSchema.safeParse(normalizedRows);
    if (!payload.success || payload.data.length === 0) {
      return { ok: false as const };
    }

    return {
      ok: true as const,
      tasks: payload.data.map((task) => ({
        dayOfWeek: task.dayOfWeek,
        title: task.title,
        objectiveId: task.objectiveId,
        plannedMinutes: task.plannedMinutes,
        startTime: task.startTime.trim().length > 0 ? task.startTime.trim() : null
      }))
    };
  }

  const tasks: DailyTemplateTask[] = [];

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
      startTime
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

  const parsedTasks = parseDailyTasks(formData);
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

export async function createTemplateEntryAction(formData: FormData) {
  const returnPath = getSafeReturnPath(formData.get("returnPath"));
  const payload = createTemplateEntrySchema.safeParse({
    templateId: formData.get("templateId"),
    habitId: formData.get("habitId"),
    dayOfWeek: formData.get("dayOfWeek"),
    plannedMinutes: formData.get("plannedMinutes"),
    minimumMinutes: formData.get("minimumMinutes"),
    isRequired: formData.get("isRequired")
  });

  if (!payload.success) {
    redirectToPath(returnPath);
  }

  const { supabase } = await requireAppContext();

  const [templateRes, categoryRes] = await Promise.all([
    supabase.from("templates").select("objective_id").eq("id", payload.data.templateId).maybeSingle(),
    supabase.from("habits").select("objective_id").eq("id", payload.data.habitId).maybeSingle()
  ]);

  if (
    templateRes.data?.objective_id &&
    categoryRes.data?.objective_id &&
    templateRes.data.objective_id !== categoryRes.data.objective_id
  ) {
    redirectToPath(returnPath);
  }

  await supabase.from("template_entries").upsert(
    {
      template_id: payload.data.templateId,
      habit_id: payload.data.habitId,
      day_of_week: payload.data.dayOfWeek,
      planned_minutes: payload.data.plannedMinutes,
      minimum_minutes: payload.data.minimumMinutes,
      is_required: payload.data.isRequired === "yes"
    },
    {
      onConflict: "template_id,habit_id,day_of_week"
    }
  );

  revalidatePath("/planning");
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
