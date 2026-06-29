"use client";

import { useState } from "react";
import { CirclePlus } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";

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
  objectives: Array<{ id: string; title: string; measurement_mode: "quantitative" | "qualitative" }>;
};

function buildEventsHref(month: string, date: string, modal?: string) {
  const query = new URLSearchParams();
  query.set("month", month);
  query.set("date", date);
  if (modal) query.set("modal", modal);
  return `/events?${query.toString()}`;
}

export function EventsAddEvent({ monthKey, selectedIso, objectives }: EventsAddEventProps) {
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
        <ModalShell title="Add Calendar Event" description="Schedule an event or objective-linked to-do." onClose={() => setIsOpen(false)}>
          <ActionForm
            action={createCalendarEventFormAction}
            className="space-y-4"
            onSuccess={() => setIsOpen(false)}
            refreshOnly
          >
            <input type="hidden" name="returnPath" value={closeModalHref} />
            <input type="hidden" name="eventType" value="General" />
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
                <Label htmlFor="eventMode">Mode</Label>
                <Select id="eventMode" name="eventMode" defaultValue="event">
                  <option value="event">Event · informational</option>
                  <option value="todo">To-do · should be done</option>
                  <option value="milestone">Milestone · important marker</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="eventDate">Date</Label>
                <Input id="eventDate" name="eventDate" type="date" defaultValue={selectedIso} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="eventTime">Time (optional)</Label>
                <Input id="eventTime" name="eventTime" type="time" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="objectiveId">Objective (for to-dos and milestones)</Label>
                {objectives.length > 0 ? (
                  <Select id="objectiveId" name="objectiveId" defaultValue="">
                    <option value="">No objective</option>
                    {objectives.map((objective) => (
                      <option key={objective.id} value={objective.id}>
                        {objective.title} · {objective.measurement_mode}
                      </option>
                    ))}
                  </Select>
                ) : (
                  <p className="rounded-lg border border-[#d7e0f1] bg-[#f8fafc] p-3 text-sm text-[#4a5f83]">
                    No objectives yet. Create one in{" "}
                    <Link href={"/planning" as Route} className="font-semibold text-[#23406d] underline">
                      Planner
                    </Link>{" "}
                    to sync calendar to-dos into Execution.
                  </p>
                )}
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
