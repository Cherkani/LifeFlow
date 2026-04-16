"use client";

import { useState } from "react";
import { ChevronRight, Pencil, Plus, Search, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { Route } from "next";

import { ActionForm } from "@/components/forms/action-form";
import { PexelsImagePicker } from "@/components/forms/pexels-image-picker";
import { SubmitButton } from "@/components/forms/submit-button";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ModalShell } from "@/components/ui/modal-shell";
import { SectionHeader } from "@/components/ui/section-header";
import {
  createKnowledgeSpaceFormAction,
  deleteKnowledgeSpaceFormAction,
  updateKnowledgeSpaceFormAction
} from "@/app/(app)/knowledge/actions";

import { CreateTopicForm } from "./create-topic-form";

type KnowledgeSpace = {
  id: string;
  title: string;
  image_url: string | null;
  updated_at: string;
};

type KnowledgeModalsProps = {
  spaces: KnowledgeSpace[];
  filteredSpaces: KnowledgeSpace[];
  countsBySpace: Record<string, { total: number; links: number; notes: number }>;
  query: string;
  errorMessage?: string;
  successMessage?: string;
};

function buildKnowledgeSpaceHref(spaceId: string): Route {
  return `/knowledge/${spaceId}` as Route;
}

export function KnowledgeModals({
  spaces,
  filteredSpaces,
  countsBySpace,
  query,
  errorMessage,
  successMessage
}: KnowledgeModalsProps) {
  const [activeModal, setActiveModal] = useState<"new-topic" | "edit-topic" | null>(null);
  const [editingSpaceId, setEditingSpaceId] = useState<string | null>(null);

  const editingSpace = editingSpaceId ? spaces.find((s) => s.id === editingSpaceId) ?? null : null;

  const closeModal = () => {
    setActiveModal(null);
    setEditingSpaceId(null);
  };

  return (
    <>
      <SectionHeader
        title="Knowledge Topics"
        description="Create a topic (space), then add simple link or note items inside it."
        action={
          <button
            type="button"
            onClick={() => setActiveModal("new-topic")}
            className="inline-flex items-center gap-2 rounded-lg bg-[#0b1f3b] px-3 py-2 text-sm font-medium text-white transition hover:bg-[#102a52]"
          >
            <Plus size={16} />
            New topic
          </button>
        }
      />

      {errorMessage ? <Alert variant="error">{errorMessage}</Alert> : null}
      {successMessage ? <Alert variant="success">{successMessage}</Alert> : null}

      <Card>
        <CardHeader>
          <CardTitle>Topics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form method="get" className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <div className="relative">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input name="q" defaultValue={query} className="pl-9" placeholder="Filter topics" />
            </div>
            <Button type="submit" variant="secondary">
              Apply
            </Button>
          </form>

          {filteredSpaces.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {filteredSpaces.map((space) => {
                const counts = countsBySpace[space.id] ?? { total: 0, links: 0, notes: 0 };
                return (
                  <div
                    key={space.id}
                    className="relative overflow-hidden rounded-xl border border-[#c7d3e8] bg-[#f2f6fe] transition hover:border-[#9eb3d8] hover:shadow-sm"
                  >
                    <Link href={buildKnowledgeSpaceHref(space.id)} className="block">
                      <div className="relative h-28 w-full bg-[#dde6f7]">
                        {space.image_url ? (
                          <Image src={space.image_url} alt={space.title} fill className="object-cover" />
                        ) : null}
                      </div>
                      <div className="p-4">
                        <h3 className="mb-2 text-sm font-semibold text-[#0c1d3c]">{space.title}</h3>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge>{counts.total} items</Badge>
                          <Badge variant="secondary">{counts.links} links</Badge>
                          <Badge variant="secondary">{counts.notes} notes</Badge>
                        </div>
                      </div>
                      <div className="flex items-center justify-between border-t border-[#d7e0f1] bg-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#4a5f83]">
                        <span>Click me</span>
                        <ChevronRight size={14} />
                      </div>
                    </Link>
                    <div className="absolute right-3 top-3 flex items-center gap-2">
                      {(counts.total ?? 0) === 0 ? (
                        <ActionForm action={deleteKnowledgeSpaceFormAction} onSuccess={closeModal}>
                          <input type="hidden" name="returnPath" value="/knowledge" />
                          <input type="hidden" name="spaceId" value={space.id} />
                          <button
                            type="submit"
                            aria-label="Delete topic"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#fecaca] bg-[#fef2f2] text-[#b91c1c] transition hover:bg-[#fee2e2]"
                            title="Delete empty topic"
                          >
                            <Trash2 size={16} />
                          </button>
                        </ActionForm>
                      ) : (
                        <button
                          type="button"
                          disabled
                          aria-label="Delete unavailable"
                          className="inline-flex h-8 w-8 cursor-not-allowed items-center justify-center rounded-md border border-[#e2e8f0] bg-[#f8fafc] text-[#94a3b8]"
                          title={`Delete unavailable: ${counts.total} linked item${counts.total !== 1 ? "s" : ""}`}
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setEditingSpaceId(space.id);
                          setActiveModal("edit-topic");
                        }}
                        aria-label="Edit topic"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#c7d3e8] bg-white text-[#0c1d3c] transition hover:bg-[#f1f5ff]"
                      >
                        <Pencil size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              {spaces.length === 0 ? "No topics yet. Create one above." : "No topics matched your filter."}
            </p>
          )}
        </CardContent>
      </Card>

      {activeModal === "new-topic" ? (
        <ModalShell title="Create Topic" description="Add a new topic and optionally select a cover image from Pexels." onClose={closeModal}>
          <CreateTopicForm action={createKnowledgeSpaceFormAction} onSuccess={closeModal} />
        </ModalShell>
      ) : null}

      {activeModal === "edit-topic" && editingSpace ? (
        <ModalShell title="Edit Topic" description="Update the topic title or cover image." onClose={closeModal}>
          <ActionForm action={updateKnowledgeSpaceFormAction} className="space-y-4" onSuccess={closeModal}>
            <input type="hidden" name="returnPath" value={`/knowledge/${editingSpace.id}`} />
            <input type="hidden" name="spaceId" value={editingSpace.id} />
            <div className="space-y-2">
              <Label htmlFor="editSpaceTitle">Topic title</Label>
              <Input
                id="editSpaceTitle"
                name="title"
                required
                defaultValue={editingSpace.title}
                placeholder="e.g. AI Research, Marketing"
              />
            </div>
            <PexelsImagePicker
              inputName="imageUrl"
              label="Topic image (optional)"
              defaultValue={editingSpace.image_url ?? ""}
            />
            <SubmitButton label="Save changes" pendingLabel="Saving..." className="w-full sm:w-auto" />
          </ActionForm>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#d7e0f1] pt-4">
            <div className="text-xs text-[#4a5f83]">
              {(countsBySpace[editingSpace.id]?.total ?? 0) === 0
                ? "This topic is empty and can be deleted."
                : `Delete unavailable: ${countsBySpace[editingSpace.id]?.total ?? 0} linked item${(countsBySpace[editingSpace.id]?.total ?? 0) !== 1 ? "s" : ""}.`}
            </div>
            {(countsBySpace[editingSpace.id]?.total ?? 0) === 0 ? (
              <ActionForm action={deleteKnowledgeSpaceFormAction} onSuccess={closeModal}>
                <input type="hidden" name="returnPath" value="/knowledge" />
                <input type="hidden" name="spaceId" value={editingSpace.id} />
                <button
                  type="submit"
                  className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#fecaca] bg-[#fef2f2] px-4 py-2 text-sm font-medium text-[#b91c1c] transition hover:bg-[#fee2e2]"
                >
                  <Trash2 size={14} />
                  Delete topic
                </button>
              </ActionForm>
            ) : null}
          </div>
        </ModalShell>
      ) : null}
    </>
  );
}
