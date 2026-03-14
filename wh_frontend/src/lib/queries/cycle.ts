import type { Supabase } from "./types";

export type PeriodCycleRow = {
  id: string;
  user_id: string;
  period_start: string;
  period_end: string | null;
  created_at: string;
};

export type OvulationConfirmationRow = {
  id: string;
  user_id: string;
  confirmed_on: string;
  method: "opk" | "bbt" | "symptoms" | "monitoring" | "other" | null;
  notes: string | null;
  created_at: string;
};

export type PeriodDailyLogRow = {
  id: string;
  user_id: string;
  log_date: string;
  flow_intensity: "spotting" | "light" | "medium" | "heavy" | null;
  symptoms: string[];
  moods: string[];
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export async function getPeriodCycles(
  supabase: Supabase,
  userId: string,
  limit = 24
): Promise<PeriodCycleRow[]> {
  const { data } = await supabase
    .from("period_cycles")
    .select("id, user_id, period_start, period_end, created_at")
    .eq("user_id", userId)
    .order("period_start", { ascending: false })
    .limit(limit);
  return (data ?? []) as PeriodCycleRow[];
}

export async function getOvulationConfirmations(
  supabase: Supabase,
  userId: string,
  limit = 120
): Promise<OvulationConfirmationRow[]> {
  const { data } = await supabase
    .from("ovulation_confirmations")
    .select("id, user_id, confirmed_on, method, notes, created_at")
    .eq("user_id", userId)
    .order("confirmed_on", { ascending: false })
    .limit(limit);
  return (data ?? []) as OvulationConfirmationRow[];
}

export async function getPeriodDailyLogs(
  supabase: Supabase,
  userId: string,
  monthStart: string,
  monthEnd: string
): Promise<PeriodDailyLogRow[]> {
  const { data } = await supabase
    .from("period_daily_logs")
    .select("id, user_id, log_date, flow_intensity, symptoms, moods, notes, created_at, updated_at")
    .eq("user_id", userId)
    .gte("log_date", monthStart)
    .lte("log_date", monthEnd)
    .order("log_date", { ascending: true });
  return (data ?? []) as PeriodDailyLogRow[];
}
