import type { ReactNode } from "react";

import { getKnowledgeSpaces } from "@/lib/queries";
import { requireAppContext } from "@/lib/server-context";

import { KnowledgeSidebar } from "./knowledge-sidebar";

export const dynamic = "force-dynamic";

export default async function KnowledgeLayout({ children }: { children: ReactNode }) {
  const { supabase, account } = await requireAppContext();
  const spaces = await getKnowledgeSpaces(supabase, account.accountId);

  return (
    <div className="flex gap-6">
      <KnowledgeSidebar
        spaces={spaces.map((s) => ({ id: s.id, title: s.title }))}
      />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
