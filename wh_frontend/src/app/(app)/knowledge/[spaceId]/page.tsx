import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, FileText, Link2, Pencil, Plus } from "lucide-react";

import { ActionForm } from "@/components/forms/action-form";
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
import { getKnowledgeSpaceById, getKnowledgeSpaceItems } from "@/lib/queries";
import { requireAppContext } from "@/lib/server-context";
import { toDateInputValue } from "@/lib/utils";

import {
  createKnowledgeItemFormAction,
  updateKnowledgeItemFormAction,
  updateKnowledgeSpaceFormAction
} from "../actions";

type KnowledgeItem = {
  id: string;
  space_id: string;
  kind: "link" | "note";
  title: string | null;
  url: string | null;
  content: string | null;
  created_at: string;
};

function buildKnowledgeSpaceHref(spaceId: string, modal?: "new-item" | "edit-item" | "edit-space", itemId?: string) {
  const params = new URLSearchParams();
  if (modal) {
    params.set("modal", modal);
  }
  if (itemId) {
    params.set("itemId", itemId);
  }
  const queryString = params.toString();
  return queryString.length > 0 ? `/knowledge/${spaceId}?${queryString}` : `/knowledge/${spaceId}`;
}

export default async function KnowledgeSpacePage({
  params,
  searchParams
}: {
  params: Promise<{ spaceId: string }>;
  searchParams: Promise<{ error?: string; success?: string; modal?: string; itemId?: string }>;
}) {
  const { spaceId } = await params;
  const query = await searchParams;
  const errorMessage = query.error?.trim();
  const successMessage = query.success?.trim();
  const modal = query.modal?.trim();
  const modalItemId = query.itemId?.trim();
  const { supabase, account } = await requireAppContext();

  const space = await getKnowledgeSpaceById(supabase, spaceId, account.accountId);
  if (!space) notFound();

  const items = (await getKnowledgeSpaceItems(supabase, spaceId)) as KnowledgeItem[];

  const linksCount = items.filter((item) => item.kind === "link").length;
  const notesCount = items.filter((item) => item.kind === "note").length;
  const selectedItem = modal === "edit-item" && modalItemId ? items.find((item) => item.id === modalItemId) : null;
  const closeModalHref = buildKnowledgeSpaceHref(space.id);

  return (
    <div className="space-y-6">
      <SectionHeader
        title={space.title}
        description="Simple topic workspace: add links with optional notes, or standalone notes."
        action={
          <div className="flex items-center gap-2">
            <a
              href={buildKnowledgeSpaceHref(space.id, "edit-space")}
              className="inline-flex items-center gap-2 rounded-lg border border-[#c7d3e8] bg-[#edf3ff] px-3 py-2 text-sm font-medium text-[#23406d] transition hover:bg-[#e3ebf9]"
            >
              <Pencil size={16} />
              Edit topic
            </a>
            <a
              href={buildKnowledgeSpaceHref(space.id, "new-item")}
              className="inline-flex items-center gap-2 rounded-lg bg-[#0b1f3b] px-3 py-2 text-sm font-medium text-white transition hover:bg-[#102a52]"
            >
              <Plus size={16} />
              Add item
            </a>
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
      {modal === "edit-item" && modalItemId && !selectedItem ? <Alert variant="error">Item not found for editing.</Alert> : null}

      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Items Overview</CardTitle>
          <div className="flex items-center gap-2">
            <Badge>{items.length} items</Badge>
            <Badge variant="secondary">{linksCount} links</Badge>
            <Badge variant="secondary">{notesCount} notes</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600">
            Add and edit entries from modal dialogs to keep the page focused on your item list.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Topic Items</CardTitle>
        </CardHeader>
        <CardContent>
          {items.length > 0 ? (
            <div className="space-y-3">
              {items.map((item) => {
                const editHref = buildKnowledgeSpaceHref(space.id, "edit-item", item.id);

                return (
                  <article key={item.id} className="space-y-3 rounded-lg border border-slate-200 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {item.kind === "link" ? <Link2 size={14} className="text-slate-500" /> : <FileText size={14} className="text-slate-500" />}
                        <Badge variant={item.kind === "link" ? "default" : "secondary"}>{item.kind}</Badge>
                        <span className="text-xs text-slate-500">{toDateInputValue(new Date(item.created_at))}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {item.kind === "link" && item.url ? (
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 hover:text-slate-900"
                          >
                            Open
                            <ExternalLink size={12} />
                          </a>
                        ) : null}
                        <a
                          href={editHref}
                          className="inline-flex items-center gap-1 rounded-md border border-[#c7d3e8] bg-[#edf3ff] px-2.5 py-1.5 text-xs font-medium text-[#23406d] hover:bg-[#e3ebf9]"
                        >
                          <Pencil size={12} />
                          Edit
                        </a>
                      </div>
                    </div>

                    {item.title ? <h4 className="text-sm font-semibold text-slate-900">{item.title}</h4> : null}
                    {item.kind === "link" && item.url ? (
                      <p className="text-sm text-slate-600">{item.url}</p>
                    ) : (
                      <p className="text-sm text-slate-600">{item.content}</p>
                    )}
                    {item.kind === "link" && item.content ? <p className="text-sm text-slate-500">{item.content}</p> : null}
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No items yet. Add your first link or note above.</p>
          )}
        </CardContent>
      </Card>

      {modal === "new-item" ? (
        <ModalShell
          title="Add Item"
          description="Create either a link entry or a note entry for this topic."
          closeHref={closeModalHref}
        >
          <ActionForm action={createKnowledgeItemFormAction} className="space-y-3">
            <input type="hidden" name="spaceId" value={space.id} />
            <input type="hidden" name="returnPath" value={`/knowledge/${space.id}`} />

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="new-kind">Item type</Label>
                <Select id="new-kind" name="kind" defaultValue="link">
                  <option value="link">Link</option>
                  <option value="note">Note</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-title">Title (optional)</Label>
                <Input id="new-title" name="title" placeholder="Short label" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-url">Link URL (required for link type)</Label>
              <Input id="new-url" name="url" placeholder="https://..." />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-content">Note / description</Label>
              <Textarea
                id="new-content"
                name="content"
                placeholder="For note type: write your full note. For link type: optional note about the link."
                className="min-h-24"
              />
            </div>

            <SubmitButton label="Add item" pendingLabel="Saving..." className="w-full sm:w-auto" />
          </ActionForm>
        </ModalShell>
      ) : null}

      {modal === "edit-item" && selectedItem ? (
        <ModalShell title="Edit Item" description="Update this entry and save changes." closeHref={closeModalHref}>
          <ActionForm action={updateKnowledgeItemFormAction} className="space-y-3">
            <input type="hidden" name="itemId" value={selectedItem.id} />
            <input type="hidden" name="returnPath" value={`/knowledge/${space.id}`} />

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor={`kind-${selectedItem.id}`}>Type</Label>
                <Select id={`kind-${selectedItem.id}`} name="kind" defaultValue={selectedItem.kind}>
                  <option value="link">Link</option>
                  <option value="note">Note</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor={`title-${selectedItem.id}`}>Title</Label>
                <Input id={`title-${selectedItem.id}`} name="title" defaultValue={selectedItem.title ?? ""} placeholder="Optional" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor={`url-${selectedItem.id}`}>URL</Label>
              <Input id={`url-${selectedItem.id}`} name="url" defaultValue={selectedItem.url ?? ""} placeholder="https://..." />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`content-${selectedItem.id}`}>Note / description</Label>
              <Textarea
                id={`content-${selectedItem.id}`}
                name="content"
                defaultValue={selectedItem.content ?? ""}
                className="min-h-24"
                placeholder="Optional for links, required for note type."
              />
            </div>

            <SubmitButton label="Save changes" pendingLabel="Saving..." className="w-full sm:w-auto" />
          </ActionForm>
        </ModalShell>
      ) : null}

      {modal === "edit-space" ? (
        <ModalShell title="Edit Topic" description="Update the topic title or cover image." closeHref={closeModalHref}>
          <ActionForm action={updateKnowledgeSpaceFormAction} className="space-y-4">
            <input type="hidden" name="returnPath" value={`/knowledge/${space.id}`} />
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
            <PexelsImagePicker
              inputName="imageUrl"
              label="Topic image (optional)"
              defaultValue={space.image_url ?? ""}
            />
            <SubmitButton label="Save changes" pendingLabel="Saving..." className="w-full sm:w-auto" />
          </ActionForm>
        </ModalShell>
      ) : null}
    </div>
  );
}
