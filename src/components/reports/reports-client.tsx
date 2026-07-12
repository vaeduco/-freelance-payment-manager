"use client";

import { useMemo, useState } from "react";
import {
  Download,
  FileSpreadsheet,
  FileText,
  Printer,
  Package,
  Wallet,
  TrendingUp,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { StatCard } from "@/components/stat-card";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { STATUS_META } from "@/lib/constants";
import type { InvoiceStatus, InvoiceWithClient, PaymentWithRelations } from "@/lib/types";
import { cn, formatCurrency, toCSV, downloadFile, downloadBlob } from "@/lib/utils";
import {
  buildInvoiceRows,
  buildPaymentRows,
  buildSummaryRows,
  computeReportSummary,
  rangeLabel,
  rangeSlug,
  INVOICE_HEADERS,
  PAYMENT_HEADERS,
  SUMMARY_HEADERS,
  type ReportOptions,
} from "@/lib/reports";

function startOfYear(): string {
  return `${new Date().getFullYear()}-01-01`;
}
function startOfMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}
function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function monthsAgo(n: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const STATUS_ORDER: InvoiceStatus[] = ["paid", "sent", "overdue", "draft"];

export function ReportsClient({
  invoices,
  payments,
  currency,
  invoiceNumbers,
}: {
  invoices: InvoiceWithClient[];
  payments: PaymentWithRelations[];
  currency: string;
  invoiceNumbers: Record<string, string>;
}) {
  const { toast } = useToast();
  const isPhp = currency === "PHP";

  const [from, setFrom] = useState(startOfYear());
  const [to, setTo] = useState(todayStr());
  const [rate, setRate] = useState("");

  const phpRate = parseFloat(rate) || null;
  const showPhp = !isPhp && phpRate != null && phpRate > 0;

  const opts: ReportOptions = useMemo(
    () => ({ from, to, currency, phpRate }),
    [from, to, currency, phpRate],
  );

  const summary = useMemo(
    () => computeReportSummary(invoices, payments, opts),
    [invoices, payments, opts],
  );

  const slug = rangeSlug(from, to);
  const hasData = invoices.length > 0 || payments.length > 0;

  function exportInvoicesCsv() {
    const rows = buildInvoiceRows(invoices, invoiceNumbers, opts);
    downloadFile(toCSV(rows, INVOICE_HEADERS), `invoices_${slug}.csv`);
    toast(`Exported ${rows.length} invoice${rows.length === 1 ? "" : "s"}`);
  }

  function exportPaymentsCsv() {
    const rows = buildPaymentRows(payments, invoiceNumbers, opts);
    downloadFile(toCSV(rows, PAYMENT_HEADERS), `payments_${slug}.csv`);
    toast(`Exported ${rows.length} payment${rows.length === 1 ? "" : "s"}`);
  }

  async function exportZip() {
    try {
      const { default: JSZip } = await import("jszip");
      const zip = new JSZip();
      zip.file(`invoices_${slug}.csv`, toCSV(buildInvoiceRows(invoices, invoiceNumbers, opts), INVOICE_HEADERS));
      zip.file(`payments_${slug}.csv`, toCSV(buildPaymentRows(payments, invoiceNumbers, opts), PAYMENT_HEADERS));
      zip.file(`summary_${slug}.csv`, toCSV(buildSummaryRows(summary), SUMMARY_HEADERS));
      const blob = await zip.generateAsync({ type: "blob" });
      downloadBlob(blob, `export_${slug}.zip`);
      toast("Accountant export ready");
    } catch (e) {
      toast((e as Error).message || "Export failed", "error");
    }
  }

  function openPrint() {
    const params = new URLSearchParams({ from, to });
    if (showPhp) params.set("rate", String(phpRate));
    window.open(`/reports/print?${params.toString()}`, "_blank");
  }

  return (
    <div>
      <PageHeader
        title="Reports"
        description="Custom date-range summaries and accountant-ready exports."
      >
        <Button variant="outline" onClick={openPrint}>
          <Printer className="h-4 w-4" />
          Print / Save as PDF
        </Button>
      </PageHeader>

      {/* Controls */}
      <Card className="mb-6">
        <CardContent className="space-y-4 p-5">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="rep-from">Start date</Label>
              <Input
                id="rep-from"
                type="date"
                value={from}
                max={to || undefined}
                onChange={(e) => setFrom(e.target.value)}
                className="w-full sm:w-44"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rep-to">End date</Label>
              <Input
                id="rep-to"
                type="date"
                value={to}
                min={from || undefined}
                onChange={(e) => setTo(e.target.value)}
                className="w-full sm:w-44"
              />
            </div>
            {!isPhp && (
              <div className="space-y-1.5">
                <Label htmlFor="rep-rate">Exchange rate (1 {currency} = ? PHP)</Label>
                <Input
                  id="rep-rate"
                  type="number"
                  min="0"
                  step="0.0001"
                  inputMode="decimal"
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                  placeholder="e.g. 56"
                  className="w-full sm:w-44"
                />
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["This month", startOfMonth(), todayStr()],
                ["This year", startOfYear(), todayStr()],
                ["Last 12 months", monthsAgo(12), todayStr()],
                ["All time", "", ""],
              ] as const
            ).map(([label, f, t]) => {
              const active = from === f && to === t;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => {
                    setFrom(f);
                    setTo(t);
                  }}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                    active
                      ? "border-primary/30 bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:bg-secondary",
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
          <p className="text-sm text-muted-foreground">
            Showing <span className="font-medium text-foreground">{rangeLabel(from, to)}</span>
          </p>
        </CardContent>
      </Card>

      {/* Export bar */}
      <div className="mb-6 flex flex-wrap gap-2">
        <Button variant="secondary" onClick={exportInvoicesCsv}>
          <FileText className="h-4 w-4" />
          Invoices CSV
        </Button>
        <Button variant="secondary" onClick={exportPaymentsCsv}>
          <FileSpreadsheet className="h-4 w-4" />
          Payments CSV
        </Button>
        <Button onClick={exportZip}>
          <Package className="h-4 w-4" />
          Export for accountant (ZIP)
        </Button>
      </div>

      {/* Summary stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total income"
          value={formatCurrency(summary.totalIncome, currency)}
          icon={Wallet}
          accent="success"
          hint={
            showPhp && summary.totalIncomePhp != null
              ? `${formatCurrency(summary.totalIncomePhp, "PHP")} PHP`
              : `${summary.paymentCount} payment${summary.paymentCount === 1 ? "" : "s"}`
          }
        />
        <StatCard
          label="Payments received"
          value={String(summary.paymentCount)}
          icon={TrendingUp}
          accent="primary"
        />
        <StatCard
          label="Invoices in range"
          value={String(
            STATUS_ORDER.reduce((s, st) => s + summary.invoiceCounts[st].count, 0),
          )}
          icon={FileText}
          accent="warning"
          hint={`${formatCurrency(summary.invoiceTotal, currency)} invoiced`}
        />
        <StatCard
          label="Clients billed"
          value={String(summary.byClient.length)}
          icon={Users}
          accent="primary"
        />
      </div>

      {/* Invoice counts by status */}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {STATUS_ORDER.map((st) => {
          const b = summary.invoiceCounts[st];
          return (
            <Card key={st} className="p-4">
              <div className="flex items-center justify-between">
                <span className={cn("rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize", STATUS_META[st].badge)}>
                  {STATUS_META[st].label}
                </span>
                <span className="text-lg font-bold tabular-nums">{b.count}</span>
              </div>
              <p className="mt-2 text-sm tabular-nums text-muted-foreground">
                {formatCurrency(b.amount, currency)}
              </p>
            </Card>
          );
        })}
      </div>

      {/* Income by client */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Income by client</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {summary.byClient.length === 0 ? (
            <p className="px-6 pb-6 text-sm text-muted-foreground">
              No income in this range.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                    <th className="px-6 py-2 font-medium">Client</th>
                    <th className="px-6 py-2 text-right font-medium">
                      Total ({currency})
                    </th>
                    {showPhp && (
                      <th className="px-6 py-2 text-right font-medium">PHP</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {summary.byClient.map((c) => (
                    <tr key={c.name} className="border-b border-border last:border-0">
                      <td className="px-6 py-2.5">{c.name}</td>
                      <td className="px-6 py-2.5 text-right tabular-nums">
                        {formatCurrency(c.total, currency)}
                      </td>
                      {showPhp && (
                        <td className="px-6 py-2.5 text-right tabular-nums text-muted-foreground">
                          {c.php != null ? formatCurrency(c.php, "PHP") : "—"}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {!hasData && (
        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Download className="mx-auto mb-2 h-5 w-5" />
          No invoices or payments yet — create some to build a report.
        </p>
      )}
    </div>
  );
}
