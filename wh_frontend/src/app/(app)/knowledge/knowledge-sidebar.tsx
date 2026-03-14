"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import { BookOpen } from "lucide-react";

import { cn } from "@/lib/utils";

type KnowledgeSpace = {
  id: string;
  title: string;
};

type KnowledgeSidebarProps = {
  spaces: KnowledgeSpace[];
};

export function KnowledgeSidebar({ spaces }: KnowledgeSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-56 shrink-0 flex-col border-r border-[#dadde9] pr-6 xl:flex">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#7a819f]">
        Knowledge
      </p>
      <nav className="space-y-0.5">
        <Link
          href="/knowledge"
          className={cn(
            "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition",
            pathname === "/knowledge"
              ? "bg-[#7270a9] text-white shadow-[0_4px_12px_rgba(72,66,126,0.2)]"
              : "text-[#5f6586] hover:bg-[#eceff7] hover:text-[#384064]"
          )}
        >
          <BookOpen size={16} />
          Topics
        </Link>
        {spaces.map((space) => {
          const href = `/knowledge/${space.id}` as Route;
          const isActive = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={space.id}
              href={href}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 pl-6 text-sm font-medium transition",
                isActive
                  ? "bg-[#7270a9] text-white shadow-[0_4px_12px_rgba(72,66,126,0.2)]"
                  : "text-[#5f6586] hover:bg-[#eceff7] hover:text-[#384064]"
              )}
            >
              {space.title}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
