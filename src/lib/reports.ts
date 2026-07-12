import type { InvoiceWithClient, PaymentWithRelations } from "@/lib/types";
import { effectiveStatus, formatDate } from "@/lib/utils";

export interface ReportOptions {
  from: string; // YYYY-MM-DD ("" = no lower bound)
  to: string; // YYYY-MM-DD ("" = no upper bound)
  currency: string;
  /** Manual FX rate: 1 {currency} = phpRate PHP. null/0 = not provided. */
  phpRate: number | null;
}

export interface ClientTotal {
  name: string;
  total: number;
  php: number | null;
}

export interface StatusBucket {
  count: number;
  amount: number;
}

export interface ReportSummary {
  from: string;
  to: string;
  currency: string;
  phpRate: number | null;
  totalIncome: number;
  totalIncomePhp: number | null;
  paymentCount: number;
  byClient: ClientTotal[];
  byCurrency: { currency: string; total: number; php: number | null }[];
  invoiceCounts: Record<"paid" | "sent" | "overdue" | "draft", StatusBucket>;
  invoiceTotal: number;
}

/** Inclusive ISO date-string range check (lexicographic == chronological). */
function inRange(date: string, from: string, to: string): boolean {
  if (from && date < from) return false;
  if (to && date > to) return false;
  return true;
}

