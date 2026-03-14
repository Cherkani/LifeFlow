import Link from "next/link";
import type { Route } from "next";
import { CalendarDays, ChevronDown, Flower2, HelpCircle } from "lucide-react";

import {
  averageCycleLength,
  dayInCycleForDate,
  fertileWindow,
  formatDateKey,
  ovulationDate,
  phaseForDay,
  predictNextPeriod
} from "@/lib/cycle-calculations";
import { redirect } from "next/navigation";

import {
  MOOD_ICONS,
  MOOD_OPTIONS,
  OVULATION_METHOD_LABELS,
  SYMPTOM_ICONS,
  type MoodOption,
  type OvulationMethod
} from "@/lib/cycle-constants";
import { getPeriodCycles, getPeriodDailyLogs, getOvulationConfirmations, getProfile } from "@/lib/queries";
import { requireAppContext } from "@/lib/server-context";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

import { CycleAddPeriod } from "./cycle-add-period";
import { CycleCalendar } from "./cycle-calendar";
import { CycleEditPeriod } from "./cycle-edit-period";
import { CycleConfirmOvulation } from "./cycle-confirm-ovulation";
import { CycleInfoCards } from "./cycle-info-cards";
import { CycleLogDay } from "@/app/(app)/cycle/cycle-log-day";

export const dynamic = "force-dynamic";

function parseMonth(monthRaw: string | undefined, fallbackDate: Date) {
  if (typeof monthRaw === "string" && /^\d{4}-\d{2}$/.test(monthRaw)) {
    const [year, month] = monthRaw.split("-").map(Number);
    return new Date(year, month - 1, 1);
  }
  return new Date(fallbackDate.getFullYear(), fallbackDate.getMonth(), 1);
}

function ordinal(day: number) {
  if (day % 10 === 1 && day % 100 !== 11) return `${day}st`;
  if (day % 10 === 2 && day % 100 !== 12) return `${day}nd`;
  if (day % 10 === 3 && day % 100 !== 13) return `${day}rd`;
  return `${day}th`;
}

function formatLongDate(date: Date) {
  const month = date.toLocaleDateString("en-US", { month: "long" });
  return `${month} ${ordinal(date.getDate())}, ${date.getFullYear()}`;
}

function parseIsoDate(dateIso: string) {
  return new Date(`${dateIso}T00:00:00`);
}

function buildDateHref(dateIso: string): Route {
  const monthKey = dateIso.slice(0, 7);
  const query = new URLSearchParams();
  query.set("month", monthKey);
  query.set("date", dateIso);
  return `/cycle?${query.toString()}` as Route;
}

function getWeekdayLabel(date: Date) {
  return date.toLocaleDateString("en-US", { weekday: "short" });
}

