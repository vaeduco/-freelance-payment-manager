"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const WEEKDAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const pad = (n: number) => String(n).padStart(2, "0");
const keyOf = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

/**
 * Dependency-free month calendar. Past dates are always disabled; callers add
 * more restrictions via `isDisabled`, highlight days via `marked`, and mark the
 * chosen day via `selectedDate`. Month navigation can't go before the current month.
 */
export function MonthCalendar({
  marked,
  isDisabled,
  selectedDate,
  onSelect,
}: {
  marked?: Set<string>;
  isDisabled?: (dateStr: string) => boolean;
  selectedDate?: string | null;
  onSelect: (dateStr: string) => void;
}) {
  const today = new Date();
  const todayKey = keyOf(today.getFullYear(), today.getMonth(), today.getDate());
  const [view, setView] = useState({ y: today.getFullYear(), m: today.getMonth() });

  const first = new Date(view.y, view.m, 1);
  const startPad = first.getDay();
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const monthLabel = first.toLocaleDateString([], { month: "long", year: "numeric" });
  const atCurrentMonth =
    view.y === today.getFullYear() && view.m === today.getMonth();

  const go = (delta: number) =>
    setView((v) => {
      const nm = new Date(v.y, v.m + delta, 1);
      return { y: nm.getFullYear(), m: nm.getMonth() };
    });

  const cells: (number | null)[] = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const navBtn =
    "inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:pointer-events-none disabled:opacity-30";

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => go(-1)}
          disabled={atCurrentMonth}
          aria-label="Previous month"
          className={navBtn}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-semibold">{monthLabel}</span>
        <button
          type="button"
          onClick={() => go(1)}
          aria-label="Next month"
          className={navBtn}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div className="mb-1 grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
        {WEEKDAY_LABELS.map((w) => (
          <span key={w}>{w}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (d === null) return <span key={`pad-${i}`} />;
          const ds = keyOf(view.y, view.m, d);
          const past = ds < todayKey;
          const disabled = past || (isDisabled ? isDisabled(ds) : false);
          const isMarked = marked?.has(ds) ?? false;
          const isSel = selectedDate === ds;
          return (
            <button
              key={ds}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(ds)}
              aria-pressed={isMarked}
              className={cn(
                "flex aspect-square items-center justify-center rounded-md text-sm transition-colors",
                disabled && "cursor-not-allowed text-muted-foreground/40",
                !disabled && isMarked && "bg-primary/15 font-semibold text-primary",
                !disabled && !isMarked && "hover:bg-secondary",
                isSel && "ring-2 ring-primary ring-offset-1 ring-offset-background",
                !disabled && ds === todayKey && !isMarked && "font-bold",
              )}
            >
              {d}
            </button>
          );
        })}
      </div>
    </div>
  );
}