/** Convert an amount in `currency` to PHP using the manual rate (if usable). */
export function toPhp(
  amount: number,
  currency: string,
  phpRate: number | null,
): number | null {
  if (currency === "PHP") return round2(amount);
  if (phpRate && phpRate > 0) return round2(amount * phpRate);
  return null;
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Stable per-user invoice numbers (INV-0001…), ordered by issue date then
 * created_at. Computed from the FULL invoice set so numbers never shift when a
 * date range is applied.
 */
export function deriveInvoiceNumbers(
  invoices: Array<{ id: string; issue_date: string; created_at: string }>,
): Record<string, string> {
  const sorted = [...invoices].sort((a, b) => {
    if (a.issue_date !== b.issue_date)
      return a.issue_date < b.issue_date ? -1 : 1;
    return a.created_at < b.created_at ? -1 : 1;
  });
  const map: Record<string, string> = {};
  sorted.forEach((inv, i) => {
    map[inv.id] = `INV-${String(i + 1).padStart(4, "0")}`;
  });
  return map;
}

export function filterInvoicesByRange(
  invoices: InvoiceWithClient[],
  from: string,
  to: string,
): InvoiceWithClient[] {
  return invoices.filter((i) => inRange(i.issue_date, from, to));
}

export function filterPaymentsByRange(
  payments: PaymentWithRelations[],
  from: string,
  to: string,
): PaymentWithRelations[] {
  return payments.filter((p) => inRange(p.payment_date, from, to));
}

export function computeReportSummary(
  invoices: InvoiceWithClient[],
  payments: PaymentWithRelations[],
  opts: ReportOptions,
): ReportSummary {
  const { from, to, currency, phpRate } = opts;
  const inv = filterInvoicesByRange(invoices, from, to);
  const pay = filterPaymentsByRange(payments, from, to);

  const totalIncome = round2(pay.reduce((s, p) => s + Number(p.amount), 0));

  // Income by client
  const clientMap = new Map<string, number>();
  for (const p of pay) {
    const name = p.client?.name ?? "No client";
    clientMap.set(name, (clientMap.get(name) ?? 0) + Number(p.amount));
  }
  const byClient: ClientTotal[] = [...clientMap.entries()]
    .map(([name, total]) => ({
      name,
      total: round2(total),
      php: toPhp(total, currency, phpRate),
    }))
    .sort((a, b) => b.total - a.total);

  // Invoice counts by (effective) status
  const invoiceCounts: ReportSummary["invoiceCounts"] = {
    paid: { count: 0, amount: 0 },
    sent: { count: 0, amount: 0 },
    overdue: { count: 0, amount: 0 },
    draft: { count: 0, amount: 0 },
  };
  let invoiceTotal = 0;
  for (const i of inv) {
    const st = effectiveStatus(i);
    invoiceCounts[st].count += 1;
    invoiceCounts[st].amount = round2(
      invoiceCounts[st].amount + Number(i.amount),
    );
    invoiceTotal += Number(i.amount);
  }

  return {
    from,
    to,
    currency,
    phpRate,
    totalIncome,
    totalIncomePhp: toPhp(totalIncome, currency, phpRate),
    paymentCount: pay.length,
    byClient,
    byCurrency: [
      { currency, total: totalIncome, php: toPhp(totalIncome, currency, phpRate) },
    ],
    invoiceCounts,
    invoiceTotal: round2(invoiceTotal),
  };
}

// ---------------------------------------------------------------------------
// CSV row builders (flat objects for toCSV). Each filters to the range itself.
// ---------------------------------------------------------------------------

const money = (n: number) => Number(n).toFixed(2);

/** Column orders — passed to toCSV so zero-row exports still emit headers. */
export const INVOICE_HEADERS = [
  "Invoice #",
  "Client",
  "Project",
  "Issue Date",
  "Due Date",
  "Amount",
  "Currency",
  "PHP Equivalent",
  "Status",
];
export const PAYMENT_HEADERS = [
  "Date Received",
  "Invoice #",
  "Invoice",
  "Payment Method",
  "Client",
  "Amount",
  "Currency",
  "PHP Equivalent",
];
export const SUMMARY_HEADERS = ["Metric", "Value"];

export function buildInvoiceRows(
  invoices: InvoiceWithClient[],
  invoiceNumbers: Record<string, string>,
  opts: ReportOptions,
): Record<string, unknown>[] {
  return filterInvoicesByRange(invoices, opts.from, opts.to).map((i) => {
    const php = toPhp(Number(i.amount), opts.currency, opts.phpRate);
    return {
      "Invoice #": invoiceNumbers[i.id] ?? "",
      Client: i.client?.name ?? "",
      Project: i.project_type ?? "",
      "Issue Date": i.issue_date,
      "Due Date": i.due_date,
      Amount: money(Number(i.amount)),
      Currency: opts.currency,
      "PHP Equivalent": php != null ? money(php) : "",
      Status: effectiveStatus(i),
    };
  });
}

export function buildPaymentRows(
  payments: PaymentWithRelations[],
  invoiceNumbers: Record<string, string>,
  opts: ReportOptions,
): Record<string, unknown>[] {
  return filterPaymentsByRange(payments, opts.from, opts.to).map((p) => {
    const php = toPhp(Number(p.amount), opts.currency, opts.phpRate);
    return {
      "Date Received": p.payment_date,
      "Invoice #": p.invoice_id ? (invoiceNumbers[p.invoice_id] ?? "") : "",
      Invoice: p.invoice?.service_description ?? "",
      "Payment Method": p.payment_method?.name ?? "",
      Client: p.client?.name ?? "",
      Amount: money(Number(p.amount)),
      Currency: opts.currency,
      "PHP Equivalent": php != null ? money(php) : "",
    };
  });
}

export function buildSummaryRows(
  summary: ReportSummary,
): Record<string, unknown>[] {
  const rows: Record<string, unknown>[] = [];
  const add = (metric: string, value: unknown) =>
    rows.push({ Metric: metric, Value: value });

  const rangeLabel = `${summary.from || "(start)"} to ${summary.to || "(today)"}`;
  add("Report range", rangeLabel);
  add("Currency", summary.currency);
  if (summary.phpRate && summary.currency !== "PHP") {
    add("Exchange rate", `1 ${summary.currency} = ${summary.phpRate} PHP`);
  }
  add("Total income", money(summary.totalIncome));
  if (summary.totalIncomePhp != null && summary.currency !== "PHP") {
    add("Total income (PHP)", money(summary.totalIncomePhp));
  }
  add("Payments received", summary.paymentCount);
  add("", "");
  add("— Income by client —", "");
  for (const c of summary.byClient) {
    add(c.name, money(c.total) + (c.php != null && summary.currency !== "PHP" ? ` (₱${money(c.php)})` : ""));
  }
  add("", "");
  add("— Invoices by status —", "");
  (["paid", "sent", "overdue", "draft"] as const).forEach((st) => {
    const b = summary.invoiceCounts[st];
    add(`${st} (count / amount)`, `${b.count} / ${money(b.amount)}`);
  });
  add("Total invoiced", money(summary.invoiceTotal));
  return rows;
}

/** Human-readable range label for filenames / headings. */
export function rangeSlug(from: string, to: string): string {
  return `${from || "start"}_to_${to || "today"}`;
}

export function rangeLabel(from: string, to: string): string {
  const f = from ? formatDate(from) : "the beginning";
  const t = to ? formatDate(to) : "today";
  return `${f} – ${t}`;
}
