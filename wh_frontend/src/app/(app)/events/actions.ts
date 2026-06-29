"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { RedirectResult } from "@/lib/action-with-state";
import { serializeCalendarEventDetails } from "@/lib/calendar-event-mode";
import { requireAppContext } from "@/lib/server-context";

const timeSchema = z.preprocess(
  (value) => (typeof value === "string" ? value.trim() : ""),
  z
    .union([z.literal(""), z.string().regex(/^\d{2}:\d{2}$/, "Invalid time")])
    .transform((value) => (value === "" ? null : value))
);

const optionalDateSchema = z.preprocess(
  (value) => (typeof value === "string" ? value.trim() : ""),
  z
    .union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date")])
    .transform((value) => (value === "" ? null : value))
);

const createEventSchema = z.object({
  title: z.string().trim().min(2).max(180),
  eventMode: z.enum(["event", "todo", "milestone"]).default("event"),
  eventDate: optionalDateSchema,
  eventTime: timeSchema,
  eventType: z.string().trim().min(1).max(60).default("General"),
  objectiveId: z.union([z.literal(""), z.string().uuid()]).optional(),
  details: z.string().trim().max(1200).optional()
});

const updateEventSchema = z.object({
  eventId: z.string().uuid(),
  title: z.string().trim().min(2).max(180),
  eventMode: z.enum(["event", "todo", "milestone"]).default("event"),
  eventDate: optionalDateSchema,
  eventTime: timeSchema,
  eventType: z.string().trim().min(1).max(60).default("General"),
  objectiveId: z.union([z.literal(""), z.string().uuid()]).optional(),
  details: z.string().trim().max(1200).optional()
});

const toggleEventDoneSchema = z.object({
  eventId: z.string().uuid(),
  completed: z.enum(["true", "false"]),
  doneOn: z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]).optional(),
  doneMinutes: z.union([z.literal(""), z.coerce.number().int().min(0).max(100000)]).optional()
});

const deleteEventSchema = z.object({
  eventId: z.string().uuid()
});

function getSafeReturnPath(raw: FormDataEntryValue | null) {
  const value = typeof raw === "string" ? raw.trim() : "";
  return value.startsWith("/events") ? value : "/events";
}

function normalizeOptionalId(value: string | undefined) {
  return value && value.length > 0 ? value : null;
}

function todayIso() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export async function createCalendarEventAction(formData: FormData) {
  const returnPath = getSafeReturnPath(formData.get("returnPath"));
  const payload = createEventSchema.safeParse({
    title: formData.get("title"),
    eventMode: formData.get("eventMode"),
    eventDate: formData.get("eventDate"),
    eventTime: formData.get("eventTime"),
    eventType: formData.get("eventType"),
    objectiveId: formData.get("objectiveId"),
    details: formData.get("details")
  });

  if (!payload.success) {
    console.error("[createCalendarEventAction] Validation failed", payload.error.flatten());
    return { redirectTo: returnPath };
  }

  const { supabase, account } = await requireAppContext();
  const { error } = await supabase.from("calendar_events").insert({
    account_id: account.accountId,
    title: payload.data.title,
    event_date: payload.data.eventDate,
    event_time: payload.data.eventTime,
    event_type: payload.data.eventType,
    objective_id: normalizeOptionalId(payload.data.objectiveId),
    details: serializeCalendarEventDetails(payload.data.eventMode, payload.data.details)
  });

  if (error) {
    console.error("[createCalendarEventAction] Insert failed", error);
    return { redirectTo: returnPath };
  }

  revalidatePath("/events", "layout");
  return { redirectTo: returnPath };
}

export async function createCalendarEventFormAction(
  _prevState: RedirectResult | null,
  formData: FormData
): Promise<RedirectResult | null> {
  return createCalendarEventAction(formData);
}

export async function updateCalendarEventAction(formData: FormData) {
  const returnPath = getSafeReturnPath(formData.get("returnPath"));
  const payload = updateEventSchema.safeParse({
    eventId: formData.get("eventId"),
    title: formData.get("title"),
    eventMode: formData.get("eventMode"),
    eventDate: formData.get("eventDate"),
    eventTime: formData.get("eventTime"),
    eventType: formData.get("eventType"),
    objectiveId: formData.get("objectiveId"),
    details: formData.get("details")
  });

  if (!payload.success) {
    return { redirectTo: returnPath };
  }

  const { supabase, account } = await requireAppContext();
  const { error } = await supabase
    .from("calendar_events")
    .update({
      title: payload.data.title,
      event_date: payload.data.eventDate,
      event_time: payload.data.eventTime,
      event_type: payload.data.eventType,
      objective_id: normalizeOptionalId(payload.data.objectiveId),
      details: serializeCalendarEventDetails(payload.data.eventMode, payload.data.details)
    })
    .eq("id", payload.data.eventId)
    .eq("account_id", account.accountId);

  if (error) {
    return { redirectTo: returnPath };
  }

  revalidatePath("/events", "layout");
  return { redirectTo: returnPath };
}

