"use client";

import { useState } from "react";
import { Pencil, Star, Trash2 } from "lucide-react";

import {
  deleteCalendarEventFormAction,
  updateCalendarEventFormAction
} from "@/app/(app)/events/actions";
import { ActionForm } from "@/components/forms/action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ModalShell } from "@/components/ui/modal-shell";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type CalendarEvent = {
  id: string;
  title: string;
  details: string | null;
  event_date: string | null;
  event_time: string | null;
  event_type: "meeting" | "important" | "general";
};

type EventsListProps = {
  events: CalendarEvent[];
  monthKey: string;
  selectedIso: string;
  emptyMessage?: string;
};

function formatTime(time: string) {
  const [h, m] = time.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${m} ${ampm}`;
}

function buildEventsHref(month: string, date: string) {
  const query = new URLSearchParams();
  query.set("month", month);
  query.set("date", date);
  return `/events?${query.toString()}`;
}

export function EventsList({ events, monthKey, selectedIso, emptyMessage }: EventsListProps) {
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [deletingEvent, setDeletingEvent] = useState<CalendarEvent | null>(null);
  const returnPath = buildEventsHref(monthKey, selectedIso);
  const fallbackEmptyMessage = emptyMessage ?? "No events scheduled for this day.";

  return (
    <>
      {events.length > 0 ? (
        <ul className="space-y-2">
          {events.map((event) => (
            <li
              key={event.id}
              className="group flex items-start justify-between gap-2 rounded-lg bg-[#eef3fb] px-3 py-2 text-sm text-[#4a5f83]"
            >
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <Star size={14} className="shrink-0 text-[#d17035]" />
                  <span className="font-semibold text-[#0c1d3c]">{event.title}</span>
                  {event.event_time ? (
                    <span className="shrink-0 text-xs text-[#4a5f83]">{formatTime(event.event_time)}</span>
                  ) : null}
                  <span className="shrink-0 rounded-full bg-[#edf3ff] px-2 py-0.5 text-xs font-semibold text-[#23406d]">
                    {event.event_type}
                  </span>
                </div>
                {event.details ? <p className="text-xs text-[#4a5f83]">{event.details}</p> : null}
              </div>
              <div className="flex shrink-0 items-center gap-1">
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
          ))}
        </ul>
      ) : (
        <p className="rounded-lg bg-[#eef3fb] p-3 text-sm text-[#4a5f83]">{fallbackEmptyMessage}</p>
      )}

      {editingEvent ? (
        <ModalShell
          title="Edit Calendar Event"
          description="Update title, date, type, or details."
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
                <Label htmlFor="editEventType">Type</Label>
                <Select id="editEventType" name="eventType" defaultValue={editingEvent.event_type}>
                  <option value="important">Important</option>
                  <option value="meeting">Meeting</option>
                  <option value="general">General</option>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="editEventDetails">Details (optional)</Label>
              <Textarea
                id="editEventDetails"
                name="details"
                defaultValue={editingEvent.details ?? ""}
                placeholder="Add context or location."
              />
            </div>
            <SubmitButton label="Save changes" pendingLabel="Saving..." className="w-full sm:w-auto" />
          </ActionForm>
        </ModalShell>
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
