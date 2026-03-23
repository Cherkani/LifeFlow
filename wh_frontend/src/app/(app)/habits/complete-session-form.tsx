"use client";

import Link from "next/link";
import type { Route } from "next";
import { useRef, useState } from "react";
import { Trash2 } from "lucide-react";

import { completeSessionWithHoursFormAction, deleteSessionAction } from "@/app/(app)/habits/actions";
import { ActionForm } from "@/components/forms/action-form";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/forms/submit-button";

type SessionSummary = {
  id: string;
  habit_id: string;
  planned_minutes: number;
  minimum_minutes: number;
  actual_minutes: number | null;
  completed: boolean;
};

const backButtonClass =
  "inline-flex h-10 items-center justify-center rounded-lg border border-[var(--app-panel-border)] bg-[var(--app-btn-secondary-bg)] px-4 py-2 text-sm font-medium text-[var(--app-btn-secondary-fg)] transition hover:bg-[var(--app-btn-secondary-hover)]";

export function CompleteSessionForm({
  session,
  returnPath,
  habitTitle,
  onClose
}: {
  session: SessionSummary;
  returnPath: string;
  habitTitle: string;
  onClose?: () => void;
}) {
  const [checked, setChecked] = useState(session.completed);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const deleteFormRef = useRef<HTMLFormElement>(null);

  return (
    <div className="space-y-4">
      <ActionForm action={completeSessionWithHoursFormAction} className="space-y-4" onSuccess={onClose}>
        <input type="hidden" name="sessionId" value={session.id} />
        <input type="hidden" name="returnPath" value={returnPath} />
        <div className="rounded-lg border border-[var(--app-panel-border)] bg-[var(--app-panel-bg-soft)] p-3">
          <p className="text-sm font-semibold text-[var(--app-text-strong)]">{habitTitle}</p>
          <p className="text-xs text-[var(--app-text-muted)]">
            Planned {session.planned_minutes} min · Minimum {session.minimum_minutes} min
          </p>
        </div>
        <label className="inline-flex items-center gap-2 text-sm text-[var(--app-text-strong)]">
          <Checkbox name="completed" checked={checked} onChange={(event) => setChecked(event.target.checked)} />
          Mark completed
        </label>
        {checked ? (
          <div className="space-y-2">
            <p className="text-xs font-medium text-[var(--app-text-muted)]">Minutes done</p>
            <Input
              name="actualMinutes"
              type="number"
              min={0}
              defaultValue={session.actual_minutes ?? session.minimum_minutes}
              placeholder="0"
            />
          </div>
        ) : null}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <SubmitButton label="Save" pendingLabel="Saving..." className="sm:w-auto" />
            {onClose ? (
              <button type="button" onClick={onClose} className={backButtonClass}>
                Back
              </button>
            ) : (
              <Link href={returnPath as Route} className={backButtonClass}>
                Back
              </Link>
            )}
          </div>
          <button
            type="button"
            aria-label="Delete task"
            title="Delete task"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--app-panel-border)] bg-[var(--ui-badge-danger-bg)] text-[var(--ui-badge-danger-fg)] transition hover:brightness-95"
            onClick={() => {
              setShowDeleteConfirm(true);
            }}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </ActionForm>
      {showDeleteConfirm ? (
        <div className="rounded-lg border border-[var(--app-panel-border)] bg-[var(--app-panel-bg-soft)] p-3">
          <p className="text-sm font-semibold text-[var(--app-text-strong)]">Delete this task?</p>
          <p className="mt-1 text-xs text-[var(--app-text-muted)]">This will remove the task from this day and cannot be undone.</p>
          <div className="mt-3 flex items-center justify-end gap-2">
            <button
              type="button"
              className={backButtonClass}
              onClick={() => {
                setShowDeleteConfirm(false);
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              className="inline-flex h-10 items-center justify-center rounded-lg border border-[var(--app-panel-border)] bg-[var(--ui-badge-danger-bg)] px-4 py-2 text-sm font-medium text-[var(--ui-badge-danger-fg)] transition hover:brightness-95"
              onClick={() => {
                deleteFormRef.current?.requestSubmit();
              }}
            >
              Delete
            </button>
          </div>
        </div>
      ) : null}
      <form
        ref={deleteFormRef}
        action={async (formData) => {
          await deleteSessionAction(formData);
          onClose?.();
        }}
        className="hidden"
      >
        <input type="hidden" name="sessionId" value={session.id} />
        <input type="hidden" name="returnPath" value={returnPath} />
      </form>
    </div>
  );
}
