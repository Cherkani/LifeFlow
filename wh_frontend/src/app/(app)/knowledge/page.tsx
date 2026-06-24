import { getKnowledgeItems, getKnowledgeSpaces, getLifeOptions } from "@/lib/queries";
import { cookies } from "next/headers";
import { LifeSummaryBand } from "@/components/life/life-context";
import { matchesLifeFilter, resolveLifeFilter } from "@/lib/life-filter";
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

  const allSpaces = await getKnowledgeSpaces(supabase, account.accountId);
  const lifeOptions = await getLifeOptions(supabase, account.accountId);
  const lifeFilter = resolveLifeFilter(await cookies(), account.accountId, lifeOptions);
  const spaces = allSpaces.filter((item) => matchesLifeFilter(item, lifeFilter));
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
      <LifeSummaryBand
        title="Knowledge with a home"
        description="Notes and references stay attached to the chapter or project that gave them meaning."
        phases={lifeOptions.phases}
        projects={lifeOptions.projects}
        stats={[{ label: "visible topics", value: spaces.length }]}
      />
      <KnowledgeModals
        spaces={spaces}
        filteredSpaces={filteredSpaces}
        countsBySpace={countsBySpace}
        query={query}
        errorMessage={errorMessage}
        successMessage={successMessage}
        lifePhases={lifeOptions.phases}
        lifeProjects={lifeOptions.projects}
      />
    </div>
  );
}
