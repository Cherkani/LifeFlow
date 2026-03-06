import {
  BookOpen,
  ChartNoAxesCombined,
  CircleDollarSign,
  LayoutDashboard,
  NotebookPen,
  Repeat,
  Settings
} from "lucide-react";

export const appNavigation = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/knowledge", label: "Knowledge", icon: BookOpen },
  { href: "/habits", label: "Habits", icon: Repeat },
  { href: "/planning", label: "Planning", icon: NotebookPen },
  { href: "/finance", label: "Finance", icon: CircleDollarSign },
  { href: "/analytics", label: "Analytics", icon: ChartNoAxesCombined },
  { href: "/settings", label: "Settings", icon: Settings }
] as const;
