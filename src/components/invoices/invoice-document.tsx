import type { InvoiceWithClient, InvoiceStatus } from "@/lib/types";
import { payLinkHref } from "@/components/payments/pay-via-button";
import { effectiveStatus, formatCurrency, formatDate } from "@/lib/utils";

const STATUS_PILL: Record<InvoiceStatus, string> = {
  paid: "bg-green-50 text-green-700 ring-1 ring-green-600/20",
  sent: "bg-blue-50 text-blue-700 ring-1 ring-blue-600/20",
  overdue: "bg-red-50 text-red-700 ring-1 ring-red-600/20",
  draft: "bg-slate-100 text-slate-600 ring-1 ring-slate-500/20",
};

/**
 * The branded invoice, rendered as a white "paper" with hardcoded slate/blue
 * colors so it looks like a real invoice document in both light and dark app
 * themes and prints cleanly. Shared by the on-app view and the print route.
 */
export function InvoiceDocument({
  invoice,
  invoiceNumber,
  businessName,
  logoUrl,
  currency,
}: {
  invoice: InvoiceWithClient;
  invoiceNumber: string;
  businessName: string;
  logoUrl: string | null;
  currency: string;
}) {
  const status = effectiveStatus(invoice);
  const method = invoice.payment_method;
  const payable = status === "sent" || status === "overdue";
  const link = method?.payment_link?.trim() || null;
  const href = link ? payLinkHref(link) : null;

  const isHourly =
    invoice.rate_type === "hourly" &&
    invoice.tracked_hours != null &&
    invoice.hourly_rate != null;

  return (
    <div className="mx-auto max-w-3xl bg-white p-8 text-slate-900 sm:p-10">
      {/* Header: business identity + invoice meta */}
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-6">
        <div className="flex items-center gap-3">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt={`${businessName} logo`}
              className="h-14 w-14 shrink-0 rounded-lg object-contain"
            />
          ) : null}
          <div>
            <p className="text-lg font-bold tracking-tight">{businessName}</p>
            <p className="text-sm text-slate-500">Invoice</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold tabular-nums text-slate-700">
            {invoiceNumber}
          </p>
          <span
            className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_PILL[status]}`}
          >
            {status}
          </span>
        </div>
      </header>

      {/* Bill-to + dates */}
      <section className="grid grid-cols-1 gap-6 py-6 sm:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Bill to
          </p>
          <p className="mt-1 font-medium text-slate-900">
            {invoice.client?.name ?? "No client"}
          </p>
          {invoice.client?.company && (
            <p className="text-sm text-slate-500">{invoice.client.company}</p>
          )}
        </div>
        <div className="sm:text-right">
          <div className="flex justify-between sm:justify-end sm:gap-6">
            <span className="text-sm text-slate-500">Issued</span>
            <span className="text-sm font-medium tabular-nums">
              {formatDate(invoice.issue_date)}
            </span>
          </div>
          <div className="mt-1 flex justify-between sm:justify-end sm:gap-6">
            <span className="text-sm text-slate-500">Due</span>
            <span
              className={`text-sm font-medium tabular-nums ${
                status === "overdue" ? "text-red-600" : ""
              }`}
            >
              {formatDate(invoice.due_date)}
            </span>
          </div>
        </div>
      </section>

      {/* Line item */}
      <section>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-y border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
              <th className="py-2 font-medium">Description</th>
              <th className="py-2 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-slate-100 align-top">
              <td className="py-3 pr-4">
                <p className="font-medium text-slate-900">
                  {invoice.service_description}
                </p>
                {isHourly && (
                  <p className="mt-0.5 text-xs text-slate-500 tabular-nums">
                    {invoice.tracked_hours} hrs ×{" "}
                    {formatCurrency(Number(invoice.hourly_rate), currency)}/hr
                  </p>
                )}
                {invoice.project_type && (
                  <p className="mt-0.5 text-xs text-slate-400">
                    {invoice.project_type}
                  </p>
                )}
              </td>
              <td className="py-3 text-right font-medium tabular-nums">
                {formatCurrency(Number(invoice.amount), currency)}
              </td>
            </tr>
          </tbody>
        </table>
        <div className="mt-4 flex justify-end">
          <div className="w-full max-w-xs space-y-1">
            <div className="flex justify-between border-t-2 border-slate-300 pt-2 text-base font-bold">
              <span>Total</span>
              <span className="tabular-nums">
                {formatCurrency(Number(invoice.amount), currency)}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Payment instructions */}
      {method && (
        <section className="mt-8 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Payment
          </p>
          <p className="mt-1 font-medium text-slate-900">{method.name}</p>
          {method.account_name && (
            <p className="text-sm text-slate-600">{method.account_name}</p>
          )}
          {method.details && (
            <p className="whitespace-pre-wrap text-sm text-slate-600">
              {method.details}
            </p>
          )}
          {payable && link && (
            <p className="mt-2 text-sm">
              {href ? (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-3 py-1.5 font-medium text-white hover:bg-blue-700"
                >
                  Pay via {method.name}
                </a>
              ) : (
                <span className="font-medium text-slate-700">
                  Pay via {method.name}: {link}
                </span>
              )}
            </p>
          )}
        </section>
      )}
    </div>
  );
}
