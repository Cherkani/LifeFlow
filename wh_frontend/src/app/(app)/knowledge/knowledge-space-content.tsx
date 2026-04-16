"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, BookOpen, Check, ExternalLink, FileText, Link2, List, Pencil, Plus, Trash2 } from "lucide-react";

import { KnowledgeCarousel } from "./knowledge-carousel";
import { KnowledgeRevisionCards } from "./knowledge-revision-cards";

import { ActionForm } from "@/components/forms/action-form";
import type { RedirectResult } from "@/lib/action-with-state";
import { PexelsImagePicker } from "@/components/forms/pexels-image-picker";
import { SubmitButton } from "@/components/forms/submit-button";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ModalShell } from "@/components/ui/modal-shell";
import { SectionHeader } from "@/components/ui/section-header";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  createKnowledgeItemFormAction,
  deleteKnowledgeSpaceFormAction,
  deleteKnowledgeItemFormAction,
  toggleKnowledgeItemCheckedFormAction,
  updateKnowledgeItemFormAction,
  updateKnowledgeSpaceFormAction
} from "@/app/(app)/knowledge/actions";

type KnowledgeItem = {
  id: string;
  space_id: string;
  kind: "link" | "note" | "bullets";
  title: string | null;
  url: string | null;
  content: string | null;
  created_at: string;
  checked: boolean;
};

type KnowledgeSpace = {
  id: string;
  title: string;
  image_url: string | null;
};

function parseBullets(content: string): string[] {
  return content
    .split(/\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => (line.replace(/^[-*•]\s*/, "")));
}

type AddItemFormProps = {
  spaceId: string;
  returnPath: string;
  action: (prevState: RedirectResult | null, formData: FormData) => Promise<RedirectResult | null>;
  onSuccess: () => void;
};

function AddItemForm({ spaceId, returnPath, action, onSuccess }: AddItemFormProps) {
  const [kind, setKind] = useState<"link" | "note" | "bullets">("note");

  return (
    <ActionForm action={action} className="space-y-4" onSuccess={onSuccess} refreshOnly>
      <input type="hidden" name="spaceId" value={spaceId} />
      <input type="hidden" name="returnPath" value={returnPath} />

      <div className="space-y-2">
        <Label htmlFor="new-kind">Type</Label>
        <Select
          id="new-kind"
          name="kind"
          value={kind}
          onChange={(e) => setKind(e.target.value as "link" | "note" | "bullets")}
        >
          <option value="link">Link — Save a URL with optional notes</option>
          <option value="note">Note — Free-form text</option>
          <option value="bullets">Bullets — List items, one per line</option>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="new-title">Title</Label>
        <Input
          id="new-title"
          name="title"
          placeholder={kind === "link" ? "e.g. Article name" : kind === "bullets" ? "e.g. Key points" : "e.g. Main idea"}
        />
      </div>

      {kind === "link" ? (
        <>
          <div className="space-y-2">
            <Label htmlFor="new-url">URL *</Label>
            <Input id="new-url" name="url" type="url" required placeholder="https://..." />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-content">Notes (optional)</Label>
            <Textarea id="new-content" name="content" placeholder="Add context or summary..." className="min-h-20" />
          </div>
        </>
      ) : kind === "bullets" ? (
        <>
          <div className="space-y-2">
            <Label htmlFor="new-content">Items *</Label>
            <Textarea
              id="new-content"
              name="content"
              required
              placeholder="One item per line:&#10;First point&#10;Second point&#10;Third point"
              className="min-h-32 font-mono text-sm"
            />
            <p className="text-xs text-slate-500">Each line becomes a bullet. Prefix with - or * if you like.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-url">Link (optional)</Label>
            <Input id="new-url" name="url" type="url" placeholder="Add a Check button to open this URL" />
          </div>
        </>
      ) : (
        <>
          <div className="space-y-2">
            <Label htmlFor="new-content">Content *</Label>
            <Textarea
              id="new-content"
              name="content"
              required
              placeholder="Write your note here..."
              className="min-h-32"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-url">Link (optional)</Label>
            <Input id="new-url" name="url" type="url" placeholder="Add a Check button to open this URL" />
          </div>
        </>
      )}

      <SubmitButton label="Add item" pendingLabel="Saving..." className="w-full sm:w-auto" />
    </ActionForm>
  );
}

