"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { CalendarEvent, CalendarEventType } from "@/lib/data/calendar";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
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
    year: "numeric",
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
  const monthLabel = first.toLocaleDateString([], { month: "long", year: "numeric" });

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
    "inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground";
  const selectedEvents = selected ? (byDate.get(selected) ?? []) : [];

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-4 space-y-0">
        <CardTitle>Calendar</CardTitle>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => go(-1)} aria-label="Previous month" className={navBtn}>
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[8.5rem] text-center text-sm font-semibold">{monthLabel}</span>
          <button type="button" onClick={() => go(1)} aria-label="Next month" className={navBtn}>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-1 grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
          {WEEKDAYS.map((w) => (
            <span key={w}>{w}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
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
                aria-label={
                  has ? `${prettyDate(ds)} — ${dayEvents!.length} item(s)` : undefined
                }
                className={cn(
                  "flex aspect-square flex-col items-center justify-center gap-0.5 rounded-md text-sm transition-colors",
                  has ? "cursor-pointer hover:bg-secondary" : "cursor-default text-muted-foreground/50",
                  isToday && "font-bold text-primary",
                  selected === ds && "ring-2 ring-primary ring-offset-1 ring-offset-background",
                )}
              >
                <span>{d}</span>
                {types.length > 0 && (
                  <span className="flex gap-0.5">
                    {types.map((t) => (
                      <span key={t} className={cn("h-1.5 w-1.5 rounded-full", TYPE_META[t].dot)} />
                    ))}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Day popover — what's happening on the selected date. */}
        {selected && selectedEvents.length > 0 && (
          <div className="mt-3 rounded-lg border border-border bg-secondary/40 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {prettyDate(selected)}
            </p>
            <ul className="space-y-2">
              {selectedEvents.map((e, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span
                    className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", TYPE_META[e.type].dot)}
                  />
                  <div className="min-w-0 flex-1">
                    {e.href ? (
                      <Link href={e.href} className="font-medium text-foreground hover:underline">
                        {e.title}
                      </Link>
                    ) : (
                      <span className="font-medium text-foreground">{e.title}</span>
                    )}
                    {e.detail && (
                      <span className="block text-xs text-muted-foreground">{e.detail}</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {TYPE_ORDER.map((t) => (
            <span key={t} className="inline-flex items-center gap-1.5">
              <span className={cn("h-2 w-2 rounded-full", TYPE_META[t].dot)} />
              {TYPE_META[t].label}
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
