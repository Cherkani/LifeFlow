"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSupabaseEnv } from "@/lib/supabase/env";

const loginSchema = z.object({
  email: z.string().trim().email("Invalid email"),
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
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (serviceRoleKey) {
    const { url } = getSupabaseEnv();
    const admin = createClient(url, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const adminCreate = await admin.auth.admin.createUser({
      email: payload.data.email,
      password: payload.data.password,
      email_confirm: true,
      user_metadata: {
        full_name: payload.data.fullName,
        timezone: payload.data.timezone,
        account_name: payload.data.accountName
      }
    });

    if (adminCreate.error) {
      const adminError = adminCreate.error.message.toLowerCase();
      if (adminError.includes("already")) {
        redirect("/signup?error=Email already registered. Please sign in or reset your password.");
      }
      redirect(`/signup?error=${encodeURIComponent(adminCreate.error.message)}`);
    }

    const signInRes = await supabase.auth.signInWithPassword({
      email: payload.data.email,
      password: payload.data.password
    });

    if (signInRes.error) {
      redirect(`/login?error=${encodeURIComponent(signInRes.error.message)}`);
    }

    await supabase.rpc("update_my_last_signed_in");
    redirect("/dashboard");
  }

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
    redirect("/login?success=signup-created-check-email");
  }

  await supabase.rpc("update_my_last_signed_in");
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

function getSafeNextPath(raw: FormDataEntryValue | null) {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (value.startsWith("/")) {
    return value;
  }
  return "/dashboard";
}

async function resolveSiteUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL;
  }

  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const proto = requestHeaders.get("x-forwarded-proto") ?? "http";
  if (host) {
    return `${proto}://${host}`;
  }

  return "http://localhost:3000";
}

export async function signInWithGoogleAction(formData: FormData) {
  const nextPath = getSafeNextPath(formData.get("next"));
  const supabase = await createServerSupabaseClient();
  const siteUrl = await resolveSiteUrl();
  const redirectTo = `${siteUrl}/auth/callback?next=${encodeURIComponent(nextPath)}`;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo
    }
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  if (!data.url) {
    redirect(`/login?error=${encodeURIComponent("Could not start Google sign-in")}`);
  }

  redirect(data.url as Parameters<typeof redirect>[0]);
}

export async function loginDemoUserAction() {
  const email = process.env.DEMO_USER_EMAIL ?? "demo@lifeflow.app";
  const password = process.env.DEMO_USER_PASSWORD ?? "Demo12345!";
  const supabase = await createServerSupabaseClient();

  let activeUserId: string | null = null;
  const loginAttempt = await supabase.auth.signInWithPassword({ email, password });
  if (loginAttempt.data.user?.id) {
    activeUserId = loginAttempt.data.user.id;
  }

  if (loginAttempt.error) {
    const lower = loginAttempt.error.message.toLowerCase();
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (serviceRoleKey) {
      const { url } = getSupabaseEnv();
      const admin = createClient(url, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      });

      const adminCreate = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: "Momentum Core Demo",
          timezone: "Africa/Casablanca",
          account_name: "Momentum Core Demo"
        }
      });

      if (adminCreate.error && !adminCreate.error.message.toLowerCase().includes("already")) {
        redirect(`/login?error=${encodeURIComponent(adminCreate.error.message)}`);
      }

      const retryLogin = await supabase.auth.signInWithPassword({ email, password });
      if (retryLogin.error) {
        redirect(`/login?error=${encodeURIComponent(retryLogin.error.message)}`);
      }
      activeUserId = retryLogin.data.user?.id ?? null;
    } else if (lower.includes("invalid login credentials")) {
      const signUpAttempt = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: "Momentum Core Demo",
            timezone: "Africa/Casablanca",
            account_name: "Momentum Core Demo"
          }
        }
      });

      if (signUpAttempt.error) {
        const signupError = signUpAttempt.error.message.toLowerCase();
        if (signupError.includes("rate limit")) {
          redirect("/login?error=Demo signup rate limit exceeded. Add SUPABASE_SERVICE_ROLE_KEY on server to avoid email limits.");
        }
        if (!signupError.includes("already")) {
          redirect(`/login?error=${encodeURIComponent(signUpAttempt.error.message)}`);
        }
      }

      const retryLogin = await supabase.auth.signInWithPassword({ email, password });
      if (retryLogin.error) {
        const retryError = retryLogin.error.message.toLowerCase();
        if (retryError.includes("email not confirmed")) {
          redirect("/login?error=Demo user created but email is not confirmed. Add SUPABASE_SERVICE_ROLE_KEY on server to auto-confirm.");
        }
        redirect(`/login?error=${encodeURIComponent(retryLogin.error.message)}`);
      }
      activeUserId = retryLogin.data.user?.id ?? null;
    } else if (lower.includes("email not confirmed")) {
      redirect("/login?error=Demo user exists but email is not confirmed. Add SUPABASE_SERVICE_ROLE_KEY on server to auto-confirm.");
    } else if (lower.includes("rate limit")) {
      redirect("/login?error=Demo auth rate limit exceeded. Wait a moment or configure SUPABASE_SERVICE_ROLE_KEY.");
    } else {
      redirect(`/login?error=${encodeURIComponent(loginAttempt.error.message)}`);
    }
  }

  if (activeUserId) {
    await supabase.rpc("seed_demo_data_for_user", { p_user_id: activeUserId });
  }
  await supabase.rpc("update_my_last_signed_in");
  redirect("/dashboard");
}
