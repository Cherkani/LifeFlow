import type { Supabase } from "./types";

export type CalendarEventRow = {
  id: string;
  title: string | null;
  details: string | null;
  event_date: string | null;
  event_time: string | null;
  event_type: string;
  objective_id: string | null;
  habit_id: string | null;
  habit_session_id: string | null;
  completed_at: string | null;
  completed_on: string | null;
};

export async function getCalendarEvents(
  supabase: Supabase,
  accountId: string,
  monthStart: string,
  monthEnd: string
): Promise<CalendarEventRow[]> {
  const { data } = await supabase
    .from("calendar_events")
    .select("id, title, details, event_date, event_time, event_type, objective_id, habit_id, habit_session_id, completed_at, completed_on")
    .eq("account_id", accountId)
    .gte("event_date", monthStart)
    .lte("event_date", monthEnd)
    .order("event_date", { ascending: true });
  return (data ?? []) as CalendarEventRow[];
}

export async function getCalendarUndatedEvents(
  supabase: Supabase,
  accountId: string
): Promise<CalendarEventRow[]> {
  const { data } = await supabase
    .from("calendar_events")
    .select("id, title, details, event_date, event_time, event_type, objective_id, habit_id, habit_session_id, completed_at, completed_on")
    .eq("account_id", accountId)
    .is("event_date", null)
    .order("created_at", { ascending: true });
  return (data ?? []) as CalendarEventRow[];
}
