"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { RedirectResult } from "@/lib/action-with-state";
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
  eventDate: optionalDateSchema,
  eventTime: timeSchema,
  eventType: z.enum(["meeting", "important", "general"]),
  details: z.string().trim().max(1200).optional()
});

const updateEventSchema = z.object({
  eventId: z.string().uuid(),
  title: z.string().trim().min(2).max(180),
  eventDate: optionalDateSchema,
  eventTime: timeSchema,
  eventType: z.enum(["meeting", "important", "general"]),
  details: z.string().trim().max(1200).optional()
});

const deleteEventSchema = z.object({
  eventId: z.string().uuid()
});

function getSafeReturnPath(raw: FormDataEntryValue | null) {
  const value = typeof raw === "string" ? raw.trim() : "";
  return value.startsWith("/events") ? value : "/events";
}

export async function createCalendarEventAction(formData: FormData) {
  const returnPath = getSafeReturnPath(formData.get("returnPath"));
  const payload = createEventSchema.safeParse({
    title: formData.get("title"),
    eventDate: formData.get("eventDate"),
    eventTime: formData.get("eventTime"),
    eventType: formData.get("eventType"),
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
    details: payload.data.details?.trim() ? payload.data.details : null
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
    eventDate: formData.get("eventDate"),
    eventTime: formData.get("eventTime"),
    eventType: formData.get("eventType"),
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
      details: payload.data.details?.trim() ? payload.data.details : null
    })
    .eq("id", payload.data.eventId)
    .eq("account_id", account.accountId);

  if (error) {
    return { redirectTo: returnPath };
  }

  revalidatePath("/events", "layout");
  return { redirectTo: returnPath };
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
