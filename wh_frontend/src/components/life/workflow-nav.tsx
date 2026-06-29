import Link from "next/link";
import type { Route } from "next";
import { CalendarDays, ClipboardList, Target } from "lucide-react";

type WorkflowNavProps = {
  active: "planning" | "execution" | "calendar";
  executionHref: Route;
  calendarHref: Route;
};

const items = [
  { key: "planning", label: "Planner", href: "/planning" as Route, Icon: Target },
  { key: "execution", label: "Execution", Icon: ClipboardList },
  { key: "calendar", label: "Calendar", Icon: CalendarDays }
] as const;

export function WorkflowNav({ active, executionHref, calendarHref }: WorkflowNavProps) {
  const hrefByKey = {
    planning: "/planning" as Route,
    execution: executionHref,
    calendar: calendarHref
  };

  return (
    <nav className="flex flex-wrap items-center gap-2 rounded-lg border border-[var(--app-panel-border)] bg-[var(--app-panel-bg-soft)] p-2">
      {items.map(({ key, label, Icon }) => {
        const isActive = active === key;
        return (
          <Link
            key={key}
            href={hrefByKey[key]}
            className={[
              "inline-flex min-h-9 items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition-colors",
              isActive
                ? "bg-[var(--app-btn-primary-bg)] text-[var(--app-btn-primary-fg)] shadow-sm"
                : "text-[var(--app-btn-secondary-fg)] hover:bg-[var(--app-btn-secondary-bg)]"
            ].join(" ")}
            aria-current={isActive ? "page" : undefined}
          >
            <Icon size={16} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
