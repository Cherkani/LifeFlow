import type { ReactNode } from "react";
import { requireAppContext } from "@/lib/server-context";

export const dynamic = "force-dynamic";

export default async function KnowledgeLayout({ children }: { children: ReactNode }) {
  await requireAppContext();

  return <>{children}</>;
}
