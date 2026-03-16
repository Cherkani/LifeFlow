"use client";

import Link from "next/link";
import {
  CircleDot,
  LogOut,
  Menu,
  MessageCircle,
  PanelLeftClose,
  PanelLeftOpen,
  Settings
} from "lucide-react";
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
  showCycleTracking?: boolean;
};

export function AppShell({
  children,
  accountName,
  role,
  userLabel,
  showCycleTracking = false
}: AppShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopExpanded, setDesktopExpanded] = useState(true);
  const stars = [
    { top: "8%", left: "14%", size: 8, delay: "0s", duration: "3.1s" },
    { top: "15%", left: "76%", size: 6, delay: "0.6s", duration: "2.9s" },
    { top: "28%", left: "58%", size: 10, delay: "0.3s", duration: "3.5s" },
    { top: "39%", left: "22%", size: 7, delay: "0.9s", duration: "2.8s" },
    { top: "53%", left: "81%", size: 9, delay: "0.2s", duration: "3.7s" },
    { top: "68%", left: "35%", size: 6, delay: "0.8s", duration: "3.2s" },
    { top: "82%", left: "67%", size: 11, delay: "0.5s", duration: "3.8s" }
  ];

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-screen bg-transparent text-[#2f3450]">
      {mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-[#3d4167]/30 md:hidden"
          aria-label="Close sidebar"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-[#dadde9] bg-[linear-gradient(170deg,#f6f7fc_0%,#f0f2f8_40%,#f8f9fd_100%)] transition-transform duration-200",
          !desktopExpanded && "md:w-20",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <div className="pointer-events-none absolute inset-0">
          {stars.map((star, index) => (
            <span
              key={`${star.top}-${star.left}-${index}`}
              className="sidebar-star"
              style={{
                top: star.top,
                left: star.left,
                width: star.size,
                height: star.size,
                animationDelay: star.delay,
                animationDuration: star.duration
              }}
            />
          ))}
        </div>

        <div className="relative z-10 flex h-16 items-center justify-between border-b border-[#dadde9] px-4">
          <Link href="/dashboard" className={cn("text-lg font-semibold tracking-tight", !desktopExpanded && "md:hidden")}>
          Momentum Core
          </Link>
          <span className={cn("hidden text-lg font-semibold md:block", desktopExpanded && "md:hidden")}>MG</span>
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

        <div className={cn("relative z-10 border-b border-[#dadde9] px-4 py-4", !desktopExpanded && "md:px-3")}>
          <p className={cn("text-xs uppercase tracking-wide text-[#7a819f]", !desktopExpanded && "md:hidden")}>Menu</p>
          <p className={cn("text-sm font-medium text-[#374067]", !desktopExpanded && "md:hidden")}>{accountName}</p>
          <p className={cn("hidden text-xs font-semibold uppercase text-[#7a819f] md:block", desktopExpanded && "md:hidden")}>{userLabel.slice(0, 1)}</p>
        </div>

        <nav className="relative z-10 flex-1 space-y-1 p-3">
          {appNavigation.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
                  active ? "bg-[#7270a9] text-white shadow-[0_8px_22px_rgba(72,66,126,0.24)]" : "text-[#5f6586] hover:bg-[#eceff7] hover:text-[#384064]",
                  !desktopExpanded && "md:justify-center md:px-2"
                )}
              >
                <Icon size={17} />
                <span className={cn(!desktopExpanded && "md:hidden")}>{item.label}</span>
              </Link>
            );
          })}
          {showCycleTracking ? (
            <Link
              href="/cycle"
              className={cn(
                "mt-3 flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
                pathname === "/cycle" || pathname.startsWith("/cycle")
                  ? "bg-[#7270a9] text-white shadow-[0_8px_22px_rgba(72,66,126,0.24)]"
                  : "text-[#5f6586] hover:bg-[#eceff7] hover:text-[#384064]",
                !desktopExpanded && "md:justify-center md:px-2"
              )}
            >
              <CircleDot size={17} />
              <span className={cn(!desktopExpanded && "md:hidden")}>Cycle</span>
            </Link>
          ) : null}
        </nav>

        <div className="relative z-10 mt-auto border-t border-[#dadde9] p-3">
          <p className={cn("mb-2 text-xs uppercase tracking-wide text-[#7a819f]", !desktopExpanded && "md:hidden")}>Support</p>
          <div className="space-y-1">
            <Link
              href="/settings"
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-[#5f6586] transition hover:bg-[#eceff7] hover:text-[#384064]",
                !desktopExpanded && "md:justify-center md:px-2"
              )}
            >
              <Settings size={17} />
              <span className={cn(!desktopExpanded && "md:hidden")}>Settings</span>
            </Link>
            <Link
              href="/settings#owner-contact"
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-[#5f6586] transition hover:bg-[#eceff7] hover:text-[#384064]",
                !desktopExpanded && "md:justify-center md:px-2"
              )}
            >
              <MessageCircle size={17} />
              <span className={cn(!desktopExpanded && "md:hidden")}>Talk to owner</span>
            </Link>
          </div>
          <form action={signOutAction} className="mt-3">
            <Button type="submit" variant="outline" className={cn("w-full gap-2", !desktopExpanded && "md:size-10 md:px-0")}>
              <LogOut size={16} />
              <span className={cn(!desktopExpanded && "md:hidden")}>Log Out</span>
            </Button>
          </form>
        </div>
      </aside>

      <div className={cn("min-w-0 overflow-x-hidden transition-all duration-200 md:pl-72", !desktopExpanded && "md:pl-20")}>
        <header className="sticky top-0 z-20 border-b border-[#dde1ee] bg-[rgba(247,248,253,0.88)] backdrop-blur">
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
              <p className="text-sm font-medium text-[#394066]">{userLabel}</p>
              <p className="text-xs text-[#7a819f]">{role}</p>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl overflow-x-hidden px-4 py-6 sm:px-6">{children}</main>
      </div>
    </div>
  );
}
