import { Activity, ArrowDownLeft, FileText } from "lucide-react";
import { EmptyState } from "@/components/ui/misc";
import { StatusBadge } from "@/components/ui/status-badge";
import type { RecentActivityItem } from "@/lib/data/dashboard";
import type { InvoiceStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { formatCurrency, formatDateShort } from "@/lib/utils";

export function RecentActivity({
  items,
  currency,
}: {
  items: RecentActivityItem[];
  currency: string;
}) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={Activity}
        title="No activity yet"
        description="Create your first invoice or log a payment to get started."
      />
    );
  }

  return (
    <ul className="divide-y divide-border">
      {items.map((item) => {
        const isPayment = item.kind === "payment";
        const Icon = isPayment ? ArrowDownLeft : FileText;
        return (
          <li key={`${item.kind}-${item.id}`} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
            <div
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                isPayment
                  ? "bg-success/10 text-success"
                  : "bg-muted text-muted-foreground",
              )}
            >
              <Icon className="h-[18px] w-[18px]" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">
                {item.title}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {item.subtitle}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {formatDateShort(item.date)}
              </p>
            </div>

            <div className="flex shrink-0 flex-col items-end gap-1">
              <span
                className={cn(
                  "text-sm font-semibold tabular-nums",
                  isPayment ? "text-success" : "text-foreground",
                )}
              >
                {isPayment ? "+" : ""}
                {formatCurrency(item.amount, currency)}
              </span>
              {!isPayment && item.status && (
                <StatusBadge status={item.status as InvoiceStatus} />
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
