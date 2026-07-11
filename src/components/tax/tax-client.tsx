"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  PiggyBank,
  Wallet,
  Landmark,
  TrendingUp,
  Receipt,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/ui/misc";
import { PageHeader } from "@/components/app/page-header";
import { StatCard } from "@/components/stat-card";
import { useToast } from "@/components/ui/toast";
import { updateProfile } from "@/lib/actions/profile";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { PaymentWithRelations } from "@/lib/types";

interface TaxClientProps {
  initialRate: number;
  currency: string;
  incomeThisYear: number;
  incomeAllTime: number;
  outstanding: number;
  recentPayments: PaymentWithRelations[];
}

/** Clamp a numeric tax rate into the valid 0–100 range. */
function clampRate(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

export function TaxClient({
  initialRate,
  currency,
  incomeThisYear,
  incomeAllTime,
  outstanding,
  recentPayments,
}: TaxClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSaving, startSaving] = useTransition();

  // Raw string keeps the input controllable (e.g. while clearing / typing).
  const [rateInput, setRateInput] = useState(String(initialRate));

  const rate = clampRate(parseFloat(rateInput));
  const fraction = rate / 100;

  const {
    setAsideThisYear,
    takeHome,
    outstandingSetAside,
  } = useMemo(
    () => ({
      setAsideThisYear: incomeThisYear * fraction,
      takeHome: incomeThisYear * (1 - fraction),
      outstandingSetAside: outstanding * fraction,
    }),
    [incomeThisYear, outstanding, fraction],
  );

  const rateChanged = rate !== clampRate(initialRate);

  function handleSave() {
    startSaving(async () => {
      const res = await updateProfile({ tax_rate: rate });
      if ("error" in res) {
        toast(res.error, "error");
        return;
      }
      toast("Tax rate saved");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tax Estimator"
        description="Set aside the right amount from every payment."
      />

      {/* Settings + headline callout */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Tax rate setting */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Your tax rate</CardTitle>
            <CardDescription>
              The percentage of income you set aside for taxes.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tax-rate">Tax rate (%)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="tax-rate"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  max={100}
                  step={0.5}
                  value={rateInput}
                  onChange={(e) => setRateInput(e.target.value)}
                  className="tabular-nums"
                  aria-describedby="tax-rate-hint"
                />
                <span className="text-sm font-medium text-muted-foreground">
                  %
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={0.5}
                value={rate}
                onChange={(e) => setRateInput(e.target.value)}
                aria-label="Tax rate slider"
                className="h-2 w-full cursor-pointer appearance-none rounded-full bg-secondary accent-primary"
              />
              <p id="tax-rate-hint" className="text-xs text-muted-foreground">
                Estimates update live as you adjust the rate.
              </p>
            </div>
            <Button
              onClick={handleSave}
              loading={isSaving}
              disabled={!rateChanged}
              className="w-full"
            >
              {rateChanged ? "Save tax rate" : "Saved"}
            </Button>
          </CardContent>
        </Card>

        {/* Headline callout */}
        <Card className="relative overflow-hidden border-warning/30 bg-warning/5 lg:col-span-2">
          <CardContent className="flex h-full flex-col justify-center gap-3 p-6 sm:p-8">
            <div className="flex items-center gap-2 text-sm font-medium text-warning">
              <PiggyBank className="h-[18px] w-[18px]" />
              Set aside from income this year
            </div>
            <p className="text-4xl font-bold tracking-tight tabular-nums text-foreground sm:text-5xl">
              {formatCurrency(setAsideThisYear, currency)}
            </p>
            <p className="text-sm text-muted-foreground">
              {rate}% of {formatCurrency(incomeThisYear, currency)} earned so
              far this year.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Explainer */}
      <Card className="bg-secondary/40">
        <CardContent className="flex items-center gap-3 p-5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <TrendingUp className="h-[18px] w-[18px]" />
          </div>
          <p className="text-sm text-foreground">
            For every {formatCurrency(100, currency)} you earn, set aside{" "}
            <span className="font-semibold tabular-nums">
              {formatCurrency(rate, currency)}
            </span>
            .
          </p>
        </CardContent>
      </Card>

      {/* Stat grid */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Income this year"
          value={formatCurrency(incomeThisYear, currency)}
          icon={Wallet}
          accent="primary"
          hint="Payments received this year"
        />
        <StatCard
          label="Estimated tax to set aside"
          value={formatCurrency(setAsideThisYear, currency)}
          icon={Landmark}
          accent="warning"
          hint={`${rate}% of income this year`}
        />
        <StatCard
          label="Take-home (after set-aside)"
          value={formatCurrency(takeHome, currency)}
          icon={Wallet}
          accent="success"
          hint={`${(100 - rate).toFixed(rate % 1 === 0 ? 0 : 1)}% of income this year`}
        />
        <StatCard
          label="If outstanding gets paid"
          value={formatCurrency(outstandingSetAside, currency)}
          icon={Receipt}
          accent="warning"
          hint={`Extra set-aside on ${formatCurrency(outstanding, currency)} outstanding`}
        />
      </div>

      {/* Recent payments — set-aside */}
      <Card>
        <CardHeader>
          <CardTitle>Recent payments — set-aside</CardTitle>
          <CardDescription>
            What to reserve from each of your latest payments at {rate}%.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentPayments.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="No payments yet"
              description="Once you log payments, we'll show how much to set aside from each one."
            />
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden overflow-x-auto sm:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      <th className="pb-2 pr-4 font-medium">Date</th>
                      <th className="pb-2 pr-4 font-medium">Client</th>
                      <th className="pb-2 pr-4 text-right font-medium">
                        Amount
                      </th>
                      <th className="pb-2 text-right font-medium">Set aside</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {recentPayments.map((p) => (
                      <tr key={p.id}>
                        <td className="whitespace-nowrap py-3 pr-4 text-muted-foreground">
                          {formatDate(p.payment_date)}
                        </td>
                        <td className="py-3 pr-4 text-foreground">
                          {p.client?.name ?? "—"}
                        </td>
                        <td className="whitespace-nowrap py-3 pr-4 text-right font-medium tabular-nums text-foreground">
                          {formatCurrency(p.amount, currency)}
                        </td>
                        <td className="whitespace-nowrap py-3 text-right font-semibold tabular-nums text-warning">
                          {formatCurrency(p.amount * fraction, currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile stacked cards */}
              <div className="space-y-3 sm:hidden">
                {recentPayments.map((p) => (
                  <div
                    key={p.id}
                    className="rounded-lg border border-border p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">
                          {p.client?.name ?? "Payment"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(p.payment_date)}
                        </p>
                      </div>
                      <p className="whitespace-nowrap text-sm font-medium tabular-nums text-foreground">
                        {formatCurrency(p.amount, currency)}
                      </p>
                    </div>
                    <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                      <span className="text-xs text-muted-foreground">
                        Set aside ({rate}%)
                      </span>
                      <span className="text-sm font-semibold tabular-nums text-warning">
                        {formatCurrency(p.amount * fraction, currency)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
