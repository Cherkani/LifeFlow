import { LogOut } from "lucide-react";
import type { ReactNode } from "react";

import { signOutAction } from "@/app/(app)/actions";

type TopbarProps = {
  userLabel: string;
  navAction?: ReactNode;
};

export function Topbar({ userLabel, navAction }: TopbarProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">{navAction ?? null}</div>

        <div className="flex items-center gap-3">
          <p className="hidden text-sm text-slate-600 sm:block">{userLabel}</p>
          <form action={signOutAction}>
            <button
              type="submit"
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
