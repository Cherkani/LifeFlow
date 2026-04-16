"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import Image from "next/image";

import { createObjectiveFormAction, deleteObjectiveFormAction, updateObjectiveFormAction } from "@/app/(app)/habits/actions";
import { ActionForm } from "@/components/forms/action-form";
import { PexelsImagePicker } from "@/components/forms/pexels-image-picker";
import { SubmitButton } from "@/components/forms/submit-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ModalShell } from "@/components/ui/modal-shell";
import { SectionHeader } from "@/components/ui/section-header";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  createTemplateWithDailyTasksFormAction,
  deleteTemplateFormAction,
  updateTemplateWithDailyTasksFormAction
} from "@/app/(app)/planning/actions";

import { TemplateTaskBuilder } from "./template-task-builder";

const dayName = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function getStartTime(metadata: unknown) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }
  const value = (metadata as { preferred_start_time?: unknown }).preferred_start_time;
  return typeof value === "string" && value.length > 0 ? value : null;
}

type Objective = {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
};

type Task = {
  id: string;
  title: string;
  objective_id: string | null;
  metadata: unknown;
};

type Template = {
  id: string;
  name: string;
  objective_id: string | null;
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

type PlanningContentProps = {
  objectives: Objective[];
  templates: Template[];
  entries: TemplateEntry[];
  taskById: Record<string, Task>;
  objectiveById: Record<string, Objective>;
  templateIdsByObjective: Record<string, string[]>;
  taskCountByObjective: Record<string, number>;
  weekCountByTemplate: Record<string, number>;
  stats: {
    objectivesCount: number;
    templatesCount: number;
    totalTemplateEntries: number;
    assignedWeeksCount: number;
  };
};

export function PlanningContent({
  objectives,
  templates,
  entries,
  taskById,
  objectiveById,
  templateIdsByObjective,
  taskCountByObjective,
  weekCountByTemplate,
  stats
}: PlanningContentProps) {
  const [activeModal, setActiveModal] = useState<
    "create-objective" | "edit-objective" | "create-template" | "edit-template" | null
  >(null);
  const [editingObjectiveId, setEditingObjectiveId] = useState<string | null>(null);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(templates[0]?.id ?? "");

  const editingObjective =
    editingObjectiveId ? objectives.find((o) => o.id === editingObjectiveId) ?? null : null;
  const editingTemplate =
    editingTemplateId ? templates.find((t) => t.id === editingTemplateId) ?? null : null;
  const editingTemplateInitialTasks =
    editingTemplate !== null
      ? entries
          .filter((entry) => entry.template_id === editingTemplate.id)
          .map((entry) => {
            const task = taskById[entry.habit_id];
            return {
              dayOfWeek: entry.day_of_week,
              title: task?.title ?? "",
              objectiveId: task?.objective_id ?? "",
              plannedMinutes: entry.planned_minutes,
              startTime: getStartTime(task?.metadata),
              habitId: entry.habit_id
            };
          })
      : [];
  const selectedTemplate = templates.find((template) => template.id === selectedTemplateId) ?? templates[0] ?? null;
  const selectedTemplateEntries = selectedTemplate
    ? entries.filter((entry) => entry.template_id === selectedTemplate.id)
    : [];

  const closeModal = () => {
    setActiveModal(null);
    setEditingObjectiveId(null);
    setEditingTemplateId(null);
  };

  const openCreateObjective = () => setActiveModal("create-objective");
  const openCreateTemplate = () => setActiveModal("create-template");
  const openEditObjective = (id: string) => {
    setEditingObjectiveId(id);
    setActiveModal("edit-objective");
  };
  const openEditTemplate = (id: string) => {
    setEditingTemplateId(id);
    setActiveModal("edit-template");
  };

  return (
    <>
      <SectionHeader
        title="Planning Studio"
        description="Design objectives and weekly templates with clearer, faster structure."
        action={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={openCreateObjective}
              className="inline-flex items-center gap-2 rounded-lg bg-[#0b1f3b] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#102a52]"
            >
              <Plus size={16} />
              Objective
            </button>
            <button
              type="button"
              onClick={openCreateTemplate}
              className="inline-flex items-center gap-2 rounded-lg bg-[#1e3a6d] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#274881]"
            >
              <Plus size={16} />
              Template
            </button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-wide text-[#4a5f83]">Objectives</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-[#0c1d3c]">{stats.objectivesCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-wide text-[#4a5f83]">Templates</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-[#0c1d3c]">{stats.templatesCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-wide text-[#4a5f83]">Template tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-[#0c1d3c]">{stats.totalTemplateEntries}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-wide text-[#4a5f83]">Generated weeks</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-[#0c1d3c]">{stats.assignedWeeksCount}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Workflow</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-[#4a5f83]">
          <p>1. Create objective.</p>
          <p>2. Create one template with day tasks, purpose/objective, average minutes, and optional start times.</p>
          <p>3. Assign template to week in Execution Tracker. Then track checkboxes + minutes there.</p>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Objectives</CardTitle>
          </CardHeader>
          <CardContent>
            {objectives.length > 0 ? (
              <div className="grid gap-3 lg:grid-cols-3">
                {objectives.map((objective) => {
                  const templateCount = templateIdsByObjective[objective.id]?.length ?? 0;
                  return (
                    <div
                      key={objective.id}
                      className="group relative overflow-hidden rounded-xl border border-[#d7e0f1] bg-white shadow-[0_2px_8px_rgba(11,31,59,0.06)] transition-all duration-200 hover:border-[#b8cae8] hover:shadow-[0_8px_24px_rgba(11,31,59,0.1)]"
                    >
                      {objective.image_url ? (
                        <div className="relative h-32 w-full overflow-hidden bg-[#e8eefb]">
                          <Image
                            src={objective.image_url}
                            alt={objective.title}
                            fill
                            className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                          />
                          <button
                            type="button"
                            onClick={() => openEditObjective(objective.id)}
                            className="absolute right-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-lg bg-white/95 px-2.5 py-1.5 text-xs font-medium text-[#23406d] shadow-md backdrop-blur-sm transition hover:bg-white hover:shadow-lg"
                          >
                            <Pencil size={14} />
                            Edit
                          </button>
                        </div>
                      ) : (
                        <div className="relative h-20 w-full bg-gradient-to-br from-[#e8eefb] to-[#f0f4fc]">
                          <button
                            type="button"
                            onClick={() => openEditObjective(objective.id)}
                            className="absolute right-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-lg bg-white/95 px-2.5 py-1.5 text-xs font-medium text-[#23406d] shadow-md backdrop-blur-sm transition hover:bg-white hover:shadow-lg"
                          >
                            <Pencil size={14} />
                            Edit
                          </button>
                        </div>
                      )}
                      <div className="p-4">
                        <p className="truncate text-base font-semibold text-[#0c1d3c]">{objective.title}</p>
                        {objective.description ? (
                          <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-[#4a5f83]">
                            {objective.description}
                          </p>
                        ) : null}
                        <p className="mt-2 text-xs font-medium text-[#6b7da1]">
                          {templateCount} template{templateCount !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-[#4a5f83]">No objectives yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Template Stack</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {templates.length > 0 ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="templateStackSelect">Choose template</Label>
                  <Select
                    id="templateStackSelect"
                    value={selectedTemplate?.id ?? ""}
                    onChange={(event) => setSelectedTemplateId(event.target.value)}
                  >
                    {templates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                      </option>
                    ))}
                  </Select>
                </div>

                {selectedTemplate ? (
                  <div className="group relative overflow-hidden rounded-xl border border-[#d7e0f1] bg-white shadow-[0_2px_8px_rgba(11,31,59,0.06)] transition-all duration-200 hover:border-[#b8cae8] hover:shadow-[0_8px_24px_rgba(11,31,59,0.1)]">
                    <div className="relative flex items-start justify-between gap-3 border-b border-[#ecebf6] bg-[#fafbff] px-4 py-3 pr-12">
                      <p className="min-w-0 flex-1 truncate text-sm font-semibold text-[#0c1d3c]">
                        {selectedTemplate.name}
                      </p>
                      <Badge variant="secondary" className="shrink-0">
                        {selectedTemplateEntries.length} task{selectedTemplateEntries.length !== 1 ? "s" : ""}
                      </Badge>
                      <button
                        type="button"
                        onClick={() => openEditTemplate(selectedTemplate.id)}
                        aria-label="Edit template"
                        className="absolute right-3 top-3 z-10 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-sm text-[#23406d] transition hover:bg-[#edf3ff] hover:shadow-md"
                      >
                        <Pencil size={14} />
                      </button>
                    </div>
                    <div className="p-4">
                      {selectedTemplateEntries.length > 0 ? (
                        <div className="space-y-0">
                          {[1, 2, 3, 4, 5, 6, 7].map((dayOfWeek) => {
                            const dayEntries = selectedTemplateEntries.filter((entry) => entry.day_of_week === dayOfWeek);
                            if (dayEntries.length === 0) return null;
                            return (
                              <div key={dayOfWeek}>
                                {dayOfWeek > 1 ? <div className="my-4 border-t-2 border-violet-200" /> : null}
                                <div className="space-y-2">
                                  {dayEntries.map((entry) => {
                                    const task = taskById[entry.habit_id];
                                    const startTime = getStartTime(task?.metadata);
                                    const taskObjective = objectiveById[task?.objective_id ?? ""]?.title ?? "Objective";
                                    return (
                                      <div
                                        key={entry.id}
                                        className="rounded-lg border border-[#e8eefb] bg-[#fafbff] px-3 py-2 transition-colors hover:border-[#d7e0f1] hover:bg-[#f8fbff]"
                                      >
                                        <p className="text-xs font-semibold text-[#0c1d3c]">
                                          {dayName[dayOfWeek - 1]} · {task?.title ?? "Task"}
                                        </p>
                                        <p className="mt-0.5 text-[11px] leading-relaxed text-[#4a5f83]">
                                          {entry.planned_minutes} min planned · Min {entry.minimum_minutes} min
                                          {startTime ? ` · ${startTime}` : ""}
                                          {taskObjective ? ` · ${taskObjective}` : ""}
                                          {entry.is_required ? " · Required" : ""}
                                        </p>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-sm text-[#6b7da1]">No day tasks yet.</p>
                      )}
                    </div>
                  </div>
                ) : null}
              </>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-[#4a5f83]">No templates yet.</p>
                <button
                  type="button"
                  onClick={openCreateTemplate}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#0b1f3b] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#102a52]"
                >
                  <Plus size={16} />
                  Create first template
                </button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create objective modal */}
      {activeModal === "create-objective" ? (
        <ModalShell
          title="Create objective"
          description="Main result you want to achieve."
          onClose={closeModal}
        >
          <ActionForm
            action={createObjectiveFormAction}
            className="space-y-4"
            onSuccess={closeModal}
          >
            <input type="hidden" name="returnPath" value="/planning" />
            <div className="space-y-2">
              <Label htmlFor="objectiveTitle">Title</Label>
              <Input
                id="objectiveTitle"
                name="title"
                required
                placeholder="e.g. Improve coding productivity"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="objectiveDescription">Description (optional)</Label>
              <Textarea
                id="objectiveDescription"
                name="description"
                placeholder="Short context for this objective."
              />
            </div>
            <PexelsImagePicker inputName="imageUrl" label="Objective image (optional)" />
            <SubmitButton label="Save objective" pendingLabel="Saving..." className="w-full sm:w-auto" />
          </ActionForm>
        </ModalShell>
      ) : null}

      {/* Edit objective modal */}
      {activeModal === "edit-objective" && editingObjective ? (
        <ModalShell
          title="Edit objective"
          description="Update title, description, or image."
          onClose={closeModal}
        >
          <ActionForm
            action={updateObjectiveFormAction}
            className="space-y-4"
            onSuccess={closeModal}
          >
            <input type="hidden" name="returnPath" value="/planning" />
            <input type="hidden" name="objectiveId" value={editingObjective.id} />
            <div className="space-y-2">
              <Label htmlFor="editObjectiveTitle">Title</Label>
              <Input
                id="editObjectiveTitle"
                name="title"
                required
                defaultValue={editingObjective.title}
                placeholder="e.g. Improve coding productivity"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editObjectiveDescription">Description (optional)</Label>
              <Textarea
                id="editObjectiveDescription"
                name="description"
                defaultValue={editingObjective.description ?? ""}
                placeholder="Short context for this objective."
              />
            </div>
            <PexelsImagePicker
              inputName="imageUrl"
              label="Objective image (optional)"
              defaultValue={editingObjective.image_url ?? ""}
            />
            <SubmitButton label="Save changes" pendingLabel="Saving..." className="w-full sm:w-auto" />
          </ActionForm>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#ecebf6] pt-4">
            <div className="text-xs text-[#4a5f83]">
              {(taskCountByObjective[editingObjective.id] ?? 0) === 0
                ? "This objective is empty and can be deleted."
                : `Delete unavailable: ${taskCountByObjective[editingObjective.id] ?? 0} habit${(taskCountByObjective[editingObjective.id] ?? 0) !== 1 ? "s" : ""} linked.`}
            </div>
            {(taskCountByObjective[editingObjective.id] ?? 0) === 0 ? (
              <ActionForm action={deleteObjectiveFormAction} onSuccess={closeModal}>
                <input type="hidden" name="returnPath" value="/planning" />
                <input type="hidden" name="objectiveId" value={editingObjective.id} />
                <button
                  type="submit"
                  className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#fecaca] bg-[#fef2f2] px-4 py-2 text-sm font-medium text-[#b91c1c] transition hover:bg-[#fee2e2]"
                >
                  <Trash2 size={14} />
                  Delete objective
                </button>
              </ActionForm>
            ) : null}
          </div>
        </ModalShell>
      ) : null}

      {/* Create template modal */}
      {activeModal === "create-template" ? (
        <ModalShell
          title="Create template"
          description="Each day can have multiple tasks. Each task has its own objective."
          onClose={closeModal}
        >
          {objectives.length === 0 ? (
            <p className="text-sm text-[#4a5f83]">Create objective first.</p>
          ) : (
            <ActionForm
              action={createTemplateWithDailyTasksFormAction}
              className="space-y-4"
              onSuccess={closeModal}
            >
              <input type="hidden" name="returnPath" value="/planning" />
              <div className="space-y-2">
                <Label htmlFor="templateName">Template name</Label>
                <Input
                  id="templateName"
                  name="name"
                  required
                  placeholder="e.g. Focus Week, Exam Week"
                />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-[#0c1d3c]">Daily tasks</p>
                <TemplateTaskBuilder
                  objectives={objectives.map((o) => ({ id: o.id, title: o.title }))}
                />
              </div>
              <SubmitButton label="Save template" pendingLabel="Saving..." className="w-full sm:w-auto" />
            </ActionForm>
          )}
        </ModalShell>
      ) : null}

      {/* Edit template modal */}
      {activeModal === "edit-template" ? (
        editingTemplate ? (
          <ModalShell
            title={`Edit ${editingTemplate.name}`}
            description="Adjust template tasks carefully—future generated weeks inherit these changes."
            onClose={closeModal}
          >
            {objectives.length === 0 ? (
              <p className="text-sm text-[#4a5f83]">Create an objective first.</p>
            ) : (
              <>
                <ActionForm
                  action={updateTemplateWithDailyTasksFormAction}
                  className="space-y-4"
                  onSuccess={closeModal}
                >
                  <input type="hidden" name="returnPath" value="/planning" />
                  <input type="hidden" name="templateId" value={editingTemplate.id} />
                  <div className="space-y-2">
                    <Label htmlFor="editTemplateName">Template name</Label>
                    <Input
                      id="editTemplateName"
                      name="name"
                      required
                      defaultValue={editingTemplate.name}
                    />
                  </div>
                  <TemplateTaskBuilder
                    objectives={objectives.map((o) => ({ id: o.id, title: o.title }))}
                    initialTasks={editingTemplateInitialTasks}
                  />
                  <SubmitButton
                    label="Save template changes"
                    pendingLabel="Saving..."
                    className="w-full sm:w-auto"
                  />
                </ActionForm>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#ecebf6] pt-4">
                  <div className="text-xs text-[#4a5f83]">
                    {editingTemplateInitialTasks.length === 0 && (weekCountByTemplate[editingTemplate.id] ?? 0) === 0
                      ? "This template is empty and can be deleted."
                      : `Delete unavailable: ${editingTemplateInitialTasks.length} task${editingTemplateInitialTasks.length !== 1 ? "s" : ""} and ${weekCountByTemplate[editingTemplate.id] ?? 0} generated week${(weekCountByTemplate[editingTemplate.id] ?? 0) !== 1 ? "s" : ""}.`}
                  </div>
                  {editingTemplateInitialTasks.length === 0 && (weekCountByTemplate[editingTemplate.id] ?? 0) === 0 ? (
                    <ActionForm action={deleteTemplateFormAction} onSuccess={closeModal}>
                      <input type="hidden" name="returnPath" value="/planning" />
                      <input type="hidden" name="templateId" value={editingTemplate.id} />
                      <button
                        type="submit"
                        className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#fecaca] bg-[#fef2f2] px-4 py-2 text-sm font-medium text-[#b91c1c] transition hover:bg-[#fee2e2]"
                      >
                        <Trash2 size={14} />
                        Delete template
                      </button>
                    </ActionForm>
                  ) : null}
                </div>
              </>
            )}
          </ModalShell>
        ) : (
          <ModalShell
            title="Template not found"
            description="Select another template to edit."
            onClose={closeModal}
          >
            <p className="text-sm text-[#4a5f83]">The requested template is unavailable.</p>
          </ModalShell>
        )
      ) : null}
    </>
  );
}
