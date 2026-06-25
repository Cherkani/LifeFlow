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
  eventType: z.string().trim().min(1).max(60),
  details: z.string().trim().max(1200).optional()
});

const updateEventSchema = z.object({
  eventId: z.string().uuid(),
  title: z.string().trim().min(2).max(180),
  eventDate: optionalDateSchema,
  eventTime: timeSchema,
  eventType: z.string().trim().min(1).max(60),
  details: z.string().trim().max(1200).optional()
});

const deleteEventSchema = z.object({
  eventId: z.string().uuid()
});

const createEventTypeSchema = z.object({
  typeName: z.string().trim().min(1).max(60)
});

const updateEventTypeSchema = z.object({
  typeId: z.string().uuid(),
  currentName: z.string().trim().min(1).max(60),
  typeName: z.string().trim().min(1).max(60)
});

const deleteEventTypeSchema = z.object({
  typeId: z.string().uuid(),
  typeName: z.string().trim().min(1).max(60)
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
  await supabase.from("calendar_event_types").upsert(
    {
      account_id: account.accountId,
      name: payload.data.eventType
    },
    { onConflict: "account_id,name" }
  );
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
  await supabase.from("calendar_event_types").upsert(
    {
      account_id: account.accountId,
      name: payload.data.eventType
    },
    { onConflict: "account_id,name" }
  );
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

export async function createCalendarEventTypeAction(formData: FormData) {
  const returnPath = getSafeReturnPath(formData.get("returnPath"));
  const payload = createEventTypeSchema.safeParse({
    typeName: formData.get("typeName")
  });

  if (!payload.success) {
    return { redirectTo: returnPath };
  }

  const { supabase, account } = await requireAppContext();
  await supabase.from("calendar_event_types").upsert(
    {
      account_id: account.accountId,
      name: payload.data.typeName
    },
    { onConflict: "account_id,name" }
  );

  revalidatePath("/events", "layout");
  return { redirectTo: returnPath };
}

export async function createCalendarEventTypeFormAction(
  _prevState: RedirectResult | null,
  formData: FormData
): Promise<RedirectResult | null> {
  return createCalendarEventTypeAction(formData);
}

export async function updateCalendarEventTypeAction(formData: FormData) {
  const returnPath = getSafeReturnPath(formData.get("returnPath"));
  const payload = updateEventTypeSchema.safeParse({
    typeId: formData.get("typeId"),
    currentName: formData.get("currentName"),
    typeName: formData.get("typeName")
  });

  if (!payload.success) {
    return { redirectTo: returnPath };
  }

  const { supabase, account } = await requireAppContext();
  const nextName = payload.data.typeName;
  const currentName = payload.data.currentName;

  const { error: typeError } = await supabase
    .from("calendar_event_types")
    .update({ name: nextName })
    .eq("id", payload.data.typeId)
    .eq("account_id", account.accountId);

  if (typeError) {
    return { redirectTo: returnPath };
  }

  if (currentName !== nextName) {
    await supabase
      .from("calendar_events")
      .update({ event_type: nextName })
      .eq("account_id", account.accountId)
      .eq("event_type", currentName);
  }

  revalidatePath("/events", "layout");
  return { redirectTo: returnPath };
}

export async function updateCalendarEventTypeFormAction(
  _prevState: RedirectResult | null,
  formData: FormData
): Promise<RedirectResult | null> {
  return updateCalendarEventTypeAction(formData);
}

export async function deleteCalendarEventTypeAction(formData: FormData) {
  const returnPath = getSafeReturnPath(formData.get("returnPath"));
  const payload = deleteEventTypeSchema.safeParse({
    typeId: formData.get("typeId"),
    typeName: formData.get("typeName")
  });

  if (!payload.success) {
    return { redirectTo: returnPath };
  }

  const { supabase, account } = await requireAppContext();
  const { count } = await supabase
    .from("calendar_events")
    .select("*", { count: "exact", head: true })
    .eq("account_id", account.accountId)
    .eq("event_type", payload.data.typeName);

  if ((count ?? 0) > 0) {
    return { redirectTo: returnPath };
  }

  await supabase
    .from("calendar_event_types")
    .delete()
    .eq("id", payload.data.typeId)
    .eq("account_id", account.accountId);

  revalidatePath("/events", "layout");
  return { redirectTo: returnPath };
}

export async function deleteCalendarEventTypeFormAction(
  _prevState: RedirectResult | null,
  formData: FormData
): Promise<RedirectResult | null> {
  return deleteCalendarEventTypeAction(formData);
}
