import Link from "next/link";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type {
  AttentionOverdueItem,
  AttentionStaleItem,
} from "@/lib/data/dashboard";
import { formatCurrency } from "@/lib/utils";

export function NeedsAttention({
  overdue,
  stale,
  currency,
}: {
  overdue: AttentionOverdueItem[];
  stale: AttentionStaleItem[];
  currency: string;
}) {
  const nothing = overdue.length === 0 && stale.length === 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Needs attention</CardTitle>
        <CardDescription>Clients and invoices to follow up on</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {nothing ? (
          <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
            <CheckCircle2 className="h-8 w-8 text-success" />
            <p className="text-sm font-medium">You&apos;re all caught up</p>
            <p className="text-xs text-muted-foreground">
              No overdue invoices or quiet clients right now.
            </p>
          </div>
        ) : (
          <>
            {overdue.length > 0 && (
              <section className="space-y-2">
                <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-destructive">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Overdue invoices ({overdue.length})
                </h3>
                <ul className="space-y-1">
                  {overdue.map((o) => (
                    <li key={o.invoiceId}>
                      <Link
                        href={o.clientId ? `/clients/${o.clientId}` : "/invoices"}
                        className="group flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-secondary"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">
                            {o.clientName}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {o.service}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-sm font-semibold tabular-nums">
                            {formatCurrency(o.amount, currency)}
                          </p>
                          <p className="text-xs font-medium text-destructive">
                            {o.daysOverdue}d overdue
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {stale.length > 0 && (
              <section className="space-y-2">
                <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-warning">
                  <CalendarClock className="h-3.5 w-3.5" />
                  No contact in 60+ days ({stale.length})
                </h3>
                <ul className="space-y-1">
                  {stale.map((c) => (
                    <li key={c.clientId}>
                      <Link
                        href={`/clients/${c.clientId}`}
                        className="group flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-secondary"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">
                            {c.clientName}
                          </p>
                          {c.company && (
                            <p className="truncate text-xs text-muted-foreground">
                              {c.company}
                            </p>
                          )}
                        </div>
                        <p className="shrink-0 text-xs font-medium text-muted-foreground">
                          {c.daysSince}d quiet
                        </p>
                        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
