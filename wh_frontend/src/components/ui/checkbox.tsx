import type { InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function Checkbox({ className, type = "checkbox", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type={type}
      className={cn(
        "size-4 rounded border border-[#9eb0d0] bg-[#edf3ff] text-[#0b1f3b] outline-none focus:ring-2 focus:ring-[#c9d7ee]",
        className
      )}
      {...props}
    />
  );
}
