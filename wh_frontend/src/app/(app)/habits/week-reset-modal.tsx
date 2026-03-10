"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";

import { ActionForm } from "@/components/forms/action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import type { RedirectResult } from "@/lib/action-with-state";
import { ModalShell } from "@/components/ui/modal-shell";
import { Select } from "@/components/ui/select";

type Template = { id: string; name: string };

type WeekResetModalProps = {
  templates: Template[];
  currentTemplateId: string;
  currentTemplateName: string;
  weekStartDate: string;
  returnPath: string;
  changeTemplateAction: (prevState: RedirectResult | null, formData: FormData) => Promise<RedirectResult | null>;
  resetSameTemplateAction: (prevState: RedirectResult | null, formData: FormData) => Promise<RedirectResult | null>;
};

export function WeekResetModal({
  templates,
  currentTemplateId,
  currentTemplateName,
  weekStartDate,
  returnPath,
  changeTemplateAction,
  resetSameTemplateAction
}: WeekResetModalProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-md border border-[#c7d3e8] bg-white px-3 py-1.5 text-xs font-medium text-[#4a5f83] transition hover:bg-[#edf3ff] hover:text-[#23406d]"
      >
        <RotateCcw size={14} />
        Reset
      </button>

      {open ? (
        <ModalShell
          title="Reset or change template"
          description="Choose how to update this week. Both options will clear all logged tasks for the week."
          onClose={() => setOpen(false)}
        >
          <div className="space-y-6">
            <div className="rounded-lg border border-[#d7e0f1] bg-white p-4 space-y-3">
              <h3 className="text-sm font-semibold text-[#0c1d3c]">Change template</h3>
              <p className="text-xs text-[#4a5f83]">
                Switch to a different template. The week will be regenerated with tasks from the new template.
              </p>
              <ActionForm action={changeTemplateAction} className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <input type="hidden" name="returnPath" value={returnPath} />
                <input type="hidden" name="weekStartDate" value={weekStartDate} />
                <div className="flex-1 space-y-1">
                  <label htmlFor="reset-template-select" className="sr-only">Select template</label>
                  <Select id="reset-template-select" name="templateId" required defaultValue={currentTemplateId}>
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </Select>
                </div>
                <SubmitButton label="Change template" pendingLabel="Updating..." className="sm:w-auto" />
              </ActionForm>
            </div>

            <div className="rounded-lg border border-[#d7e0f1] bg-white p-4 space-y-3">
              <h3 className="text-sm font-semibold text-[#0c1d3c]">Reset to current template</h3>
              <p className="text-xs text-[#4a5f83]">
                Keep &quot;{currentTemplateName}&quot; but clear all logged tasks and regenerate the week from scratch.
              </p>
              <ActionForm action={resetSameTemplateAction} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <input type="hidden" name="returnPath" value={returnPath} />
                <input type="hidden" name="weekStartDate" value={weekStartDate} />
                <SubmitButton
                  label="Reset to current template"
                  pendingLabel="Resetting..."
                  className="bg-[#92400e] text-white hover:bg-[#78350f] sm:w-auto"
                />
              </ActionForm>
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="w-full rounded-lg border border-[#c7d3e8] bg-white px-4 py-2.5 text-sm font-semibold text-[#23406d] transition hover:bg-[#edf3ff]"
            >
              Cancel
            </button>
          </div>
        </ModalShell>
      ) : null}
    </>
  );
}
