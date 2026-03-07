import { X } from "lucide-react";
import type { ReactNode } from "react";

type ModalShellProps = {
  title: string;
  closeHref: string;
  description?: string;
  children: ReactNode;
};

export function ModalShell({ title, closeHref, description, children }: ModalShellProps) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto p-4">
      <a
        href={closeHref}
        aria-label="Close modal"
        className="absolute inset-0 bg-slate-950/40 backdrop-blur-[1px]"
      />

      <div className="relative z-10 mx-auto my-6 flex w-full max-w-2xl max-h-[90vh] flex-col rounded-2xl border border-[#c7d3e8] bg-[#f2f6fe] shadow-xl">
        <div className="flex items-start justify-between border-b border-[#d7e0f1] px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-[#0c1d3c]">{title}</h2>
            {description ? <p className="mt-1 text-sm text-[#4a5f83]">{description}</p> : null}
          </div>
          <a
            href={closeHref}
            aria-label="Close"
            className="inline-flex size-8 items-center justify-center rounded-md text-[#4a5f83] hover:bg-[#e3ebf9] hover:text-[#0c1d3c]"
          >
            <X size={16} />
          </a>
        </div>

        <div className="overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}
