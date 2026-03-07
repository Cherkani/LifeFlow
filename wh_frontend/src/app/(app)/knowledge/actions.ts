"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireAppContext } from "@/lib/server-context";

const createSpaceSchema = z.object({
  title: z.string().trim().min(2, "Space title is required").max(140)
});

const createItemSchema = z.object({
  spaceId: z.string().uuid(),
  kind: z.enum(["link", "note"]),
  title: z.string().trim().max(180).optional(),
  url: z.string().trim().optional(),
  content: z.string().trim().optional()
});

const updateItemSchema = z.object({
  itemId: z.string().uuid(),
  kind: z.enum(["link", "note"]),
  title: z.string().trim().max(180).optional(),
  url: z.string().trim().optional(),
  content: z.string().trim().optional()
});

function normalizeOptional(value?: string) {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

function getSafeReturnPath(raw: FormDataEntryValue | null, fallback: string) {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!value.startsWith("/knowledge")) {
    return fallback;
  }
  return value;
}

function redirectWithMessage(path: string, type: "error" | "success", message: string): never {
  const query = new URLSearchParams();
  query.set(type, message);
  const target = `${path}?${query.toString()}`;
  redirect(target as Parameters<typeof redirect>[0]);
}

function mapDbErrorMessage(errorMessage: string | null | undefined) {
  if (!errorMessage) {
    return "Database operation failed.";
  }

  if (errorMessage.includes("relation \"public.knowledge_items\" does not exist")) {
    return "Knowledge table is missing. Run Supabase migrations, then retry.";
  }

  if (errorMessage.includes("violates check constraint")) {
    return "Invalid item data. Links need a valid URL and notes need content.";
  }

  if (
    errorMessage.includes("new row violates row-level security policy") ||
    errorMessage.includes("violates row-level security policy")
  ) {
    return "You do not have permission for this topic.";
  }

  if (errorMessage.includes("violates foreign key constraint")) {
    return "Topic not found. Refresh and try again.";
  }

  return errorMessage;
}

function validateItem(kind: "link" | "note", url?: string, content?: string) {
  if (kind === "link") {
    const normalizedUrl = normalizeOptional(url);
    if (!normalizedUrl || !URL.canParse(normalizedUrl)) {
      return { ok: false as const, reason: "Link items require a valid URL." };
    }
    return { ok: true as const, url: normalizedUrl, content: normalizeOptional(content) };
  }

  const normalizedContent = normalizeOptional(content);
  if (!normalizedContent) {
    return { ok: false as const, reason: "Note items require content." };
  }

  return { ok: true as const, url: null, content: normalizedContent };
}

async function getSpaceIdByItemId(itemId: string) {
  const { supabase } = await requireAppContext();
  const { data } = await supabase
    .from("knowledge_items")
    .select("space_id")
    .eq("id", itemId)
    .maybeSingle();

  return data?.space_id ?? null;
}

function revalidateKnowledgeRoutes(spaceId?: string | null) {
  revalidatePath("/knowledge");
  if (spaceId) {
    revalidatePath(`/knowledge/${spaceId}`);
  }
}

export async function createKnowledgeSpaceAction(formData: FormData) {
  const returnPath = getSafeReturnPath(formData.get("returnPath"), "/knowledge");
  const payload = createSpaceSchema.safeParse({
    title: formData.get("title")
  });

  if (!payload.success) {
    redirectWithMessage(returnPath, "error", payload.error.issues[0]?.message ?? "Invalid topic title.");
  }

  const { supabase, account } = await requireAppContext();

  const { data: space, error } = await supabase
    .from("knowledge_spaces")
    .insert({
      account_id: account.accountId,
      title: payload.data.title
    })
    .select("id")
    .single();

  if (error) {
    redirectWithMessage(returnPath, "error", mapDbErrorMessage(error.message));
  }

  revalidateKnowledgeRoutes(space?.id);

  if (space?.id) {
    redirect(`/knowledge/${space.id}?success=${encodeURIComponent("Topic created.")}`);
  }

  redirectWithMessage(returnPath, "error", "Topic was not created.");
}

export async function createKnowledgeItemAction(formData: FormData) {
  const returnPath = getSafeReturnPath(formData.get("returnPath"), "/knowledge");
  const payload = createItemSchema.safeParse({
    spaceId: formData.get("spaceId"),
    kind: formData.get("kind"),
    title: formData.get("title"),
    url: formData.get("url"),
    content: formData.get("content")
  });

  if (!payload.success) {
    redirectWithMessage(returnPath, "error", payload.error.issues[0]?.message ?? "Invalid item payload.");
  }

  const validated = validateItem(payload.data.kind, payload.data.url, payload.data.content);
  if (!validated.ok) {
    redirectWithMessage(returnPath, "error", validated.reason);
  }

  const { supabase } = await requireAppContext();

  const { data: item, error } = await supabase
    .from("knowledge_items")
    .insert({
      space_id: payload.data.spaceId,
      kind: payload.data.kind,
      title: normalizeOptional(payload.data.title),
      url: validated.url,
      content: validated.content
    })
    .select("id")
    .single();

  if (error) {
    redirectWithMessage(returnPath, "error", mapDbErrorMessage(error.message));
  }

  if (!item?.id) {
    redirectWithMessage(returnPath, "error", "Item was not created.");
  }

  revalidateKnowledgeRoutes(payload.data.spaceId);
  redirectWithMessage(returnPath, "success", "Item added.");
}

export async function updateKnowledgeItemAction(formData: FormData) {
  const returnPath = getSafeReturnPath(formData.get("returnPath"), "/knowledge");
  const payload = updateItemSchema.safeParse({
    itemId: formData.get("itemId"),
    kind: formData.get("kind"),
    title: formData.get("title"),
    url: formData.get("url"),
    content: formData.get("content")
  });

  if (!payload.success) {
    redirectWithMessage(returnPath, "error", payload.error.issues[0]?.message ?? "Invalid item payload.");
  }

  const validated = validateItem(payload.data.kind, payload.data.url, payload.data.content);
  if (!validated.ok) {
    redirectWithMessage(returnPath, "error", validated.reason);
  }

  const { supabase } = await requireAppContext();
  const spaceId = await getSpaceIdByItemId(payload.data.itemId);

  const { data: item, error } = await supabase
    .from("knowledge_items")
    .update({
      kind: payload.data.kind,
      title: normalizeOptional(payload.data.title),
      url: validated.url,
      content: validated.content
    })
    .eq("id", payload.data.itemId)
    .select("id")
    .single();

  if (error) {
    redirectWithMessage(returnPath, "error", mapDbErrorMessage(error.message));
  }

  if (!item?.id) {
    redirectWithMessage(returnPath, "error", "Item not found or access denied.");
  }

  revalidateKnowledgeRoutes(spaceId);
  redirectWithMessage(returnPath, "success", "Item updated.");
}
