import type { LucideIcon } from "lucide-react";
import {
  Activity,
  CircleDot,
  CloudFog,
  CloudRain,
  Droplet,
  Flower2,
  Flame,
  Frown,
  HeartPulse,
  Laugh,
  Moon,
  Smile,
  Sprout,
  Wind
} from "lucide-react";

import type { CyclePhase } from "./cycle-calculations";

export const PHASE_ICONS: Record<CyclePhase, LucideIcon> = {
  menstrual: Droplet,
  follicular: Sprout,
  ovulation: CircleDot,
  luteal: Moon
};

export const OVULATION_METHODS = ["opk", "bbt", "symptoms", "monitoring", "other"] as const;

export type OvulationMethod = (typeof OVULATION_METHODS)[number];

export const OVULATION_METHOD_LABELS: Record<OvulationMethod, string> = {
  opk: "Ovulation test (OPK)",
  bbt: "BBT shift",
  symptoms: "Symptoms/cervical fluid",
  monitoring: "Ultrasound/monitoring",
  other: "Other/unspecified"
};

export const SYMPTOM_ICONS: Record<string, LucideIcon> = {
  cramps: Activity,
  fatigue: CloudFog,
  headache: Wind,
  acne: Flame,
  bloating: Droplet,
  "mood swings": Smile,
  "tender breasts": HeartPulse,
  "back pain": Flower2
};

export const MOOD_OPTIONS = [
  "energized",
  "calm",
  "moody",
  "sad",
  "stressed",
  "tired",
  "sensitive",
  "relieved",
  "anxious",
  "low energy"
] as const;

export type MoodOption = (typeof MOOD_OPTIONS)[number];

export const MOOD_ICONS: Record<MoodOption, LucideIcon> = {
  energized: Activity,
  calm: Smile,
  moody: Wind,
  sad: Frown,
  stressed: CloudRain,
  tired: Moon,
  sensitive: Droplet,
  relieved: Laugh,
  anxious: HeartPulse,
  "low energy": CloudFog
};
