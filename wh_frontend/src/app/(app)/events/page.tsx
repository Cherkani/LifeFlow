import { CalendarDays, ChevronLeft, ChevronRight, CirclePlus, Star } from "lucide-react";

import { createCalendarEventAction } from "@/app/(app)/events/actions";
import { SubmitButton } from "@/components/forms/submit-button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ModalShell } from "@/components/ui/modal-shell";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { requireAppContext } from "@/lib/server-context";

type EventsSearchParams = Promise<{
  month?: string;
  date?: string;
  modal?: string;
}>;

type CalendarEvent = {
  id: string;
  title: string;
  details: string | null;
  event_date: string;
  event_type: "meeting" | "important" | "general";
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

function buildEventsHref(month: string, date: string, modal?: string) {
  const query = new URLSearchParams();
  query.set("month", month);
  query.set("date", date);
  if (modal) query.set("modal", modal);
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
  const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
  const monthKey = `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, "0")}`;
  const prevMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() - 1, 1);
  const nextMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1);
  const prevMonthKey = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, "0")}`;
  const nextMonthKey = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, "0")}`;
  const selectedIso = formatDateKey(selectedDate);

  const { supabase, account } = await requireAppContext();
  const eventsRes = await supabase
    .from("calendar_events")
    .select("id, title, details, event_date, event_type")
    .eq("account_id", account.accountId)
    .gte("event_date", formatDateKey(monthStart))
    .lte("event_date", formatDateKey(monthEnd))
    .order("event_date", { ascending: true });
  const events = (eventsRes.data ?? []) as CalendarEvent[];

  const eventsByDate = new Map<string, CalendarEvent[]>();
  for (const event of events) {
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
  const isModalOpen = params.modal === "new-event";
  const closeModalHref = buildEventsHref(monthKey, selectedIso);

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-2 py-6">
          <h1 className="text-5xl font-bold tracking-tight text-[#0c1d3c]">Calendar</h1>
          <p className="text-lg text-[#4a5f83]">Add meetings and important items directly to your calendar.</p>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
        <Card>
          <CardContent className="space-y-5 py-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-4xl font-semibold text-[#0c1d3c]">Important Dates Calendar</h2>
              <a
                href={buildEventsHref(monthKey, selectedIso, "new-event")}
                className="inline-flex items-center gap-2 rounded-lg border border-[#c7d3e8] bg-[#edf3ff] px-3 py-2 text-sm font-semibold text-[#23406d] transition hover:bg-[#e3ebf9]"
              >
                <CirclePlus size={16} />
                Add Event
              </a>
            </div>

            <div className="rounded-lg border border-[#d7e0f1] bg-[#eef3fb] p-4">
              <div className="mb-3 flex items-center justify-between">
                <a
                  href={buildEventsHref(prevMonthKey, selectedIso)}
                  className="inline-flex size-8 items-center justify-center rounded-md border border-[#d7e0f1] text-[#4a5f83] hover:bg-[#e3ebf9]"
                >
                  <ChevronLeft size={16} />
                </a>
                <p className="text-sm font-semibold text-[#0c1d3c]">
                  {monthStart.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                </p>
                <a
                  href={buildEventsHref(nextMonthKey, selectedIso)}
                  className="inline-flex size-8 items-center justify-center rounded-md border border-[#d7e0f1] text-[#4a5f83] hover:bg-[#e3ebf9]"
                >
                  <ChevronRight size={16} />
                </a>
              </div>

              <div className="grid grid-cols-7 gap-2 text-center text-sm">
                {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((label) => (
                  <span key={label} className="pb-1 font-medium text-[#4a5f83]">
                    {label}
                  </span>
                ))}

                {calendarDays.map((day) => (
                  <a
                    key={day.iso}
                    href={buildEventsHref(monthKey, day.iso)}
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
                  </a>
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
            <h2 className="flex items-center gap-2 text-4xl font-semibold text-[#0c1d3c]">
              <CalendarDays size={24} className="text-[#c38f4f]" />
              Events for {formatLongDate(selectedDate)}
            </h2>

            {selectedEvents.length > 0 ? (
              <ul className="space-y-2">
                {selectedEvents.map((event) => (
                  <li key={event.id} className="space-y-1 rounded-lg bg-[#eef3fb] px-3 py-2 text-sm text-[#4a5f83]">
                    <div className="flex items-center gap-2">
                      <Star size={14} className="text-[#d17035]" />
                      <span className="font-semibold text-[#0c1d3c]">{event.title}</span>
                      <span className="rounded-full bg-[#edf3ff] px-2 py-0.5 text-xs font-semibold text-[#23406d]">{event.event_type}</span>
                    </div>
                    {event.details ? <p className="text-xs text-[#4a5f83]">{event.details}</p> : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-lg bg-[#eef3fb] p-3 text-sm text-[#4a5f83]">No events scheduled for this day.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {isModalOpen ? (
        <ModalShell title="Add Calendar Event" description="Meeting or important note." closeHref={closeModalHref}>
          <form action={createCalendarEventAction} className="space-y-4">
            <input type="hidden" name="returnPath" value={closeModalHref} />
            <div className="space-y-2">
              <Label htmlFor="eventTitle">Title</Label>
              <Input id="eventTitle" name="title" required placeholder="e.g. Team meeting, Visa renewal, Doctor appointment" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="eventDate">Date</Label>
                <Input id="eventDate" name="eventDate" type="date" defaultValue={selectedIso} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="eventType">Type</Label>
                <Select id="eventType" name="eventType" defaultValue="important">
                  <option value="important">Important</option>
                  <option value="meeting">Meeting</option>
                  <option value="general">General</option>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="eventDetails">Details (optional)</Label>
              <Textarea id="eventDetails" name="details" placeholder="Add context or location." />
            </div>
            <SubmitButton label="Save event" pendingLabel="Saving..." className="w-full sm:w-auto" />
          </form>
        </ModalShell>
      ) : null}
    </div>
  );
}
