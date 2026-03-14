"use client";

import { useState } from "react";
import { CirclePlus } from "lucide-react";

import { logPeriodFormAction } from "./actions";
import { ActionForm } from "@/components/forms/action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ModalShell } from "@/components/ui/modal-shell";

type CycleAddPeriodProps = {
  selectedIso: string;
};

function addDays(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function CycleAddPeriod({ selectedIso }: CycleAddPeriodProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [includeEndDate, setIncludeEndDate] = useState(false);
  const defaultEnd = addDays(selectedIso, 5);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-[#c7d3e8] bg-[#edf3ff] px-2.5 py-1.5 text-xs font-semibold text-[#23406d] transition hover:bg-[#e3ebf9] sm:gap-2 sm:px-3 sm:py-2 sm:text-sm"
      >
        <CirclePlus size={16} />
        Log period
      </button>

      {isOpen ? (
        <ModalShell
          title="Log period"
          description="Record when your period started. You can add the end date later when it finishes."
          onClose={() => {
            setIsOpen(false);
            setIncludeEndDate(false);
          }}
        >
          <ActionForm
            action={logPeriodFormAction}
            className="space-y-4"
            onSuccess={() => {
              setIsOpen(false);
              setIncludeEndDate(false);
            }}
            refreshOnly
          >
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="periodStart">Start date</Label>
                <Input
                  id="periodStart"
                  name="periodStart"
                  type="date"
                  defaultValue={selectedIso}
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
              {includeEndDate && (
                <div className="space-y-2">
                  <Label htmlFor="periodEnd">End date</Label>
                  <Input
                    id="periodEnd"
                    name="periodEnd"
                    type="date"
                    defaultValue={defaultEnd}
                  />
                </div>
              )}
            </div>
            <SubmitButton label="Save period" pendingLabel="Saving..." className="w-full sm:w-auto" />
          </ActionForm>
        </ModalShell>
      ) : null}
    </>
  );
}
