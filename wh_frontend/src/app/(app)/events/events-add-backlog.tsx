"use client";

import { useState } from "react";
import { ListPlus } from "lucide-react";

import { createCalendarEventFormAction } from "@/app/(app)/events/actions";
import { ActionForm } from "@/components/forms/action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ModalShell } from "@/components/ui/modal-shell";
import { Textarea } from "@/components/ui/textarea";
import { EventsTypeField } from "./events-type-field";

function buildEventsHref(month: string, date: string, view: "scheduled" | "backlog" = "scheduled") {
  const query = new URLSearchParams();
  query.set("month", month);
  query.set("date", date);
  query.set("view", view);
  return `/events?${query.toString()}`;
}

type EventsAddBacklogProps = {
  monthKey: string;
  selectedIso: string;
  view?: "scheduled" | "backlog";
  eventTypes?: string[];
};

export function EventsAddBacklog({ monthKey, selectedIso, view = "backlog", eventTypes = [] }: EventsAddBacklogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const returnPath = buildEventsHref(monthKey, selectedIso, view);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg border border-[#c7d3e8] bg-white px-3 py-2 text-sm font-semibold text-[#23406d] transition hover:bg-[#f5f8ff]"
      >
        <ListPlus size={16} />
        Add To-Do
      </button>

      {isOpen ? (
        <ModalShell
          title="Add Undated To-Do"
          description="Create a backlog item you can schedule later."
          onClose={() => setIsOpen(false)}
        >
          <ActionForm
            action={createCalendarEventFormAction}
            className="space-y-4"
            onSuccess={() => setIsOpen(false)}
            refreshOnly
          >
            <input type="hidden" name="returnPath" value={returnPath} />
            <input type="hidden" name="eventDate" value="" />
            <div className="space-y-2">
              <Label htmlFor="backlogTitle">Title</Label>
              <Input
                id="backlogTitle"
                name="title"
                required
                placeholder="e.g. Plan offsite agenda"
              />
            </div>
            <EventsTypeField fieldId="backlogType" name="eventType" savedTypes={eventTypes} defaultValue={eventTypes[0] ?? "General"} />
            <div className="space-y-2">
              <Label htmlFor="backlogDetails">Details (optional)</Label>
              <Textarea
                id="backlogDetails"
                name="details"
                placeholder="Add quick context or location."
              />
            </div>
            <SubmitButton label="Save to-do" pendingLabel="Saving..." className="w-full sm:w-auto" />
          </ActionForm>
        </ModalShell>
      ) : null}
    </>
  );
}
