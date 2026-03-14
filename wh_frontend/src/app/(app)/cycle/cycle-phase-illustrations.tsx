"use client";

import { useId } from "react";
import type { CyclePhase } from "@/lib/cycle-calculations";

/** Simple SVG illustrations for each cycle phase - medical-appropriate, abstract */
export function PhaseIllustration({ phase, className = "h-24 w-24" }: { phase: CyclePhase; className?: string }) {
  const id = useId().replace(/:/g, "");
  switch (phase) {
    case "menstrual":
      return (
        <svg viewBox="0 0 64 64" className={className} aria-hidden>
          <defs>
            <linearGradient id={`menstrual-grad-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fda4af" />
              <stop offset="100%" stopColor="#fb7185" />
            </linearGradient>
          </defs>
          <ellipse cx="32" cy="40" rx="12" ry="8" fill={`url(#menstrual-grad-${id})`} opacity="0.9" />
          <path d="M26 28 Q32 20 38 28 Q36 32 32 36 Q28 32 26 28" fill="none" stroke="#fb7185" strokeWidth="2" strokeLinecap="round" />
          <circle cx="28" cy="24" r="3" fill="#fda4af" />
          <circle cx="36" cy="22" r="2.5" fill="#fda4af" />
        </svg>
      );
    case "follicular":
      return (
        <svg viewBox="0 0 64 64" className={className} aria-hidden>
          <defs>
            <linearGradient id={`follicular-grad-${id}`} x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#7dd3fc" />
              <stop offset="100%" stopColor="#38bdf8" />
            </linearGradient>
          </defs>
          <path d="M32 52 Q20 40 24 28 Q28 20 32 16 Q36 20 40 28 Q44 40 32 52" fill={`url(#follicular-grad-${id})`} opacity="0.9" />
          <path d="M28 36 Q32 28 36 36" fill="none" stroke="#0ea5e9" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
        </svg>
      );
    case "ovulation":
      return (
        <svg viewBox="0 0 64 64" className={className} aria-hidden>
          <defs>
            <linearGradient id={`ovulation-grad-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fde047" />
              <stop offset="100%" stopColor="#facc15" />
            </linearGradient>
            <radialGradient id={`ovulation-glow-${id}`}>
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="100%" stopColor="#fde047" />
            </radialGradient>
          </defs>
          <circle cx="32" cy="32" r="18" fill={`url(#ovulation-glow-${id})`} />
          <circle cx="32" cy="32" r="12" fill={`url(#ovulation-grad-${id})`} stroke="#eab308" strokeWidth="2" />
        </svg>
      );
    case "luteal":
      return (
        <svg viewBox="0 0 64 64" className={className} aria-hidden>
          <defs>
            <linearGradient id={`luteal-grad-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#c4b5fd" />
              <stop offset="100%" stopColor="#a78bfa" />
            </linearGradient>
          </defs>
          <path d="M32 8 Q48 24 32 48 Q16 24 32 8" fill={`url(#luteal-grad-${id})`} opacity="0.9" />
          <path d="M32 20 Q40 28 32 36 Q24 28 32 20" fill="none" stroke="#8b5cf6" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
        </svg>
      );
  }
}
