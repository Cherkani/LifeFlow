"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { RedirectResult } from "@/lib/action-with-state";
import { requireAppContext } from "@/lib/server-context";

const createSpaceSchema = z.object({
  title: z.string().trim().min(2, "Space title is required").max(140),
  imageUrl: z.string().trim().optional()
});

const updateSpaceSchema = z.object({
  spaceId: z.string().uuid(),
  title: z.string().trim().min(2, "Space title is required").max(140),
  imageUrl: z.string().trim().optional()
});

const deleteSpaceSchema = z.object({
  spaceId: z.string().uuid()
});

const createItemSchema = z.object({
  spaceId: z.string().uuid(),
  kind: z.enum(["link", "note", "bullets"]),
  title: z.string().trim().max(180).optional(),
  url: z.string().trim().optional(),
  content: z.string().trim().optional()
});

const updateItemSchema = z.object({
  itemId: z.string().uuid(),
  kind: z.enum(["link", "note", "bullets"]),
  title: z.string().trim().max(180).optional(),
  url: z.string().trim().optional(),
  content: z.string().trim().optional()
});

const deleteItemSchema = z.object({
  itemId: z.string().uuid()
});

const toggleCheckedSchema = z.object({
  itemId: z.string().uuid()
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

function redirectTarget(path: string, type: "error" | "success", message: string): { redirectTo: string } {
  const query = new URLSearchParams();
  query.set(type, message);
  return { redirectTo: `${path}?${query.toString()}` };
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

function validateItem(kind: "link" | "note" | "bullets", url?: string, content?: string) {
  if (kind === "link") {
    const normalizedUrl = normalizeOptional(url);
    if (!normalizedUrl || !URL.canParse(normalizedUrl)) {
      return { ok: false as const, reason: "Link items require a valid URL." };
    }
    return { ok: true as const, url: normalizedUrl, content: normalizeOptional(content) };
  }

  const normalizedContent = normalizeOptional(content);
  if (!normalizedContent) {
    return { ok: false as const, reason: "Note and bullets items require content." };
  }

  const normalizedUrl = normalizeOptional(url);
  const safeUrl = normalizedUrl && URL.canParse(normalizedUrl) ? normalizedUrl : null;
  return { ok: true as const, url: safeUrl, content: normalizedContent };
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
    title: formData.get("title"),
    imageUrl: formData.get("imageUrl")
  });

  if (!payload.success) {
    return redirectTarget(returnPath, "error", payload.error.issues[0]?.message ?? "Invalid topic title.");
  }

  const { supabase, account } = await requireAppContext();
  const imageUrl = normalizeOptional(payload.data.imageUrl);
  const safeImageUrl = imageUrl && URL.canParse(imageUrl) ? imageUrl : null;

  const { data: space, error } = await supabase
    .from("knowledge_spaces")
    .insert({
      account_id: account.accountId,
      title: payload.data.title,
      image_url: safeImageUrl
    })
    .select("id")
    .single();

  if (error) {
    return redirectTarget(returnPath, "error", mapDbErrorMessage(error.message));
  }

  revalidateKnowledgeRoutes(space?.id);

  if (space?.id) {
    return { redirectTo: `/knowledge/${space.id}?success=${encodeURIComponent("Topic created.")}` };
  }

  return redirectTarget(returnPath, "error", "Topic was not created.");
}

export async function updateKnowledgeSpaceAction(formData: FormData) {
  const returnPath = getSafeReturnPath(formData.get("returnPath"), "/knowledge");
  const payload = updateSpaceSchema.safeParse({
    spaceId: formData.get("spaceId"),
    title: formData.get("title"),
    imageUrl: formData.get("imageUrl")
  });

  if (!payload.success) {
    return redirectTarget(returnPath, "error", payload.error.issues[0]?.message ?? "Invalid topic data.");
  }

  const { supabase, account } = await requireAppContext();
  const imageUrl = normalizeOptional(payload.data.imageUrl);
  const safeImageUrl = imageUrl && URL.canParse(imageUrl) ? imageUrl : null;

  const { data: space, error } = await supabase
    .from("knowledge_spaces")
    .update({
      title: payload.data.title,
      image_url: safeImageUrl
    })
    .eq("id", payload.data.spaceId)
    .eq("account_id", account.accountId)
    .select("id")
    .single();

  if (error) {
    return redirectTarget(returnPath, "error", mapDbErrorMessage(error.message));
  }

  revalidateKnowledgeRoutes(space?.id);
  return { redirectTo: `/knowledge/${space?.id ?? payload.data.spaceId}?success=${encodeURIComponent("Topic updated.")}` };
}

export async function deleteKnowledgeSpaceAction(formData: FormData) {
  const returnPath = getSafeReturnPath(formData.get("returnPath"), "/knowledge");
  const payload = deleteSpaceSchema.safeParse({
    spaceId: formData.get("spaceId")
  });

  if (!payload.success) {
    return redirectTarget(returnPath, "error", "Invalid topic.");
  }

  const { supabase, account } = await requireAppContext();

  const { count } = await supabase
    .from("knowledge_items")
    .select("id", { count: "exact", head: true })
    .eq("space_id", payload.data.spaceId);

  if ((count ?? 0) > 0) {
    return redirectTarget(returnPath, "error", "Delete all topic items first.");
  }

  const { error } = await supabase
    .from("knowledge_spaces")
    .delete()
    .eq("id", payload.data.spaceId)
    .eq("account_id", account.accountId);

  if (error) {
    return redirectTarget(returnPath, "error", mapDbErrorMessage(error.message));
  }

  revalidateKnowledgeRoutes(payload.data.spaceId);
  return redirectTarget("/knowledge", "success", "Topic deleted.");
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
    return redirectTarget(returnPath, "error", payload.error.issues[0]?.message ?? "Invalid item payload.");
  }

  const validated = validateItem(payload.data.kind, payload.data.url, payload.data.content);
  if (!validated.ok) {
    return redirectTarget(returnPath, "error", validated.reason);
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
    return redirectTarget(returnPath, "error", mapDbErrorMessage(error.message));
  }

  if (!item?.id) {
    return redirectTarget(returnPath, "error", "Item was not created.");
  }

  revalidateKnowledgeRoutes(payload.data.spaceId);
  return redirectTarget(returnPath, "success", "Item added.");
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
    return redirectTarget(returnPath, "error", payload.error.issues[0]?.message ?? "Invalid item payload.");
  }

  const validated = validateItem(payload.data.kind, payload.data.url, payload.data.content);
  if (!validated.ok) {
    return redirectTarget(returnPath, "error", validated.reason);
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
    return redirectTarget(returnPath, "error", mapDbErrorMessage(error.message));
  }

  if (!item?.id) {
    return redirectTarget(returnPath, "error", "Item not found or access denied.");
  }

  revalidateKnowledgeRoutes(spaceId);
  return redirectTarget(returnPath, "success", "Item updated.");
}