function formatDate(iso: string) {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

type KnowledgeSpaceContentProps = {
  space: KnowledgeSpace;
  items: KnowledgeItem[];
  errorMessage?: string | null;
  successMessage?: string | null;
};

export function KnowledgeSpaceContent({ space, items, errorMessage, successMessage }: KnowledgeSpaceContentProps) {
  const [activeModal, setActiveModal] = useState<"new-item" | "edit-item" | "edit-space" | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  const [revisionMode, setRevisionMode] = useState(false);

  const editingItem = editingItemId ? items.find((i) => i.id === editingItemId) ?? null : null;
  const returnPath = `/knowledge/${space.id}`;

  const linksCount = items.filter((i) => i.kind === "link").length;
  const notesCount = items.filter((i) => i.kind === "note").length;
  const bulletsCount = items.filter((i) => i.kind === "bullets").length;

  const closeModal = () => {
    setActiveModal(null);
    setEditingItemId(null);
  };

  return (
    <>
      <SectionHeader
        title={space.title}
        description="Simple topic workspace: add links with optional notes, standalone notes, or bullet lists."
        action={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveModal("edit-space")}
              className="inline-flex items-center gap-2 rounded-lg border border-[#c7d3e8] bg-[#edf3ff] px-3 py-2 text-sm font-medium text-[#23406d] transition hover:bg-[#e3ebf9]"
            >
              <Pencil size={16} />
              Edit topic
            </button>
            <button
              type="button"
              onClick={() => {
                setEditingItemId(null);
                setActiveModal("new-item");
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-[#0b1f3b] px-3 py-2 text-sm font-medium text-white transition hover:bg-[#102a52]"
            >
              <Plus size={16} />
              Add item
            </button>
            <button
              type="button"
              onClick={() => setRevisionMode(true)}
              disabled={items.length === 0}
              className="inline-flex items-center gap-2 rounded-lg border border-[#c7d3e8] bg-[#edf3ff] px-3 py-2 text-sm font-medium text-[#23406d] transition hover:bg-[#e3ebf9] disabled:opacity-50 disabled:hover:bg-[#edf3ff]"
            >
              <BookOpen size={16} />
              Revision cards
            </button>
            <Link
              href="/knowledge"
              className="inline-flex items-center gap-2 rounded-lg border border-[#c7d3e8] bg-[#edf3ff] px-3 py-2 text-sm font-medium text-[#23406d] transition hover:bg-[#e3ebf9]"
            >
              <ArrowLeft size={16} />
              Back to topics
            </Link>
          </div>
        }
      />

      {errorMessage ? <Alert variant="error">{errorMessage}</Alert> : null}
      {successMessage ? <Alert variant="success">{successMessage}</Alert> : null}

      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Items Overview</CardTitle>
          <div className="flex items-center gap-2">
            <Badge>{items.length} items</Badge>
            <Badge variant="secondary">{linksCount} links</Badge>
            <Badge variant="secondary">{notesCount} notes</Badge>
            <Badge variant="secondary">{bulletsCount} bullets</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600">
            Add and edit entries from modal dialogs. Links show as a Check button; notes show content only.
          </p>
        </CardContent>
      </Card>

      {items.length > 0 ? (
        <Card>
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Cards view</CardTitle>
            <button
              type="button"
              onClick={() => setRevisionMode(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-[#0b1f3b] px-3 py-2 text-sm font-medium text-white transition hover:bg-[#102a52]"
            >
              <BookOpen size={16} />
              Full-screen mode
            </button>
          </CardHeader>
          <CardContent>
            <KnowledgeCarousel items={items} onEdit={(id) => { setEditingItemId(id); setActiveModal("edit-item"); }} />
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Topic Items</CardTitle>
        </CardHeader>
        <CardContent>
          {items.length > 0 ? (
            <div className="space-y-3">
              {items.map((item) => {
                const hasLink = item.url && item.url.length > 0;
                const isLink = item.kind === "link";
                const isBullets = item.kind === "bullets";

                return (
                  <article
                    key={item.id}
                    className={`space-y-3 rounded-lg border border-slate-200 p-4 ${item.checked ? "opacity-70" : ""}`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <ActionForm action={toggleKnowledgeItemCheckedFormAction} className="inline" refreshOnly>
                          <input type="hidden" name="returnPath" value={returnPath} />
                          <input type="hidden" name="itemId" value={item.id} />
                          <button
                            type="submit"
                            aria-label={item.checked ? "Mark as not done" : "Mark as done"}
                            className={`inline-flex shrink-0 items-center justify-center rounded-md border transition ${
                              item.checked
                                ? "border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                : "border-slate-300 bg-white text-slate-400 hover:border-slate-400 hover:bg-slate-50"
                            }`}
                          >
                            {item.checked ? (
                              <Check size={16} className="stroke-[2.5]" />
                            ) : (
                              <span className="h-4 w-4 rounded-sm border-2 border-current" />
                            )}
                          </button>
                        </ActionForm>
                        {item.kind === "link" ? (
                          <Link2 size={14} className="text-slate-500" />
                        ) : item.kind === "bullets" ? (
                          <List size={14} className="text-slate-500" />
                        ) : (
                          <FileText size={14} className="text-slate-500" />
                        )}
                        <Badge variant={item.kind === "link" ? "default" : "secondary"}>{item.kind}</Badge>
                        <span className="text-xs text-slate-500">{formatDate(item.created_at)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {hasLink ? (
                          <a
                            href={item.url!}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 rounded-md border border-[#c7d3e8] bg-[#edf3ff] px-2.5 py-1.5 text-xs font-medium text-[#23406d] transition hover:bg-[#e3ebf9]"
                          >
                            Check
                            <ExternalLink size={12} />
                          </a>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => {
                            setEditingItemId(item.id);
                            setActiveModal("edit-item");
                          }}
                          className="inline-flex items-center gap-1 rounded-md border border-[#c7d3e8] bg-[#edf3ff] px-2.5 py-1.5 text-xs font-medium text-[#23406d] hover:bg-[#e3ebf9]"
                        >
                          <Pencil size={12} />
                          Edit
                        </button>
                        <ActionForm action={deleteKnowledgeItemFormAction} className="inline" refreshOnly>
                          <input type="hidden" name="returnPath" value={returnPath} />
                          <input type="hidden" name="itemId" value={item.id} />
                          <button
                            type="button"
                            aria-label="Delete item"
                            onClick={() => setDeletingItemId(item.id)}
                            className="inline-flex items-center gap-1 rounded-md border border-[#fecaca] bg-[#fef2f2] px-2 py-1 text-xs font-medium text-[#b91c1c] hover:bg-[#fee2e2]"
                          >
                            <Trash2 size={12} />
                            Delete
                          </button>
                        </ActionForm>
                      </div>
                    </div>

                    {item.title ? (
                      <h4 className={`text-sm font-semibold text-slate-900 ${item.checked ? "line-through text-slate-500" : ""}`}>
                        {item.title}
                      </h4>
                    ) : null}

                    {isLink ? (
                      <>
                        {item.content ? (
                          <p className={`text-sm text-slate-600 ${item.checked ? "line-through text-slate-500" : ""}`}>
                            {item.content}
                          </p>
                        ) : null}
                        {!item.content && item.url ? (
                          <p className={`text-sm text-slate-500 ${item.checked ? "line-through text-slate-500" : ""}`}>
                            {item.url}
                          </p>
                        ) : null}
                      </>
                    ) : isBullets ? (
                      <ul
                        className={`list-inside list-disc space-y-1 text-sm text-slate-600 ${
                          item.checked ? "line-through text-slate-500" : ""
                        }`}
                      >
                        {parseBullets(item.content ?? "").map((bullet, i) => (
                          <li key={i}>{bullet}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className={`text-sm text-slate-600 ${item.checked ? "line-through text-slate-500" : ""}`}>
                        {item.content}
                      </p>
                    )}
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No items yet. Add your first link, note, or bullets above.</p>
          )}
        </CardContent>
      </Card>

      {/* New item modal */}
      {activeModal === "new-item" ? (
        <ModalShell title="Add Item" description="Add a link to save, a note to remember, or a bullet list to track." onClose={closeModal}>
          <AddItemForm
            spaceId={space.id}
            returnPath={returnPath}
            action={createKnowledgeItemFormAction}
            onSuccess={closeModal}
          />
        </ModalShell>
      ) : null}

      {/* Edit item modal */}
      {activeModal === "edit-item" && editingItem ? (
        <ModalShell title="Edit Item" description="Update this entry and save changes." onClose={closeModal}>
          <div className="space-y-4">
            <ActionForm action={updateKnowledgeItemFormAction} className="space-y-3" onSuccess={closeModal} refreshOnly>
              <input type="hidden" name="itemId" value={editingItem.id} />
              <input type="hidden" name="returnPath" value={returnPath} />

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor={`kind-${editingItem.id}`}>Type</Label>
                  <Select id={`kind-${editingItem.id}`} name="kind" defaultValue={editingItem.kind}>
                    <option value="link">Link</option>
                    <option value="note">Note</option>
                    <option value="bullets">Bullets</option>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`title-${editingItem.id}`}>Title</Label>
                  <Input id={`title-${editingItem.id}`} name="title" defaultValue={editingItem.title ?? ""} placeholder="Optional" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor={`url-${editingItem.id}`}>URL (optional for notes/bullets)</Label>
                <Input id={`url-${editingItem.id}`} name="url" defaultValue={editingItem.url ?? ""} placeholder="https://..." />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`content-${editingItem.id}`}>Note / description</Label>
                <Textarea
                  id={`content-${editingItem.id}`}
                  name="content"
                  defaultValue={editingItem.content ?? ""}
                  className="min-h-24"
                  placeholder="Required for note/bullets. For bullets: one item per line."
                />
              </div>

              <SubmitButton label="Save changes" pendingLabel="Saving..." className="w-full sm:w-auto" />
            </ActionForm>

            <div className="border-t border-[#d7e0f1] pt-4">
              <ActionForm action={deleteKnowledgeItemFormAction} onSuccess={closeModal} refreshOnly>
                <input type="hidden" name="returnPath" value={returnPath} />
                <input type="hidden" name="itemId" value={editingItem.id} />
                <button
                  type="button"
                  onClick={() => setDeletingItemId(editingItem.id)}
                  className="inline-flex items-center gap-2 rounded-md border border-[#fecaca] bg-[#fef2f2] px-3 py-2 text-sm font-medium text-[#b91c1c] hover:bg-[#fee2e2]"
                >
                  <Trash2 size={14} />
                  Delete item
                </button>
              </ActionForm>
            </div>
          </div>
        </ModalShell>
      ) : null}

      {/* Edit space modal */}
      {activeModal === "edit-space" ? (
        <ModalShell title="Edit Topic" description="Update the topic title or cover image." onClose={closeModal}>
          <ActionForm action={updateKnowledgeSpaceFormAction} className="space-y-4" onSuccess={closeModal} refreshOnly>
            <input type="hidden" name="returnPath" value={returnPath} />
            <input type="hidden" name="spaceId" value={space.id} />
            <div className="space-y-2">
              <Label htmlFor="editSpaceTitle">Topic title</Label>
              <Input
                id="editSpaceTitle"
                name="title"
                required
                defaultValue={space.title}
                placeholder="e.g. AI Research, Marketing"
              />
            </div>
            <PexelsImagePicker inputName="imageUrl" label="Topic image (optional)" defaultValue={space.image_url ?? ""} />
            <SubmitButton label="Save changes" pendingLabel="Saving..." className="w-full sm:w-auto" />
          </ActionForm>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#d7e0f1] pt-4">
            <div className="text-xs text-[#4a5f83]">
              {items.length === 0
                ? "This topic is empty and can be deleted."
                : `Delete unavailable: ${items.length} linked item${items.length !== 1 ? "s" : ""}.`}
            </div>
            {items.length === 0 ? (
              <ActionForm action={deleteKnowledgeSpaceFormAction} onSuccess={closeModal}>
                <input type="hidden" name="returnPath" value="/knowledge" />
                <input type="hidden" name="spaceId" value={space.id} />
                <SubmitButton
                  label="Delete topic"
                  pendingLabel="Deleting..."
                  className="h-10 rounded-lg border border-[#fecaca] bg-[#fef2f2] px-4 py-2 text-sm font-medium text-[#b91c1c] hover:bg-[#fee2e2]"
                />
              </ActionForm>
            ) : null}
          </div>
        </ModalShell>
      ) : null}

      {deletingItemId ? (
        <ModalShell title="Delete this item?" description="This action cannot be undone." onClose={() => setDeletingItemId(null)}>
          <ActionForm
            action={deleteKnowledgeItemFormAction}
            className="flex items-center justify-end gap-2"
            onSuccess={() => {
              setDeletingItemId(null);
              closeModal();
            }}
            refreshOnly
          >
            <input type="hidden" name="returnPath" value={returnPath} />
            <input type="hidden" name="itemId" value={deletingItemId} />
            <button
              type="button"
              onClick={() => setDeletingItemId(null)}
              className="inline-flex h-10 items-center justify-center rounded-lg border border-[var(--app-panel-border)] bg-[var(--app-btn-secondary-bg)] px-4 py-2 text-sm font-medium text-[var(--app-btn-secondary-fg)] transition hover:bg-[var(--app-btn-secondary-hover)]"
            >
              Cancel
            </button>
            <SubmitButton
              label="Delete"
              pendingLabel="Deleting..."
              className="h-10 rounded-lg border border-[var(--app-panel-border)] bg-[var(--ui-badge-danger-bg)] px-4 py-2 text-sm font-medium text-[var(--ui-badge-danger-fg)] hover:brightness-95"
            />
          </ActionForm>
        </ModalShell>
      ) : null}

      {revisionMode ? (
        <KnowledgeRevisionCards
          spaceTitle={space.title}
          items={items}
          onClose={() => setRevisionMode(false)}
        />
      ) : null}
    </>
  );
}
