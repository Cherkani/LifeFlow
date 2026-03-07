import Link from "next/link";
import { CalendarDays, CheckCircle2, Circle, ListFilter, PlusCircle, Search } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { requireAppContext } from "@/lib/server-context";

type TaskSearchParams = Promise<{
  q?: string;
  status?: string;
  priority?: string;
}>;

type Habit = {
  id: string;
  title: string;
};

type Session = {
  id: string;
  habit_id: string;
  session_date: string;
  planned_minutes: number;
  completed: boolean;
  notes: string | null;
};

type Priority = "High" | "Medium" | "Low";

function getPriority(minutes: number): Priority {
  if (minutes >= 90) return "High";
  if (minutes >= 45) return "Medium";
  return "Low";
}

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric"
  });
}

export default async function TasksPage({
  searchParams
}: {
  searchParams: TaskSearchParams;
}) {
  const params = await searchParams;
  const query = params.q?.trim().toLowerCase() ?? "";
  const statusFilter = params.status?.trim() ?? "all";
  const priorityFilter = params.priority?.trim() ?? "all";

  const { supabase, account } = await requireAppContext();
  const habitsRes = await supabase.from("habits").select("id, title").eq("account_id", account.accountId).eq("is_active", true);
  const habits = (habitsRes.data ?? []) as Habit[];
  const habitNameById = new Map(habits.map((habit) => [habit.id, habit.title]));

  const sessionsRes =
    habits.length > 0
      ? await supabase
          .from("habit_sessions")
          .select("id, habit_id, session_date, planned_minutes, completed, notes")
          .in("habit_id", habits.map((habit) => habit.id))
          .order("session_date", { ascending: true })
          .limit(50)
      : { data: [] as Session[] };

  const sessions = (sessionsRes.data ?? []) as Session[];
  const rawTasks = sessions.map((session) => {
    const status = session.completed ? "done" : "todo";
    const priority = getPriority(session.planned_minutes);

    return {
      id: session.id,
      title: habitNameById.get(session.habit_id) ?? "Task",
      description: session.notes || `Planned ${session.planned_minutes} minutes.`,
      status,
      priority,
      dueDate: session.session_date,
      tag: "General"
    };
  });

  const tasks = rawTasks.filter((task) => {
    const matchesQuery =
      query.length === 0 ||
      task.title.toLowerCase().includes(query) ||
      task.description.toLowerCase().includes(query) ||
      task.tag.toLowerCase().includes(query);

    const matchesStatus = statusFilter === "all" || task.status === statusFilter;
    const matchesPriority = priorityFilter === "all" || task.priority.toLowerCase() === priorityFilter;

    return matchesQuery && matchesStatus && matchesPriority;
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-2 py-6">
          <h1 className="text-5xl font-bold tracking-tight text-[#0c1d3c]">My Tasks</h1>
          <p className="text-lg text-[#4a5f83]">Stay organized and focused. Manage your to-do list effectively.</p>
        </CardContent>
      </Card>

      <form method="get" className="grid gap-3 xl:grid-cols-[1fr_auto_auto_auto]">
        <div className="relative">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#4a5f83]" />
          <Input name="q" defaultValue={params.q ?? ""} placeholder="Search tasks..." className="pl-9" />
        </div>

        <div className="relative">
          <ListFilter size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#4a5f83]" />
          <select
            name="status"
            defaultValue={statusFilter}
            className="h-10 min-w-32 rounded-lg border border-[#c7d3e8] bg-[#edf3ff] px-9 text-sm text-[#0c1d3c] outline-none focus:border-[#1e3a6d]"
          >
            <option value="all">All Statuses</option>
            <option value="todo">To Do</option>
            <option value="done">Done</option>
          </select>
        </div>

        <div className="relative">
          <ListFilter size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#4a5f83]" />
          <select
            name="priority"
            defaultValue={priorityFilter}
            className="h-10 min-w-32 rounded-lg border border-[#c7d3e8] bg-[#edf3ff] px-9 text-sm text-[#0c1d3c] outline-none focus:border-[#1e3a6d]"
          >
            <option value="all">All Priorities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            className="rounded-lg border border-[#c7d3e8] bg-[#edf3ff] px-4 text-sm font-semibold text-[#23406d] transition hover:bg-[#e3ebf9]"
          >
            Apply
          </button>
          <Link
            href="/planning"
            className="inline-flex items-center gap-2 rounded-lg bg-[#0b1f3b] px-4 text-sm font-semibold text-white transition hover:bg-[#102a52]"
          >
            <PlusCircle size={16} />
            Add Task
          </Link>
        </div>
      </form>

      <div className="space-y-3">
        {tasks.length > 0 ? (
          tasks.map((task) => (
            <Card key={task.id}>
              <CardContent className="space-y-3 py-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    {task.status === "done" ? (
                      <CheckCircle2 size={20} className="mt-0.5 text-emerald-600" />
                    ) : (
                      <Circle size={20} className="mt-0.5 text-[#b59748]" />
                    )}
                    <div>
                      <h2 className="text-2xl font-semibold text-[#0c1d3c]">{task.title}</h2>
                      <p className="text-base text-[#4a5f83]">{task.description}</p>
                    </div>
                  </div>
                  <button type="button" aria-label="Task options" className="text-[#4a5f83]">⋮</button>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span
                    className={
                      task.status === "done"
                        ? "rounded-full bg-emerald-100 px-2.5 py-1 font-semibold text-emerald-700"
                        : "rounded-full bg-blue-100 px-2.5 py-1 font-semibold text-blue-700"
                    }
                  >
                    {task.status === "done" ? "Done" : "To Do"}
                  </span>
                  <span className="rounded-full bg-[#e3e6d7] px-2.5 py-1 font-semibold text-[#4d5139]">{task.priority} Priority</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#eef2fa] px-2.5 py-1 font-medium text-[#4a5f83]">
                    <CalendarDays size={13} />
                    {formatDate(task.dueDate)}
                  </span>
                  <span className="rounded-full bg-[#edf3ff] px-2.5 py-1 font-semibold text-[#23406d]">{task.tag}</span>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="py-6 text-sm text-[#4a5f83]">
              No tasks matched this filter. Create one from <Link href="/planning" className="font-semibold text-[#0b1f3b]">Create Schedule</Link>.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
