import type { Supabase } from "./types";

export type ProfileRow = { full_name: string | null; email: string | null };

export async function getProfile(supabase: Supabase, userId: string): Promise<ProfileRow | null> {
  const { data } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", userId)
    .maybeSingle();
  return data as ProfileRow | null;
}

export type ProfileFullRow = ProfileRow & {
  timezone: string | null;
  role: "admin" | "user";
  is_active: boolean;
  created_at: string;
};

export async function getProfileFull(supabase: Supabase, userId: string): Promise<ProfileFullRow | null> {
  const { data } = await supabase
    .from("profiles")
    .select("full_name, email, timezone, role, is_active, created_at")
    .eq("id", userId)
    .maybeSingle();
  return data as ProfileFullRow | null;
}
