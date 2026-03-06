"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAppContext } from "@/lib/server-context";

const createSpaceSchema = z.object({
  title: z.string().trim().min(2, "Space title is required").max(140)
});

const createNoteSchema = z.object({
  spaceId: z.string().uuid(),
  title: z.string().trim().min(2, "Note title is required").max(140)
});

const createCardSchema = z.object({
  noteId: z.string().uuid(),
  content: z.string().trim().min(2, "Card content is required").max(1600)
});

async function getNextNotePosition(spaceId: string) {
  const { supabase } = await requireAppContext();
  const { data } = await supabase
    .from("notes")
    .select("position")
    .eq("space_id", spaceId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data?.position ?? -1) + 1;
}

async function getNextCardPosition(noteId: string) {
  const { supabase } = await requireAppContext();
  const { data } = await supabase
    .from("cards")
    .select("position")
    .eq("note_id", noteId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data?.position ?? -1) + 1;
}

export async function createKnowledgeSpaceAction(formData: FormData) {
  const payload = createSpaceSchema.safeParse({
    title: formData.get("title")
  });

  if (!payload.success) {
    return;
  }

  const { supabase, account } = await requireAppContext();

  await supabase.from("knowledge_spaces").insert({
    account_id: account.accountId,
    title: payload.data.title
  });

  revalidatePath("/knowledge");
}

export async function createNoteAction(formData: FormData) {
  const payload = createNoteSchema.safeParse({
    spaceId: formData.get("spaceId"),
    title: formData.get("title")
  });

  if (!payload.success) {
    return;
  }

  const { supabase } = await requireAppContext();
  const nextPosition = await getNextNotePosition(payload.data.spaceId);

  await supabase.from("notes").insert({
    space_id: payload.data.spaceId,
    title: payload.data.title,
    position: nextPosition
  });

  revalidatePath("/knowledge");
}

export async function createCardAction(formData: FormData) {
  const payload = createCardSchema.safeParse({
    noteId: formData.get("noteId"),
    content: formData.get("content")
  });

  if (!payload.success) {
    return;
  }

  const { supabase } = await requireAppContext();
  const nextPosition = await getNextCardPosition(payload.data.noteId);

  await supabase.from("cards").insert({
    note_id: payload.data.noteId,
    content: payload.data.content,
    position: nextPosition
  });

  revalidatePath("/knowledge");
}
