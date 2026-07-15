"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, Bell, LogIn, MapPin, Monitor } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { markAllAlertsRead } from "@/lib/actions/security";
import { cn } from "@/lib/utils";
import type { SecurityEvent } from "@/lib/types";

type Tab = "alerts" | "logins" | "activity";

function fmt(ts: string): string {
  return new Date(ts).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function SecurityActivity({
  alerts,
  logins,
  activity,
  unreadCount,
}: {
  alerts: SecurityEvent[];
  logins: SecurityEvent[];
  activity: SecurityEvent[];
  unreadCount: number;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>(unreadCount > 0 ? "alerts" : "activity");
  const [marking, setMarking] = useState(false);

  // Each tab is backed by its own scoped, bounded query (not a filter over a
  // single capped window), so the lists stay consistent with the unread badge.
  const rows = tab === "alerts" ? alerts : tab === "logins" ? logins : activity;

  async function markRead() {
    setMarking(true);
    const res = await markAllAlertsRead();
    setMarking(false);
    if ("error" in res) return toast(res.error, "error");
    toast("Alerts marked as read");
    router.refresh();
  }

  const TABS: { key: Tab; label: string; count?: number }[] = [
    { key: "alerts", label: "Alerts", count: unreadCount || undefined },
    { key: "logins", label: "Login history" },
    { key: "activity", label: "Audit log" },
  ];

  const empty = {
    alerts: { icon: Bell, title: "No alerts", desc: "Security alerts will show here." },
    logins: { icon: LogIn, title: "No sign-ins yet", desc: "Your sign-in history will show here." },
    activity: { icon: Activity, title: "No activity yet", desc: "Account activity will show here." },
  }[tab];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle>Security activity</CardTitle>
          {tab === "alerts" && unreadCount > 0 && (
            <Button size="sm" variant="outline" onClick={markRead} loading={marking}>
              Mark all read
            </Button>
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={cn(
                "inline-flex items-center rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                tab === t.key
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-secondary",
              )}
            >
              {t.label}
              {t.count ? (
                <span className="ml-1.5 rounded-full bg-destructive px-1.5 text-xs font-semibold text-destructive-foreground">
                  {t.count}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <EmptyState icon={empty.icon} title={empty.title} description={empty.desc} />
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((e) => {
              const unread = e.is_alert && !e.read_at;
              return (
                <li key={e.id} className="flex items-start gap-3 py-3">
                  <div
                    className={cn(
                      "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                      unread ? "bg-warning/10 text-warning" : "bg-secondary text-muted-foreground",
                    )}
                  >
                    {e.category === "auth" ? (
                      <LogIn className="h-4 w-4" />
                    ) : e.is_alert ? (
                      <Bell className="h-4 w-4" />
                    ) : (
                      <Activity className="h-4 w-4" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-foreground">
                      {e.summary}
                      {unread && (
                        <Badge variant="warning" className="ml-2">
                          New
                        </Badge>
                      )}
                    </p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                      <span>{fmt(e.created_at)}</span>
                      {e.device && (
                        <span className="inline-flex items-center gap-1">
                          <Monitor className="h-3 w-3" />
                          {e.device}
                        </span>
                      )}
                      {e.location && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {e.location}
                        </span>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
