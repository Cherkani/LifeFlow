import { SubmitButton } from "@/components/forms/submit-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { requireAppContext } from "@/lib/server-context";
import { startOfIsoWeek, toDateInputValue } from "@/lib/utils";

import { createTemplateAction, createTemplateEntryAction, generateWeekAction } from "./actions";

type Template = {
  id: string;
  name: string;
};

type Habit = {
  id: string;
  title: string;
};

type TemplateEntry = {
  id: string;
  template_id: string;
  habit_id: string;
  day_of_week: number;
  planned_minutes: number;
  minimum_minutes: number;
  is_required: boolean;
};

const dayName = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default async function PlanningPage() {
  const { supabase, account } = await requireAppContext();

  const [templatesRes, habitsRes, weeksRes] = await Promise.all([
    supabase.from("templates").select("id, name").eq("account_id", account.accountId).order("created_at", { ascending: false }),
    supabase
      .from("habits")
      .select("id, title")
      .eq("account_id", account.accountId)
      .eq("is_active", true)
      .order("created_at", { ascending: false }),
    supabase
      .from("weeks")
      .select("id, template_id, week_start_date, created_at")
      .eq("account_id", account.accountId)
      .order("week_start_date", { ascending: false })
      .limit(10)
  ]);

  const templates = (templatesRes.data ?? []) as Template[];
  const habits = (habitsRes.data ?? []) as Habit[];
  const templateIds = templates.map((template) => template.id);
  const entriesRes =
    templateIds.length > 0
      ? await supabase
          .from("template_entries")
          .select("id, template_id, habit_id, day_of_week, planned_minutes, minimum_minutes, is_required")
          .in("template_id", templateIds)
          .order("created_at", { ascending: false })
      : { data: [] as TemplateEntry[] };
  const entries = (entriesRes.data ?? []) as TemplateEntry[];
  const weeks = weeksRes.data ?? [];

  const habitNameById = new Map(habits.map((habit) => [habit.id, habit.title]));

  return (
    <div className="space-y-6">
      <SectionHeader title="Weekly Planning" description="Build reusable week blueprints and generate execution sessions." />

      <div className="grid gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Create template</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createTemplateAction} className="space-y-3">
              <input
                name="name"
                required
                placeholder="Template name"
                className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none transition focus:border-blue-400"
              />
              <SubmitButton label="Save template" pendingLabel="Saving..." />
            </form>
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Add template entry</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createTemplateEntryAction} className="grid gap-3 lg:grid-cols-3">
              <select
                name="templateId"
                required
                className="h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none transition focus:border-blue-400"
              >
                <option value="">Template</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>

              <select
                name="habitId"
                required
                className="h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none transition focus:border-blue-400"
              >
                <option value="">Habit</option>
                {habits.map((habit) => (
                  <option key={habit.id} value={habit.id}>
                    {habit.title}
                  </option>
                ))}
              </select>

              <select
                name="dayOfWeek"
                defaultValue="1"
                className="h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none transition focus:border-blue-400"
              >
                <option value="1">Monday</option>
                <option value="2">Tuesday</option>
                <option value="3">Wednesday</option>
                <option value="4">Thursday</option>
                <option value="5">Friday</option>
                <option value="6">Saturday</option>
                <option value="7">Sunday</option>
              </select>

              <input
                name="plannedMinutes"
                type="number"
                defaultValue={45}
                min={0}
                className="h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none transition focus:border-blue-400"
              />

              <input
                name="minimumMinutes"
                type="number"
                defaultValue={20}
                min={0}
                className="h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none transition focus:border-blue-400"
              />

              <select
                name="isRequired"
                defaultValue="yes"
                className="h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none transition focus:border-blue-400"
              >
                <option value="yes">Required</option>
                <option value="no">Optional</option>
              </select>

              <div className="lg:col-span-3">
                <SubmitButton label="Add / update entry" pendingLabel="Saving..." />
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Generate week from template</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={generateWeekAction} className="grid gap-3 sm:grid-cols-3">
            <select
              name="templateId"
              required
              className="h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none transition focus:border-blue-400"
            >
              <option value="">Template</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>

            <input
              name="weekStartDate"
              type="date"
              defaultValue={toDateInputValue(startOfIsoWeek(new Date()))}
              className="h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none transition focus:border-blue-400"
            />

            <SubmitButton label="Generate week" pendingLabel="Generating..." />
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Template entries</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {templates.length > 0 ? (
              templates.map((template) => {
                const templateEntries = entries.filter((entry) => entry.template_id === template.id);

                return (
                  <div key={template.id} className="rounded-xl border border-slate-200 p-3">
                    <p className="text-sm font-semibold text-slate-900">{template.name}</p>
                    <div className="mt-2 space-y-1">
                      {templateEntries.length > 0 ? (
                        templateEntries.map((entry) => (
                          <p key={entry.id} className="text-xs text-slate-600">
                            {dayName[entry.day_of_week - 1]} - {habitNameById.get(entry.habit_id) ?? "Habit"} ({entry.planned_minutes}/
                            {entry.minimum_minutes} min{entry.is_required ? ", required" : ""})
                          </p>
                        ))
                      ) : (
                        <p className="text-xs text-slate-500">No entries yet.</p>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-slate-500">No templates yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Generated weeks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {weeks.length > 0 ? (
              weeks.map((week) => (
                <div key={week.id} className="rounded-xl border border-slate-200 px-3 py-2">
                  <p className="text-sm font-medium text-slate-900">
                    {templates.find((template) => template.id === week.template_id)?.name ?? "Template"}
                  </p>
                  <p className="text-xs text-slate-500">Week starts {week.week_start_date}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">No weeks generated yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
