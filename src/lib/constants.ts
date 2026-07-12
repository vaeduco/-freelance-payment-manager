import type { InvoiceStatus } from "./types";

export const INVOICE_STATUSES: InvoiceStatus[] = [
  "draft",
  "sent",
  "paid",
  "overdue",
];

interface StatusMeta {
  label: string;
  /** Tailwind classes for a badge (bg + text + border). */
  badge: string;
  /** Solid dot color class. */
  dot: string;
}

export const STATUS_META: Record<InvoiceStatus, StatusMeta> = {
  draft: {
    label: "Draft",
    badge:
      "bg-muted text-muted-foreground border-border",
    dot: "bg-muted-foreground",
  },
  sent: {
    label: "Sent",
    badge:
      "bg-accent text-accent-foreground border-primary/20",
    dot: "bg-primary",
  },
  paid: {
    label: "Paid",
    badge:
      "bg-success/10 text-success border-success/20",
    dot: "bg-success",
  },
  overdue: {
    label: "Overdue",
    badge:
      "bg-destructive/10 text-destructive border-destructive/20",
    dot: "bg-destructive",
  },
};

/** Common payment methods to suggest; users may also type their own. */
export const PAYMENT_METHOD_SUGGESTIONS = [
  "Bank Transfer",
  "PayPal",
  "GCash",
  "Wise",
  "Payoneer",
  "Crypto",
  "Cash",
  "Check",
  "Credit Card",
  "Venmo",
];

/**
 * Fixed palette for the payment-method breakdown chart. Uses theme-independent
 * HSL values that read well in both light and dark mode.
 */
export const CHART_COLORS = [
  "hsl(221 83% 53%)", // blue
  "hsl(142 71% 45%)", // green
  "hsl(38 92% 50%)", // amber
  "hsl(280 65% 60%)", // purple
  "hsl(340 75% 55%)", // pink
  "hsl(190 80% 42%)", // cyan
  "hsl(24 90% 55%)", // orange
  "hsl(160 60% 40%)", // teal
];

/** Suggested project types; users may also type their own. */
export const PROJECT_TYPES = [
  "Web Development",
  "Design",
  "Consulting",
  "Writing",
  "Marketing",
  "Photography",
  "Video",
  "Maintenance",
  "Other",
];

/** Number of days without payment before a client is auto-flagged as slow. */
export const SLOW_PAYER_DAYS = 45;

export const CURRENCIES = [
  { code: "USD", symbol: "$", label: "US Dollar" },
  { code: "EUR", symbol: "€", label: "Euro" },
  { code: "GBP", symbol: "£", label: "British Pound" },
  { code: "CAD", symbol: "$", label: "Canadian Dollar" },
  { code: "AUD", symbol: "$", label: "Australian Dollar" },
  { code: "INR", symbol: "₹", label: "Indian Rupee" },
  { code: "JPY", symbol: "¥", label: "Japanese Yen" },
  { code: "BRL", symbol: "R$", label: "Brazilian Real" },
  { code: "PHP", symbol: "₱", label: "Philippine Peso" },
];

export const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: "LayoutDashboard" },
  { href: "/invoices", label: "Invoices", icon: "FileText" },
  { href: "/income", label: "Income", icon: "TrendingUp" },
  { href: "/clients", label: "Clients", icon: "Users" },
  { href: "/tax", label: "Tax Estimator", icon: "Calculator" },
] as const;
