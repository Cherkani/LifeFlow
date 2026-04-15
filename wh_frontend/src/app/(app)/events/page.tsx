import type { Route } from "next";
import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight, ListTodo } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { getCalendarEventTypeUsage, getCalendarEventTypes, getCalendarEvents, getCalendarUndatedEvents } from "@/lib/queries";
import { requireAppContext } from "@/lib/server-context";

import { EventsAddEvent } from "./events-add-event";
import { EventsBacklogContent } from "./events-backlog-content";
import { EventsList } from "./events-list";
import { EventsTypesContent } from "./events-types-content";

export const dynamic = "force-dynamic";

type EventsSearchParams = Promise<{
  month?: string;
  date?: string;
  view?: string;
}>;

type CalendarEvent = {
  id: string;
  title: string;
  details: string | null;
  event_date: string | null;
  event_time: string | null;
  event_type: string;
};

function isIsoDate(value: string | undefined) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseMonth(monthRaw: string | undefined, fallbackDate: Date) {
  if (typeof monthRaw === "string" && /^\d{4}-\d{2}$/.test(monthRaw)) {
    const [year, month] = monthRaw.split("-").map(Number);
    return new Date(year, month - 1, 1);
  }
  return new Date(fallbackDate.getFullYear(), fallbackDate.getMonth(), 1);
}

function ordinal(day: number) {
  if (day % 10 === 1 && day % 100 !== 11) return `${day}st`;
  if (day % 10 === 2 && day % 100 !== 12) return `${day}nd`;
  if (day % 10 === 3 && day % 100 !== 13) return `${day}rd`;
  return `${day}th`;
}

function formatLongDate(date: Date) {
  const month = date.toLocaleDateString("en-US", { month: "long" });
  return `${month} ${ordinal(date.getDate())}, ${date.getFullYear()}`;
}

function buildEventsHref(month: string, date: string, view: "scheduled" | "backlog" | "types" = "scheduled") {
  const query = new URLSearchParams();
  query.set("month", month);
  query.set("date", date);
  query.set("view", view);
  return `/events?${query.toString()}`;
}

