import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type AlertVariant = "default" | "error" | "success";

type AlertProps = HTMLAttributes<HTMLDivElement> & {
  variant?: AlertVariant;
};

const variantClasses: Record<AlertVariant, string> = {
  default: "border-[#c7d3e8] bg-[#edf3ff] text-[#25406d]",
  error: "border-rose-200 bg-rose-50 text-rose-700",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700"
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
