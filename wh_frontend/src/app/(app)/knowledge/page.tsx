import Link from "next/link";
import type { Route } from "next";
import { Plus, Search } from "lucide-react";

import { SubmitButton } from "@/components/forms/submit-button";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ModalShell } from "@/components/ui/modal-shell";
import { SectionHeader } from "@/components/ui/section-header";
import { requireAppContext } from "@/lib/server-context";

import { createKnowledgeSpaceAction } from "./actions";

type KnowledgeSearchParams = Promise<{
  q?: string;
  error?: string;
  success?: string;
  modal?: string;
}>;

type KnowledgeItem = {
  id: string;
  space_id: string;
  kind: "link" | "note";
};

function buildKnowledgeSpaceHref(spaceId: string): Route {
  return `/knowledge/${spaceId}` as Route;
}

function buildKnowledgePageHref(query: string, modal?: string) {
  const params = new URLSearchParams();
  if (query.length > 0) {
    params.set("q", query);
  }
  if (modal) {
    params.set("modal", modal);
  }
  const queryString = params.toString();
  return queryString.length > 0 ? `/knowledge?${queryString}` : "/knowledge";
}

export default async function KnowledgePage({
  searchParams
}: {
  searchParams: KnowledgeSearchParams;
}) {
  const params = await searchParams;
  const { supabase, account } = await requireAppContext();

  const spacesRes = await supabase
    .from("knowledge_spaces")
    .select("id, title, created_at, updated_at")
    .eq("account_id", account.accountId)
    .order("updated_at", { ascending: false });

  const spaces = spacesRes.data ?? [];
  const spaceIds = spaces.map((space) => space.id);

  const itemsRes =
    spaceIds.length > 0
      ? await supabase
          .from("knowledge_items")
          .select("id, space_id, kind")
          .in("space_id", spaceIds)
      : { data: [] as KnowledgeItem[] };

  const items = (itemsRes.data ?? []) as KnowledgeItem[];

  const countsBySpace = new Map<string, { total: number; links: number; notes: number }>();
  for (const space of spaces) {
    countsBySpace.set(space.id, { total: 0, links: 0, notes: 0 });
  }

  for (const item of items) {
    const current = countsBySpace.get(item.space_id) ?? { total: 0, links: 0, notes: 0 };
    current.total += 1;
    if (item.kind === "link") current.links += 1;
    if (item.kind === "note") current.notes += 1;
    countsBySpace.set(item.space_id, current);
  }

  const query = params.q?.trim() ?? "";
  const errorMessage = params.error?.trim();
  const successMessage = params.success?.trim();
  const modal = params.modal?.trim();
  const createTopicHref = buildKnowledgePageHref(query, "new-topic");
  const closeModalHref = buildKnowledgePageHref(query);

  const sortedSpaces = [...spaces].sort((a, b) => {
    const countDiff = (countsBySpace.get(b.id)?.total ?? 0) - (countsBySpace.get(a.id)?.total ?? 0);
    if (countDiff !== 0) return countDiff;
    return b.updated_at.localeCompare(a.updated_at);
  });

  const filteredSpaces =
    query.length > 0
      ? sortedSpaces.filter((space) => space.title.toLowerCase().includes(query.toLowerCase()))
      : sortedSpaces;

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Knowledge Topics"
        description="Create a topic (space), then add simple link or note items inside it."
        action={
          <a
            href={createTopicHref}
            className="inline-flex items-center gap-2 rounded-lg bg-[#0b1f3b] px-3 py-2 text-sm font-medium text-white transition hover:bg-[#102a52]"
          >
            <Plus size={16} />
            New topic
          </a>
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
                const counts = countsBySpace.get(space.id) ?? { total: 0, links: 0, notes: 0 };

                return (
                  <Link
                    key={space.id}
                    href={buildKnowledgeSpaceHref(space.id)}
                    className="rounded-xl border border-[#c7d3e8] bg-[#f2f6fe] p-4 transition hover:border-[#9eb3d8] hover:shadow-sm"
                  >
                    <h3 className="mb-2 text-sm font-semibold text-[#0c1d3c]">{space.title}</h3>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge>{counts.total} items</Badge>
                      <Badge variant="secondary">{counts.links} links</Badge>
                      <Badge variant="secondary">{counts.notes} notes</Badge>
                    </div>
                  </Link>
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

      {modal === "new-topic" ? (
        <ModalShell
          title="Create Topic"
          description="Add a new topic, then open it to add links and notes."
          closeHref={closeModalHref}
        >
          <form action={createKnowledgeSpaceAction} className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <input type="hidden" name="returnPath" value="/knowledge" />
            <div className="space-y-2">
              <Label htmlFor="spaceTitle">Topic title</Label>
              <Input id="spaceTitle" name="title" required placeholder="e.g. AI Research, Marketing, Product Ideas" />
            </div>
            <SubmitButton label="Create topic" pendingLabel="Creating..." className="w-full self-end sm:w-auto" />
          </form>
        </ModalShell>
      ) : null}
    </div>
  );
}
