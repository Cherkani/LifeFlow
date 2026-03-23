import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type AlertVariant = "default" | "error" | "success";

type AlertProps = HTMLAttributes<HTMLDivElement> & {
  variant?: AlertVariant;
};

const variantClasses: Record<AlertVariant, string> = {
  default: "border-[var(--ui-alert-default-border)] bg-[var(--ui-alert-default-bg)] text-[var(--ui-alert-default-fg)]",
  error: "border-[var(--ui-alert-error-border)] bg-[var(--ui-alert-error-bg)] text-[var(--ui-alert-error-fg)]",
  success: "border-[var(--ui-alert-success-border)] bg-[var(--ui-alert-success-bg)] text-[var(--ui-alert-success-fg)]"
};

export function Alert({ className, variant = "default", ...props }: AlertProps) {
  return (
    <div
      role="alert"
      className={cn("rounded-lg border px-3 py-2 text-sm", variantClasses[variant], className)}
      {...props}
    />
  );
}
