import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="relative flex min-h-screen items-center justify-center px-4 py-10 sm:px-6">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,_#f2f6fe_0%,_#e8eef9_45%,_#dfe8f8_100%)]" />
      <div className="w-full max-w-md">{children}</div>
    </main>
  );
}
