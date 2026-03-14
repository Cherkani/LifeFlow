/** Cycle length in days between two period start dates */
export function cycleLengthDays(start1: Date, start2: Date): number {
  return Math.round((start2.getTime() - start1.getTime()) / (1000 * 60 * 60 * 24));
}

/** Average cycle length from last N cycles (period start dates, newest first) */
export function averageCycleLength(periodStarts: Date[], lastN = 6): number {
  const starts = [...periodStarts].sort((a, b) => b.getTime() - a.getTime()).slice(0, lastN + 1);
  let total = 0;
  let count = 0;
  for (let i = 0; i < starts.length - 1; i++) {
    total += cycleLengthDays(starts[i + 1], starts[i]);
    count++;
  }
  return count > 0 ? Math.round(total / count) : 28;
}

/** Predicted next period start date */
export function predictNextPeriod(lastStart: Date, avgCycle: number): Date {
  const d = new Date(lastStart);
  d.setDate(d.getDate() + avgCycle);
  return d;
}

/** Ovulation date (typically 14 days before next period) */
export function ovulationDate(predictedNextPeriod: Date, lutealPhaseLength = 14): Date {
  const d = new Date(predictedNextPeriod);
  d.setDate(d.getDate() - lutealPhaseLength);
  return d;
}

/** Fertile window: 5 days before ovulation to 1 day after */
export function fertileWindow(ovulation: Date): { start: Date; end: Date } {
  const start = new Date(ovulation);
  start.setDate(start.getDate() - 5);
  const end = new Date(ovulation);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

export type CyclePhase = "menstrual" | "follicular" | "ovulation" | "luteal";

/** Estimate phase based on day in cycle (1-based). Simplified 28-day model. */
export function phaseForDay(dayInCycle: number, cycleLength = 28): CyclePhase {
  const p = (dayInCycle / cycleLength) * 4;
  if (p < 1) return "menstrual";
  if (p < 2) return "follicular";
  if (p < 2.5) return "ovulation";
  return "luteal";
}

export function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Day number in cycle (1-based) for a given date, or null if no period data. */
export function dayInCycleForDate(
  date: Date,
  lastPeriodStart: Date | null,
  avgCycle: number
): number | null {
  if (!lastPeriodStart || avgCycle < 1) return null;
  const msPerDay = 1000 * 60 * 60 * 24;
  let day = Math.ceil((date.getTime() - lastPeriodStart.getTime()) / msPerDay);
  if (day < 1) day += Math.ceil(Math.abs(day) / avgCycle) * avgCycle;
  day = ((day - 1) % avgCycle) + 1;
  return day;
}

/**
 * Day-specific conception probability (0–36) by days from ovulation.
 * Based on research: Wilcox et al. (1995), Stanford (2018).
 * Peak is 1–2 days before ovulation.
 */
const CONCEPTION_BY_DAYS_FROM_OV: Record<number, number> = {
  [-6]: 0,
  [-5]: 10,
  [-4]: 16,
  [-3]: 16,
  [-2]: 27,
  [-1]: 36,
  0: 33,
  1: 10,
  2: 0
};

/** Conception probability (0–36) for a given day in cycle. */
export function conceptionProbability(
  dayInCycle: number,
  ovulationDayInCycle: number
): number {
  const daysFromOv = dayInCycle - ovulationDayInCycle;
  if (daysFromOv < -6 || daysFromOv > 2) return 0;
  return CONCEPTION_BY_DAYS_FROM_OV[daysFromOv] ?? 0;
}
