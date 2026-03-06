"use client";

import Link from "next/link";
import Image from "next/image";

import { NavLink } from "@/components/shell/nav-link";
import { appNavigation } from "@/lib/constants/navigation";

type SidebarProps = {
  accountName: string;
  role: string;
  onNavigate?: () => void;
};

export function Sidebar({ accountName, role, onNavigate }: SidebarProps) {
  return (
    <aside className="flex h-full flex-col gap-6 border-r border-slate-200 bg-white px-4 py-5">
      <div className="space-y-2">
        <Link href="/dashboard" className="inline-flex items-center gap-2">
          <Image src="/assets/brand/volt-dark.svg" alt="LifeFlow logo" width={18} height={30} />
          <span className="text-lg font-semibold tracking-tight text-slate-900">LifeFlow</span>
        </Link>
        <p className="mt-1 text-xs text-slate-500">{accountName}</p>
        <p className="text-xs uppercase tracking-wide text-blue-600">{role}</p>
      </div>

      <nav className="space-y-1">
        {appNavigation.map((item) => (
          <NavLink
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            onNavigate={onNavigate}
          />
        ))}
      </nav>
    </aside>
  );
}
