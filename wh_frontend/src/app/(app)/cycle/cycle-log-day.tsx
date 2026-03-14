"use client";

import { useEffect, useState } from "react";
import { PenLine } from "lucide-react";

import { upsertDailyLogFormAction } from "./actions";
import { ActionForm } from "@/components/forms/action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { Label } from "@/components/ui/label";
import { ModalShell } from "@/components/ui/modal-shell";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { MOOD_ICONS, MOOD_OPTIONS, SYMPTOM_ICONS } from "@/lib/cycle-constants";

const SYMPTOMS = [
  "cramps",
  "fatigue",
  "headache",
  "acne",
  "bloating",
  "mood swings",
  "tender breasts",
  "back pain"
];

type CycleLogDayProps = {
  dateIso: string;
  dateLabel: string;
  existingFlow?: string | null;
  existingSymptoms?: string[];
  existingMoods?: string[];
  existingNotes?: string | null;
  children: React.ReactNode;
};

export function CycleLogDay({
  dateIso,
  dateLabel,
  existingFlow,
  existingSymptoms = [],
  existingMoods = [],
  existingNotes,
  children
}: CycleLogDayProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedMoods, setSelectedMoods] = useState<string[]>(existingMoods);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>(existingSymptoms.map((symptom) => symptom.toLowerCase()));

  useEffect(() => {
    setSelectedMoods(existingMoods);
    setSelectedSymptoms(existingSymptoms.map((symptom) => symptom.toLowerCase()));
  }, [existingMoods, existingSymptoms]);

  function toggleMood(mood: string) {
    setSelectedMoods((prev) =>
      prev.includes(mood) ? prev.filter((item) => item !== mood) : [...prev, mood]
    );
  }

  function toggleSymptom(symptom: string) {
    const normalized = symptom.toLowerCase();
    setSelectedSymptoms((prev) =>
      prev.includes(normalized) ? prev.filter((item) => item !== normalized) : [...prev, normalized]
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[#c7d3e8] bg-[#edf3ff] px-3 py-2 text-sm font-semibold text-[#23406d] transition hover:bg-[#e3ebf9] sm:w-auto"
      >
        <PenLine size={16} />
        {children}
      </button>

      {isOpen ? (
        <ModalShell
          title={`Log for ${dateLabel}`}
          description="Record flow intensity, symptoms, moods, and notes."
          onClose={() => setIsOpen(false)}
        >
          <ActionForm
            action={upsertDailyLogFormAction}
            className="space-y-4"
            onSuccess={() => setIsOpen(false)}
            refreshOnly
          >
            <input type="hidden" name="logDate" value={dateIso} />
            <input type="hidden" name="moods" value={selectedMoods.join(",") || ""} />
            <input type="hidden" name="symptoms" value={selectedSymptoms.join(",") || ""} />
            <div className="space-y-2">
              <Label htmlFor="flowIntensity">Flow intensity</Label>
              <Select
                id="flowIntensity"
                name="flowIntensity"
                defaultValue={existingFlow ?? ""}
              >
                <option value="">None</option>
                <option value="spotting">Spotting</option>
                <option value="light">Light</option>
                <option value="medium">Medium</option>
                <option value="heavy">Heavy</option>
              </Select>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <Label>Symptoms</Label>
                <span className="text-xs uppercase tracking-wide text-slate-400">Tap to toggle</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {SYMPTOMS.map((symptom) => {
                  const normalized = symptom.toLowerCase();
                  const Icon = SYMPTOM_ICONS[normalized];
                  const isActive = selectedSymptoms.includes(normalized);
                  return (
                    <button
                      key={symptom}
                      type="button"
                      onClick={() => toggleSymptom(symptom)}
                      className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold capitalize transition ${
                        isActive
                          ? "border-[#5d66c7] bg-[#eef0ff] text-[#1c2271]"
                          : "border-[#d9dcf4] text-[#4b5278] hover:border-[#c1c6ea]"
                      }`}
                    >
                      {Icon ? <Icon size={14} className="text-[#6b73cf]" /> : null}
                      {symptom}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Today&apos;s mood</Label>
              <div className="flex flex-wrap gap-2">
                {MOOD_OPTIONS.map((mood) => {
                  const Icon = MOOD_ICONS[mood];
                  const isActive = selectedMoods.includes(mood);
                  return (
                    <button
                      key={mood}
                      type="button"
                      onClick={() => toggleMood(mood)}
                      className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold capitalize transition ${
                        isActive
                          ? "border-[#5d66c7] bg-[#eef0ff] text-[#1c2271]"
                          : "border-[#d9dcf4] text-[#4b5278] hover:border-[#c1c6ea]"
                      }`}
                    >
                      {Icon ? <Icon size={14} /> : null}
                      {mood}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-slate-500">Capture how you feel to spot mood trends.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                name="notes"
                placeholder="Any additional notes..."
                defaultValue={existingNotes ?? ""}
                className="min-h-20"
              />
            </div>
            <SubmitButton label="Save log" pendingLabel="Saving..." className="w-full sm:w-auto" />
          </ActionForm>
        </ModalShell>
      ) : null}
    </>
  );
}
