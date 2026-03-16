import type { Supabase } from "./types";

export type CalendarEventRow = {
  id: string;
  title: string | null;
  details: string | null;
  event_date: string | null;
  event_time: string | null;
  event_type: string;
};

export async function getCalendarEvents(
  supabase: Supabase,
  accountId: string,
  monthStart: string,
  monthEnd: string
): Promise<CalendarEventRow[]> {
  const { data } = await supabase
    .from("calendar_events")
    .select("id, title, details, event_date, event_time, event_type")
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
    .select("id, title, details, event_date, event_time, event_type")
    .eq("account_id", accountId)
    .is("event_date", null)
    .order("created_at", { ascending: true });
  return (data ?? []) as CalendarEventRow[];
}
