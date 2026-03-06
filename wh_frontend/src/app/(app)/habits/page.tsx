import { SubmitButton } from "@/components/forms/submit-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { requireAppContext } from "@/lib/server-context";
import { toDateInputValue } from "@/lib/utils";

import { createHabitAction, planSessionAction, updateSessionAction } from "./actions";

type Habit = {
  id: string;
  title: string;
  type: string;
  minimum_minutes: number | null;
  weekly_target_minutes: number | null;
};

type Session = {
  id: string;
  session_date: string;
  planned_minutes: number;
  minimum_minutes: number;
  actual_minutes: number | null;
  completed: boolean;
  rating: number | null;
  notes: string | null;
  habit_id: string;
};

export default async function HabitsPage() {
  const { supabase, account } = await requireAppContext();

  const habitsRes = await supabase
    .from("habits")
    .select("id, title, type, minimum_minutes, weekly_target_minutes")
    .eq("account_id", account.accountId)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  const habits = (habitsRes.data ?? []) as Habit[];
  const sessionsRes =
    habits.length > 0
      ? await supabase
          .from("habit_sessions")
          .select("id, habit_id, session_date, planned_minutes, minimum_minutes, actual_minutes, completed, rating, notes")
          .in("habit_id", habits.map((habit) => habit.id))
          .order("session_date", { ascending: true })
          .limit(30)
      : { data: [] as Session[] };
  const sessions = (sessionsRes.data ?? []) as Session[];
  const habitNameById = new Map(habits.map((habit) => [habit.id, habit.title]));

  return (
    <div className="space-y-6">
      <SectionHeader title="Habits & Sessions" description="Define systems, then track reality against your plan." />

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Create habit</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createHabitAction} className="grid gap-3 sm:grid-cols-2">
              <input
                name="title"
                required
                placeholder="Habit title"
                className="h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none transition focus:border-blue-400 sm:col-span-2"
              />

              <select
                name="type"
                defaultValue="time_tracking"
                className="h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none transition focus:border-blue-400"
              >
                <option value="time_tracking">Time tracking</option>
                <option value="fixed_protocol">Fixed protocol</option>
                <option value="count">Count</option>
                <option value="custom">Custom</option>
              </select>

              <input
                name="weeklyTargetMinutes"
                type="number"
                min={0}
                placeholder="Weekly target (minutes)"
                className="h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none transition focus:border-blue-400"
              />

              <input
                name="minimumMinutes"
                type="number"
                min={0}
                placeholder="Minimum minutes"
                className="h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none transition focus:border-blue-400"
              />

              <div className="sm:col-span-2">
                <SubmitButton label="Save habit" pendingLabel="Saving..." />
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Plan session</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={planSessionAction} className="grid gap-3 sm:grid-cols-2">
              <select
                name="habitId"
                required
                className="h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none transition focus:border-blue-400 sm:col-span-2"
              >
                <option value="">Choose habit</option>
                {habits.map((habit) => (
                  <option key={habit.id} value={habit.id}>
                    {habit.title}
                  </option>
                ))}
              </select>

              <input
                name="sessionDate"
                type="date"
                defaultValue={toDateInputValue(new Date())}
                required
                className="h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none transition focus:border-blue-400"
              />

              <input
                name="plannedMinutes"
                type="number"
                min={0}
                defaultValue={45}
                required
                className="h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none transition focus:border-blue-400"
              />

              <input
                name="minimumMinutes"
                type="number"
                min={0}
                defaultValue={20}
                required
                className="h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none transition focus:border-blue-400"
              />

              <div className="sm:col-span-2">
                <SubmitButton label="Plan session" pendingLabel="Planning..." />
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent sessions</CardTitle>
        </CardHeader>
        <CardContent>
          {sessions.length > 0 ? (
            <div className="space-y-3">
              {sessions.map((session) => (
                <form
                  key={session.id}
                  action={updateSessionAction}
                  className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 lg:grid-cols-[1.4fr_repeat(5,minmax(0,1fr))_auto]"
                >
                  <input type="hidden" name="sessionId" value={session.id} />

                  <div>
                    <p className="text-sm font-semibold text-slate-900">{habitNameById.get(session.habit_id) ?? "Habit"}</p>
                    <p className="text-xs text-slate-500">{session.session_date}</p>
                    <p className="text-xs text-slate-500">
                      Plan {session.planned_minutes} / Min {session.minimum_minutes}
                    </p>
                  </div>

                  <input
                    name="actualMinutes"
                    type="number"
                    min={0}
                    defaultValue={session.actual_minutes ?? undefined}
                    placeholder="Actual"
                    className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-blue-400"
                  />

                  <select
                    name="rating"
                    defaultValue={session.rating ?? ""}
                    className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-blue-400"
                  >
                    <option value="">Rating</option>
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                    <option value="4">4</option>
                    <option value="5">5</option>
                  </select>

                  <input
                    name="notes"
                    defaultValue={session.notes ?? ""}
                    placeholder="Notes"
                    className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-blue-400 lg:col-span-3"
                  />

                  <SubmitButton label={session.completed ? "Update" : "Complete"} pendingLabel="Saving..." className="h-10" />
                </form>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No sessions yet. Plan your first one above.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
