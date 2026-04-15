import type { InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function Input({ className, type = "text", step, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type={type}
      step={type === "time" && step == null ? 1800 : step}
      className={cn(
        "flex h-10 w-full rounded-lg border border-[var(--ui-input-border)] bg-[var(--ui-input-bg)] px-3 py-2 text-sm text-[var(--ui-input-text)] shadow-sm outline-none transition placeholder:text-[var(--ui-input-placeholder)] focus:border-[var(--ui-input-focus-border)] focus:ring-2 focus:ring-[var(--ui-input-focus-ring)] disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}
