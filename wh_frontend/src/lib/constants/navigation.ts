import {
  BookOpen,
  CalendarDays,
  ChartNoAxesCombined,
  CircleDollarSign,
  LayoutDashboard,
  NotebookPen,
  Repeat
} from "lucide-react";

export const appNavigation = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/planning", label: "Planner", icon: NotebookPen },
  { href: "/habits", label: "Execution", icon: Repeat },
  { href: "/events", label: "Calendar", icon: CalendarDays },
  { href: "/finance", label: "Finance", icon: CircleDollarSign },
  { href: "/knowledge", label: "Knowledge", icon: BookOpen },
  { href: "/analytics", label: "Analysis", icon: ChartNoAxesCombined }
] as const;
