import type { Invoice, InvoiceStatus } from "./types";

/** Minimal classnames joiner (truthy strings only). */
export function cn(
  ...classes: Array<string | false | null | undefined>
): string {
  return classes.filter(Boolean).join(" ");
}

export function formatCurrency(
  amount: number,
  currency = "USD",
  opts: { compact?: boolean } = {},
): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      notation: opts.compact ? "compact" : "standard",
      maximumFractionDigits: opts.compact ? 1 : 2,
      minimumFractionDigits: opts.compact ? 0 : 2,
    }).format(amount || 0);
  } catch {
    // Unknown currency code -> fall back to a plain number with the code.
    return `${(amount || 0).toFixed(2)} ${currency}`;
  }
}

/** Parse a `YYYY-MM-DD` date string as a *local* date (no TZ shift). */
export function parseDateOnly(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

/** Today's date as `YYYY-MM-DD` in local time. */
export function todayISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  return parseDateOnly(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDateShort(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  return parseDateOnly(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

/** Whole days between two date-only strings (b - a). */
export function daysBetween(a: string, b: string): number {
  const ms = parseDateOnly(b).getTime() - parseDateOnly(a).getTime();
  return Math.round(ms / 86_400_000);
}

/** `YYYY-MM` bucket key for a date string. */
export function monthKey(dateStr: string): string {
  return dateStr.slice(0, 7);
}

/**
 * Derive the display status. An invoice that has been sent but whose due date
 * has passed is treated as "overdue" without needing a background job.
 */
export function effectiveStatus(invoice: Pick<Invoice, "status" | "due_date">): InvoiceStatus {
  if (invoice.status === "sent" && invoice.due_date < todayISO()) {
    return "overdue";
  }
  return invoice.status;
}

/** True when an invoice still owes money (not draft, not paid). */
export function isOutstanding(invoice: Pick<Invoice, "status">): boolean {
  return invoice.status === "sent" || invoice.status === "overdue";
}

export interface MonthBucket {
  key: string; // YYYY-MM
  label: string; // "Jan"
  fullLabel: string; // "Jan 2026"
}

/** Last `count` months (oldest first), ending with the current month. */
export function lastNMonths(count: number, ref = new Date()): MonthBucket[] {
  const out: MonthBucket[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(ref.getFullYear(), ref.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    out.push({
      key,
      label: d.toLocaleDateString("en-US", { month: "short" }),
      fullLabel: d.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
    });
  }
  return out;
}

/** Convert an array of flat objects into a CSV string. */
export function toCSV(rows: Array<Record<string, unknown>>, headers?: string[]): string {
  if (rows.length === 0) return (headers ?? []).join(",") + "\n";
  const cols = headers ?? Object.keys(rows[0]);
  const escape = (val: unknown) => {
    if (val === null || val === undefined) return "";
    let s = String(val);
    // Neutralize spreadsheet formula injection (=, +, -, @, tab, CR leads).
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const lines = [cols.join(",")];
  for (const row of rows) {
    lines.push(cols.map((c) => escape(row[c])).join(","));
  }
  return lines.join("\n");
}

/** Trigger a browser download of a Blob as a file (client-side only). */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Trigger a browser download of `content` as a file (client-side only). */
export function downloadFile(
  content: string,
  filename: string,
  mime = "text/csv;charset=utf-8;",
) {
  downloadBlob(new Blob([content], { type: mime }), filename);
}

/**
 * Map of project_type (lowercased) -> the most recently used hourly rate for
 * that project type, from the user's hourly invoices. Assumes `invoices` is
 * ordered most-recent-first (as getInvoicesWithClients returns them), so the
 * first hourly invoice seen per project type wins.
 */
export function hourlyRatesByProjectType(
  invoices: Array<
    Pick<Invoice, "project_type" | "rate_type" | "hourly_rate">
  >,
): Record<string, number> {
  const map: Record<string, number> = {};
  for (const inv of invoices) {
    if (
      inv.rate_type === "hourly" &&
      inv.hourly_rate != null &&
      Number(inv.hourly_rate) > 0 &&
      inv.project_type
    ) {
      const key = inv.project_type.trim().toLowerCase();
      if (!(key in map)) map[key] = Number(inv.hourly_rate);
    }
  }
  return map;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? "")
    .join("");
}
