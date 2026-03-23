import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "secondary" | "success" | "warning" | "danger";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
};

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-[var(--ui-badge-default-bg)] text-[var(--ui-badge-default-fg)]",
  secondary: "bg-[var(--ui-badge-secondary-bg)] text-[var(--ui-badge-secondary-fg)]",
  success: "bg-[var(--ui-badge-success-bg)] text-[var(--ui-badge-success-fg)]",
  warning: "bg-[var(--ui-badge-warning-bg)] text-[var(--ui-badge-warning-fg)]",
  danger: "bg-[var(--ui-badge-danger-bg)] text-[var(--ui-badge-danger-fg)]"
};

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold", variantClasses[variant], className)}
      {...props}
    />
  );
}
