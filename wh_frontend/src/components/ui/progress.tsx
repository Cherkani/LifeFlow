import { cn } from "@/lib/utils";

type ProgressProps = {
  value: number;
  className?: string;
  barClassName?: string;
};

export function Progress({ value, className, barClassName }: ProgressProps) {
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-[#d7e2f5]", className)}>
      <div className={cn("h-full rounded-full bg-[#0b1f3b] transition-all", barClassName)} style={{ width: `${clamped}%` }} />
    </div>
  );
}
