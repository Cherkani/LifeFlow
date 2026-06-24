import type { ReactNode } from "react";
import { cookies } from "next/headers";

import { AppShell } from "@/components/shell/app-shell";
import { getLifeOptions, getProfile } from "@/lib/queries";
import { resolveLifeFilter } from "@/lib/life-filter";
import { requireAppContext } from "@/lib/server-context";

export const dynamic = "force-dynamic";

export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  const { supabase, user, account } = await requireAppContext();
  const [profile, lifeOptions, cookieStore] = await Promise.all([
    getProfile(supabase, user.id),
    getLifeOptions(supabase, account.accountId),
    cookies()
  ]);

  const lifeFilter = resolveLifeFilter(cookieStore, account.accountId, lifeOptions);

  const label = profile?.full_name || profile?.email || user.email || "Member";

  return (
    <AppShell
      accountName={account.accountName}
      accountId={account.accountId}
      role={account.role}
      userLabel={label}
      lifeOptions={lifeOptions}
      initialPhaseId={lifeFilter.phaseId}
      initialProjectId={lifeFilter.projectId}
      initialScope={lifeFilter.scope}
    >
      {children}
    </AppShell>
  );
}
