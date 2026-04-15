"use client";

import { Copy, Plus, Trash2 } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

type ObjectiveOption = {
  id: string;
  title: string;
};

type TemplateTask = {
  dayOfWeek: number;
  title: string;
  objectiveId: string;
  plannedMinutes: number;
  startTime: string | null;
  habitId?: string | null;
};

type TaskDraft = {
  id: string;
  habitId?: string;
  title: string;
  objectiveId: string;
  plannedMinutes: string;
  startTime: string;
};

type TasksByDay = Record<number, TaskDraft[]>;

type TaskRowProps = {
  task: TaskDraft;
  dayOfWeek: number;
  objectives: ObjectiveOption[];
  onUpdateTask: (dayOfWeek: number, taskId: string, field: keyof Omit<TaskDraft, "id" | "habitId">, value: string) => void;
  onUpdateObjective: (dayOfWeek: number, taskId: string, objectiveId: string) => void;
  onRemoveTask: (dayOfWeek: number, taskId: string) => void;
};

function TaskRow({
  task,
  dayOfWeek,
  objectives,
  onUpdateTask,
  onUpdateObjective,
  onRemoveTask
}: TaskRowProps) {
  const handleMinutesChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onUpdateTask(dayOfWeek, task.id, "plannedMinutes", e.target.value);
    },
    [dayOfWeek, task.id, onUpdateTask]
  );

  const handleStartTimeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onUpdateTask(dayOfWeek, task.id, "startTime", e.target.value);
    },
    [dayOfWeek, task.id, onUpdateTask]
  );

  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onUpdateTask(dayOfWeek, task.id, "title", e.target.value);
    },
    [dayOfWeek, task.id, onUpdateTask]
  );

  const handleObjectiveChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onUpdateObjective(dayOfWeek, task.id, e.target.value);
    },
    [dayOfWeek, task.id, onUpdateObjective]
  );

  const fieldBaseId = `template-day-${dayOfWeek}-task-${task.id}`;

  return (
    <div className="rounded-xl border border-[var(--app-panel-border)] bg-[var(--app-panel-bg-soft)] p-3">
      <div className="grid gap-3 md:grid-cols-[1.2fr_1.8fr_110px_140px_auto] md:items-end">
        <div className="space-y-1.5">
          <Label htmlFor={`${fieldBaseId}-objective`} className="text-xs uppercase tracking-wide text-[var(--app-text-muted)]">
            Objective
          </Label>
          <Select
            id={`${fieldBaseId}-objective`}
            name={`${fieldBaseId}-objective`}
            value={task.objectiveId}
            onChange={handleObjectiveChange}
            autoComplete="off"
          >
            <option value="">Choose objective</option>
            {objectives.map((objective) => (
              <option key={objective.id} value={objective.id}>
                {objective.title}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${fieldBaseId}-title`} className="text-xs uppercase tracking-wide text-[var(--app-text-muted)]">
            Task title
          </Label>
          <Input
            id={`${fieldBaseId}-title`}
            name={`${fieldBaseId}-title`}
            value={task.title}
            onChange={handleTitleChange}
            placeholder="Task title"
            aria-label={`Task title for ${task.id}`}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${fieldBaseId}-minutes`} className="text-xs uppercase tracking-wide text-[var(--app-text-muted)]">
            Avg min
          </Label>
          <Input
            id={`${fieldBaseId}-minutes`}
            name={`${fieldBaseId}-minutes`}
            type="number"
            min={0}
            inputMode="numeric"
            value={task.plannedMinutes}
            onChange={handleMinutesChange}
            placeholder="Avg min"
            aria-label={`Planned minutes for ${task.id}`}
            autoComplete="off"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${fieldBaseId}-start-time`} className="text-xs uppercase tracking-wide text-[var(--app-text-muted)]">
            Start time
          </Label>
          <Input
            id={`${fieldBaseId}-start-time`}
            name={`${fieldBaseId}-start-time`}
            type="time"
            step={1800}
            value={task.startTime}
            onChange={handleStartTimeChange}
            aria-label={`Start time for ${task.id}`}
            autoComplete="off"
          />
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="self-end"
          onClick={() => onRemoveTask(dayOfWeek, task.id)}
          aria-label="Remove task"
        >
          <Trash2 size={14} />
        </Button>
      </div>
    </div>
  );
}

const dayConfig = [
  { dayOfWeek: 1, label: "Monday" },
  { dayOfWeek: 2, label: "Tuesday" },
  { dayOfWeek: 3, label: "Wednesday" },
  { dayOfWeek: 4, label: "Thursday" },
  { dayOfWeek: 5, label: "Friday" },
  { dayOfWeek: 6, label: "Saturday" },
  { dayOfWeek: 7, label: "Sunday" }
] as const;

function createDraft(id: string, overrides?: Partial<TaskDraft>): TaskDraft {
  return {
    id,
    habitId: overrides?.habitId ?? "",
    title: overrides?.title ?? "",
    objectiveId: overrides?.objectiveId ?? "",
    plannedMinutes: overrides?.plannedMinutes ?? "",
    startTime: overrides?.startTime ?? ""
  };
}

function isBlankDraft(task: TaskDraft) {
  return (
    task.title.trim().length === 0 &&
    task.objectiveId.trim().length === 0 &&
    task.plannedMinutes.trim().length === 0 &&
    task.startTime.trim().length === 0
  );
}

function createInitialState(initialTasks?: TemplateTask[]) {
  const state = {} as TasksByDay;
  for (const day of dayConfig) {
    state[day.dayOfWeek] = [];
  }
  if (initialTasks && initialTasks.length > 0) {
    initialTasks.forEach((task, index) => {
      const dayKey = dayConfig.find((day) => day.dayOfWeek === task.dayOfWeek);
      if (!dayKey) {
        return;
      }
      const draftId = `${task.dayOfWeek}-${index + 1}`;
      state[task.dayOfWeek]?.push(
        createDraft(draftId, {
          habitId: task.habitId ?? "",
          title: task.title,
          objectiveId: task.objectiveId,
          plannedMinutes: String(task.plannedMinutes ?? ""),
          startTime: task.startTime ?? ""
        })
      );
    });
  } else {
    for (const day of dayConfig) {
      state[day.dayOfWeek] = [createDraft(`${day.dayOfWeek}-1`)];
    }
  }
  return state;
}

type TemplateTaskBuilderProps = {
  objectives: ObjectiveOption[];
  initialTasks?: TemplateTask[];
};

export function TemplateTaskBuilder({ objectives, initialTasks }: TemplateTaskBuilderProps) {
  const [tasksByDay, setTasksByDay] = useState<TasksByDay>(() => createInitialState(initialTasks));
  const idCounterRef = useRef(initialTasks?.length ? initialTasks.length + 7 : 7);

  const serializedTasks = useMemo(
    () =>
      JSON.stringify(
        dayConfig.flatMap((day) =>
          (tasksByDay[day.dayOfWeek] ?? []).map((task) => {
            const normalizedStartTime = task.startTime.trim();
            return {
              dayOfWeek: day.dayOfWeek,
              title: task.title,
              objectiveId: task.objectiveId,
              plannedMinutes: Number(task.plannedMinutes || 0),
              startTime: normalizedStartTime.length > 0 ? normalizedStartTime : null,
              habitId: task.habitId && task.habitId.length > 0 ? task.habitId : null
            };
          })
        )
      ),
    [tasksByDay]
  );

  const dayHasCopySource = useCallback(
    (sourceDayOfWeek: number) => (tasksByDay[sourceDayOfWeek] ?? []).some((task) => !isBlankDraft(task)),
    [tasksByDay]
  );

  const addTask = useCallback((dayOfWeek: number) => {
    idCounterRef.current += 1;
    const id = `${dayOfWeek}-${idCounterRef.current}`;

    setTasksByDay((previous) => ({
      ...previous,
      [dayOfWeek]: [...(previous[dayOfWeek] ?? []), createDraft(id)]
    }));
  }, []);

  const copyTasksFromDay = useCallback((sourceDayOfWeek: number, targetDayOfWeek: number) => {
    setTasksByDay((previous) => {
      const sourceTasks = previous[sourceDayOfWeek] ?? [];
      if (sourceTasks.length === 0) {
        return previous;
      }

      const copiedTasks = sourceTasks.map((task) => {
        idCounterRef.current += 1;
        return createDraft(`${targetDayOfWeek}-${idCounterRef.current}`, {
          title: task.title,
          objectiveId: task.objectiveId,
          plannedMinutes: task.plannedMinutes,
          startTime: task.startTime
        });
      });

      const currentTargetTasks = previous[targetDayOfWeek] ?? [];
      const nextTargetTasks =
        currentTargetTasks.length > 0 && currentTargetTasks.every(isBlankDraft)
          ? copiedTasks
          : [...currentTargetTasks, ...copiedTasks];

      return {
        ...previous,
        [targetDayOfWeek]: nextTargetTasks
      };
    });
  }, []);

  const removeTask = useCallback((dayOfWeek: number, taskId: string) => {
    setTasksByDay((previous) => ({
      ...previous,
      [dayOfWeek]: (previous[dayOfWeek] ?? []).filter((task) => task.id !== taskId)
    }));
  }, []);

  const updateTask = useCallback(
    (dayOfWeek: number, taskId: string, field: keyof Omit<TaskDraft, "id" | "habitId">, value: string) => {
      setTasksByDay((previous) => ({
        ...previous,
        [dayOfWeek]: (previous[dayOfWeek] ?? []).map((task) =>
          task.id === taskId ? { ...task, [field]: value } : task
        )
      }));
    },
    []
  );

  const updateObjective = useCallback(
    (dayOfWeek: number, taskId: string, objectiveId: string) => {
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
    },
    [objectives]
  );

  return (
    <div className="space-y-3">
      <input type="hidden" name="tasksPayload" value={serializedTasks} />

      {dayConfig.map((day) => (
        <div
          key={day.dayOfWeek}
          className="space-y-3 rounded-xl border border-[var(--app-panel-border)] bg-[var(--app-panel-bg)] p-4 shadow-[0_2px_8px_rgba(11,31,59,0.04)]"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-[var(--app-text-strong)]">{day.label}</p>
              <p className="text-xs text-[var(--app-text-muted)]">
                {(tasksByDay[day.dayOfWeek] ?? []).filter((task) => !isBlankDraft(task)).length} configured task
                {(tasksByDay[day.dayOfWeek] ?? []).filter((task) => !isBlankDraft(task)).length !== 1 ? "s" : ""}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {day.dayOfWeek > 1 ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  onClick={() => copyTasksFromDay(day.dayOfWeek - 1, day.dayOfWeek)}
                  disabled={!dayHasCopySource(day.dayOfWeek - 1)}
                >
                  <Copy size={14} />
                  Copy {dayConfig[day.dayOfWeek - 2]?.label ?? "above"}
                </Button>
              ) : null}
              <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => addTask(day.dayOfWeek)}>
                <Plus size={14} />
                Add task
              </Button>
            </div>
          </div>

          {(tasksByDay[day.dayOfWeek] ?? []).length > 0 ? (
            <div className="space-y-2">
              {(tasksByDay[day.dayOfWeek] ?? []).map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  dayOfWeek={day.dayOfWeek}
                  objectives={objectives}
                  onUpdateTask={updateTask}
                  onUpdateObjective={updateObjective}
                  onRemoveTask={removeTask}
                />
              ))}
            </div>
          ) : (
            <p className="text-xs text-[var(--app-text-muted)]">No tasks for this day.</p>
          )}
        </div>
      ))}

      <p className="text-xs text-[var(--app-text-muted)]">
        Each task should include title, objective, and average minutes. Start time is optional.
      </p>
    </div>
  );
}
