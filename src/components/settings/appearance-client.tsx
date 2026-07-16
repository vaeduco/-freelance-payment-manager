"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  ArrowDown,
  ArrowUp,
  GripVertical,
  Monitor,
  Moon,
  Sun,
  type LucideIcon,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/toast";
import { useAppSettings } from "@/components/settings/settings-provider";
import { saveUserSettings } from "@/lib/actions/user-settings";
import { CURRENCIES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import {
  DASHBOARD_WIDGETS,
  type DashboardWidgetKey,
  type DateFormatPref,
  type Density,
  type FontSize,
  type NumberFormatPref,
  type SidebarDefault,
  type ThemePref,
  type UserSettings,
} from "@/lib/types";

const THEME_OPTIONS: { value: ThemePref; label: string; Icon: LucideIcon }[] = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
  { value: "system", label: "System", Icon: Monitor },
];

const FONT_OPTIONS: { value: FontSize; label: string; sample: string }[] = [
  { value: "small", label: "Small", sample: "text-xs" },
  { value: "medium", label: "Medium", sample: "text-sm" },
  { value: "large", label: "Large", sample: "text-base" },
];

const WIDGET_LABELS: Record<DashboardWidgetKey, string> = Object.fromEntries(
  DASHBOARD_WIDGETS.map((w) => [w.key, w.label]),
) as Record<DashboardWidgetKey, string>;

