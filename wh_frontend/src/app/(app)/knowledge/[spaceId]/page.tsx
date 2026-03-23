import { notFound } from "next/navigation";

import { getKnowledgeSpaceById, getKnowledgeSpaceItems } from "@/lib/queries";
import { requireAppContext } from "@/lib/server-context";

import { KnowledgeSpaceContent } from "../knowledge-space-content";

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

export default async function KnowledgeSpacePage({
  params,
  searchParams
}: {
  params: Promise<{ spaceId: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const { spaceId } = await params;
  const query = await searchParams;
  const errorMessage = query.error?.trim();
  const successMessage = query.success?.trim();
  const { supabase, account } = await requireAppContext();

  const space = await getKnowledgeSpaceById(supabase, spaceId, account.accountId);
  if (!space) notFound();

  const items = (await getKnowledgeSpaceItems(supabase, spaceId)) as KnowledgeItem[];

  return (
    <div className="knowledge-theme space-y-6">
      <KnowledgeSpaceContent
        space={space}
        items={items}
        errorMessage={errorMessage}
        successMessage={successMessage}
      />
    </div>
  );
}
