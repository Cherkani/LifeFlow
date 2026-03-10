"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { RedirectResult } from "@/lib/action-with-state";
import { requireAppContext } from "@/lib/server-context";

const createEventSchema = z.object({
  title: z.string().trim().min(2).max(180),
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
  eventType: z.enum(["meeting", "important", "general"]),
  details: z.string().trim().max(1200).optional()
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
    eventType: formData.get("eventType"),
    details: formData.get("details")
  });

  if (!payload.success) {
    return { redirectTo: returnPath };
  }

  const { supabase, account } = await requireAppContext();
  await supabase.from("calendar_events").insert({
    account_id: account.accountId,
    title: payload.data.title,
    event_date: payload.data.eventDate,
    event_type: payload.data.eventType,
    details: payload.data.details?.trim() ? payload.data.details : null
  });

  revalidatePath("/events");
  return { redirectTo: returnPath };
}

export async function createCalendarEventFormAction(
  _prevState: RedirectResult | null,
  formData: FormData
): Promise<RedirectResult | null> {
  return createCalendarEventAction(formData);
}
