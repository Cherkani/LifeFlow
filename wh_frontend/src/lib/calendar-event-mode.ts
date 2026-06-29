export type CalendarEventMode = "event" | "todo" | "milestone";

const modePrefix = "[mode:";
const modePattern = /^\[mode:(event|todo|milestone)\]\s*/;

export function parseCalendarEventDetails(details: string | null | undefined): {
  mode: CalendarEventMode;
  details: string | null;
} {
  const raw = details?.trim() ?? "";
  const match = raw.match(modePattern);

  if (!match) {
    return { mode: "event", details: raw.length > 0 ? raw : null };
  }

  const cleanedDetails = raw.replace(modePattern, "").trim();
  return {
    mode: match[1] as CalendarEventMode,
    details: cleanedDetails.length > 0 ? cleanedDetails : null
  };
}

export function serializeCalendarEventDetails(mode: CalendarEventMode, details: string | null | undefined) {
  const cleanDetails = details?.trim() ?? "";
  return `${modePrefix}${mode}]${cleanDetails.length > 0 ? ` ${cleanDetails}` : ""}`;
}

export function getCalendarEventModeLabel(mode: CalendarEventMode) {
  if (mode === "todo") return "To-do";
  if (mode === "milestone") return "Milestone";
  return "Event";
}
