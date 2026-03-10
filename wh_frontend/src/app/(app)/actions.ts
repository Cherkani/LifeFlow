"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import type { RedirectResult } from "@/lib/action-with-state";
import { requireAppContext } from "@/lib/server-context";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const profileSchema = z.object({
  fullName: z.string().trim().min(2, "Full name is too short").max(120),
  timezone: z.string().trim().min(2).max(100)
});

export async function signOutAction() {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut({ scope: "global" });
  redirect("/login");
}

export async function updateProfileAction(formData: FormData) {
  const payload = profileSchema.safeParse({
    fullName: formData.get("fullName"),
    timezone: formData.get("timezone")
  });

  if (!payload.success) {
    return { redirectTo: `/settings?error=${encodeURIComponent(payload.error.issues[0]?.message ?? "Invalid profile data")}` };
  }

  const { supabase, user } = await requireAppContext();
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: payload.data.fullName, timezone: payload.data.timezone })
    .eq("id", user.id);

  if (error) {
    return { redirectTo: `/settings?error=${encodeURIComponent(error.message)}` };
  }

  revalidatePath("/settings");
  return { redirectTo: "/settings?success=profile-updated" };
}

export async function updateProfileFormAction(
  _prevState: RedirectResult | null,
  formData: FormData
): Promise<RedirectResult | null> {
  return updateProfileAction(formData);
}
