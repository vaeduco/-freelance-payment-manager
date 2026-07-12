import type { Metadata } from "next";
import { getInvoicesWithClients } from "@/lib/data/invoices";
import { getPaymentsWithRelations } from "@/lib/data/payments";
import { getProfile } from "@/lib/data/profile";
import { computeReportSummary, rangeLabel } from "@/lib/reports";
import { formatCurrency } from "@/lib/utils";
import { STATUS_META } from "@/lib/constants";
import type { InvoiceStatus } from "@/lib/types";
import { PrintButton } from "@/components/reports/print-button";

export const metadata: Metadata = { title: "Report summary" };

const STATUS_ORDER: InvoiceStatus[] = ["paid", "sent", "overdue", "draft"];

export default async function ReportPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; rate?: string }>;
}) {
  const params = await searchParams;
  const from = params.from ?? "";
  const to = params.to ?? "";
  const [invoices, payments, profile] = await Promise.all([
    getInvoicesWithClients(),
    getPaymentsWithRelations(),
    getProfile(),
  ]);
  const currency = profile?.currency ?? "USD";
  const phpRate = parseFloat(params.rate ?? "") || null;
  const showPhp = currency !== "PHP" && phpRate != null && phpRate > 0;

  const summary = computeReportSummary(invoices, payments, {
    from,
    to,
    currency,
    phpRate,
  });

  const generatedOn = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-dvh bg-white text-slate-900">
      <div className="mx-auto max-w-3xl p-8 sm:p-10">
        {/* Print controls (hidden when printing) */}
        <div className="mb-6 flex justify-end print:hidden">
          <PrintButton />
        </div>

        {/* Header */}
        <header className="mb-8 border-b border-slate-200 pb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Income &amp; Invoice Report
              </h1>
              <p className="mt-1 text-slate-500">{rangeLabel(from, to)}</p>
            </div>
            <div className="text-right text-sm text-slate-500">
              <p className="font-semibold text-slate-700">FreelanceFlow</p>
              <p>Generated {generatedOn}</p>
            </div>
          </div>
        </header>

        {/* Headline total */}
        <section className="mb-8">
          <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
            Total income
          </p>
          <p className="text-4xl font-bold tabular-nums">
            {formatCurrency(summary.totalIncome, currency)}
          </p>
          {showPhp && summary.totalIncomePhp != null && (
            <p className="mt-1 text-slate-500">
              ≈ {formatCurrency(summary.totalIncomePhp, "PHP")} (1 {currency} ={" "}
              {phpRate} PHP)
            </p>
          )}
          <p className="mt-1 text-sm text-slate-500">
            {summary.paymentCount} payment{summary.paymentCount === 1 ? "" : "s"}{" "}
            · {formatCurrency(summary.invoiceTotal, currency)} invoiced
          </p>
        </section>

        {/* Invoices by status */}
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Invoices by status
          </h2>
          <div className="grid grid-cols-4 gap-3">
            {STATUS_ORDER.map((st) => {
              const b = summary.invoiceCounts[st];
              return (
                <div
                  key={st}
                  className="rounded-lg border border-slate-200 p-3"
                >
                  <p className="text-xs font-medium capitalize text-slate-500">
                    {STATUS_META[st].label}
                  </p>
                  <p className="text-xl font-bold tabular-nums">{b.count}</p>
                  <p className="text-xs tabular-nums text-slate-500">
                    {formatCurrency(b.amount, currency)}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Income by client */}
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Income by client
          </h2>
          {summary.byClient.length === 0 ? (
            <p className="text-sm text-slate-500">No income in this range.</p>
          ) : (
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-300 text-left text-xs uppercase text-slate-500">
                  <th className="py-2 font-medium">Client</th>
                  <th className="py-2 text-right font-medium">
                    Total ({currency})
                  </th>
                  {showPhp && (
                    <th className="py-2 text-right font-medium">PHP</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {summary.byClient.map((c) => (
                  <tr key={c.name} className="border-b border-slate-200">
                    <td className="py-2">{c.name}</td>
                    <td className="py-2 text-right tabular-nums">
                      {formatCurrency(c.total, currency)}
                    </td>
                    {showPhp && (
                      <td className="py-2 text-right tabular-nums text-slate-500">
                        {c.php != null ? formatCurrency(c.php, "PHP") : "—"}
                      </td>
                    )}
                  </tr>
                ))}
                <tr className="font-semibold">
                  <td className="py-2">Total</td>
                  <td className="py-2 text-right tabular-nums">
                    {formatCurrency(summary.totalIncome, currency)}
                  </td>
                  {showPhp && (
                    <td className="py-2 text-right tabular-nums">
                      {summary.totalIncomePhp != null
                        ? formatCurrency(summary.totalIncomePhp, "PHP")
                        : "—"}
                    </td>
                  )}
                </tr>
              </tbody>
            </table>
          )}
        </section>

        <footer className="mt-10 border-t border-slate-200 pt-4 text-xs text-slate-400">
          Generated by FreelanceFlow · Amounts in {currency}
          {showPhp ? ` (PHP equivalents at 1 ${currency} = ${phpRate})` : ""}.
        </footer>
      </div>
    </div>
  );
}
