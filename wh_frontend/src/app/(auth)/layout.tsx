import type { ReactNode } from "react";
import Image from "next/image";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="auth-shell relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10 sm:px-6">
      <Image
        src="/momentum-grid-auth-hero.jpg"
        alt="Momentum Grid background"
        fill
        className="object-cover"
        priority
      />
      <div className="absolute inset-0 bg-gradient-to-br from-[#040812]/90 via-[#0d1d38]/80 to-[#1f3f76]/72" />
      <div className="auth-orb auth-orb-one" />
      <div className="auth-orb auth-orb-two" />
      <div className="auth-orb auth-orb-three" />
      <div className="auth-star auth-star-one" />
      <div className="auth-star auth-star-two" />
      <div className="auth-star auth-star-three" />
      <div className="auth-star auth-star-four" />
      <div className="relative z-10 w-full max-w-6xl">{children}</div>
      <div className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2 text-center text-white/90">
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px]">
          <span className="font-semibold tracking-[0.08em] text-white">Built by Aymen Cherkani</span>
          <a href="mailto:cherkaniaymen1@gmail.com" className="text-white/90 transition-colors hover:text-white">
            Email
          </a>
          <a
            href="https://www.linkedin.com/in/aymen-cherkani-a68b1224a/"
            target="_blank"
            rel="noreferrer"
            className="text-white/90 transition-colors hover:text-white"
          >
            LinkedIn
          </a>
          <a
            href="https://cherkani.vercel.app/"
            target="_blank"
            rel="noreferrer"
            className="text-white/90 transition-colors hover:text-white"
          >
            Website
          </a>
        </div>
      </div>
    </main>
  );
}
