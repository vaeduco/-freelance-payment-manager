"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { CalendarEvent, CalendarEventType } from "@/lib/data/calendar";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const TYPE_ORDER: CalendarEventType[] = ["due", "meeting", "scheduled"];
const TYPE_META: Record<CalendarEventType, { label: string; dot: string }> = {
  due: { label: "Due date", dot: "bg-destructive" },
  meeting: { label: "Meeting", dot: "bg-primary" },
  scheduled: { label: "Scheduled invoice", dot: "bg-success" },
};

const pad = (n: number) => String(n).padStart(2, "0");
const keyOf = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

function prettyDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString([], {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export function DashboardCalendar({ events }: { events: CalendarEvent[] }) {
  const today = new Date();
  const todayKey = keyOf(today.getFullYear(), today.getMonth(), today.getDate());
  const [view, setView] = useState({ y: today.getFullYear(), m: today.getMonth() });
  const [selected, setSelected] = useState<string | null>(null);

  const byDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const e of events) {
      const list = map.get(e.date);
      if (list) list.push(e);
      else map.set(e.date, [e]);
    }
    return map;
  }, [events]);

  const first = new Date(view.y, view.m, 1);
  const startPad = first.getDay();
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const monthLabel = first.toLocaleDateString([], { month: "short", year: "numeric" });

  const go = (delta: number) => {
    setSelected(null);
    setView((v) => {
      const nm = new Date(v.y, v.m + delta, 1);
      return { y: nm.getFullYear(), m: nm.getMonth() };
    });
  };

  const cells: (number | null)[] = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const navBtn =
    "inline-flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground";
  const selectedEvents = selected ? (byDate.get(selected) ?? []) : [];

  return (
    <Card className="p-3">
      {/* Header */}
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[13px] font-semibold">Calendar</span>
        <div className="flex items-center gap-0.5">
          <button type="button" onClick={() => go(-1)} aria-label="Previous month" className={navBtn}>
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <span className="min-w-[4.75rem] text-center text-[12px] font-medium tabular-nums">
            {monthLabel}
          </span>
          <button type="button" onClick={() => go(1)} aria-label="Next month" className={navBtn}>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Weekday labels */}
      <div className="grid grid-cols-7 text-center text-[10px] font-medium text-muted-foreground">
        {WEEKDAYS.map((w, i) => (
          <span key={i} className="py-1">
            {w}
          </span>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7">
        {cells.map((d, i) => {
          if (d === null) return <span key={`pad-${i}`} />;
          const ds = keyOf(view.y, view.m, d);
          const dayEvents = byDate.get(ds);
          const has = !!dayEvents?.length;
          const types = has
            ? TYPE_ORDER.filter((t) => dayEvents!.some((e) => e.type === t))
            : [];
          const isToday = ds === todayKey;
          return (
            <button
              key={ds}
              type="button"
              disabled={!has}
              onClick={() => setSelected(ds)}
              aria-label={has ? `${prettyDate(ds)} — ${dayEvents!.length} item(s)` : undefined}
              className={cn(
                "flex flex-col items-center gap-0.5 rounded py-1 text-[11px] transition-colors",
                has ? "cursor-pointer hover:bg-secondary" : "cursor-default text-muted-foreground/40",
                selected === ds && "bg-secondary",
              )}
            >
              <span
                className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-full",
                  isToday && "bg-primary font-semibold text-primary-foreground",
                )}
              >
                {d}
              </span>
              {/* Fixed-height dot row keeps every cell aligned. */}
              <span className="flex h-1 items-center gap-0.5">
                {types.map((t) => (
                  <span key={t} className={cn("h-1 w-1 rounded-full", TYPE_META[t].dot)} />
                ))}
              </span>
            </button>
          );
        })}
      </div>

      {/* Day popover — what's happening on the selected date. */}
      {selected && selectedEvents.length > 0 && (
        <div className="mt-2 rounded-md border border-border bg-secondary/40 p-2">
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {prettyDate(selected)}
          </p>
          <ul className="space-y-1.5">
            {selectedEvents.map((e, i) => (
              <li key={i} className="flex items-start gap-1.5 text-[11px]">
                <span className={cn("mt-1 h-1.5 w-1.5 shrink-0 rounded-full", TYPE_META[e.type].dot)} />
                <div className="min-w-0 flex-1 leading-tight">
                  {e.href ? (
                    <Link href={e.href} className="font-medium text-foreground hover:underline">
                      {e.title}
                    </Link>
                  ) : (
                    <span className="font-medium text-foreground">{e.title}</span>
                  )}
                  {e.detail && (
                    <span className="block text-[10px] text-muted-foreground">{e.detail}</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Legend */}
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground">
        {TYPE_ORDER.map((t) => (
          <span key={t} className="inline-flex items-center gap-1">
            <span className={cn("h-1.5 w-1.5 rounded-full", TYPE_META[t].dot)} />
            {TYPE_META[t].label}
          </span>
        ))}
      </div>
    </Card>
  );
}
