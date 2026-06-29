"use client";

import { useState } from "react";
import { CheckCircle2, Circle, Pencil, Star, Trash2 } from "lucide-react";

import {
  deleteCalendarEventFormAction,
  toggleCalendarEventDoneFormAction,
  updateCalendarEventFormAction
} from "@/app/(app)/events/actions";
import { ActionForm } from "@/components/forms/action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ModalShell } from "@/components/ui/modal-shell";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  getCalendarEventModeLabel,
  parseCalendarEventDetails
} from "@/lib/calendar-event-mode";

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

type EventsListProps = {
  events: CalendarEvent[];
  monthKey: string;
  selectedIso: string;
  view?: "scheduled" | "backlog";
  emptyMessage?: string;
  objectives: Array<{ id: string; title: string; measurement_mode: "quantitative" | "qualitative" }>;
};

function formatTime(time: string) {
  const [h, m] = time.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${m} ${ampm}`;
}

function buildEventsHref(month: string, date: string, view: "scheduled" | "backlog" = "scheduled") {
  const query = new URLSearchParams();
  query.set("month", month);
  query.set("date", date);
  query.set("view", view);
  return `/events?${query.toString()}`;
}

export function EventsList({
  events,
  monthKey,
  selectedIso,
  view = "scheduled",
  emptyMessage,
  objectives
}: EventsListProps) {
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [deletingEvent, setDeletingEvent] = useState<CalendarEvent | null>(null);
  const returnPath = buildEventsHref(monthKey, selectedIso, view);
  const fallbackEmptyMessage = emptyMessage ?? "No events scheduled for this day.";
  const objectiveById = new Map(objectives.map((objective) => [objective.id, objective]));

  return (
    <>
      {events.length > 0 ? (
        <ul className="space-y-2">
          {events.map((event) => (
            (() => {
              const parsed = parseCalendarEventDetails(event.details);
              return (
                <li
                  key={event.id}
                  className="group flex items-start justify-between gap-2 rounded-lg bg-[#eef3fb] px-3 py-2 text-sm text-[#4a5f83]"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Star size={14} className="shrink-0 text-[#d17035]" />
                      <span className="font-semibold text-[#0c1d3c]">{event.title}</span>
                      {event.event_time ? (
                        <span className="shrink-0 text-xs text-[#4a5f83]">{formatTime(event.event_time)}</span>
                      ) : null}
                      <span className="shrink-0 rounded-full bg-[#edf3ff] px-2 py-0.5 text-xs font-semibold text-[#23406d]">
                        {event.objective_id ? objectiveById.get(event.objective_id)?.title ?? "Objective" : "No objective"}
                      </span>
                      <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-[#475569]">
                        {getCalendarEventModeLabel(parsed.mode)}
                      </span>
                      {event.completed_at ? (
                        <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                          Done
                        </span>
                      ) : null}
                    </div>
                    {parsed.details ? <p className="text-xs text-[#4a5f83]">{parsed.details}</p> : null}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {parsed.mode !== "event" ? (
                      <ActionForm action={toggleCalendarEventDoneFormAction} className="inline" refreshOnly>
                        <input type="hidden" name="returnPath" value={returnPath} />
                        <input type="hidden" name="eventId" value={event.id} />
                        <input type="hidden" name="completed" value={event.completed_at ? "false" : "true"} />
                        <input type="hidden" name="doneOn" value={event.event_date ?? selectedIso} />
                        {!event.completed_at && objectiveById.get(event.objective_id ?? "")?.measurement_mode === "quantitative" ? (
                          <input
                            name="doneMinutes"
                            type="number"
                            min={0}
                            step={1}
                            placeholder="min"
                            className="h-7 w-14 rounded-md border border-[#c7d3e8] bg-white px-2 text-xs text-[#0c1d3c]"
                            aria-label="Done minutes"
                          />
                        ) : null}
                        <button
                          type="submit"
                          aria-label={event.completed_at ? "Mark not done" : "Mark done"}
                          className={[
                            "inline-flex size-7 items-center justify-center rounded-md transition",
                            event.completed_at
                              ? "text-emerald-700 hover:bg-emerald-100"
                              : "text-[#4a5f83] hover:bg-[#e3ebf9] hover:text-[#0c1d3c]"
                          ].join(" ")}
                        >
                          {event.completed_at ? <CheckCircle2 size={14} /> : <Circle size={14} />}
                        </button>
                      </ActionForm>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => setEditingEvent(event)}
                      aria-label="Edit event"
                      className="inline-flex size-7 items-center justify-center rounded-md text-[#4a5f83] hover:bg-[#e3ebf9] hover:text-[#0c1d3c]"
                    >
                      <Pencil size={12} />
                    </button>
                    <ActionForm action={deleteCalendarEventFormAction} className="inline" refreshOnly>
                      <input type="hidden" name="returnPath" value={returnPath} />
                      <input type="hidden" name="eventId" value={event.id} />
                      <button
                        type="button"
                        aria-label="Delete event"
                        onClick={() => setDeletingEvent(event)}
                        className="inline-flex size-7 items-center justify-center rounded-md text-[#b91c1c] hover:bg-[#fee2e2]"
                      >
                        <Trash2 size={12} />
                      </button>
                    </ActionForm>
                  </div>
                </li>
              );
            })()
          ))}
        </ul>
      ) : (
        <p className="rounded-lg bg-[#eef3fb] p-3 text-sm text-[#4a5f83]">{fallbackEmptyMessage}</p>
      )}

      {editingEvent ? (
        (() => {
          const parsed = parseCalendarEventDetails(editingEvent.details);
          return (
        <ModalShell
          title="Edit Calendar Event"
          description="Update title, date, objective, or details."
          onClose={() => setEditingEvent(null)}
        >
          <ActionForm
            action={updateCalendarEventFormAction}
            className="space-y-4"
            onSuccess={() => setEditingEvent(null)}
            refreshOnly
          >
            <input type="hidden" name="returnPath" value={returnPath} />
            <input type="hidden" name="eventId" value={editingEvent.id} />
            <input type="hidden" name="eventType" value="General" />
            <div className="space-y-2">
              <Label htmlFor="editEventTitle">Title</Label>
              <Input
                id="editEventTitle"
                name="title"
                required
                defaultValue={editingEvent.title}
                placeholder="e.g. Team meeting, Visa renewal"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="editEventMode">Mode</Label>
                <Select id="editEventMode" name="eventMode" defaultValue={parsed.mode}>
                  <option value="event">Event · informational</option>
                  <option value="todo">To-do · should be done</option>
                  <option value="milestone">Milestone · important marker</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="editEventDate">Date (optional)</Label>
                <Input
                  id="editEventDate"
                  name="eventDate"
                  type="date"
                  defaultValue={editingEvent.event_date ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editEventTime">Time (optional)</Label>
                <Input
                  id="editEventTime"
                  name="eventTime"
                  type="time"
                  defaultValue={editingEvent.event_time ?? ""}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="editObjectiveId">Objective (for to-dos and milestones)</Label>
                <Select id="editObjectiveId" name="objectiveId" defaultValue={editingEvent.objective_id ?? ""}>
                  <option value="">No objective</option>
                  {objectives.map((objective) => (
                    <option key={objective.id} value={objective.id}>
                      {objective.title} · {objective.measurement_mode}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="editEventDetails">Details (optional)</Label>
              <Textarea
              id="editEventDetails"
              name="details"
              defaultValue={parsed.details ?? ""}
              placeholder="Add context or location."
            />
            </div>
            <SubmitButton label="Save changes" pendingLabel="Saving..." className="w-full sm:w-auto" />
          </ActionForm>
        </ModalShell>
          );
        })()
      ) : null}

      {deletingEvent ? (
        <ModalShell
          title="Delete this event?"
          description="This action cannot be undone."
          onClose={() => setDeletingEvent(null)}
        >
          <ActionForm
            action={deleteCalendarEventFormAction}
            className="flex items-center justify-end gap-2"
            onSuccess={() => setDeletingEvent(null)}
            refreshOnly
          >
            <input type="hidden" name="returnPath" value={returnPath} />
            <input type="hidden" name="eventId" value={deletingEvent.id} />
            <button
              type="button"
              onClick={() => setDeletingEvent(null)}
              className="inline-flex h-10 items-center justify-center rounded-lg border border-[var(--app-panel-border)] bg-[var(--app-btn-secondary-bg)] px-4 py-2 text-sm font-medium text-[var(--app-btn-secondary-fg)] transition hover:bg-[var(--app-btn-secondary-hover)]"
            >
              Cancel
            </button>
            <SubmitButton
              label="Delete"
              pendingLabel="Deleting..."
              className="h-10 rounded-lg border border-[var(--app-panel-border)] bg-[var(--ui-badge-danger-bg)] px-4 py-2 text-sm font-medium text-[var(--ui-badge-danger-fg)] hover:brightness-95"
            />
          </ActionForm>
        </ModalShell>
      ) : null}
    </>
  );
}
