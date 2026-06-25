"use client";

import { useState } from "react";
import { CalendarDays, ListTodo } from "lucide-react";

import { EventsAddBacklog } from "@/app/(app)/events/events-add-backlog";
import { EventsList } from "@/app/(app)/events/events-list";

type CalendarEvent = {
  id: string;
  title: string;
  details: string | null;
  event_date: string | null;
  event_time: string | null;
  event_type: string;
};

type EventsSidePanelProps = {
  scheduledEvents: CalendarEvent[];
  backlogEvents: CalendarEvent[];
  monthKey: string;
  selectedIso: string;
  selectedDateLabel: string;
};

export function EventsSidePanel({
  scheduledEvents,
  backlogEvents,
  monthKey,
  selectedIso,
  selectedDateLabel
}: EventsSidePanelProps) {
  const [tab, setTab] = useState<"scheduled" | "backlog">("scheduled");
  const isBacklog = tab === "backlog";

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-4xl font-semibold text-[#0c1d3c]">
              {isBacklog ? (
                <>
                  <ListTodo size={24} className="text-[#1e3a6d]" />
                  <span>Undated To-Dos</span>
                </>
              ) : (
                <>
                  <CalendarDays size={24} className="text-[#c38f4f]" />
                  <span className="flex flex-col leading-tight">
                    <span>Events for</span>
                    <span>{selectedDateLabel}</span>
                  </span>
                </>
              )}
            </h2>
            {isBacklog ? (
              <div className="space-y-1 text-sm text-[#4a5f83]">
                <p>
                  Backlog to-dos live here without a date so you can quickly add ideas, then assign them to the calendar
                  later when you’re ready.
                </p>
                <p>Switch back to Scheduled to see your events on the calendar.</p>
              </div>
            ) : (
              <p className="text-sm text-[#4a5f83]">
                See everything scheduled for this day so you can plan around your existing commitments.
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-lg border border-[var(--app-panel-border)] bg-[var(--app-panel-bg-soft)] p-1">
              <button
                type="button"
                onClick={() => setTab("scheduled")}
                className={[
                  "rounded-md px-3 py-1.5 text-sm font-semibold transition-colors",
                  tab === "scheduled"
                    ? "bg-[var(--app-btn-primary-bg)] text-[var(--app-btn-primary-fg)] shadow-sm"
                    : "text-[var(--app-btn-secondary-fg)] hover:bg-[var(--app-btn-secondary-bg)]"
                ].join(" ")}
              >
                Scheduled
              </button>
              <button
                type="button"
                onClick={() => setTab("backlog")}
                className={[
                  "rounded-md px-3 py-1.5 text-sm font-semibold transition-colors",
                  tab === "backlog"
                    ? "bg-[var(--app-btn-primary-bg)] text-[var(--app-btn-primary-fg)] shadow-sm"
                    : "text-[var(--app-btn-secondary-fg)] hover:bg-[var(--app-btn-secondary-bg)]"
                ].join(" ")}
              >
                Backlog
              </button>
            </div>
            {isBacklog ? (
              <EventsAddBacklog monthKey={monthKey} selectedIso={selectedIso} />
            ) : null}
          </div>
        </div>
      </div>

      {isBacklog ? (
        <EventsList
          events={backlogEvents}
          monthKey={monthKey}
          selectedIso={selectedIso}
          emptyMessage="No backlog to-dos yet."
        />
      ) : (
        <EventsList
          events={scheduledEvents}
          monthKey={monthKey}
          selectedIso={selectedIso}
          emptyMessage="No events scheduled for this day."
        />
      )}
    </div>
  );
}
