"use client";

import Link from "next/link";
import type { Route } from "next";
import { useState } from "react";

import { completeSessionWithHoursFormAction } from "@/app/(app)/habits/actions";
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
  "inline-flex h-10 items-center justify-center rounded-lg border border-[#c7d3e8] bg-[#edf3ff] px-4 py-2 text-sm font-medium text-[#23406d] transition hover:bg-[#e3ebf9]";

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

  return (
    <ActionForm action={completeSessionWithHoursFormAction} className="space-y-4" onSuccess={onClose}>
      <input type="hidden" name="sessionId" value={session.id} />
      <input type="hidden" name="returnPath" value={returnPath} />
      <div className="rounded-lg border border-[#d7e0f1] bg-[#f8fbff] p-3">
        <p className="text-sm font-semibold text-[#0c1d3c]">{habitTitle}</p>
        <p className="text-xs text-[#4a5f83]">
          Planned {session.planned_minutes} min · Minimum {session.minimum_minutes} min
        </p>
      </div>
      <label className="inline-flex items-center gap-2 text-sm text-[#23406d]">
        <Checkbox name="completed" checked={checked} onChange={(event) => setChecked(event.target.checked)} />
        Mark completed
      </label>
      {checked ? (
        <div className="space-y-2">
          <p className="text-xs font-medium text-[#4a5f83]">Minutes done</p>
          <Input
            name="actualMinutes"
            type="number"
            min={0}
            defaultValue={session.actual_minutes ?? session.minimum_minutes}
            placeholder="0"
          />
        </div>
      ) : null}
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
    </ActionForm>
  );
}
