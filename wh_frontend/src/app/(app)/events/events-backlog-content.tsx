"use client";

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
  objective_id: string | null;
  habit_id: string | null;
  habit_session_id: string | null;
  completed_at: string | null;
  completed_on: string | null;
};

type EventsBacklogContentProps = {
  backlogEvents: CalendarEvent[];
  monthKey: string;
  selectedIso: string;
  objectives: Array<{ id: string; title: string; measurement_mode: "quantitative" | "qualitative" }>;
};

export function EventsBacklogContent({
  backlogEvents,
  monthKey,
  selectedIso,
  objectives
}: EventsBacklogContentProps) {
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
        <EventsAddBacklog monthKey={monthKey} selectedIso={selectedIso} view="backlog" objectives={objectives} />
      </div>

      <EventsList
        events={backlogEvents}
        monthKey={monthKey}
        selectedIso={selectedIso}
        view="backlog"
        objectives={objectives}
        emptyMessage="No backlog to-dos yet."
      />
    </div>
  );
}
