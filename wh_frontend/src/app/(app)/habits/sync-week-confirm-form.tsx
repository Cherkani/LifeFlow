"use client";

import { FormHTMLAttributes, useState } from "react";

import { SubmitButton } from "@/components/forms/submit-button";
import { cn } from "@/lib/utils";

type SyncWeekConfirmFormProps = {
  action: FormHTMLAttributes<HTMLFormElement>["action"];
  returnPath: string;
  weekStartDate: string;
  className?: string;
};

export function SyncWeekConfirmForm({ action, returnPath, weekStartDate, className }: SyncWeekConfirmFormProps) {
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <>
      <div className={cn("flex items-center gap-2", className)}>
        <p className="text-[10px] text-[#92400e]">Need to reset?</p>
        <button
          type="button"
          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[#c7d3e8] bg-white text-[#92400e] transition hover:bg-[#fef3c7]"
          onClick={() => setShowConfirm(true)}
          aria-label="Reset week to template"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 7v6h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path
              d="M3 13 5 11a8 8 0 1 1 1.42 8.96"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
      {showConfirm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm space-y-4 rounded-2xl border border-[#d7e0f1] bg-white p-5 shadow-2xl">
            <div>
              <p className="text-sm font-semibold text-[#0c1d3c]">Reset week to template?</p>
              <p className="mt-1 text-xs text-[#4a5f83]">
                This deletes every logged task for the selected week and regenerates it from the template.
              </p>
            </div>
            <form action={action} className="flex flex-col gap-2 sm:flex-row">
              <input type="hidden" name="returnPath" value={returnPath} />
              <input type="hidden" name="weekStartDate" value={weekStartDate} />
              <button
                type="button"
                className="h-10 flex-1 rounded-lg border border-[#c7d3e8] bg-white px-4 text-sm font-semibold text-[#23406d] transition hover:bg-[#eef2ff]"
                onClick={() => setShowConfirm(false)}
              >
                Cancel
              </button>
              <SubmitButton
                label="Confirm reset"
                pendingLabel="Resetting..."
                className="h-10 flex-1 bg-[#92400e] text-sm text-white hover:bg-[#78350f]"
              />
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
