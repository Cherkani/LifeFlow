import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, CalendarDays, ChartNoAxesCombined, NotebookPen, Repeat, WalletCards } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDashboardCounts } from "@/lib/queries";
import { requireAppContext } from "@/lib/server-context";
type QuickAction = {
  title: string;
  description: string;
  button: string;
  href: "/planning" | "/habits" | "/events" | "/analytics" | "/finance";
  icon: LucideIcon;
  tone: string;
};

const quickActions: QuickAction[] = [
  {
    title: "Plan Your Week",
    description: "Create objectives and templates in a structured planner flow.",
    button: "Open Planner",
    href: "/planning",
    icon: NotebookPen,
    tone: "from-[#dbe5f7] to-[#edf3ff]"
  },
  {
    title: "Execute Daily",
    description: "Track checkboxes and minutes from your assigned weekly template.",
    button: "Open Execution",
    href: "/habits",
    icon: Repeat,
    tone: "from-[#e5eaf9] to-[#f3f6ff]"
  },
  {
    title: "Manage Finance",
    description: "Track expenses, debt, and payments with clearer visual controls.",
    button: "Open Finance",
    href: "/finance",
    icon: WalletCards,
    tone: "from-[#f6e5de] to-[#fff1eb]"
  },
  {
    title: "Analyze Progress",
    description: "Use weekly/monthly charts to evaluate momentum and consistency.",
    button: "Open Analysis",
    href: "/analytics",
    icon: ChartNoAxesCombined,
    tone: "from-[#e3eee6] to-[#f2faf4]"
  }
];

export default async function DashboardPage() {
  const { supabase, account } = await requireAppContext();
  const { objectivesCount, templatesCount } = await getDashboardCounts(supabase, account.accountId);

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <CardContent className="relative space-y-4 py-8">
          <div className="absolute right-0 top-0 h-28 w-28 rounded-bl-full bg-[#dbe5f7]" />
          <div className="absolute bottom-0 left-0 h-20 w-20 rounded-tr-full bg-[#e8eefb]" />
          <h1 className="relative text-4xl font-bold tracking-tight text-[#0b1f3b]">Welcome back, Momentum Grid</h1>
          <p className="relative max-w-3xl text-base text-[#4a5f83]">
            Build objectives, execute tasks, monitor spend, and inspect results from one command center.
          </p>
          <div className="relative grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-lg border border-[#c7d3e8] bg-white p-3">
              <p className="text-xs uppercase tracking-wide text-[#4a5f83]">Objectives</p>
              <p className="mt-1 text-xl font-semibold text-[#0c1d3c]">{objectivesCount}</p>
            </div>
            <div className="rounded-lg border border-[#c7d3e8] bg-white p-3">
              <p className="text-xs uppercase tracking-wide text-[#4a5f83]">Templates</p>
              <p className="mt-1 text-xl font-semibold text-[#0c1d3c]">{templatesCount}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <section className="grid gap-4 md:grid-cols-2">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <Card key={action.title} className="overflow-hidden">
              <CardHeader className={`bg-gradient-to-r ${action.tone}`}>
                <CardTitle className="flex items-center gap-2 text-xl text-[#0c1d3c]">
                  <Icon size={20} />
                  {action.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 py-6">
                <p className="text-sm text-[#4a5f83]">{action.description}</p>
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

      <Card>
        <CardHeader>
          <CardTitle>Quick Access</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Link href="/events" className="rounded-lg border border-[#c7d3e8] bg-[#f8fbff] p-3 text-sm font-semibold text-[#0c1d3c] transition hover:bg-[#edf3ff]">
            <div className="mb-2 inline-flex size-9 items-center justify-center rounded-lg bg-white">
              <CalendarDays size={18} className="text-[#23406d]" />
            </div>
            Calendar events
          </Link>
          <Link href="/knowledge" className="rounded-lg border border-[#c7d3e8] bg-[#f8fbff] p-3 text-sm font-semibold text-[#0c1d3c] transition hover:bg-[#edf3ff]">
            Subject knowledge
          </Link>
          <Link href="/planning" className="rounded-lg border border-[#c7d3e8] bg-[#f8fbff] p-3 text-sm font-semibold text-[#0c1d3c] transition hover:bg-[#edf3ff]">
            Objective planner
          </Link>
          <Link href="/habits" className="rounded-lg border border-[#c7d3e8] bg-[#f8fbff] p-3 text-sm font-semibold text-[#0c1d3c] transition hover:bg-[#edf3ff]">
            Execution board
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
