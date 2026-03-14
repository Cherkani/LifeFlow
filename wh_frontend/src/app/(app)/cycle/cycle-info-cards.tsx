"use client";

import { Info } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import type { CyclePhase } from "@/lib/cycle-calculations";

import { CycleFertilityHistogram } from "./cycle-fertility-histogram";
import { CyclePhaseRing } from "./cycle-phase-ring";

const PHASE_INFO: Record<
  CyclePhase,
  { title: string; description: string; tip: string; color: string }
> = {
  menstrual: {
    title: "Menstrual",
    description: "Bleeding phase. Your body sheds the uterine lining.",
    tip: "Rest when needed. Light exercise like walking can help with cramps.",
    color: "bg-rose-100 text-rose-800 border-rose-200"
  },
  follicular: {
    title: "Follicular",
    description: "Egg follicles develop. Energy often rises.",
    tip: "Good time for new projects and social activities.",
    color: "bg-sky-100 text-sky-800 border-sky-200"
  },
  ovulation: {
    title: "Ovulation",
    description: "Egg is released. Peak fertility window.",
    tip: "Highest energy. Ideal for important tasks and workouts.",
    color: "bg-amber-100 text-amber-800 border-amber-200"
  },
  luteal: {
    title: "Luteal",
    description: "Post-ovulation. Body prepares for next cycle.",
    tip: "Listen to your body. Gentle movement and rest support this phase.",
    color: "bg-violet-100 text-violet-800 border-violet-200"
  }
};

const PHASE_LEGEND = [
  { phase: "menstrual" as CyclePhase, label: "Menstrual", dot: "bg-rose-400" },
  { phase: "follicular" as CyclePhase, label: "Follicular", dot: "bg-sky-400" },
  { phase: "ovulation" as CyclePhase, label: "Ovulation", dot: "bg-amber-400" },
  { phase: "luteal" as CyclePhase, label: "Luteal", dot: "bg-violet-400" }
];

type CycleInfoCardsProps = {
  dayInCycle: number | null;
  cycleLength: number;
  ovulationDayInCycle: number;
  phase: CyclePhase | null;
  periodsLogged: number;
  avgCycleLength: number;
  logsThisMonth: number;
};

export function CycleInfoCards({
  dayInCycle,
  cycleLength,
  ovulationDayInCycle,
  phase,
  periodsLogged,
  avgCycleLength,
  logsThisMonth
}: CycleInfoCardsProps) {
  const safeDay = dayInCycle ?? 1;
  const phaseInfo = phase ? PHASE_INFO[phase] : null;

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <Card className="overflow-hidden">
        <CardContent className="flex flex-col items-center py-6">
          <h3 className="mb-3 text-sm font-semibold text-[#3a4868]">
            Your cycle at a glance
          </h3>
          <div className="min-h-[180px] w-full flex items-center justify-center sm:min-h-[200px]">
            <CyclePhaseRing
              dayInCycle={safeDay}
              cycleLength={cycleLength}
              size={160}
            />
          </div>
          <div className="mt-3 flex flex-wrap justify-center gap-3">
            {PHASE_LEGEND.map((item) => (
              <span
                key={item.phase}
                className="flex items-center gap-1.5 text-xs text-[#4a5f83]"
              >
                <span className={`size-2 rounded-full ${item.dot}`} />
                {item.label}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardContent className="py-5">
          <h3 className="mb-3 text-sm font-semibold text-[#3a4868]">
            Chance to conceive
          </h3>
          <div className="h-36 w-full">
            <CycleFertilityHistogram
              dayInCycle={safeDay}
              cycleLength={cycleLength}
              ovulationDayInCycle={ovulationDayInCycle}
            />
          </div>
          <p className="mt-2 text-xs text-[#4a5f83]">
            Peak fertility 1–2 days before ovulation.
          </p>
        </CardContent>
      </Card>

      {phaseInfo && (
        <Card className="overflow-hidden">
          <CardContent className="py-5">
            <h3 className="mb-3 text-sm font-semibold text-[#3a4868]">
              Current phase
            </h3>
            <div className={`rounded-lg border px-4 py-3 ${phaseInfo.color}`}>
              <p className="font-semibold capitalize text-[#3a4868]">{phaseInfo.title}</p>
              <p className="mt-1 text-sm text-[#4a5f83]">{phaseInfo.description}</p>
            </div>
            <p className="mt-3 flex items-start gap-2 text-xs text-[#4a5f83]">
              <Info size={14} className="mt-0.5 shrink-0" />
              <span>{phaseInfo.tip}</span>
            </p>
          </CardContent>
        </Card>
      )}

      <Card className="overflow-hidden">
        <CardContent className="py-5">
          <h3 className="mb-3 text-sm font-semibold text-[#3a4868]">
            Your stats
          </h3>
          <dl className="space-y-2.5 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-[#4a5f83]">Periods logged</dt>
              <dd className="font-semibold text-[#3a4868]">{periodsLogged}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[#4a5f83]">Avg cycle</dt>
              <dd className="font-semibold text-[#3a4868]">{avgCycleLength} days</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[#4a5f83]">Logs this month</dt>
              <dd className="font-semibold text-[#3a4868]">{logsThisMonth}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardContent className="py-5">
          <h3 className="mb-3 text-sm font-semibold text-[#3a4868]">
            Quick tips
          </h3>
          <ul className="space-y-2 text-xs text-[#4a5f83]">
            <li>Log period start and end for better predictions.</li>
            <li>Confirm ovulation (OPK, BBT) to refine fertile window.</li>
            <li>Track symptoms and mood to spot patterns.</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
