"use client";

import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SubmitButtonProps = {
  label: string;
  pendingLabel?: string;
  className?: string;
  variant?: "default" | "secondary" | "outline" | "ghost" | "destructive";
};

export function SubmitButton({ label, pendingLabel, className, variant = "default" }: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" variant={variant} className={cn("w-full sm:w-auto", className)} disabled={pending}>
      {pending ? pendingLabel ?? "Saving..." : label}
    </Button>
  );
}
