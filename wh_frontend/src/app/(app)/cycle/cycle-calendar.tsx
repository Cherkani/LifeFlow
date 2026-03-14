"use client";

import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo } from "react";
import Calendar from "react-calendar";
import { ChevronLeft, ChevronRight } from "lucide-react";
import "react-calendar/dist/Calendar.css";
import "./cycle-calendar.css";

import { dayInCycleForDate, formatDateKey, phaseForDay } from "@/lib/cycle-calculations";
import { MOOD_ICONS, MOOD_OPTIONS, PHASE_ICONS, type MoodOption } from "@/lib/cycle-constants";
import { CircleDot, Droplet, Moon, Sprout } from "lucide-react";
import { cn } from "@/lib/utils";

type CycleCalendarProps = {
  monthStart: Date;
  prevMonthKey: string;
  nextMonthKey: string;
  prevMonthSelectedIso: string;
  nextMonthSelectedIso: string;
  selectedIso: string;
  lastPeriodStart: Date | null;
  avgCycle: number;
  periodRanges: { start: string; end: string }[];
  fertileStart: string | null;
  fertileEnd: string | null;
  ovulationIso: string | null;
  confirmedOvulationIsos?: string[];
  moodByDate?: Record<string, string>;
  predictedNextIso: string | null;
};

function isDateInRange(iso: string, start: string, end: string): boolean {
  return iso >= start && iso <= end;
}

function buildCycleHref(month: string, date: string) {
  const query = new URLSearchParams();
  query.set("month", month);
  query.set("date", date);
  return `/cycle?${query.toString()}` as Route;
}

