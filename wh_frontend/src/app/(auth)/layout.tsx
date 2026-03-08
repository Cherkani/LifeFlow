import type { ReactNode } from "react";
import Image from "next/image";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="auth-shell relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10 sm:px-6">
      <Image
        src="https://images.pexels.com/photos/3183150/pexels-photo-3183150.jpeg"
        alt="Momentum Grid background"
        fill
        className="object-cover"
        priority
      />
      <div className="absolute inset-0 bg-gradient-to-br from-[#1d2a4e]/72 via-[#384a7a]/52 to-[#7e7ab5]/42" />
      <div className="auth-orb auth-orb-one" />
      <div className="auth-orb auth-orb-two" />
      <div className="auth-orb auth-orb-three" />
      <div className="relative z-10 w-full max-w-xl">{children}</div>
      <div className="pointer-events-none absolute bottom-4 left-1/2 z-10 -translate-x-1/2 text-center text-white/90">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em]">Momentum Grid</p>
      </div>
    </main>
  );
}
