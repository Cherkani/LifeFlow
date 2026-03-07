"use client";

import Link from "next/link";
import { CircleHelp, LogOut, Menu, MessageCircle, PanelLeftClose, PanelLeftOpen, Settings } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { signOutAction } from "@/app/(app)/actions";
import { Button } from "@/components/ui/button";
import { appNavigation } from "@/lib/constants/navigation";
import { cn } from "@/lib/utils";

type AppShellProps = {
  children: ReactNode;
  accountName: string;
  role: string;
  userLabel: string;
};

export function AppShell({ children, accountName, role, userLabel }: AppShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopExpanded, setDesktopExpanded] = useState(true);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-screen bg-[#e8eef9] text-[#0c1d3c]">
      {mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-[#0b1f3b]/40 md:hidden"
          aria-label="Close sidebar"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-[#c7d3e8] bg-[#f2f6fe] transition-transform duration-200",
          !desktopExpanded && "md:w-20",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-[#c7d3e8] px-4">
          <Link href="/dashboard" className={cn("text-lg font-semibold tracking-tight", !desktopExpanded && "md:hidden")}>
            LifeFlow
          </Link>
          <span className={cn("hidden text-lg font-semibold md:block", desktopExpanded && "md:hidden")}>LF</span>
          <Button
            variant="ghost"
            size="icon"
            className="hidden md:inline-flex"
            onClick={() => setDesktopExpanded((value) => !value)}
            aria-label={desktopExpanded ? "Collapse sidebar" : "Expand sidebar"}
          >
            {desktopExpanded ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
          </Button>
        </div>

        <div className={cn("border-b border-[#c7d3e8] px-4 py-4", !desktopExpanded && "md:px-3")}>
          <p className={cn("text-xs uppercase tracking-wide text-[#4a5f83]", !desktopExpanded && "md:hidden")}>Menu</p>
          <p className={cn("text-sm font-medium text-[#0c1d3c]", !desktopExpanded && "md:hidden")}>{accountName}</p>
          <p className={cn("hidden text-xs font-semibold uppercase text-[#4a5f83] md:block", desktopExpanded && "md:hidden")}>{userLabel.slice(0, 1)}</p>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {appNavigation.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
                  active ? "bg-[#0b1f3b] text-white" : "text-[#465d83] hover:bg-[#e3ebf9] hover:text-[#0c1d3c]",
                  !desktopExpanded && "md:justify-center md:px-2"
                )}
              >
                <Icon size={17} />
                <span className={cn(!desktopExpanded && "md:hidden")}>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto border-t border-[#c7d3e8] p-3">
          <p className={cn("mb-2 text-xs uppercase tracking-wide text-[#4a5f83]", !desktopExpanded && "md:hidden")}>Support</p>
          <div className="space-y-1">
            <Link
              href="/settings"
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-[#465d83] transition hover:bg-[#e3ebf9] hover:text-[#0c1d3c]",
                !desktopExpanded && "md:justify-center md:px-2"
              )}
            >
              <Settings size={17} />
              <span className={cn(!desktopExpanded && "md:hidden")}>Settings</span>
            </Link>
            <a
              href="mailto:support@lifeflow.app"
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-[#465d83] transition hover:bg-[#e3ebf9] hover:text-[#0c1d3c]",
                !desktopExpanded && "md:justify-center md:px-2"
              )}
            >
              <CircleHelp size={17} />
              <span className={cn(!desktopExpanded && "md:hidden")}>Help & Support</span>
            </a>
            <a
              href="mailto:founder@lifeflow.app"
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-[#465d83] transition hover:bg-[#e3ebf9] hover:text-[#0c1d3c]",
                !desktopExpanded && "md:justify-center md:px-2"
              )}
            >
              <MessageCircle size={17} />
              <span className={cn(!desktopExpanded && "md:hidden")}>Talk to Founder</span>
            </a>
          </div>
          <form action={signOutAction} className="mt-3">
            <Button variant="outline" className={cn("w-full gap-2", !desktopExpanded && "md:size-10 md:px-0")}>
              <LogOut size={16} />
              <span className={cn(!desktopExpanded && "md:hidden")}>Log Out</span>
            </Button>
          </form>
        </div>
      </aside>

      <div className={cn("transition-all duration-200 md:pl-72", !desktopExpanded && "md:pl-20")}>
        <header className="sticky top-0 z-20 border-b border-[#c7d3e8] bg-[#f2f6fe]/95 backdrop-blur">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileOpen((value) => !value)}
              aria-label="Toggle sidebar"
            >
              <Menu size={18} />
            </Button>
            <div className="hidden md:block" />
            <div className="text-right">
              <p className="text-sm font-medium text-[#0c1d3c]">{userLabel}</p>
              <p className="text-xs text-[#4a5f83]">{role}</p>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">{children}</main>
      </div>
    </div>
  );
}
