import type { InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function Input({ className, type = "text", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type={type}
      className={cn(
        "flex h-10 w-full rounded-lg border border-[#c7d3e8] bg-[#edf3ff] px-3 py-2 text-sm text-[#0c1d3c] shadow-sm outline-none transition placeholder:text-[#63769a] focus:border-[#1e3a6d] focus:ring-2 focus:ring-[#d6e0f2] disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}
