import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export type AppAccount = {
  accountId: string;
  accountName: string;
  currencyCode: string;
  role: "owner" | "admin" | "member";
};

export async function requireUser() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return { supabase, user };
}

export async function getPrimaryAccountForUser(user: User) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("account_users")
    .select("account_id, role, accounts:accounts(id, name, currency_code)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error || !data || !data.accounts) {
    return null;
  }

  const account = Array.isArray(data.accounts) ? data.accounts[0] : data.accounts;

  if (!account) {
    return null;
  }

  return {
    accountId: data.account_id,
    accountName: account.name,
    currencyCode: account.currency_code,
    role: data.role
  } as AppAccount;
}

export async function requireAppContext() {
  const { supabase, user } = await requireUser();
  const account = await getPrimaryAccountForUser(user);

  if (!account) {
    redirect("/login?error=missing-account");
  }

  return { supabase, user, account };
}
