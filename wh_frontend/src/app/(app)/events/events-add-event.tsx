"use client";

import { useState } from "react";
import { CirclePlus } from "lucide-react";

import { createCalendarEventFormAction } from "@/app/(app)/events/actions";
import { ActionForm } from "@/components/forms/action-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ModalShell } from "@/components/ui/modal-shell";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/forms/submit-button";

type EventsAddEventProps = {
  monthKey: string;
  selectedIso: string;
};

function buildEventsHref(month: string, date: string, modal?: string) {
  const query = new URLSearchParams();
  query.set("month", month);
  query.set("date", date);
  if (modal) query.set("modal", modal);
  return `/events?${query.toString()}`;
}

export function EventsAddEvent({ monthKey, selectedIso }: EventsAddEventProps) {
  const [isOpen, setIsOpen] = useState(false);
  const closeModalHref = buildEventsHref(monthKey, selectedIso);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg border border-[#c7d3e8] bg-[#edf3ff] px-3 py-2 text-sm font-semibold text-[#23406d] transition hover:bg-[#e3ebf9]"
      >
        <CirclePlus size={16} />
        Add Event
      </button>

      {isOpen ? (
        <ModalShell title="Add Calendar Event" description="Meeting or important note." onClose={() => setIsOpen(false)}>
          <ActionForm
            action={createCalendarEventFormAction}
            className="space-y-4"
            onSuccess={() => setIsOpen(false)}
          >
            <input type="hidden" name="returnPath" value={closeModalHref} />
            <div className="space-y-2">
              <Label htmlFor="eventTitle">Title</Label>
              <Input
                id="eventTitle"
                name="title"
                required
                placeholder="e.g. Team meeting, Visa renewal, Doctor appointment"
              />
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
          </ActionForm>
        </ModalShell>
      ) : null}
    </>
  );
}
