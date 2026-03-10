import type { Supabase } from "./types";

export type KnowledgeSpaceRow = {
  id: string;
  title: string;
  image_url: string | null;
  created_at: string;
  updated_at: string;
};

export async function getKnowledgeSpaces(supabase: Supabase, accountId: string): Promise<KnowledgeSpaceRow[]> {
  const { data } = await supabase
    .from("knowledge_spaces")
    .select("id, title, image_url, created_at, updated_at")
    .eq("account_id", accountId)
    .order("updated_at", { ascending: false });
  return (data ?? []) as KnowledgeSpaceRow[];
}

export type KnowledgeItemRow = {
  id: string;
  space_id: string;
  kind: "link" | "note";
};

export async function getKnowledgeItems(supabase: Supabase, spaceIds: string[]): Promise<KnowledgeItemRow[]> {
  if (spaceIds.length === 0) {
    return [];
  }
  const { data } = await supabase
    .from("knowledge_items")
    .select("id, space_id, kind")
    .in("space_id", spaceIds);
  return (data ?? []) as KnowledgeItemRow[];
}

export async function getKnowledgeSpaceById(
  supabase: Supabase,
  spaceId: string,
  accountId: string
): Promise<KnowledgeSpaceRow | null> {
  const { data } = await supabase
    .from("knowledge_spaces")
    .select("id, title, image_url, created_at, updated_at")
    .eq("id", spaceId)
    .eq("account_id", accountId)
    .maybeSingle();
  return data as KnowledgeSpaceRow | null;
}

export type KnowledgeItemFullRow = KnowledgeItemRow & {
  title: string | null;
  url: string | null;
  content: string | null;
  created_at: string;
};

export async function getKnowledgeSpaceItems(
  supabase: Supabase,
  spaceId: string
): Promise<KnowledgeItemFullRow[]> {
  const { data } = await supabase
    .from("knowledge_items")
    .select("id, space_id, kind, title, url, content, created_at")
    .eq("space_id", spaceId)
    .order("created_at", { ascending: false });
  return (data ?? []) as KnowledgeItemFullRow[];
}
