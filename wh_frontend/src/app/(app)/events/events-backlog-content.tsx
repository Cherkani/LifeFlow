"use client";

import { useMemo } from "react";
import { ListTodo } from "lucide-react";

import { EventsAddBacklog } from "./events-add-backlog";
import { EventsList } from "./events-list";

type CalendarEvent = {
  id: string;
  title: string;
  details: string | null;
  event_date: string | null;
  event_time: string | null;
  event_type: string;
};

type EventsBacklogContentProps = {
  backlogEvents: CalendarEvent[];
  monthKey: string;
  selectedIso: string;
  eventTypes: string[];
};

export function EventsBacklogContent({ backlogEvents, monthKey, selectedIso, eventTypes }: EventsBacklogContentProps) {
  const uniqueTypes = useMemo(() => Array.from(new Set(eventTypes.map((type) => type.trim()).filter(Boolean))), [eventTypes]);
  const groupedBacklogEvents = useMemo(() => {
    const groups = new Map<string, CalendarEvent[]>();
    for (const event of backlogEvents) {
      const key = event.event_type.trim() || "Uncategorized";
      const existing = groups.get(key) ?? [];
      existing.push(event);
      groups.set(key, existing);
    }

    return Array.from(groups.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([type, events]) => ({
        type,
        events
      }));
  }, [backlogEvents]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <h2 className="flex items-center gap-2 text-4xl font-semibold text-[#0c1d3c]">
            <ListTodo size={24} className="text-[#1e3a6d]" />
            <span>Backlog</span>
          </h2>
          <p className="max-w-2xl text-sm text-[#4a5f83]">
            Undated meetings and important items live here so you can review them in one stacked list, then schedule them
            later when you are ready.
          </p>
        </div>
        <EventsAddBacklog monthKey={monthKey} selectedIso={selectedIso} view="backlog" eventTypes={uniqueTypes} />
      </div>

      {groupedBacklogEvents.length > 0 ? (
        <div className="space-y-4">
          {groupedBacklogEvents.map((group) => (
            <section
              key={group.type}
              className="space-y-3 rounded-2xl border border-[var(--app-panel-border)] bg-[var(--app-panel-bg-soft)] p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold text-[var(--app-text-strong)]">{group.type}</h3>
                  <p className="text-xs text-[var(--app-text-muted)]">
                    {group.events.length} item{group.events.length !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>

              <EventsList
                events={group.events}
                monthKey={monthKey}
                selectedIso={selectedIso}
                view="backlog"
                eventTypes={uniqueTypes}
              />
            </section>
          ))}
        </div>
      ) : (
        <EventsList
          events={backlogEvents}
          monthKey={monthKey}
          selectedIso={selectedIso}
          view="backlog"
          eventTypes={uniqueTypes}
          emptyMessage="No backlog to-dos yet."
        />
      )}
    </div>
  );
}
