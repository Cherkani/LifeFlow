import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 px-4 py-10">
      <div className="absolute -top-16 right-0 h-72 w-72 rounded-full bg-blue-400/20 blur-3xl" />
      <div className="absolute -bottom-16 left-0 h-72 w-72 rounded-full bg-cyan-300/15 blur-3xl" />
      <div className="relative w-full max-w-md">{children}</div>
    </div>
  );
}