/** Selectable card used for Theme + Font size. */
function OptionCard({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex flex-1 flex-col items-center justify-center gap-2 rounded-lg border px-3 py-4 text-sm font-medium transition-colors",
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border text-muted-foreground hover:bg-secondary hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

export function AppearanceClient({ initial }: { initial: UserSettings }) {
  const router = useRouter();
  const { toast } = useToast();
  const { setTheme } = useTheme();
  const { setLocal } = useAppSettings();

  const [theme, setThemeState] = useState<ThemePref>(initial.theme);
  const [fontSize, setFontSize] = useState<FontSize>(initial.font_size);
  const [density, setDensity] = useState<Density>(initial.density);
  const [sidebarDefault, setSidebarDefault] = useState<SidebarDefault>(
    initial.sidebar_default,
  );
  const [dateFormat, setDateFormat] = useState<DateFormatPref>(initial.date_format);
  const [numberFormat, setNumberFormat] = useState<NumberFormatPref>(
    initial.number_format,
  );
  const [currency, setCurrency] = useState(initial.default_currency);
  const [showBoth, setShowBoth] = useState(initial.show_both_currencies);
  const [order, setOrder] = useState<DashboardWidgetKey[]>(
    initial.dashboard_widget_order,
  );
  const [busy, setBusy] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  // --- live-applied prefs -------------------------------------------------
  function pickTheme(next: ThemePref) {
    setThemeState(next);
    setTheme(next); // applies + persists to localStorage immediately
  }
  function pickFontSize(next: FontSize) {
    setFontSize(next);
    setLocal({ fontSize: next }); // applies to <html> immediately
  }
  function pickDensity(next: Density) {
    setDensity(next);
    setLocal({ density: next });
  }
  function pickSidebar(next: SidebarDefault) {
    setSidebarDefault(next);
    setLocal({ sidebarDefault: next });
  }

  // --- widget reordering --------------------------------------------------
  function move(from: number, to: number) {
    if (to < 0 || to >= order.length) return;
    setOrder((prev) => {
      const next = [...prev];
      const [m] = next.splice(from, 1);
      next.splice(to, 0, m);
      return next;
    });
  }

  async function save() {
    setBusy(true);
    const payload: UserSettings = {
      theme,
      font_size: fontSize,
      density,
      sidebar_default: sidebarDefault,
      date_format: dateFormat,
      number_format: numberFormat,
      default_currency: currency,
      show_both_currencies: showBoth,
      dashboard_widget_order: order,
    };
    const res = await saveUserSettings(payload);
    setBusy(false);
    if ("error" in res) {
      toast(res.error, "error");
      return;
    }
    toast("Appearance saved");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {/* Theme */}
      <Card>
        <CardHeader>
          <CardTitle>Theme</CardTitle>
          <CardDescription>Applies instantly across the app.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            {THEME_OPTIONS.map((o) => (
              <OptionCard
                key={o.value}
                active={theme === o.value}
                onClick={() => pickTheme(o.value)}
              >
                <o.Icon className="h-5 w-5" />
                {o.label}
              </OptionCard>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Font size */}
      <Card>
        <CardHeader>
          <CardTitle>Font size</CardTitle>
          <CardDescription>Scales text and spacing everywhere.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            {FONT_OPTIONS.map((o) => (
              <OptionCard
                key={o.value}
                active={fontSize === o.value}
                onClick={() => pickFontSize(o.value)}
              >
                <span className={cn("font-semibold leading-none", o.sample)}>Aa</span>
                {o.label}
              </OptionCard>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Density + Sidebar */}
      <Card>
        <CardHeader>
          <CardTitle>Layout</CardTitle>
          <CardDescription>Spacing density and sidebar default.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="ap-density">Layout density</Label>
            <Select
              id="ap-density"
              value={density}
              onChange={(e) => pickDensity(e.target.value as Density)}
            >
              <option value="comfortable">Comfortable</option>
              <option value="compact">Compact</option>
            </Select>
          </div>
          <div className="space-y-1.5">
            <span className="text-sm font-medium">Sidebar default state</span>
            <div className="flex flex-col gap-2 pt-1">
              {(["expanded", "collapsed"] as SidebarDefault[]).map((v) => (
                <label
                  key={v}
                  className="flex cursor-pointer items-center gap-2.5 text-sm"
                >
                  <input
                    type="radio"
                    name="sidebar-default"
                    value={v}
                    checked={sidebarDefault === v}
                    onChange={() => pickSidebar(v)}
                    className="h-4 w-4 accent-primary"
                  />
                  <span className="capitalize">{v}</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Saved now; a collapsible sidebar is coming soon.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Date & number format */}
      <Card>
        <CardHeader>
          <CardTitle>Date &amp; number format</CardTitle>
          <CardDescription>How dates and numbers are displayed.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="ap-date">Date format</Label>
            <Select
              id="ap-date"
              value={dateFormat}
              onChange={(e) => setDateFormat(e.target.value as DateFormatPref)}
            >
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ap-number">Number format</Label>
            <Select
              id="ap-number"
              value={numberFormat}
              onChange={(e) => setNumberFormat(e.target.value as NumberFormatPref)}
            >
              <option value="1,000.00">1,000.00</option>
              <option value="1.000,00">1.000,00</option>
            </Select>
          </div>
          <p className="text-xs text-muted-foreground sm:col-span-2">
            Saved with your account. App-wide date/number formatting is being
            wired up in a follow-up — values still display in the current format
            for now.
          </p>
        </CardContent>
      </Card>

      {/* Currency */}
      <Card>
        <CardHeader>
          <CardTitle>Currency display</CardTitle>
          <CardDescription>
            The currency used for amounts across the app.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="max-w-xs space-y-1.5">
            <Label htmlFor="ap-currency">Default currency</Label>
            <Select
              id="ap-currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} — {c.label} ({c.symbol})
                </option>
              ))}
            </Select>
          </div>
          <label className="flex items-start gap-2.5">
            <span className="pt-0.5">
              <Checkbox
                checked={showBoth}
                onChange={(e) => setShowBoth(e.currentTarget.checked)}
              />
            </span>
            <span className="text-sm">
              Show both currencies
              <span className="mt-0.5 block text-xs text-muted-foreground">
                Needs an exchange rate — dual amounts aren&apos;t rendered yet.
              </span>
            </span>
          </label>
        </CardContent>
      </Card>

      {/* Dashboard widget order */}
      <Card>
        <CardHeader>
          <CardTitle>Dashboard widget order</CardTitle>
          <CardDescription>
            Drag to reorder, or use the arrows. This sets the order on your
            dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {order.map((key, i) => (
              <li
                key={key}
                draggable
                onDragStart={() => setDragIndex(i)}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (dragIndex === null || dragIndex === i) return;
                  move(dragIndex, i);
                  setDragIndex(i);
                }}
                onDragEnd={() => setDragIndex(null)}
                className={cn(
                  "flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-2.5 transition-colors",
                  dragIndex === i ? "border-primary bg-primary/5" : "hover:bg-secondary",
                )}
              >
                <GripVertical
                  className="h-4 w-4 shrink-0 cursor-grab text-muted-foreground"
                  aria-hidden
                />
                <span className="flex-1 text-sm font-medium">
                  {WIDGET_LABELS[key]}
                </span>
                <span className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => move(i, i - 1)}
                    disabled={i === 0}
                    aria-label={`Move ${WIDGET_LABELS[key]} up`}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(i, i + 1)}
                    disabled={i === order.length - 1}
                    aria-label={`Move ${WIDGET_LABELS[key]} down`}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} loading={busy}>
          Save changes
        </Button>
      </div>
    </div>
  );
}