export default async function EventsPage({
  searchParams
}: {
  searchParams: EventsSearchParams;
}) {
  const params = await searchParams;
  const today = new Date();
  const selectedDate = isIsoDate(params.date) ? new Date(`${params.date}T00:00:00`) : new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const monthDate = parseMonth(params.month, selectedDate);
  const activeView = params.view === "backlog" || params.view === "types" ? params.view : "scheduled";
  const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
  const monthKey = `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, "0")}`;
  const prevMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() - 1, 1);
  const nextMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1);
  const prevMonthKey = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, "0")}`;
  const nextMonthKey = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, "0")}`;
  const selectedIso = formatDateKey(selectedDate);

  const { supabase, account } = await requireAppContext();
  const events = (await getCalendarEvents(
    supabase,
    account.accountId,
    formatDateKey(monthStart),
    formatDateKey(monthEnd)
  )) as CalendarEvent[];
  const backlogEvents = (await getCalendarUndatedEvents(supabase, account.accountId)) as CalendarEvent[];
  const eventTypeRows = await getCalendarEventTypes(supabase, account.accountId);
  const eventTypeUsageRows = await getCalendarEventTypeUsage(supabase, account.accountId);
  const eventTypes = eventTypeRows.map((type) => type.name);
  const eventTypeUsage = new Map<string, number>();
  for (const row of eventTypeUsageRows) {
    const key = row.event_type.trim();
    if (!key) continue;
    eventTypeUsage.set(key, (eventTypeUsage.get(key) ?? 0) + 1);
  }
  const eventTypesWithUsage = eventTypeRows.map((type) => ({
    id: type.id,
    name: type.name,
    usageCount: eventTypeUsage.get(type.name.trim()) ?? 0
  }));

  const eventsByDate = new Map<string, CalendarEvent[]>();
  for (const event of events) {
    if (!event.event_date) continue;
    const existing = eventsByDate.get(event.event_date) ?? [];
    existing.push(event);
    eventsByDate.set(event.event_date, existing);
  }

  const firstGridDate = new Date(monthStart);
  firstGridDate.setDate(monthStart.getDate() - monthStart.getDay());
  const calendarDays = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(firstGridDate);
    date.setDate(firstGridDate.getDate() + index);
    const iso = formatDateKey(date);
    return {
      date,
      iso,
      inCurrentMonth: date.getMonth() === monthStart.getMonth(),
      isSelected: iso === selectedIso,
      hasEvent: eventsByDate.has(iso)
    };
  });

  const selectedEvents = eventsByDate.get(selectedIso) ?? [];
  const selectedDateLabel = formatLongDate(selectedDate);

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-2 py-6">
          <h1 className="text-5xl font-bold tracking-tight text-[#0c1d3c]">Calendar</h1>
          <p className="text-lg text-[#4a5f83]">Add meetings and important items directly to your calendar.</p>
          <div className="pt-2">
            <div className="inline-flex rounded-xl border border-[var(--app-panel-border)] bg-[var(--app-panel-bg-soft)] p-1">
              <Link
                href={buildEventsHref(monthKey, selectedIso, "scheduled") as Route}
                className={[
                  "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors",
                  activeView === "scheduled"
                    ? "bg-[var(--app-btn-primary-bg)] text-[var(--app-btn-primary-fg)] shadow-sm"
                    : "text-[var(--app-btn-secondary-fg)] hover:bg-[var(--app-btn-secondary-bg)]"
                ].join(" ")}
              >
                <CalendarDays size={16} />
                Scheduled
              </Link>
              <Link
                href={buildEventsHref(monthKey, selectedIso, "backlog") as Route}
                className={[
                  "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors",
                  activeView === "backlog"
                    ? "bg-[var(--app-btn-primary-bg)] text-[var(--app-btn-primary-fg)] shadow-sm"
                    : "text-[var(--app-btn-secondary-fg)] hover:bg-[var(--app-btn-secondary-bg)]"
                ].join(" ")}
              >
                <ListTodo size={16} />
                Backlog
              </Link>
              <Link
                href={buildEventsHref(monthKey, selectedIso, "types") as Route}
                className={[
                  "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors",
                  activeView === "types"
                    ? "bg-[var(--app-btn-primary-bg)] text-[var(--app-btn-primary-fg)] shadow-sm"
                    : "text-[var(--app-btn-secondary-fg)] hover:bg-[var(--app-btn-secondary-bg)]"
                ].join(" ")}
              >
                Types
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      {activeView === "scheduled" ? (
        <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
          <Card>
            <CardContent className="space-y-5 py-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-4xl font-semibold text-[#0c1d3c]">Important Dates Calendar</h2>
                <EventsAddEvent monthKey={monthKey} selectedIso={selectedIso} eventTypes={eventTypes} />
              </div>

              <div className="rounded-lg border border-[#d7e0f1] bg-[#eef3fb] p-4">
                <div className="mb-3 flex items-center justify-between">
                  <Link
                    href={buildEventsHref(prevMonthKey, selectedIso, activeView) as Route}
                    className="inline-flex size-8 items-center justify-center rounded-md border border-[#d7e0f1] text-[#4a5f83] hover:bg-[#e3ebf9]"
                  >
                    <ChevronLeft size={16} />
                  </Link>
                  <p className="text-sm font-semibold text-[#0c1d3c]">
                    {monthStart.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                  </p>
                  <Link
                    href={buildEventsHref(nextMonthKey, selectedIso, activeView) as Route}
                    className="inline-flex size-8 items-center justify-center rounded-md border border-[#d7e0f1] text-[#4a5f83] hover:bg-[#e3ebf9]"
                  >
                    <ChevronRight size={16} />
                  </Link>
                </div>

                <div className="grid grid-cols-7 gap-2 text-center text-sm">
                  {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((label) => (
                    <span key={label} className="pb-1 font-medium text-[#4a5f83]">
                      {label}
                    </span>
                  ))}

                  {calendarDays.map((day) => (
                    <Link
                      key={day.iso}
                      href={buildEventsHref(monthKey, day.iso, activeView) as Route}
                      className={[
                        "grid h-10 place-items-center rounded-md border text-sm font-medium transition",
                        day.inCurrentMonth ? "text-[#0c1d3c]" : "text-[#8aa0c2]",
                        day.isSelected
                          ? "border-[#0b1f3b] bg-[#0b1f3b] text-white"
                          : day.hasEvent
                            ? "border-[#c38f4f] bg-[#fff1d6]"
                            : "border-transparent hover:bg-[#e3ebf9]"
                      ].join(" ")}
                    >
                      {day.date.getDate()}
                    </Link>
                  ))}
                </div>

                <div className="mt-4 flex items-center gap-2 text-sm text-[#4a5f83]">
                  <span className="size-2.5 rounded-full bg-[#c38f4f]" />
                  Day has events
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-4 py-6">
              <div className="space-y-2">
                <h2 className="flex items-center gap-2 text-4xl font-semibold text-[#0c1d3c]">
                  <CalendarDays size={24} className="text-[#c38f4f]" />
                  <span className="flex flex-col leading-tight">
                    <span>Events for</span>
                    <span>{selectedDateLabel}</span>
                  </span>
                </h2>
                <p className="text-sm text-[#4a5f83]">
                  See everything scheduled for this day so you can plan around your existing commitments.
                </p>
              </div>
              <EventsList
                events={selectedEvents}
                monthKey={monthKey}
                selectedIso={selectedIso}
                view="scheduled"
                eventTypes={eventTypes}
              />
            </CardContent>
          </Card>
        </div>
      ) : activeView === "backlog" ? (
        <Card>
          <CardContent className="space-y-5 py-6">
            <EventsBacklogContent
              backlogEvents={backlogEvents}
              monthKey={monthKey}
              selectedIso={selectedIso}
              eventTypes={eventTypes}
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="space-y-5 py-6">
            <EventsTypesContent monthKey={monthKey} selectedIso={selectedIso} eventTypes={eventTypesWithUsage} />
          </CardContent>
        </Card>
      )}

    </div>
  );
}
