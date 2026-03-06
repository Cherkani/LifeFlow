"use server";

import { revalidatePath } from "next/cache";
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

export async function createTemplateAction(formData: FormData) {
  const payload = createTemplateSchema.safeParse({
    name: formData.get("name")
  });

  if (!payload.success) {
    return;
  }

  const { supabase, account } = await requireAppContext();

  await supabase.from("templates").insert({
    account_id: account.accountId,
    name: payload.data.name
  });

  revalidatePath("/planning");
}

export async function createTemplateEntryAction(formData: FormData) {
  const payload = createTemplateEntrySchema.safeParse({
    templateId: formData.get("templateId"),
    habitId: formData.get("habitId"),
    dayOfWeek: formData.get("dayOfWeek"),
    plannedMinutes: formData.get("plannedMinutes"),
    minimumMinutes: formData.get("minimumMinutes"),
    isRequired: formData.get("isRequired")
  });

  if (!payload.success) {
    return;
  }

  const { supabase } = await requireAppContext();

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
}

export async function generateWeekAction(formData: FormData) {
  const payload = generateWeekSchema.safeParse({
    templateId: formData.get("templateId"),
    weekStartDate: formData.get("weekStartDate")
  });

  if (!payload.success) {
    return;
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
}
