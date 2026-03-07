"use client";

import { Plus, Trash2 } from "lucide-react";
import { useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

type ObjectiveOption = {
  id: string;
  title: string;
};

type TaskDraft = {
  id: string;
  title: string;
  objectiveId: string;
  plannedMinutes: string;
  startTime: string;
};

type TasksByDay = Record<number, TaskDraft[]>;

const dayConfig = [
  { dayOfWeek: 1, label: "Monday" },
  { dayOfWeek: 2, label: "Tuesday" },
  { dayOfWeek: 3, label: "Wednesday" },
  { dayOfWeek: 4, label: "Thursday" },
  { dayOfWeek: 5, label: "Friday" },
  { dayOfWeek: 6, label: "Saturday" },
  { dayOfWeek: 7, label: "Sunday" }
] as const;

function createDraft(id: string): TaskDraft {
  return {
    id,
    title: "",
    objectiveId: "",
    plannedMinutes: "",
    startTime: ""
  };
}

function createInitialState() {
  const state = {} as TasksByDay;
  for (const day of dayConfig) {
    state[day.dayOfWeek] = [createDraft(`${day.dayOfWeek}-1`)];
  }
  return state;
}

export function TemplateTaskBuilder({ objectives }: { objectives: ObjectiveOption[] }) {
  const [tasksByDay, setTasksByDay] = useState<TasksByDay>(() => createInitialState());
  const idCounterRef = useRef(7);

  const serializedTasks = useMemo(
    () =>
      JSON.stringify(
        dayConfig.flatMap((day) =>
          (tasksByDay[day.dayOfWeek] ?? []).map((task) => ({
            dayOfWeek: day.dayOfWeek,
            title: task.title,
            objectiveId: task.objectiveId,
            plannedMinutes: Number(task.plannedMinutes || 0),
            startTime: task.startTime
          }))
        )
      ),
    [tasksByDay]
  );

  function addTask(dayOfWeek: number) {
    idCounterRef.current += 1;
    const id = `${dayOfWeek}-${idCounterRef.current}`;

    setTasksByDay((previous) => ({
      ...previous,
      [dayOfWeek]: [...(previous[dayOfWeek] ?? []), createDraft(id)]
    }));
  }

  function removeTask(dayOfWeek: number, taskId: string) {
    setTasksByDay((previous) => ({
      ...previous,
      [dayOfWeek]: (previous[dayOfWeek] ?? []).filter((task) => task.id !== taskId)
    }));
  }

  function updateTask(dayOfWeek: number, taskId: string, field: keyof Omit<TaskDraft, "id">, value: string) {
    setTasksByDay((previous) => ({
      ...previous,
      [dayOfWeek]: (previous[dayOfWeek] ?? []).map((task) => (task.id === taskId ? { ...task, [field]: value } : task))
    }));
  }

  function updateObjective(dayOfWeek: number, taskId: string, objectiveId: string) {
    setTasksByDay((previous) => ({
      ...previous,
      [dayOfWeek]: (previous[dayOfWeek] ?? []).map((task) => {
        if (task.id !== taskId) {
          return task;
        }

        const previousObjectiveTitle = objectives.find((objective) => objective.id === task.objectiveId)?.title ?? "";
        const nextObjectiveTitle = objectives.find((objective) => objective.id === objectiveId)?.title ?? "";
        const shouldAutoFillTitle = task.title.trim().length === 0 || task.title === previousObjectiveTitle;

        return {
          ...task,
          objectiveId,
          title: shouldAutoFillTitle ? nextObjectiveTitle : task.title
        };
      })
    }));
  }

  return (
    <div className="space-y-3">
      <input type="hidden" name="tasksPayload" value={serializedTasks} />

      {dayConfig.map((day) => (
        <div key={day.dayOfWeek} className="space-y-2 rounded-lg border border-[#c7d3e8] p-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-[#23406d]">{day.label}</p>
            <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => addTask(day.dayOfWeek)}>
              <Plus size={14} />
              Add task
            </Button>
          </div>

          {(tasksByDay[day.dayOfWeek] ?? []).length > 0 ? (
            <div className="space-y-2">
              {(tasksByDay[day.dayOfWeek] ?? []).map((task) => (
                <div key={task.id} className="grid gap-2 md:grid-cols-[130px_2.1fr_110px_120px_auto]">
                  <Select value={task.objectiveId} onChange={(event) => updateObjective(day.dayOfWeek, task.id, event.target.value)}>
                    <option value="">Choose objective</option>
                    {objectives.map((objective) => (
                      <option key={objective.id} value={objective.id}>
                        {objective.title}
                      </option>
                    ))}
                  </Select>
                  <Input
                    value={task.title}
                    onChange={(event) => updateTask(day.dayOfWeek, task.id, "title", event.target.value)}
                    placeholder="Task title"
                  />
                  <Input
                    type="number"
                    min={0}
                    step={10}
                    value={task.plannedMinutes}
                    onChange={(event) => updateTask(day.dayOfWeek, task.id, "plannedMinutes", event.target.value)}
                    placeholder="Avg min"
                  />
                  <Input
                    type="time"
                    value={task.startTime}
                    onChange={(event) => updateTask(day.dayOfWeek, task.id, "startTime", event.target.value)}
                  />
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeTask(day.dayOfWeek, task.id)} aria-label="Remove task">
                    <Trash2 size={14} />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[#4a5f83]">No tasks for this day.</p>
          )}
        </div>
      ))}

      <p className="text-xs text-[#4a5f83]">Each task should include title, objective, and average minutes. Start time is optional.</p>
    </div>
  );
}
