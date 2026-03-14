import type { ReactNode } from "react";

import { AppShell } from "@/components/shell/app-shell";
import { getProfile } from "@/lib/queries";
import { requireAppContext } from "@/lib/server-context";

export const dynamic = "force-dynamic";

export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  const { supabase, user, account } = await requireAppContext();
  const profile = await getProfile(supabase, user.id);

  const label = profile?.full_name || profile?.email || user.email || "Member";
  const showCycleTracking = profile?.cycle_tracking_enabled ?? false;

  return (
    <AppShell
      accountName={account.accountName}
      role={account.role}
      userLabel={label}
      showCycleTracking={showCycleTracking}
    >
      {children}
    </AppShell>
  );
}
