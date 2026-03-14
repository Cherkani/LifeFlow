"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import type { RedirectResult } from "@/lib/action-with-state";
import { requireAppContext } from "@/lib/server-context";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const profileSchema = z.object({
  fullName: z.preprocess(
    (v) => (v == null ? "" : String(v).trim()),
    z.string().min(2, "Full name must be at least 2 characters").max(120)
  ),
  timezone: z.preprocess(
    (v) => (v == null ? "" : String(v).trim()),
    z.string().min(2, "Please select a timezone").max(100)
  ),
  cycleTrackingEnabled: z
    .union([z.literal("on"), z.literal("true"), z.null(), z.undefined()])
    .optional()
    .transform((v) => (v === "on" || v === "true")),
  lutealPhaseLength: z
    .preprocess((value) => {
      if (value == null || value === "") return undefined;
      const parsed = Number(value);
      return Number.isNaN(parsed) ? value : parsed;
    }, z.number().int("Luteal length must be whole days").min(8).max(20))
    .optional()
});

export async function signOutAction() {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut({ scope: "global" });
  redirect("/login");
}

export async function updateProfileAction(formData: FormData) {
  const payload = profileSchema.safeParse({
    fullName: formData.get("fullName"),
    timezone: formData.get("timezone"),
    cycleTrackingEnabled: formData.get("cycleTrackingEnabled"),
    lutealPhaseLength: formData.get("lutealPhaseLength")
  });

  if (!payload.success) {
    const first = payload.error.issues[0];
    const msg = first?.path?.length
      ? `${first.path.join(".")}: ${first.message}`
      : first?.message ?? "Invalid profile data";
    return { redirectTo: `/settings?error=${encodeURIComponent(msg)}` };
  }

  const { supabase, user } = await requireAppContext();
  const update: Record<string, unknown> = {
    full_name: payload.data.fullName,
    timezone: payload.data.timezone,
    cycle_tracking_enabled: payload.data.cycleTrackingEnabled ?? false,
    luteal_phase_length: payload.data.lutealPhaseLength ?? 14
  };

  const { error } = await supabase.from("profiles").update(update).eq("id", user.id);

  if (error) {
    const errMsg =
      (error.message || "Update failed") +
      (error.details ? ` (${error.details})` : "") +
      (error.hint ? ` [${error.hint}]` : "");
    return {
      redirectTo: `/settings?error=${encodeURIComponent(errMsg)}`
    };
  }

  revalidatePath("/settings");
  revalidatePath("/", "layout");
  return { redirectTo: "/settings?success=profile-updated&t=" + Date.now() };
}

export async function updateProfileFormAction(
  _prevState: RedirectResult | null,
  formData: FormData
): Promise<RedirectResult | null> {
  return updateProfileAction(formData);
}
