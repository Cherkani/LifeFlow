import type { TextareaHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-24 w-full rounded-lg border border-[#c7d3e8] bg-[#edf3ff] px-3 py-2 text-sm text-[#0c1d3c] shadow-sm outline-none transition placeholder:text-[#63769a] focus:border-[#1e3a6d] focus:ring-2 focus:ring-[#d6e0f2] disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}
