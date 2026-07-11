import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  icon: Icon,
  iconClassName,
  delta,
  hint,
  accent,
}: {
  label: string;
  value: string;
  icon?: LucideIcon;
  iconClassName?: string;
  /** e.g. +12% vs last month. Positive is good (green), negative red. */
  delta?: { value: number; label?: string } | null;
  hint?: string;
  accent?: "primary" | "success" | "warning" | "destructive";
}) {
  const accentBg =
    accent === "success"
      ? "bg-success/10 text-success"
      : accent === "warning"
        ? "bg-warning/10 text-warning"
        : accent === "destructive"
          ? "bg-destructive/10 text-destructive"
          : "bg-primary/10 text-primary";

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {Icon && (
          <div
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-lg",
              accentBg,
              iconClassName,
            )}
          >
            <Icon className="h-[18px] w-[18px]" />
          </div>
        )}
      </div>
      <p className="mt-2 text-2xl font-bold tracking-tight tabular-nums">
        {value}
      </p>
      <div className="mt-1 flex items-center gap-2">
        {delta != null && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 text-xs font-medium",
              delta.value >= 0 ? "text-success" : "text-destructive",
            )}
          >
            {delta.value >= 0 ? (
              <ArrowUpRight className="h-3.5 w-3.5" />
            ) : (
              <ArrowDownRight className="h-3.5 w-3.5" />
            )}
            {Math.abs(delta.value)}%
          </span>
        )}
        {(delta?.label || hint) && (
          <span className="text-xs text-muted-foreground">
            {delta?.label ?? hint}
          </span>
        )}
      </div>
    </Card>
  );
}