export function CycleCalendar({
  monthStart,
  prevMonthKey,
  nextMonthKey,
  prevMonthSelectedIso,
  nextMonthSelectedIso,
  selectedIso,
  lastPeriodStart,
  avgCycle,
  periodRanges,
  fertileStart,
  fertileEnd,
  ovulationIso,
  confirmedOvulationIsos = [],
  moodByDate = {},
  predictedNextIso
}: CycleCalendarProps) {
  const router = useRouter();
  const selectedDate = new Date(`${selectedIso}T12:00:00`);
  const predEndIso = predictedNextIso
    ? formatDateKey(new Date(new Date(predictedNextIso).getTime() + 5 * 24 * 60 * 60 * 1000))
    : null;

  const confirmedSet = useMemo(() => new Set(confirmedOvulationIsos), [confirmedOvulationIsos]);
  const getTileStatus = useCallback(
    (date: Date) => {
      const iso = formatDateKey(date);
      const isPeriod = periodRanges.some((r) => isDateInRange(iso, r.start, r.end));
      const isFertile = fertileStart && fertileEnd && isDateInRange(iso, fertileStart, fertileEnd);
      const isConfirmedOvulation = confirmedSet.has(iso);
      const isOvulation = ovulationIso === iso;
      const isPredicted =
        predictedNextIso && predEndIso && iso >= predictedNextIso && iso <= predEndIso;
      const isSelected = iso === selectedIso;
      return {
        iso,
        isPeriod,
        isFertile,
        isConfirmedOvulation,
        isOvulation,
        isPredicted,
        isSelected
      };
    },
    [
      periodRanges,
      fertileStart,
      fertileEnd,
      ovulationIso,
      predictedNextIso,
      predEndIso,
      selectedIso,
      confirmedSet
    ]
  );

  const getPhaseForTile = useCallback(
    (date: Date) => {
      const day = dayInCycleForDate(date, lastPeriodStart, avgCycle);
      return day !== null ? phaseForDay(day, avgCycle) : null;
    },
    [lastPeriodStart, avgCycle]
  );

  const tileClassName = useCallback(
    ({ date, view }: { date: Date; view: string }) => {
      if (view !== "month") return "";
      const { isPeriod, isFertile, isConfirmedOvulation, isOvulation, isPredicted, isSelected } =
        getTileStatus(date);
      const inCurrentMonth = date.getMonth() === monthStart.getMonth();
      const phase = getPhaseForTile(date);
      const hasSpecialEvent =
        isPeriod || isFertile || isConfirmedOvulation || isOvulation || isPredicted;
      const phaseBorder =
        !hasSpecialEvent &&
        phase &&
        (phase === "menstrual"
          ? "cycle-tile-menstrual"
          : phase === "follicular"
            ? "cycle-tile-follicular"
            : phase === "ovulation"
              ? "cycle-tile-ovulation"
              : phase === "luteal"
                ? "cycle-tile-luteal"
                : "");
      return cn(
        "!rounded-2xl !border-2 !text-sm !font-semibold transition-all duration-200",
        phaseBorder,
        !inCurrentMonth && "!text-[#8aa0c2] !border-transparent !bg-transparent",
        inCurrentMonth && "!text-[#3a4868]",
        isSelected && "!border-[#4a5f83] !bg-[#4a5f83] !text-white !ring-2 !ring-[#4a5f83] !ring-offset-2",
        !isSelected && isPeriod && "!border-rose-300 !bg-rose-50 !text-rose-800",
        !isSelected && isConfirmedOvulation && "!border-violet-300 !bg-violet-50 !text-violet-800",
        !isSelected && isOvulation && "!border-amber-300 !bg-amber-50 !text-amber-800",
        !isSelected && isFertile && "cycle-tile-fertile !border-emerald-300 !bg-emerald-50 !text-emerald-800",
        !isSelected && isPredicted && "!border-pink-300 !bg-pink-50 !text-pink-800 !border-dashed",
        !isSelected &&
          !isPeriod &&
          !isFertile &&
          !isConfirmedOvulation &&
          !isOvulation &&
          !isPredicted &&
          inCurrentMonth &&
          "!border-[#e4e8f5] !bg-white hover:!bg-[#e3ebf9] hover:!scale-105"
      );
    },
    [getTileStatus, getPhaseForTile, monthStart, selectedIso]
  );

  const tileContent = useCallback(
    ({ date, view }: { date: Date; view: string }) => {
      if (view !== "month") return null;
      const iso = formatDateKey(date);
      const moodValue = moodByDate[iso];
      const normalizedMood =
        moodValue && (MOOD_OPTIONS as readonly string[]).includes(moodValue)
          ? (moodValue as MoodOption)
          : undefined;
      const MoodGlyph = normalizedMood ? MOOD_ICONS[normalizedMood] : null;
      const day = dayInCycleForDate(date, lastPeriodStart, avgCycle);
      const phase = day !== null ? phaseForDay(day, avgCycle) : null;
      const PhaseIcon = phase ? PHASE_ICONS[phase] : null;

      const isPeriod = periodRanges.some((r) => isDateInRange(iso, r.start, r.end));
      const isFertile =
        fertileStart && fertileEnd && isDateInRange(iso, fertileStart, fertileEnd);
      const isOvulation = ovulationIso === iso;
      const isConfirmed = confirmedOvulationIsos.includes(iso);

      const phaseIconColor = isPeriod
        ? "text-rose-600"
        : isConfirmed
          ? "text-violet-600"
          : isOvulation
            ? "text-amber-500"
            : isFertile
              ? "text-emerald-600"
              : phase === "menstrual"
                ? "text-rose-500"
                : phase === "follicular"
                  ? "text-sky-500"
                  : phase === "ovulation"
                    ? "text-amber-500"
                    : phase === "luteal"
                      ? "text-violet-500"
                      : "text-[#6b7da1]";

      const hasIcons = PhaseIcon || MoodGlyph;
      const hasCycleDay = day !== null;
      if (!hasIcons && !hasCycleDay) return null;
      return (
        <div className="mt-0.5 flex flex-col items-center gap-0.5">
          {(PhaseIcon || MoodGlyph) && (
            <div className="flex items-center justify-center gap-0.5">
              {PhaseIcon && <PhaseIcon size={10} className={cn("shrink-0", phaseIconColor)} />}
              {MoodGlyph && <MoodGlyph size={10} className="shrink-0 text-[#5a63b5]" />}
            </div>
          )}
          {hasCycleDay && (
            <span className="text-[9px] font-medium leading-tight opacity-80">
              Day {day}
            </span>
          )}
        </div>
      );
    },
    [moodByDate, lastPeriodStart, avgCycle, periodRanges, fertileStart, fertileEnd, ovulationIso, confirmedOvulationIsos]
  );

  const handleChange = useCallback(
    (value: Date | [Date | null, Date | null] | null) => {
      const date = Array.isArray(value) ? value[0] : value;
      if (!date) return;
      const iso = formatDateKey(date);
      const month = iso.slice(0, 7);
      router.push(buildCycleHref(month, iso));
    },
    [router]
  );

  return (
    <div className="cycle-calendar-wrapper">
      <div className="mb-3 flex items-center justify-between gap-2 sm:mb-4">
        <Link
          href={buildCycleHref(prevMonthKey, prevMonthSelectedIso)}
          className="flex size-10 shrink-0 items-center justify-center rounded-full border border-[#c7d3e8] bg-white text-[#4a5f83] transition hover:bg-[#e3ebf9] hover:text-[#3a4868]"
          aria-label="Previous month"
        >
          <ChevronLeft size={20} />
        </Link>
        <span className="min-w-0 flex-1 truncate text-center text-sm font-bold text-[#3a4868] sm:text-base">
          {monthStart.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
        </span>
        <Link
          href={buildCycleHref(nextMonthKey, nextMonthSelectedIso)}
          className="flex size-10 shrink-0 items-center justify-center rounded-full border border-[#c7d3e8] bg-white text-[#4a5f83] transition hover:bg-[#e3ebf9] hover:text-[#3a4868]"
          aria-label="Next month"
        >
          <ChevronRight size={20} />
        </Link>
      </div>
      <Calendar
        locale="en-US"
        value={selectedDate}
        onChange={handleChange}
        activeStartDate={monthStart}
        view="month"
        tileClassName={tileClassName}
        tileContent={tileContent}
        prev2Label={null}
        next2Label={null}
        formatShortWeekday={(_, date) =>
          date.toLocaleDateString("en-US", { weekday: "narrow" })
        }
      />
      <div className="mt-3 text-[11px] text-[#8b93b8]">
        Each day shows calendar date and cycle day (Day 1 = first day of period).
      </div>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1.5 text-[10px] text-[#4a5f83] sm:mt-3 sm:gap-x-6 sm:gap-y-2 sm:text-xs">
        <span className="flex items-center gap-2">
          <Droplet size={14} className="text-rose-500" />
          Period
        </span>
        <span className="flex items-center gap-2">
          <Sprout size={14} className="text-emerald-500" />
          Fertile
        </span>
        <span className="flex items-center gap-2">
          <CircleDot size={14} className="text-amber-500" />
          Ovulation
        </span>
        <span className="flex items-center gap-2">
          <Moon size={14} className="text-violet-500" />
          Confirmed
        </span>
        <span className="flex items-center gap-2">
          <span className="size-2.5 rounded-full border-2 border-dashed border-pink-300 bg-pink-50" />
          Predicted
        </span>
      </div>
    </div>
  );
}
