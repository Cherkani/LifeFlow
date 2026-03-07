"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { createServerSupabaseClient } from "@/lib/supabase/server";

const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters")
});

const signUpSchema = loginSchema.extend({
  fullName: z.string().trim().min(2, "Full name is required").max(120),
  timezone: z.string().trim().min(2, "Timezone is required").max(100),
  accountName: z.string().trim().min(2, "Account name is required").max(120)
});

export async function loginAction(formData: FormData) {
  const payload = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password")
  });

  if (!payload.success) {
    redirect(`/login?error=${encodeURIComponent(payload.error.issues[0]?.message ?? "Invalid credentials")}`);
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword(payload.data);

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  await supabase.rpc("update_my_last_signed_in");
  redirect("/dashboard");
}

export async function signUpAction(formData: FormData) {
  const payload = signUpSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    fullName: formData.get("fullName"),
    timezone: formData.get("timezone"),
    accountName: formData.get("accountName")
  });

  if (!payload.success) {
    redirect(`/signup?error=${encodeURIComponent(payload.error.issues[0]?.message ?? "Invalid signup data")}`);
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.signUp({
    email: payload.data.email,
    password: payload.data.password,
    options: {
      data: {
        full_name: payload.data.fullName,
        timezone: payload.data.timezone,
        account_name: payload.data.accountName
      }
    }
  });

  if (error) {
    redirect(`/signup?error=${encodeURIComponent(error.message)}`);
  }

  if (!data.session) {
    redirect("/login?success=signup-created");
  }

  redirect("/dashboard");
}

export async function forgotPasswordAction(formData: FormData) {
  const email = formData.get("email");
  if (!email || typeof email !== "string") {
    redirect(`/forgot-password?error=${encodeURIComponent("Email is required")}`);
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/reset-password`
  });

  if (error) {
    redirect(`/forgot-password?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/forgot-password?success=email-sent");
}

export async function resetPasswordAction(formData: FormData) {
  const password = formData.get("password");
  const confirmPassword = formData.get("confirmPassword");

  if (!password || typeof password !== "string") {
    redirect(`/reset-password?error=${encodeURIComponent("Password is required")}`);
  }
  if (password !== confirmPassword) {
    redirect(`/reset-password?error=${encodeURIComponent("Passwords do not match")}`);
  }
  if (password.length < 8) {
    redirect(`/reset-password?error=${encodeURIComponent("Password must be at least 8 characters")}`);
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    redirect(`/reset-password?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/login?success=password-reset");
}
