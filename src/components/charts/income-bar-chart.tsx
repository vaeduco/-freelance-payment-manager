"use client";

import { useState } from "react";
import type { MonthlyIncomePoint } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

/**
 * Responsive, dependency-free monthly income bar chart.
 * Bars scale to the tallest month; hovering (or focusing) shows the amount.
 */
export function IncomeBarChart({
  data,
  currency = "USD",
  height = 240,
}: {
  data: MonthlyIncomePoint[];
  currency?: string;
  height?: number;
}) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.total));
  const hasAny = data.some((d) => d.total > 0);

  return (
    <div className="w-full">
      <div
        className="flex items-end gap-1.5 sm:gap-2"
        style={{ height }}
        onMouseLeave={() => setActive(null)}
      >
        {data.map((d, i) => {
          const pct = hasAny ? (d.total / max) * 100 : 0;
          const isActive = active === i;
          return (
            <div
              key={d.month}
              className="group relative flex h-full flex-1 flex-col items-center justify-end"
              onMouseEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              tabIndex={0}
            >
              {/* Tooltip */}
              <div
                className={cn(
                  "pointer-events-none absolute -top-1 z-10 -translate-y-full whitespace-nowrap rounded-md border border-border bg-popover px-2 py-1 text-xs font-medium shadow-md transition-opacity",
                  isActive ? "opacity-100" : "opacity-0",
                )}
              >
                {formatCurrency(d.total, currency)}
              </div>
              {/* Bar track */}
              <div className="flex h-full w-full max-w-[42px] items-end">
                <div
                  className={cn(
                    "w-full rounded-t-md transition-all duration-300",
                    isActive
                      ? "bg-primary"
                      : "bg-primary/70 group-hover:bg-primary",
                  )}
                  style={{
                    height: `${Math.max(pct, d.total > 0 ? 4 : 0)}%`,
                    minHeight: d.total > 0 ? 4 : 0,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
      {/* Month labels */}
      <div className="mt-2 flex gap-1.5 sm:gap-2">
        {data.map((d) => (
          <div
            key={d.month}
            className="flex-1 text-center text-[10px] font-medium text-muted-foreground sm:text-xs"
          >
            {d.label}
          </div>
        ))}
      </div>
    </div>
  );
}