export async function deleteKnowledgeItemAction(formData: FormData) {
  const returnPath = getSafeReturnPath(formData.get("returnPath"), "/knowledge");
  const payload = deleteItemSchema.safeParse({
    itemId: formData.get("itemId")
  });

  if (!payload.success) {
    return redirectTarget(returnPath, "error", "Invalid item.");
  }

  const { supabase } = await requireAppContext();
  const spaceId = await getSpaceIdByItemId(payload.data.itemId);

  const { error } = await supabase
    .from("knowledge_items")
    .delete()
    .eq("id", payload.data.itemId);

  if (error) {
    return redirectTarget(returnPath, "error", mapDbErrorMessage(error.message));
  }

  revalidateKnowledgeRoutes(spaceId);
  return redirectTarget(returnPath, "success", "Item deleted.");
}

export async function toggleKnowledgeItemCheckedAction(formData: FormData) {
  const returnPath = getSafeReturnPath(formData.get("returnPath"), "/knowledge");
  const payload = toggleCheckedSchema.safeParse({
    itemId: formData.get("itemId")
  });

  if (!payload.success) {
    return redirectTarget(returnPath, "error", "Invalid item.");
  }

  const { supabase } = await requireAppContext();
  const spaceId = await getSpaceIdByItemId(payload.data.itemId);

  const { data: current } = await supabase
    .from("knowledge_items")
    .select("checked")
    .eq("id", payload.data.itemId)
    .maybeSingle();

  if (!current) {
    return redirectTarget(returnPath, "error", "Item not found.");
  }

  const { error } = await supabase
    .from("knowledge_items")
    .update({ checked: !current.checked })
    .eq("id", payload.data.itemId);

  if (error) {
    return redirectTarget(returnPath, "error", mapDbErrorMessage(error.message));
  }

  revalidateKnowledgeRoutes(spaceId);
  return { redirectTo: returnPath };
}

export async function createKnowledgeSpaceFormAction(
  _prevState: RedirectResult | null,
  formData: FormData
): Promise<RedirectResult | null> {
  return createKnowledgeSpaceAction(formData);
}

export async function updateKnowledgeSpaceFormAction(
  _prevState: RedirectResult | null,
  formData: FormData
): Promise<RedirectResult | null> {
  return updateKnowledgeSpaceAction(formData);
}

export async function deleteKnowledgeSpaceFormAction(
  _prevState: RedirectResult | null,
  formData: FormData
): Promise<RedirectResult | null> {
  return deleteKnowledgeSpaceAction(formData);
}

export async function createKnowledgeItemFormAction(
  _prevState: RedirectResult | null,
  formData: FormData
): Promise<RedirectResult | null> {
  return createKnowledgeItemAction(formData);
}

export async function updateKnowledgeItemFormAction(
  _prevState: RedirectResult | null,
  formData: FormData
): Promise<RedirectResult | null> {
  return updateKnowledgeItemAction(formData);
}

export async function deleteKnowledgeItemFormAction(
  _prevState: RedirectResult | null,
  formData: FormData
): Promise<RedirectResult | null> {
  return deleteKnowledgeItemAction(formData);
}

export async function toggleKnowledgeItemCheckedFormAction(
  _prevState: RedirectResult | null,
  formData: FormData
): Promise<RedirectResult | null> {
  return toggleKnowledgeItemCheckedAction(formData);
}