function formatPeriodRange(startIso: string, endIso: string | null) {
  const start = new Date(`${startIso}T00:00:00`);
  if (!endIso) {
    return `${start.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} – ongoing`;
  }
  const end = new Date(`${endIso}T00:00:00`);
  const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
  if (sameMonth) {
    return `${start.toLocaleDateString("en-US", { month: "short" })} ${start.getDate()} – ${end.getDate()}, ${start.getFullYear()}`;
  }
  return `${start.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} – ${end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
}

function periodDurationDays(startIso: string, endIso: string | null) {
  const start = new Date(`${startIso}T00:00:00`).getTime();
  const end = endIso
    ? new Date(`${endIso}T00:00:00`).getTime()
    : (() => {
        const t = new Date();
        t.setHours(0, 0, 0, 0);
        return t.getTime();
      })();
  return Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;
}

export default async function CyclePage({
  searchParams
}: {
  searchParams: Promise<{ month?: string; date?: string }>;
}) {
  const params = await searchParams;
  const today = new Date();
  const selectedDate =
    typeof params.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(params.date)
      ? new Date(`${params.date}T00:00:00`)
      : new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const monthDate = parseMonth(params.month, selectedDate);
  let monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  /* Sync calendar month with selected date: if selected date is not visible, show its month */
  const selectedInMonth =
    selectedDate.getMonth() === monthStart.getMonth() &&
    selectedDate.getFullYear() === monthStart.getFullYear();
  if (!selectedInMonth) {
    monthStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
  }
  const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
  const prevMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() - 1, 1);
  const nextMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1);
  const prevMonthKey = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, "0")}`;
  const nextMonthKey = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, "0")}`;
  const selectedIso = formatDateKey(selectedDate);
  /* For prev/next month nav: select same day in target month (clamp to max days) */
  const dayNum = selectedDate.getDate();
  const prevMonthLastDay = new Date(prevMonth.getFullYear(), prevMonth.getMonth() + 1, 0).getDate();
  const nextMonthLastDay = new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 0).getDate();
  const prevMonthSelectedIso = `${prevMonthKey}-${String(Math.min(dayNum, prevMonthLastDay)).padStart(2, "0")}`;
  const nextMonthSelectedIso = `${nextMonthKey}-${String(Math.min(dayNum, nextMonthLastDay)).padStart(2, "0")}`;

  const { supabase, user } = await requireAppContext();
  const profile = await getProfile(supabase, user.id);
  if (!profile?.cycle_tracking_enabled) {
    redirect("/dashboard");
  }
  const lutealPhaseLength = profile?.luteal_phase_length ?? 14;

  const periods = await getPeriodCycles(supabase, user.id);
  /* Fetch logs for calendar month + strip (selectedDate ± 3) so both show same data */
  const stripStart = new Date(selectedDate);
  stripStart.setDate(stripStart.getDate() - 3);
  const stripEnd = new Date(selectedDate);
  stripEnd.setDate(stripEnd.getDate() + 3);
  const fetchStartIso = formatDateKey(
    stripStart < monthStart ? stripStart : monthStart
  );
  const fetchEndIso = formatDateKey(
    stripEnd > monthEnd ? stripEnd : monthEnd
  );
  const logs = await getPeriodDailyLogs(
    supabase,
    user.id,
    fetchStartIso,
    fetchEndIso
  );
  const ovulationConfirmations = await getOvulationConfirmations(supabase, user.id);

  const logsByDate = new Map<string, (typeof logs)[0]>();
  for (const log of logs) {
    logsByDate.set(log.log_date, log);
  }
  const moodByDate: Record<string, string> = {};
  for (const log of logs) {
    const mood = log.moods?.[0];
    if (mood) {
      moodByDate[log.log_date] = mood.toLowerCase();
    }
  }

  const confirmationsByIso = new Map<string, (typeof ovulationConfirmations)[0]>();
  for (const confirmation of ovulationConfirmations) {
    confirmationsByIso.set(confirmation.confirmed_on, confirmation);
  }
  const selectedConfirmation = confirmationsByIso.get(selectedIso);
  const selectedConfirmationMethodLabel = selectedConfirmation
    ? OVULATION_METHOD_LABELS[(selectedConfirmation.method ?? "other") as OvulationMethod]
    : null;

  const todayIso = formatDateKey(today);
  const periodForSelectedDate = periods.find((p) => {
    const end = p.period_end ?? todayIso;
    return selectedIso >= p.period_start && selectedIso <= end;
  });
  const periodRanges = periods.map((p) => ({
    start: p.period_start,
    end: p.period_end ?? todayIso
  }));

  /* Use all period starts (newest first) for cycle length and predictions. Include ongoing periods
   * so lastPeriodStart reflects the current cycle and predictions use the most recent start. */
  const periodStarts = periods.map((p) => new Date(p.period_start));
  const avgCycle = averageCycleLength(periodStarts);
  const lastPeriodStart = periodStarts[0] ?? null;
  const predictedNext = lastPeriodStart ? predictNextPeriod(lastPeriodStart, avgCycle) : null;
  const estimatedOvulation = predictedNext ? ovulationDate(predictedNext, lutealPhaseLength) : null;
  const cycleConfirmation =
    lastPeriodStart && predictedNext
      ? ovulationConfirmations.find((confirmation) => {
          const confirmationDate = parseIsoDate(confirmation.confirmed_on);
          return confirmationDate >= lastPeriodStart && confirmationDate <= predictedNext;
        }) ?? null
      : null;
  const ovulation = cycleConfirmation ? parseIsoDate(cycleConfirmation.confirmed_on) : estimatedOvulation;
  const ovulationSource: "confirmed" | "estimated" | null = cycleConfirmation ? "confirmed" : ovulation ? "estimated" : null;
  const fertile = ovulation ? fertileWindow(ovulation) : null;
  const fertileStartIso = fertile ? formatDateKey(fertile.start) : null;
  const fertileEndIso = fertile ? formatDateKey(fertile.end) : null;
  const ovulationIso = ovulation ? formatDateKey(ovulation) : null;
  const predictedPeriodStartIso = predictedNext ? formatDateKey(predictedNext) : null;
  const predictedPeriodEnd = predictedNext
    ? new Date(predictedNext.getTime() + 5 * 24 * 60 * 60 * 1000)
    : null;
  const predictedPeriodEndIso = predictedPeriodEnd ? formatDateKey(predictedPeriodEnd) : null;
  const confirmedIsos = ovulationConfirmations.map((confirmation) => confirmation.confirmed_on);
  const lastConfirmed = ovulationConfirmations[0] ?? null;
  const lastConfirmedDate = lastConfirmed ? parseIsoDate(lastConfirmed.confirmed_on) : null;
  const timelineStart = new Date(selectedDate);
  timelineStart.setDate(timelineStart.getDate() - 3);
  const timelineDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(timelineStart);
    date.setDate(timelineStart.getDate() + index);
    const iso = formatDateKey(date);
    const inPeriod = periodRanges.some((range) => iso >= range.start && iso <= range.end);
    const inFertile = fertileStartIso && fertileEndIso ? iso >= fertileStartIso && iso <= fertileEndIso : false;
    const isConfirmed = confirmedIsos.includes(iso);
    const isOvulationTarget = ovulationIso === iso;
    const isPredictedWindow =
      predictedPeriodStartIso && predictedPeriodEndIso ? iso >= predictedPeriodStartIso && iso <= predictedPeriodEndIso : false;
    const moodValue = moodByDate[iso];
    const normalizedMood = moodValue && (MOOD_OPTIONS as readonly string[]).includes(moodValue)
      ? (moodValue as MoodOption)
      : undefined;
    const MoodGlyph = normalizedMood ? MOOD_ICONS[normalizedMood] : null;
    let status: "selected" | "period" | "confirmed" | "ovulation" | "fertile" | "predicted" | "default" = "default";
    if (iso === selectedIso) status = "selected";
    else if (inPeriod) status = "period";
    else if (isConfirmed) status = "confirmed";
    else if (isOvulationTarget) status = "ovulation";
    else if (inFertile) status = "fertile";
    else if (isPredictedWindow) status = "predicted";

    const statusLabel =
      status === "period"
        ? "Period"
        : status === "fertile"
          ? "Fertile"
          : status === "ovulation"
            ? "Estimated ovulation"
            : status === "confirmed"
              ? "Confirmed ovulation"
              : status === "predicted"
                ? "Predicted period"
                : status === "selected"
                  ? "Selected day"
                  : "Log day";

    const cycleDay = dayInCycleForDate(date, lastPeriodStart, avgCycle);

    return {
      iso,
      weekday: getWeekdayLabel(date),
      day: date.getDate(),
      cycleDay,
      status,
      statusLabel,
      MoodGlyph
    };
  });

  const dayInCycle = dayInCycleForDate(selectedDate, lastPeriodStart, avgCycle);
  const phase = dayInCycle !== null ? phaseForDay(dayInCycle, avgCycle) : null;
  const rawOvulationDay = lastPeriodStart && ovulation
    ? Math.ceil((ovulation.getTime() - lastPeriodStart.getTime()) / (1000 * 60 * 60 * 24))
    : avgCycle - lutealPhaseLength;
  const ovulationDayInCycle = Math.max(1, Math.min(avgCycle, rawOvulationDay));

  const isInFertileWindow =
    fertile &&
    selectedDate >= fertile.start &&
    selectedDate <= fertile.end;
  const isOvulationDay = ovulation && formatDateKey(selectedDate) === formatDateKey(ovulation);
  const isConfirmedOvulationDay = Boolean(selectedConfirmation);
  const isPredictedPeriod =
    predictedNext &&
    predictedPeriodEnd &&
    selectedDate >= predictedNext &&
    selectedDate <= predictedPeriodEnd;
  const interactiveHint = isConfirmedOvulationDay
    ? null
    : isInFertileWindow
      ? {
          title: "Fertile window in progress",
          description: "Log OPK or BBT data to lock in your ovulation estimate.",
          action: "Confirm ovulation"
        }
      : isPredictedPeriod
        ? {
            title: "Predicted period approaching",
            description: "Track flow or symptoms to refine future predictions.",
            action: "Log period data"
          }
        : phase === "follicular" && !selectedConfirmation
          ? {
              title: "Prep for ovulation",
              description: "Plan ahead: add notes or reminders for LH testing.",
              action: "Plan ovulation"
            }
          : null;

  const selectedLog = logsByDate.get(selectedIso);
  const hasSymptoms = (selectedLog?.symptoms?.length ?? 0) > 0;
  const hasMoods = (selectedLog?.moods?.length ?? 0) > 0;
  const hasLog = Boolean(selectedLog?.flow_intensity || hasSymptoms || hasMoods || selectedLog?.notes);

  return (
    <div className="min-w-0 overflow-x-hidden space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-[#3a4868] sm:text-4xl">Cycle</h1>
          <p className="mt-1 text-sm text-[#4a5f83] sm:text-base">
            Track your period, view predictions, and log symptoms.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <CycleAddPeriod selectedIso={selectedIso} />
          {periodForSelectedDate && (
            <CycleEditPeriod
              period={periodForSelectedDate}
              formattedRange={formatPeriodRange(periodForSelectedDate.period_start, periodForSelectedDate.period_end)}
              durationDays={periodDurationDays(periodForSelectedDate.period_start, periodForSelectedDate.period_end)}
              periodHref={buildDateHref(periodForSelectedDate.period_start)}
              buttonOnly
            />
          )}
          <CycleLogDay
            dateIso={selectedIso}
            dateLabel={formatLongDate(selectedDate)}
            existingFlow={logsByDate.get(selectedIso)?.flow_intensity}
            existingSymptoms={logsByDate.get(selectedIso)?.symptoms ?? []}
            existingMoods={logsByDate.get(selectedIso)?.moods ?? []}
            existingNotes={logsByDate.get(selectedIso)?.notes}
          >
            {hasLog ? "Edit log" : "Log symptoms or flow"}
          </CycleLogDay>
          <CycleConfirmOvulation
            dateIso={selectedIso}
            dateLabel={formatLongDate(selectedDate)}
            existingMethod={selectedConfirmation?.method}
            existingNotes={selectedConfirmation?.notes}
          >
            {selectedConfirmation ? "Update ovulation" : "Confirm ovulation"}
          </CycleConfirmOvulation>
        </div>
      </div>

      <div className="grid min-w-0 gap-4 sm:gap-6 lg:grid-cols-[1fr_1fr]">
        <div className="min-w-0 space-y-6">
          <Card className="min-w-0 overflow-hidden">
            <CardContent className="min-w-0 space-y-4 py-4 sm:py-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                <h2 className="flex items-center gap-2 text-lg font-semibold text-[#3a4868] sm:text-2xl">
                  <Flower2 size={20} className="shrink-0 text-rose-500" aria-hidden />
                  <span>Period Calendar</span>
                </h2>
                {selectedIso !== formatDateKey(today) && (
                  <Link
                    href={buildDateHref(formatDateKey(today))}
                    className="w-fit rounded-lg border border-[#c7d3e8] bg-white px-3 py-1.5 text-sm font-semibold text-[#4a5f83] transition hover:bg-[#e3ebf9] hover:text-[#3a4868]"
                    aria-label="Go to today"
                  >
                    Today
                  </Link>
                )}
              </div>

              <div className="min-w-0 overflow-hidden rounded-xl border border-[#d7e0f1] bg-[#eef3fb] p-3 sm:p-4">
                <CycleCalendar
                  monthStart={monthStart}
                  prevMonthKey={prevMonthKey}
                  nextMonthKey={nextMonthKey}
                  prevMonthSelectedIso={prevMonthSelectedIso}
                  nextMonthSelectedIso={nextMonthSelectedIso}
                  selectedIso={selectedIso}
                  lastPeriodStart={lastPeriodStart}
                  avgCycle={avgCycle}
                  periodRanges={periodRanges}
                  fertileStart={fertile ? formatDateKey(fertile.start) : null}
                  fertileEnd={fertile ? formatDateKey(fertile.end) : null}
                  ovulationIso={ovulation ? formatDateKey(ovulation) : null}
                  confirmedOvulationIsos={confirmedIsos}
                  moodByDate={moodByDate}
                  predictedNextIso={predictedNext ? formatDateKey(predictedNext) : null}
                />
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
          <Card className="min-w-0 overflow-hidden">
            <CardContent className="min-w-0 space-y-4 py-4 sm:py-6">
              <h2 className="flex items-center gap-2 text-xl font-semibold text-[#3a4868] sm:text-2xl">
                <CalendarDays size={20} className="shrink-0 text-[#c38f4f]" aria-hidden />
                <span className="min-w-0 truncate">{formatLongDate(selectedDate)}</span>
              </h2>

              <div className="flex flex-wrap gap-2">
                {isInFertileWindow && (
                  <Badge variant="success">Fertile window</Badge>
                )}
                {isConfirmedOvulationDay && (
                  <Badge variant="warning">Confirmed ovulation</Badge>
                )}
                {!isConfirmedOvulationDay && isOvulationDay && (
                  <Badge variant="secondary">Estimated ovulation</Badge>
                )}
                {isPredictedPeriod && (
                  <Badge variant="danger">Predicted period</Badge>
                )}
                {!isInFertileWindow && !isOvulationDay && !isPredictedPeriod && phase && (
                  <Badge variant="secondary" className="capitalize">{phase}</Badge>
                )}
              </div>

              <div className="min-w-0 space-y-3 rounded-xl border border-[#e4e8f5] bg-[#f7f8fd] p-3 sm:p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-[#5c678c]">
                      Around selected day
                    </div>
                    <div className="mt-0.5 text-[11px] text-[#8b93b8]">
                      Calendar dates and cycle days · Tap to jump
                    </div>
                  </div>
                </div>
                <div className="flex min-w-0 gap-2 overflow-x-auto pb-1 ">
                  {timelineDays.map((day) => {
                    let cellClass =
                      "flex min-w-[3.5rem] sm:min-w-[4rem] flex-col items-center gap-0.5 rounded-lg border px-1.5 py-2 text-xs font-semibold transition hover:-translate-y-0.5 sm:px-2 sm:py-2.5";
                    switch (day.status) {
                      case "selected":
                        cellClass += " border-[#4a5f83] bg-[#4a5f83] text-white";
                        break;
                      case "period":
                        cellClass += " border-[#fb7185] bg-[#ffe4e6] text-[#a11a3f]";
                        break;
                      case "fertile":
                        cellClass += " border-[#22c55e] bg-[#dcfce7] text-[#166534]";
                        break;
                      case "confirmed":
                        cellClass += " border-[#a855f7] bg-[#f3e8ff] text-[#6d28d9]";
                        break;
                      case "ovulation":
                        cellClass += " border-[#2563eb] bg-[#dbeafe] text-[#1d4ed8]";
                        break;
                      case "predicted":
                        cellClass += " border-[#f472b6] bg-[#fdf2f8] text-[#be185d]";
                        break;
                      default:
                        cellClass += " border-transparent bg-white text-[#475569]";
                    }
                    return (
                      <Link
                        key={day.iso}
                        href={buildDateHref(day.iso)}
                        title={day.statusLabel}
                        className={cellClass}
                      >
                        <span className="text-[10px] uppercase tracking-wide opacity-80">{day.weekday}</span>
                        <span className="text-sm font-bold sm:text-base">{day.day}</span>
                        {day.cycleDay !== null ? (
                          <span className="text-[10px] font-medium opacity-90">
                            Day {day.cycleDay}
                          </span>
                        ) : null}
                        {day.MoodGlyph ? <day.MoodGlyph size={12} className="mt-0.5 text-[#5a63b5]" /> : null}
                      </Link>
                    );
                  })}
                </div>
                <div className="flex flex-wrap gap-3 text-[11px] text-[#6b7297]">
                  <span className="flex items-center gap-1">
                    <span className="size-2 rounded-full bg-[#ffe4e6]" /> Period
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="size-2 rounded-full bg-[#dcfce7]" /> Fertile
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="size-2 rounded-full bg-[#f3e8ff]" /> Confirmed
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="size-2 rounded-full bg-[#dbeafe]" /> Ovulation
                  </span>
                </div>
              </div>

              {interactiveHint ? (
                <div className="rounded-xl border border-[#d6d9f1] bg-gradient-to-r from-[#f7f8fd] to-[#eef0fb] p-4">
                  <h3 className="text-sm font-semibold text-[#1f2a52]">{interactiveHint.title}</h3>
                  <p className="mt-1 text-sm text-[#4c5682]">{interactiveHint.description}</p>
                </div>
              ) : null}

              {hasLog ? (
                <div className="space-y-3 rounded-lg border border-[#ecebf6] bg-[#f8fafc] p-4">
                  {selectedLog!.flow_intensity && (
                    <div>
                      <span className="text-xs font-medium uppercase tracking-wide text-[#4a5f83]">Flow</span>
                      <p className="mt-0.5 font-medium capitalize text-[#3a4868]">{selectedLog!.flow_intensity}</p>
                    </div>
                  )}
                  {(selectedLog!.symptoms?.length ?? 0) > 0 && (
                    <div>
                      <span className="text-xs font-medium uppercase tracking-wide text-[#4a5f83]">Symptoms</span>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {selectedLog!.symptoms!.map((symptom, index) => {
                          const normalized = symptom.toLowerCase();
                          const Icon = SYMPTOM_ICONS[normalized];
                          return (
                            <span
                              key={`${symptom}-${index}`}
                              className="inline-flex items-center gap-1 rounded-full border border-[#d6daf0] bg-white px-2.5 py-1 text-xs font-semibold text-[#1f2a52] shadow-sm"
                            >
                              {Icon ? <Icon size={14} className="text-[#7c77c2]" /> : <span className="text-[#9ea5c8]">•</span>}
                              <span className="capitalize">{symptom}</span>
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {(selectedLog!.moods?.length ?? 0) > 0 && (
                    <div>
                      <span className="text-xs font-medium uppercase tracking-wide text-[#4a5f83]">Mood</span>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {selectedLog!.moods!.map((mood, index) => {
                          const normalized = mood.toLowerCase();
                          const moodKey =
                            (MOOD_OPTIONS as readonly string[]).includes(normalized) ? (normalized as MoodOption) : undefined;
                          const Icon = moodKey ? MOOD_ICONS[moodKey] : null;
                          return (
                            <span
                              key={`${mood}-${index}`}
                              className="inline-flex items-center gap-1 rounded-full border border-[#d6daf0] bg-white px-2.5 py-1 text-xs font-semibold capitalize text-[#1f2a52] shadow-sm"
                            >
                              {Icon ? <Icon size={14} className="text-[#4d57a5]" /> : <span className="text-[#9ea5c8]">•</span>}
                              {mood}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {selectedLog!.notes && (
                    <div>
                      <span className="text-xs font-medium uppercase tracking-wide text-[#4a5f83]">Notes</span>
                      <p className="mt-0.5 text-[#3a4868]">{selectedLog!.notes}</p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-[#4a5f83]">No log for this day.</p>
              )}

              {selectedConfirmation && (
                <div id="confirm-ovulation" className="rounded-lg border border-[#fde68a] bg-[#fffbeb] p-4">
                  <p className="text-sm font-semibold text-[#92400e]">
                    Confirmed via {selectedConfirmationMethodLabel ?? OVULATION_METHOD_LABELS.other}
                  </p>
                  {selectedConfirmation.notes ? (
                    <p className="mt-1 text-sm text-[#92400e]">{selectedConfirmation.notes}</p>
                  ) : (
                    <p className="mt-1 text-xs text-[#b45309]">No additional notes added for this confirmation.</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {periods.length > 0 && (
            <Card id="periods" className="min-w-0 overflow-hidden">
              <CardContent className="space-y-4 py-4 sm:py-6">
                <h3 className="text-lg font-semibold text-[#3a4868]">Recent periods</h3>
                <div className="flex min-w-0 items-center gap-x-2 overflow-x-auto pb-1 ">
                  {periods.slice(0, 5).map((p, index) => (
                    <div key={p.id} className="flex items-center gap-2">
                      <CycleEditPeriod
                        period={p}
                        formattedRange={formatPeriodRange(p.period_start, p.period_end)}
                        durationDays={periodDurationDays(p.period_start, p.period_end)}
                        periodHref={buildDateHref(p.period_start)}
                      />
                      {index < Math.min(periods.length, 5) - 1 && (
                        <span className="shrink-0 text-rose-300/80" aria-hidden>
                          – – – –
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          </div>
        </div>

        <div className="min-w-0 space-y-4">
          <Card id="overview" className="min-w-0 overflow-hidden">
            <CardContent className="space-y-4 py-4 sm:py-6">
              <h3 className="text-lg font-semibold text-[#3a4868]">Overview</h3>
              <dl className="space-y-3 text-sm">
                {phase && (
                  <div className="flex justify-between">
                    <dt className="text-[#4a5f83]">Current phase</dt>
                    <dd className="font-medium capitalize text-[#3a4868]">{phase}</dd>
                  </div>
                )}
                {dayInCycle !== null && dayInCycle > 0 && (
                  <div className="flex justify-between">
                    <dt className="text-[#4a5f83]">Day in cycle</dt>
                    <dd className="font-medium text-[#3a4868]">{dayInCycle}</dd>
                  </div>
                )}
                {predictedNext && (
                  <div className="flex justify-between">
                    <dt className="text-[#4a5f83]">Predicted next period</dt>
                    <dd className="font-medium text-[#3a4868]">{formatLongDate(predictedNext)}</dd>
                  </div>
                )}
                {ovulation && ovulationSource && (
                  <div className="flex justify-between">
                    <dt className="text-[#4a5f83]">
                      {ovulationSource === "confirmed" ? "Confirmed ovulation" : "Estimated ovulation"}
                    </dt>
                    <dd className="font-medium text-[#3a4868]">{formatLongDate(ovulation)}</dd>
                  </div>
                )}
                {lastConfirmedDate && (!ovulation || lastConfirmedDate.getTime() !== ovulation.getTime()) && (
                  <div className="flex justify-between">
                    <dt className="text-[#4a5f83]">Last confirmed ovulation</dt>
                    <dd className="font-medium text-[#3a4868]">{formatLongDate(lastConfirmedDate)}</dd>
                  </div>
                )}
                {periods.length > 0 && (
                  <div className="flex justify-between">
                    <dt className="text-[#4a5f83]">Avg cycle length</dt>
                    <dd className="font-medium text-[#3a4868]">{avgCycle} days</dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-[#4a5f83]">Luteal phase length</dt>
                  <dd className="font-medium text-[#3a4868]">{lutealPhaseLength} days</dd>
                </div>
                {periods.length === 0 && !phase && !predictedNext && (
                  <p className="text-[#4a5f83]">Log your first period to see predictions.</p>
                )}
              </dl>
            </CardContent>
          </Card>
          <CycleInfoCards
            dayInCycle={dayInCycle}
            cycleLength={avgCycle}
            ovulationDayInCycle={ovulationDayInCycle}
            phase={phase}
            periodsLogged={periods.length}
            avgCycleLength={avgCycle}
            logsThisMonth={logs.length}
          />
        </div>
      </div>

      <Card className="min-w-0 overflow-hidden border-[#d7e0f1] bg-[#f7f9fd]">
        <CardContent className="p-0">
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-4 transition hover:bg-[#eef2f9]/50 sm:px-6 sm:py-5 [&::-webkit-details-marker]:hidden">
              <h2 className="flex items-center gap-2 text-base font-semibold text-[#3a4868] sm:text-xl">
                <HelpCircle size={20} className="shrink-0 text-[#5a63b5]" />
                <span>How cycle tracking works</span>
              </h2>
              <ChevronDown size={20} className="shrink-0 text-[#5a63b5] transition-transform group-open:rotate-180" />
            </summary>
            <div className="min-w-0 space-y-4 border-t border-[#e4e8f5] px-4 pb-6 pt-4 sm:space-y-6 sm:px-6 sm:pb-8 sm:pt-6">
              <div className="grid min-w-0 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
            <div className="space-y-2 rounded-xl border border-[#e4e8f5] bg-white p-4">
              <h3 className="font-semibold text-[#3a4868]">1. Log your period</h3>
              <p className="text-sm text-[#4a5f83]">
                Use <strong>Log period</strong> when your period starts. The app records the date range and uses it to predict your next period and fertile window.
              </p>
            </div>

            <div className="space-y-2 rounded-xl border border-[#e4e8f5] bg-white p-4">
              <h3 className="font-semibold text-[#3a4868]">2. Track symptoms & flow</h3>
              <p className="text-sm text-[#4a5f83]">
                Use <strong>Log symptoms or flow</strong> for any day to record cramps, flow intensity, mood, and notes. This helps you spot patterns over time.
              </p>
            </div>

            <div className="space-y-2 rounded-xl border border-[#e4e8f5] bg-white p-4">
              <h3 className="font-semibold text-[#3a4868]">3. Confirm ovulation</h3>
              <p className="text-sm text-[#4a5f83]">
                Use <strong>Confirm ovulation</strong> when you have data (OPK, BBT, symptoms) that ovulation happened. This locks in the date and improves future predictions.
              </p>
            </div>

            <div className="space-y-2 rounded-xl border border-[#e4e8f5] bg-white p-4 sm:col-span-2 lg:col-span-1">
              <h3 className="font-semibold text-[#3a4868]">Calendar colors</h3>
              <ul className="space-y-1.5 text-sm text-[#4a5f83]">
                <li><span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-rose-100 border border-rose-300" /> <strong>Period</strong> — logged period</span></li>
                <li><span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-full border-2 border-dashed border-pink-300 bg-pink-50" /> <strong>Predicted</strong> — estimated next period</span></li>
                <li><span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-emerald-100 border border-emerald-300" /> <strong>Fertile</strong> — high chance to conceive</span></li>
                <li><span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-amber-100 border border-amber-300" /> <strong>Ovulation</strong> — estimated ovulation day</span></li>
                <li><span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-violet-100 border border-violet-300" /> <strong>Confirmed</strong> — confirmed ovulation</span></li>
              </ul>
            </div>

            <div className="space-y-2 rounded-xl border border-[#e4e8f5] bg-white p-4 sm:col-span-2">
              <h3 className="font-semibold text-[#3a4868]">Predictions</h3>
              <p className="text-sm text-[#4a5f83]">
                Predictions are based on your logged periods and average cycle length. The more periods you log, the more accurate they become. Confirming ovulation helps refine the fertile window. If you have no period data yet, the app uses a default 28-day cycle until you log your first period.
              </p>
            </div>
              </div>
            </div>
          </details>
        </CardContent>
      </Card>
    </div>
  );
}
