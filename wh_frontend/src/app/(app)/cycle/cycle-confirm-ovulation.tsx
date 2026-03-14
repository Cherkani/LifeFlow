"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";

import { confirmOvulationFormAction } from "./actions";
import { ActionForm } from "@/components/forms/action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { Label } from "@/components/ui/label";
import { ModalShell } from "@/components/ui/modal-shell";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { OVULATION_METHODS, OVULATION_METHOD_LABELS } from "@/lib/cycle-constants";

type CycleConfirmOvulationProps = {
  dateIso: string;
  dateLabel: string;
  existingMethod?: string | null;
  existingNotes?: string | null;
  children: React.ReactNode;
};

export function CycleConfirmOvulation({
  dateIso,
  dateLabel,
  existingMethod,
  existingNotes,
  children
}: CycleConfirmOvulationProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[#facc15] bg-[#fff7d6] px-3 py-2 text-sm font-semibold text-[#92400e] transition hover:bg-[#fde68a] sm:w-auto"
      >
        <Sparkles size={16} />
        {children}
      </button>

      {open ? (
        <ModalShell
          title={`Confirm ovulation for ${dateLabel}`}
          description="Log how you verified ovulation so predictions become more accurate."
          onClose={() => setOpen(false)}
        >
          <ActionForm
            action={confirmOvulationFormAction}
            className="space-y-4"
            onSuccess={() => setOpen(false)}
            refreshOnly
          >
            <input type="hidden" name="confirmDate" value={dateIso} />
            <div className="space-y-2">
              <Label htmlFor="method">Confirmation method</Label>
              <Select
                id="method"
                name="method"
                defaultValue={existingMethod ?? "other"}
                required
              >
                {OVULATION_METHODS.map((method) => (
                  <option key={method} value={method}>
                    {OVULATION_METHOD_LABELS[method]}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                name="notes"
                placeholder="Add OPK results, temperature shift, or monitoring notes..."
                defaultValue={existingNotes ?? ""}
                className="min-h-24"
              />
              <p className="text-xs text-slate-500">
                Helpful if your confirmation method or timing varies cycle to cycle.
              </p>
            </div>
            <SubmitButton label="Save confirmation" pendingLabel="Saving..." className="w-full sm:w-auto" />
          </ActionForm>
        </ModalShell>
      ) : null}
    </>
  );
}
