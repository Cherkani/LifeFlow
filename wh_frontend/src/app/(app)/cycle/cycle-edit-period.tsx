"use client";

import { useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { Droplet, Pencil } from "lucide-react";

import { updatePeriodFormAction } from "./actions";
import type { PeriodCycleRow } from "@/lib/queries/cycle";
import { ActionForm } from "@/components/forms/action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ModalShell } from "@/components/ui/modal-shell";

type CycleEditPeriodProps = {
  period: PeriodCycleRow;
  formattedRange: string;
  durationDays: number;
  periodHref: Route;
  /** When true, render only the edit button (e.g. for top bar when selected day is in a period) */
  buttonOnly?: boolean;
};

function addDays(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function CycleEditPeriod({
  period,
  formattedRange,
  durationDays,
  periodHref,
  buttonOnly = false
}: CycleEditPeriodProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [includeEndDate, setIncludeEndDate] = useState(!!period.period_end);
  const defaultEnd = period.period_end ?? addDays(period.period_start, 5);

  const editButton = (
    <button
      type="button"
      onClick={() => setIsOpen(true)}
      className={
        buttonOnly
          ? "inline-flex items-center gap-1.5 rounded-lg border border-[#c7d3e8] bg-[#edf3ff] px-2.5 py-1.5 text-xs font-semibold text-[#23406d] transition hover:bg-[#e3ebf9] sm:gap-2 sm:px-3 sm:py-2 sm:text-sm"
          : "shrink-0 rounded-lg border border-rose-200 bg-rose-50/80 p-1.5 text-rose-600 transition hover:bg-rose-100"
      }
      title={period.period_end ? "Edit period" : "Add end date"}
    >
      {buttonOnly ? (
        <>
          <Pencil size={16} />
          Edit period
        </>
      ) : (
        <Pencil size={14} />
      )}
    </button>
  );

  return (
    <>
      <div className="flex shrink-0 items-center gap-1.5">
        {!buttonOnly && (
          <Link
            href={periodHref}
            className="flex shrink-0 items-center gap-1.5 rounded-xl border border-rose-100 bg-gradient-to-r from-rose-50/80 to-pink-50/60 px-2.5 py-2 text-xs transition hover:border-rose-200 hover:from-rose-50 hover:to-pink-50 sm:gap-2 sm:px-3 sm:py-2.5 sm:text-sm"
          >
            <Droplet size={16} className="shrink-0 text-rose-600" />
            <div className="text-left">
              <span className="font-medium text-[#3a4868]">{formattedRange}</span>
              <span className="ml-1.5 text-xs text-rose-600/90">{durationDays}d</span>
            </div>
          </Link>
        )}
        {editButton}
      </div>
      {isOpen ? (
        <ModalShell
          title="Edit period"
          description="Update the start date and optionally add or change the end date."
          onClose={() => setIsOpen(false)}
        >
          <ActionForm
            action={updatePeriodFormAction}
            className="space-y-4"
            onSuccess={() => setIsOpen(false)}
            refreshOnly
          >
            <input type="hidden" name="periodId" value={period.id} />
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="periodStart">Start date</Label>
                <Input
                  id="periodStart"
                  name="periodStart"
                  type="date"
                  defaultValue={period.period_start}
                  required
                />
              </div>
              <label className="flex cursor-pointer items-center gap-2">
                <Checkbox
                  checked={includeEndDate}
                  onChange={(e) => setIncludeEndDate(e.target.checked)}
                />
                <span className="text-sm text-[#3a4868]">Add end date (period finished)</span>
              </label>
              {includeEndDate ? (
                <div className="space-y-2">
                  <Label htmlFor="periodEnd">End date</Label>
                  <Input
                    id="periodEnd"
                    name="periodEnd"
                    type="date"
                    defaultValue={defaultEnd}
                  />
                </div>
              ) : (
                <input type="hidden" name="periodEnd" value="" />
              )}
            </div>
            <SubmitButton label="Update period" pendingLabel="Updating..." className="w-full sm:w-auto" />
          </ActionForm>
        </ModalShell>
      ) : null}
    </>
  );
}
