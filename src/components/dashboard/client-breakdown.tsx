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
          <div className="cbd-cq">
            <div className="cbd-cq-row flex flex-col items-center gap-6">
            <svg
              viewBox="0 0 140 140"
              className="h-32 w-32 shrink-0 -rotate-90"
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

            {/* Full width when stacked; takes the remaining space beside the
                donut when the container query switches to a row (globals.css
                .cbd-cq rules). min-w-0 lets long names truncate. */}
            <ul className="cbd-cq-legend space-y-2.5">
              {items.map((d, i) => {
                const pct = Math.round((d.value / total) * 100);
                return (
                  <li key={d.label} className="text-sm">
                    {/* Row 1: dot + name + percentage. */}
                    <div className="flex items-center gap-2">
                      <span
                        className="h-3 w-3 shrink-0 rounded-full"
                        style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                      />
                      <span className="min-w-0 flex-1 truncate text-foreground">
                        {d.label}
                      </span>
                      <span className="shrink-0 tabular-nums font-medium text-foreground">
                        {pct}%
                      </span>
                    </div>
                    {/* Row 2: amount as muted subtext, indented under the name
                        (dot w-3 = 12px + gap-2 = 8px → pl-5 = 20px). */}
                    <span className="block truncate pl-5 text-xs tabular-nums text-muted-foreground">
                      {formatCurrency(d.value, currency)}
                    </span>
                  </li>
                );
              })}
            </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
