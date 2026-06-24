"use client";

import { useState } from "react";
import { CirclePlus } from "lucide-react";

import { createCalendarEventFormAction } from "@/app/(app)/events/actions";
import { ActionForm } from "@/components/forms/action-form";
import { useCurrentLifeContext } from "@/components/life/current-life-context";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ModalShell } from "@/components/ui/modal-shell";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/forms/submit-button";
import { EventsTypeField } from "./events-type-field";

type EventsAddEventProps = {
  monthKey: string;
  selectedIso: string;
  eventTypes: string[];
  lifePhases: Array<{ id: string; title: string }>;
  lifeProjects: Array<{ id: string; name: string }>;
};

function buildEventsHref(month: string, date: string, modal?: string) {
  const query = new URLSearchParams();
  query.set("month", month);
  query.set("date", date);
  if (modal) query.set("modal", modal);
  return `/events?${query.toString()}`;
}

export function EventsAddEvent({ monthKey, selectedIso, eventTypes, lifePhases, lifeProjects }: EventsAddEventProps) {
  const { activePhaseId, activeProjectId } = useCurrentLifeContext();
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
        <ModalShell title="Add Calendar Event" description="Add any dated event with your own custom type." onClose={() => setIsOpen(false)}>
          <ActionForm
            action={createCalendarEventFormAction}
            className="space-y-4"
            onSuccess={() => setIsOpen(false)}
            refreshOnly
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
                <Label htmlFor="eventTime">Time (optional)</Label>
                <Input id="eventTime" name="eventTime" type="time" />
              </div>
              <div className="sm:col-span-2">
                <EventsTypeField fieldId="eventType" name="eventType" savedTypes={eventTypes} defaultValue={eventTypes[0] ?? "General"} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="eventDetails">Details (optional)</Label>
              <Textarea id="eventDetails" name="details" placeholder="Add context or location." />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="eventPhaseId">Life phase</Label>
                <select key={`event-phase-${activePhaseId}`} id="eventPhaseId" name="phaseId" defaultValue={activePhaseId ?? ""} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="">No phase</option>
                  {lifePhases.map((phase) => (
                    <option key={phase.id} value={phase.id}>{phase.title}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="eventProjectId">Project</Label>
                <select key={`event-project-${activeProjectId}`} id="eventProjectId" name="projectId" defaultValue={activeProjectId ?? ""} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="">No project</option>
                  {lifeProjects.map((project) => (
                    <option key={project.id} value={project.id}>{project.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <SubmitButton label="Save event" pendingLabel="Saving..." className="w-full sm:w-auto" />
          </ActionForm>
        </ModalShell>
      ) : null}
    </>
  );
}
