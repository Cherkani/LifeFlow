"use client";

import { Menu, X } from "lucide-react";
import { useState, type ReactNode } from "react";

import { Sidebar } from "@/components/shell/sidebar";
import { Topbar } from "@/components/shell/topbar";

type AppShellProps = {
  children: ReactNode;
  accountName: string;
  role: string;
  userLabel: string;
};

export function AppShell({ children, accountName, role, userLabel }: AppShellProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto grid min-h-screen w-full max-w-[1600px] md:grid-cols-[240px_1fr]">
        <div className="hidden md:block">
          <Sidebar accountName={accountName} role={role} />
        </div>

        {open ? (
          <div className="fixed inset-0 z-40 bg-slate-900/40 md:hidden" onClick={() => setOpen(false)}>
            <div className="h-full w-[260px] bg-white" onClick={(event) => event.stopPropagation()}>
              <Sidebar accountName={accountName} role={role} onNavigate={() => setOpen(false)} />
            </div>
          </div>
        ) : null}

        <div className="flex min-h-screen flex-col">
          <Topbar
            userLabel={userLabel}
            navAction={
              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-600 md:hidden"
                onClick={() => setOpen((value) => !value)}
                aria-label="Toggle navigation"
              >
                {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            }
          />
          <main className="flex-1 px-4 pb-6 pt-4 sm:px-6 lg:px-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
