import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CHART_COLORS } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";

export interface ClientSlice {
  label: string;
  value: number;
}

/**
 * Dashboard widget: share of collected income by client (top 6), as a
 * dependency-free donut + legend. Mirrors the PaymentMethodBreakdown style.
 */
export function ClientBreakdown({
  data,
  currency = "USD",
}: {
  data: ClientSlice[];
  currency?: string;
}) {
  const items = [...data]
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);
  const total = items.reduce((s, d) => s + d.value, 0);

  const r = 54;
  const c = 2 * Math.PI * r;
  let offset = 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Client breakdown</CardTitle>
        <CardDescription>Collected income by client</CardDescription>
      </CardHeader>
      <CardContent>
        {total <= 0 || items.length === 0 ? (
          <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
            No income data yet.
          </div>
        ) : (
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:gap-8">
            <svg
              viewBox="0 0 140 140"
              className="h-36 w-36 shrink-0 -rotate-90"
              role="img"
              aria-label="Client income breakdown"
            >
              <circle
                cx="70"
                cy="70"
                r={r}
                fill="none"
                stroke="hsl(var(--muted))"
                strokeWidth="18"
              />
              {items.map((d, i) => {
                const frac = d.value / total;
                const dash = frac * c;
                const seg = (
                  <circle
                    key={d.label}
                    cx="70"
                    cy="70"
                    r={r}
                    fill="none"
                    stroke={CHART_COLORS[i % CHART_COLORS.length]}
                    strokeWidth="18"
                    strokeDasharray={`${dash} ${c - dash}`}
                    strokeDashoffset={-offset}
                  />
                );
                offset += dash;
                return seg;
              })}
            </svg>

            <ul className="w-full space-y-2">
              {items.map((d, i) => {
                const pct = Math.round((d.value / total) * 100);
                return (
                  <li key={d.label} className="flex items-center gap-3 text-sm">
                    <span
                      className="h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                    />
                    <span className="flex-1 truncate text-foreground">{d.label}</span>
                    <span className="tabular-nums font-medium text-foreground">
                      {pct}%
                    </span>
                    <span className="w-24 text-right tabular-nums text-muted-foreground">
                      {formatCurrency(d.value, currency)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