export async function toggleCalendarEventDoneAction(formData: FormData) {
  const returnPath = getSafeReturnPath(formData.get("returnPath"));
  const payload = toggleEventDoneSchema.safeParse({
    eventId: formData.get("eventId"),
    completed: formData.get("completed"),
    doneOn: formData.get("doneOn"),
    doneMinutes: formData.get("doneMinutes")
  });

  if (!payload.success) {
    return { redirectTo: returnPath };
  }

  const { supabase, account } = await requireAppContext();
  const { data: event } = await supabase
    .from("calendar_events")
    .select("id, title, event_date, objective_id, habit_id, habit_session_id")
    .eq("account_id", account.accountId)
    .eq("id", payload.data.eventId)
    .maybeSingle();

  if (!event) {
    return { redirectTo: returnPath };
  }

  if (payload.data.completed === "false") {
    if (event.habit_session_id) {
      await supabase
        .from("habit_sessions")
        .update({ completed: false, actual_minutes: null })
        .eq("id", event.habit_session_id);
    }

    await supabase
      .from("calendar_events")
      .update({ completed_at: null, completed_on: null })
      .eq("account_id", account.accountId)
      .eq("id", event.id);

    revalidatePath("/events", "layout");
    revalidatePath("/habits", "layout");
    return { redirectTo: returnPath };
  }

  const sessionDate = event.event_date ?? (payload.data.doneOn === "" || !payload.data.doneOn ? todayIso() : payload.data.doneOn);

  if (!event.objective_id) {
    await supabase
      .from("calendar_events")
      .update({
        completed_at: new Date().toISOString(),
        completed_on: sessionDate
      })
      .eq("account_id", account.accountId)
      .eq("id", event.id);

    revalidatePath("/events", "layout");
    return { redirectTo: returnPath };
  }

  const { data: objective } = await supabase
    .from("habit_objectives")
    .select("id, measurement_mode")
    .eq("account_id", account.accountId)
    .eq("id", event.objective_id)
    .maybeSingle();

  if (!objective) {
    return { redirectTo: returnPath };
  }

  let habitId = event.habit_id;
  if (!habitId) {
    const { data: existingHabit } = await supabase
      .from("habits")
      .select("id")
      .eq("account_id", account.accountId)
      .eq("objective_id", objective.id)
      .eq("title", event.title ?? "Calendar task")
      .maybeSingle();

    if (existingHabit?.id) {
      habitId = existingHabit.id;
    } else {
      const { data: newHabit } = await supabase
        .from("habits")
        .insert({
          account_id: account.accountId,
          objective_id: objective.id,
          title: event.title ?? "Calendar task",
          type: objective.measurement_mode === "quantitative" ? "time_tracking" : "fixed_protocol",
          weekly_target_minutes: null,
          minimum_minutes: 0,
          is_active: true,
          metadata: { source: "calendar" }
        })
        .select("id")
        .single();
      habitId = newHabit?.id ?? null;
    }
  }

  if (!habitId) {
    return { redirectTo: returnPath };
  }

  const actualMinutes =
    payload.data.doneMinutes === "" || typeof payload.data.doneMinutes === "undefined"
      ? 0
      : payload.data.doneMinutes;

  const { data: session } = await supabase
    .from("habit_sessions")
    .upsert(
      {
        habit_id: habitId,
        session_date: sessionDate,
        planned_minutes: 0,
        minimum_minutes: 0,
        actual_minutes: objective.measurement_mode === "quantitative" ? actualMinutes : 0,
        completed: true,
        notes: `Calendar: ${event.title ?? "Task"}`
      },
      { onConflict: "habit_id,session_date" }
    )
    .select("id")
    .single();

  await supabase
    .from("calendar_events")
    .update({
      habit_id: habitId,
      habit_session_id: session?.id ?? event.habit_session_id,
      completed_at: new Date().toISOString(),
      completed_on: sessionDate
    })
    .eq("account_id", account.accountId)
    .eq("id", event.id);

  revalidatePath("/events", "layout");
  revalidatePath("/habits", "layout");
  revalidatePath("/analytics", "layout");
  return { redirectTo: returnPath };
}

export async function toggleCalendarEventDoneFormAction(
  _prevState: RedirectResult | null,
  formData: FormData
): Promise<RedirectResult | null> {
  return toggleCalendarEventDoneAction(formData);
}

export async function updateCalendarEventFormAction(
  _prevState: RedirectResult | null,
  formData: FormData
): Promise<RedirectResult | null> {
  return updateCalendarEventAction(formData);
}

export async function deleteCalendarEventAction(formData: FormData) {
  const returnPath = getSafeReturnPath(formData.get("returnPath"));
  const payload = deleteEventSchema.safeParse({
    eventId: formData.get("eventId")
  });

  if (!payload.success) {
    return { redirectTo: returnPath };
  }

  const { supabase, account } = await requireAppContext();
  await supabase
    .from("calendar_events")
    .delete()
    .eq("id", payload.data.eventId)
    .eq("account_id", account.accountId);

  revalidatePath("/events", "layout");
  return { redirectTo: returnPath };
}

export async function deleteCalendarEventFormAction(
  _prevState: RedirectResult | null,
  formData: FormData
): Promise<RedirectResult | null> {
  return deleteCalendarEventAction(formData);
}
