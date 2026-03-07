import { TrendingUp } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

type MetricCardProps = {
  label: string;
  value: string;
  hint?: string;
};

export function MetricCard({ label, value, hint }: MetricCardProps) {
  return (
    <Card>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
          <div className="rounded-lg bg-[#dce6f8] p-2 text-[#23406d]">
            <TrendingUp size={14} />
          </div>
        </div>
        <p className="text-2xl font-semibold text-[#0c1d3c]">{value}</p>
        {hint ? <p className="text-xs text-slate-500">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}
