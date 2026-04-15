"use client";

import { useMemo, useState } from "react";
import { Pencil, Tags, Trash2 } from "lucide-react";

import {
  createCalendarEventTypeFormAction,
  deleteCalendarEventTypeFormAction,
  updateCalendarEventTypeFormAction
} from "@/app/(app)/events/actions";
import { ActionForm } from "@/components/forms/action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ModalShell } from "@/components/ui/modal-shell";

type EventsTypesContentProps = {
  monthKey: string;
  selectedIso: string;
  eventTypes: Array<{
    id: string;
    name: string;
    usageCount: number;
  }>;
};

function buildEventsHref(month: string, date: string, view: "scheduled" | "backlog" | "types" = "scheduled") {
  const query = new URLSearchParams();
  query.set("month", month);
  query.set("date", date);
  query.set("view", view);
  return `/events?${query.toString()}`;
}

export function EventsTypesContent({ monthKey, selectedIso, eventTypes }: EventsTypesContentProps) {
  const uniqueTypes = useMemo(
    () =>
      eventTypes
        .map((type) => ({
          ...type,
          name: type.name.trim()
        }))
        .filter((type) => type.name.length > 0),
    [eventTypes]
  );
  const returnPath = buildEventsHref(monthKey, selectedIso, "types");
  const [editingType, setEditingType] = useState<(typeof uniqueTypes)[number] | null>(null);
  const [deletingType, setDeletingType] = useState<(typeof uniqueTypes)[number] | null>(null);

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <h2 className="flex items-center gap-2 text-4xl font-semibold text-[#0c1d3c]">
          <Tags size={24} className="text-[#1e3a6d]" />
          <span>Types</span>
        </h2>
        <p className="max-w-2xl text-sm text-[#4a5f83]">
          Manage the types you want to reuse across backlog items and calendar events.
        </p>
      </div>

      <div className="rounded-2xl border border-[#d7e0f1] bg-[#eef3fb] p-4">
        <ActionForm action={createCalendarEventTypeFormAction} className="space-y-4" refreshOnly>
          <input type="hidden" name="returnPath" value={returnPath} />
          <div className="space-y-2">
            <Label htmlFor="newEventTypeName">Create a type</Label>
            <Input
              id="newEventTypeName"
              name="typeName"
              required
              placeholder="e.g. General, Cleanup, Content, Personal"
            />
          </div>
          <SubmitButton label="Save type" pendingLabel="Saving..." className="w-full sm:w-auto" />
        </ActionForm>
      </div>

      {uniqueTypes.length > 0 ? (
        <ul className="space-y-2">
          {uniqueTypes.map((type) => (
            <li
              key={type.id}
              className="flex items-center justify-between gap-3 rounded-lg bg-[#eef3fb] px-3 py-3 text-sm text-[#0c1d3c]"
            >
              <div className="min-w-0">
                <p className="font-semibold">{type.name}</p>
                <p className="text-xs text-[#4a5f83]">
                  {type.usageCount > 0 ? `${type.usageCount} linked item${type.usageCount > 1 ? "s" : ""}` : "Not linked to any item"}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setEditingType(type)}
                  aria-label={`Edit ${type.name}`}
                  className="inline-flex size-8 items-center justify-center rounded-md text-[#4a5f83] hover:bg-[#dfe8f7] hover:text-[#0c1d3c]"
                >
                  <Pencil size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setDeletingType(type)}
                  disabled={type.usageCount > 0}
                  aria-label={`Delete ${type.name}`}
                  className="inline-flex size-8 items-center justify-center rounded-md text-[#b91c1c] hover:bg-[#fee2e2] disabled:cursor-not-allowed disabled:text-[#c7a0a0] disabled:hover:bg-transparent"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-lg bg-[#eef3fb] p-3 text-sm text-[#4a5f83]">No saved types yet.</p>
      )}

      {editingType ? (
        <ModalShell
          title="Edit Type"
          description="Rename this type everywhere it is used."
          onClose={() => setEditingType(null)}
        >
          <ActionForm
            action={updateCalendarEventTypeFormAction}
            className="space-y-4"
            onSuccess={() => setEditingType(null)}
            refreshOnly
          >
            <input type="hidden" name="returnPath" value={returnPath} />
            <input type="hidden" name="typeId" value={editingType.id} />
            <input type="hidden" name="currentName" value={editingType.name} />
            <div className="space-y-2">
              <Label htmlFor="editTypeName">Type name</Label>
              <Input id="editTypeName" name="typeName" required defaultValue={editingType.name} />
            </div>
            <SubmitButton label="Save changes" pendingLabel="Saving..." className="w-full sm:w-auto" />
          </ActionForm>
        </ModalShell>
      ) : null}

      {deletingType ? (
        <ModalShell
          title="Delete Type?"
          description={
            deletingType.usageCount > 0
              ? "This type is still linked to items and cannot be deleted."
              : "Delete this type only if you no longer need it."
          }
          onClose={() => setDeletingType(null)}
        >
          {deletingType.usageCount > 0 ? (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setDeletingType(null)}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-[var(--app-panel-border)] bg-[var(--app-btn-secondary-bg)] px-4 py-2 text-sm font-medium text-[var(--app-btn-secondary-fg)] transition hover:bg-[var(--app-btn-secondary-hover)]"
              >
                Close
              </button>
            </div>
          ) : (
            <ActionForm
              action={deleteCalendarEventTypeFormAction}
              className="flex items-center justify-end gap-2"
              onSuccess={() => setDeletingType(null)}
              refreshOnly
            >
              <input type="hidden" name="returnPath" value={returnPath} />
              <input type="hidden" name="typeId" value={deletingType.id} />
              <input type="hidden" name="typeName" value={deletingType.name} />
              <button
                type="button"
                onClick={() => setDeletingType(null)}
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
          )}
        </ModalShell>
      ) : null}
    </div>
  );
}
