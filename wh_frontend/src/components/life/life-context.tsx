import { GitBranch } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

type LifeContextProps = {
  stats?: Array<{ label: string; value: string | number }>;
  emptyLabel?: string;
};

export function LifeContext({
  stats = [],
  emptyLabel = "No phase or project linked yet"
}: LifeContextProps) {
  return (
    <Card className="border-[var(--app-panel-border)] bg-[var(--app-panel-bg-soft)] shadow-none">
      <CardContent className="flex flex-wrap items-center justify-between gap-3 py-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="inline-flex size-8 items-center justify-center rounded-lg bg-[var(--app-btn-secondary-bg)] text-[var(--app-btn-secondary-fg)]">
            <GitBranch size={16} />
          </span>
          <span className="text-sm text-[var(--app-text-muted)]">{emptyLabel}</span>
        </div>
        {stats.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            {stats.map((stat) => (
              <Badge key={stat.label} variant="secondary">
                {stat.label}: {stat.value}
              </Badge>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function LifeSummaryBand({
  title,
  description,
  stats
}: {
  title: string;
  description: string;
  stats: Array<{ label: string; value: string | number }>;
}) {
  return (
    <Card className="border-[var(--app-panel-border)] bg-[var(--app-panel-bg-soft)] shadow-none">
      <CardContent className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <GitBranch size={15} className="shrink-0 text-[var(--app-text-muted)]" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[var(--app-text-strong)]">{title}</p>
            <p className="hidden truncate text-xs text-[var(--app-text-muted)] lg:block">{description}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {stats.map((stat) => <Badge key={stat.label}>{stat.label}: {stat.value}</Badge>)}
        </div>
      </CardContent>
    </Card>
  );
}
