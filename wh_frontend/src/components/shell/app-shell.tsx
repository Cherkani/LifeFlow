"use client";

import Link from "next/link";
import {
  CircleDot,
  LogOut,
  Menu,
  MessageCircle,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Settings
  ,
  Sun
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
  const [theme, setTheme] = useState<"dark" | "light">("dark");
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

  useEffect(() => {
    const savedTheme =
      typeof window !== "undefined"
        ? window.localStorage.getItem("momentum-grid-theme") ?? window.localStorage.getItem("lifeflow-theme")
        : null;
    if (savedTheme === "light" || savedTheme === "dark") {
      setTheme(savedTheme);
      return;
    }
    if (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: light)").matches) {
      setTheme("light");
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("momentum-grid-theme", theme);
      document.documentElement.setAttribute("data-theme", theme);
      document.body.setAttribute("data-theme", theme);
    }
  }, [theme]);

  const isDark = theme === "dark";

  return (
    <div
      data-theme={theme}
      className={cn(
        "min-h-screen",
        isDark
          ? "bg-[radial-gradient(circle_at_10%_8%,rgba(69,114,192,0.18)_0%,transparent_34%),linear-gradient(180deg,#070f1d_0%,#0c1628_60%,#0f1c32_100%)] text-[#dce7fb]"
          : "bg-[radial-gradient(circle_at_12%_8%,rgba(167,190,230,0.28)_0%,transparent_35%),linear-gradient(180deg,#f8fafe_0%,#eff3fb_58%,#e9eef7_100%)] text-[#2f3450]"
      )}
    >
      {mobileOpen ? (
        <button
          type="button"
          className={cn("fixed inset-0 z-30 md:hidden", isDark ? "bg-[#020713]/62" : "bg-[#3d4167]/30")}
          aria-label="Close sidebar"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-72 flex-col transition-transform duration-200",
          isDark
            ? "border-r border-[#2c3e5f] bg-[linear-gradient(170deg,#0b172a_0%,#0d1b30_40%,#101f36_100%)]"
            : "border-r border-[#dadde9] bg-[linear-gradient(170deg,#f6f7fc_0%,#f0f2f8_40%,#f8f9fd_100%)]",
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

        <div className={cn("relative z-10 flex h-16 items-center justify-between border-b px-4", isDark ? "border-[#2c3e5f]" : "border-[#dadde9]")}>
          <Link href="/dashboard" className={cn("text-lg font-semibold tracking-tight", !desktopExpanded && "md:hidden")}>
          Momentum Grid
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

        <div className={cn("relative z-10 border-b px-4 py-4", isDark ? "border-[#2c3e5f]" : "border-[#dadde9]", !desktopExpanded && "md:px-3")}>
          <p className={cn("text-xs uppercase tracking-wide", isDark ? "text-[#91a7cb]" : "text-[#7a819f]", !desktopExpanded && "md:hidden")}>Menu</p>
          <p className={cn("text-sm font-medium", isDark ? "text-[#e3edff]" : "text-[#374067]", !desktopExpanded && "md:hidden")}>{accountName}</p>
          <p className={cn("hidden text-xs font-semibold uppercase md:block", isDark ? "text-[#91a7cb]" : "text-[#7a819f]", desktopExpanded && "md:hidden")}>{userLabel.slice(0, 1)}</p>
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
                  active
                    ? isDark
                      ? "bg-[#3d5f9c] text-white shadow-[0_8px_24px_rgba(16,39,78,0.45)]"
                      : "bg-[#7270a9] text-white shadow-[0_8px_22px_rgba(72,66,126,0.24)]"
                    : isDark
                      ? "text-[#a8bbdc] hover:bg-[#162742] hover:text-[#e6efff]"
                      : "text-[#5f6586] hover:bg-[#eceff7] hover:text-[#384064]",
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
                  ? isDark
                    ? "bg-[#3d5f9c] text-white shadow-[0_8px_24px_rgba(16,39,78,0.45)]"
                    : "bg-[#7270a9] text-white shadow-[0_8px_22px_rgba(72,66,126,0.24)]"
                  : isDark
                    ? "text-[#a8bbdc] hover:bg-[#162742] hover:text-[#e6efff]"
                    : "text-[#5f6586] hover:bg-[#eceff7] hover:text-[#384064]",
                !desktopExpanded && "md:justify-center md:px-2"
              )}
            >
              <CircleDot size={17} />
              <span className={cn(!desktopExpanded && "md:hidden")}>Cycle</span>
            </Link>
          ) : null}
        </nav>

        <div className={cn("relative z-10 mt-auto border-t p-3", isDark ? "border-[#2c3e5f]" : "border-[#dadde9]")}>
          <p className={cn("mb-2 text-xs uppercase tracking-wide", isDark ? "text-[#91a7cb]" : "text-[#7a819f]", !desktopExpanded && "md:hidden")}>Support</p>
          <div className="space-y-1">
            <Link
              href="/settings"
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
                isDark ? "text-[#a8bbdc] hover:bg-[#162742] hover:text-[#e6efff]" : "text-[#5f6586] hover:bg-[#eceff7] hover:text-[#384064]",
                !desktopExpanded && "md:justify-center md:px-2"
              )}
            >
              <Settings size={17} />
              <span className={cn(!desktopExpanded && "md:hidden")}>Settings</span>
            </Link>
            <Link
              href="/settings#owner-contact"
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
                isDark ? "text-[#a8bbdc] hover:bg-[#162742] hover:text-[#e6efff]" : "text-[#5f6586] hover:bg-[#eceff7] hover:text-[#384064]",
                !desktopExpanded && "md:justify-center md:px-2"
              )}
            >
              <MessageCircle size={17} />
              <span className={cn(!desktopExpanded && "md:hidden")}>Talk to owner</span>
            </Link>
          </div>
          <form action={signOutAction} className="mt-3">
            <Button
              type="submit"
              variant="outline"
              className={cn(
                "w-full gap-2",
                isDark
                  ? "border-[#3b557f] bg-[#13233d] text-[#e6efff] hover:bg-[#1a3153] hover:text-white"
                  : "border-[#c7d3e8] bg-[#f8fbff] text-[#23406d] hover:bg-[#edf3ff] hover:text-[#1a3153]",
                !desktopExpanded && "md:size-10 md:px-0"
              )}
            >
              <LogOut size={16} />
              <span className={cn(!desktopExpanded && "md:hidden")}>Log Out</span>
            </Button>
          </form>
        </div>
      </aside>

      <div className={cn("min-w-0 overflow-x-hidden transition-all duration-200 md:pl-72", !desktopExpanded && "md:pl-20")}>
        <header
          className={cn(
            "sticky top-0 z-20 border-b backdrop-blur",
            isDark ? "border-[#2b3d5f] bg-[rgba(8,18,34,0.9)]" : "border-[#dde1ee] bg-[rgba(247,248,253,0.88)]"
          )}
        >
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
            <Button
              variant="ghost"
              size="icon"
              className={cn(isDark ? "text-[#dce7fb] hover:bg-[#152743] hover:text-white" : "", "md:hidden")}
              onClick={() => setMobileOpen((value) => !value)}
              aria-label="Toggle sidebar"
            >
              <Menu size={18} />
            </Button>
            <div className="hidden md:block" />
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
                title={isDark ? "Switch to light mode" : "Switch to dark mode"}
                className={cn(
                  isDark
                    ? "text-[#dce7fb] hover:bg-[#152743] hover:text-white"
                    : "text-[#394066] hover:bg-[#e6ecf8] hover:text-[#1f2b44]"
                )}
                onClick={() => setTheme((prev) => (prev === "dark" ? "light" : "dark"))}
              >
                {isDark ? <Sun size={18} /> : <Moon size={18} />}
              </Button>
              <div className="text-right">
                <p className={cn("text-sm font-medium", isDark ? "text-[#e6efff]" : "text-[#394066]")}>{userLabel}</p>
                <p className={cn("text-xs", isDark ? "text-[#9db2d7]" : "text-[#7a819f]")}>{role}</p>
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl overflow-x-hidden px-4 py-6 sm:px-6">{children}</main>
      </div>
    </div>
  );
}
