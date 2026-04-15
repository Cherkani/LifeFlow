import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type ButtonVariant = "default" | "secondary" | "outline" | "ghost" | "destructive";
type ButtonSize = "default" | "sm" | "lg" | "icon";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

const variantClasses: Record<ButtonVariant, string> = {
  default: "bg-[var(--app-btn-primary-bg)] text-[var(--app-btn-primary-fg)] hover:bg-[var(--app-btn-primary-hover)]",
  secondary: "bg-[var(--app-chip-bg)] text-[var(--app-chip-fg)] hover:brightness-95",
  outline:
    "border border-[var(--app-panel-border-strong)] bg-[var(--app-btn-secondary-bg)] text-[var(--app-btn-secondary-fg)] hover:bg-[var(--app-btn-secondary-hover)]",
  ghost: "bg-transparent text-[var(--app-btn-secondary-fg)] hover:bg-[var(--app-btn-secondary-bg)]",
  destructive: "bg-rose-600 text-white hover:bg-rose-500"
};

const sizeClasses: Record<ButtonSize, string> = {
  default: "h-10 px-4 py-2",
  sm: "h-9 rounded-md px-3",
  lg: "h-11 rounded-md px-8",
  icon: "size-10"
};

export function Button({ className, variant = "default", size = "default", type = "button", ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8f8abf] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    />
  );
}
