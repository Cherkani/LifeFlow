import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, CalendarDays, ChartNoAxesCombined, NotebookPen, Repeat } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

type QuickAction = {
  title: string;
  description: string;
  button: string;
  href: "/planning" | "/habits" | "/events" | "/analytics";
  icon: LucideIcon;
};

const quickActions: QuickAction[] = [
  {
    title: "Create Your Schedule",
    description: "Let AI craft your perfect day. Just tell us your goals.",
    button: "Start Planning",
    href: "/planning",
    icon: NotebookPen
  },
  {
    title: "Execute Weekly Habits",
    description: "Check your weekly tasks and log hours done for each one.",
    button: "Open Habits",
    href: "/habits",
    icon: Repeat
  },
  {
    title: "View Your Calendar",
    description: "See your important dates visually on a calendar.",
    button: "Open Calendar",
    href: "/events",
    icon: CalendarDays
  },
  {
    title: "See Your Progress",
    description: "Visualize your achievements and time usage with analytics.",
    button: "View Analytics",
    href: "/analytics",
    icon: ChartNoAxesCombined
  }
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-3 py-7">
          <h1 className="text-4xl font-bold tracking-tight text-[#0b1f3b]">Welcome to Dev Weaver!</h1>
          <p className="text-lg text-[#4a5f83]">Your day, your goals, no stress. Let AI handle the mess.</p>
          <p className="text-base text-[#4a5f83]">
            Dev Weaver is your intelligent assistant for mastering your schedule. Create, adapt, and visualize your plans
            with the power of AI.
          </p>
        </CardContent>
      </Card>

      <section className="grid gap-4 md:grid-cols-2">
        {quickActions.map((action) => {
          const Icon = action.icon;

          return (
            <Card key={action.title}>
              <CardContent className="space-y-6 py-7">
                <div className="space-y-4 text-center">
                  <div className="mx-auto inline-flex size-12 items-center justify-center rounded-xl bg-[#dbe5f7] text-[#0b1f3b]">
                    <Icon size={24} />
                  </div>
                  <div>
                    <h2 className="text-3xl font-semibold text-[#0c1d3c]">{action.title}</h2>
                    <p className="mt-2 text-base text-[#4a5f83]">{action.description}</p>
                  </div>
                </div>
                <Link
                  href={action.href}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#0b1f3b] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#102a52]"
                >
                  {action.button}
                  <ArrowRight size={16} />
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </section>
    </div>
  );
}
