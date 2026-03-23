import { getKnowledgeItems, getKnowledgeSpaces } from "@/lib/queries";
import { requireAppContext } from "@/lib/server-context";

import { KnowledgeModals } from "./knowledge-modals";

type KnowledgeSearchParams = Promise<{
  q?: string;
  error?: string;
  success?: string;
}>;

type KnowledgeItem = {
  id: string;
  space_id: string;
  kind: "link" | "note";
};

export default async function KnowledgePage({
  searchParams
}: {
  searchParams: KnowledgeSearchParams;
}) {
  const params = await searchParams;
  const { supabase, account } = await requireAppContext();

  const spaces = await getKnowledgeSpaces(supabase, account.accountId);
  const spaceIds = spaces.map((space) => space.id);
  const items = (await getKnowledgeItems(supabase, spaceIds)) as KnowledgeItem[];

  const countsBySpace: Record<string, { total: number; links: number; notes: number }> = {};
  for (const space of spaces) {
    countsBySpace[space.id] = { total: 0, links: 0, notes: 0 };
  }

  for (const item of items) {
    const current = countsBySpace[item.space_id] ?? { total: 0, links: 0, notes: 0 };
    current.total += 1;
    if (item.kind === "link") current.links += 1;
    if (item.kind === "note") current.notes += 1;
    countsBySpace[item.space_id] = current;
  }

  const query = params.q?.trim() ?? "";
  const errorMessage = params.error?.trim();
  const successMessage = params.success?.trim();

  const sortedSpaces = [...spaces].sort((a, b) => {
    const countDiff = (countsBySpace[b.id]?.total ?? 0) - (countsBySpace[a.id]?.total ?? 0);
    if (countDiff !== 0) return countDiff;
    return b.updated_at.localeCompare(a.updated_at);
  });

  const filteredSpaces =
    query.length > 0
      ? sortedSpaces.filter((space) => space.title.toLowerCase().includes(query.toLowerCase()))
      : sortedSpaces;

  return (
    <div className="knowledge-theme space-y-6">
      <KnowledgeModals
        spaces={spaces}
        filteredSpaces={filteredSpaces}
        countsBySpace={countsBySpace}
        query={query}
        errorMessage={errorMessage}
        successMessage={successMessage}
      />
    </div>
  );
}
