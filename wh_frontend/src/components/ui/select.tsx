import type { SelectHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "flex h-10 w-full rounded-lg border border-[#c7d3e8] bg-[#edf3ff] px-3 py-2 text-sm text-[#0c1d3c] shadow-sm outline-none transition focus:border-[#1e3a6d] focus:ring-2 focus:ring-[#d6e0f2] disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}
