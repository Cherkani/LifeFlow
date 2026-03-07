import type { ReactNode } from "react";

import { AppShell } from "@/components/shell/app-shell";
import { requireAppContext } from "@/lib/server-context";

export const dynamic = "force-dynamic";

export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  const { supabase, user, account } = await requireAppContext();
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", user.id)
    .maybeSingle();

  const label = profile?.full_name || profile?.email || user.email || "Member";

  return (
    <AppShell accountName={account.accountName} role={account.role} userLabel={label}>
      {children}
    </AppShell>
  );
}
