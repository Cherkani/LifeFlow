"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, type ReactNode } from "react";

import type { RedirectResult } from "@/lib/action-with-state";

type ActionFormProps = {
  action: (prevState: RedirectResult | null, formData: FormData) => Promise<RedirectResult | null>;
  children: ReactNode;
  className?: string;
  /** Called before redirect when save succeeds. Use to close modals without full navigation. */
  onSuccess?: () => void;
};

export function ActionForm({ action, children, className, onSuccess }: ActionFormProps) {
  const router = useRouter();
  const [state, formAction] = useActionState(action, null);

  useEffect(() => {
    if (state?.redirectTo) {
      onSuccess?.();
      router.replace(state.redirectTo as Parameters<typeof router.replace>[0]);
    }
  }, [state, router, onSuccess]);

  return (
    <form action={formAction} className={className}>
      {children}
    </form>
  );
}
