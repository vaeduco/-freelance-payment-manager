export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue";

/** Status actually stored in the DB (overdue is derived at read time). */
export type StoredInvoiceStatus = "draft" | "sent" | "paid" | "overdue";

export interface Profile {
  id: string;
  full_name: string | null;
  /** Business/brand name shown on invoices (distinct from the personal full_name). */
  business_name: string | null;
  /** Storage object key in the private `logos` bucket (e.g. `<uid>/logo`), never a URL. */
  logo_path: string | null;
  tax_rate: number;
  currency: string;
  /** Default number of days added to today for a new invoice's due date. */
  payment_terms_days: number;
  /** Set once the user finishes (or skips) first-time onboarding. */
  onboarded_at: string | null;
  /** Last time the password was checked against HIBP and came back clean. */
  password_checked_at: string | null;
  /** Public booking handle for /book/[slug]; null until the user picks one. */
  booking_slug: string | null;
  /** IANA timezone anchoring the user's availability (e.g. "America/Los_Angeles"). */
  timezone: string;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  user_id: string;
  name: string;
  email: string | null;
  company: string | null;
  notes: string | null;
  is_flagged: boolean;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface PaymentMethod {
  id: string;
  user_id: string;
  name: string;
  account_name: string | null;
  details: string | null;
  /** Optional pay link/number: PayPal.me URL, Wise link, GCash number, … */
  payment_link: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

/** Embedded (joined) payment-method shape returned by queries. */
export type PaymentMethodRef = Pick<
  PaymentMethod,
  "id" | "name" | "account_name" | "details" | "payment_link"
>;

export interface Invoice {
  id: string;
  user_id: string;
  client_id: string | null;
  service_description: string;
  amount: number;
  status: StoredInvoiceStatus;
  issue_date: string; // YYYY-MM-DD
  due_date: string; // YYYY-MM-DD
  project_type: string | null;
  rate_type: "fixed" | "hourly";
  tracked_hours: number | null;
  hourly_rate: number | null;
  payment_method_id: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  user_id: string;
  invoice_id: string | null;
  client_id: string | null;
  amount: number;
  payment_date: string; // YYYY-MM-DD
  project_type: string | null;
  payment_method_id: string | null;
  notes: string | null;
  created_at: string;
}

/** Invoice joined with its client (as returned by our queries). */
export interface InvoiceWithClient extends Invoice {
  client: Pick<Client, "id" | "name" | "company"> | null;
  payment_method: PaymentMethodRef | null;
}

/** Payment joined with client + invoice context. */
export interface PaymentWithRelations extends Payment {
  client: Pick<Client, "id" | "name"> | null;
  invoice: Pick<Invoice, "id" | "service_description"> | null;
  payment_method: PaymentMethodRef | null;
}

/** Client augmented with aggregate payment stats. */
export interface ClientWithStats extends Client {
  total_paid: number;
  invoice_count: number;
  outstanding: number;
  last_payment_date: string | null;
  avg_days_to_pay: number | null;
  /** Most recent invoice/payment date (falls back to creation) — YYYY-MM-DD. */
  last_activity: string;
}

export type SecurityEventCategory =
  | "auth"
  | "invoice"
  | "client"
  | "payment"
  | "payment_method"
  | "report"
  | "security"
  | "share";

/** A public share link for one invoice (password_hash never leaves the server). */
export interface SharedLink {
  id: string;
  invoice_id: string;
  token: string;
  has_password: boolean;
  expires_at: string | null;
  max_views: number | null;
  view_count: number;
  revoked: boolean;
  created_at: string;
}

export interface SecurityEvent {
  id: string;
  user_id: string;
  category: SecurityEventCategory;
  action: string;
  summary: string;
  is_alert: boolean;
  read_at: string | null;
  ip: string | null;
  location: string | null;
  device: string | null;
  user_agent: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface DashboardStats {
  incomeThisMonth: number;
  incomeThisYear: number;
  incomeLastMonth: number;
  pendingCount: number;
  pendingAmount: number;
  overdueCount: number;
  overdueAmount: number;
  outstandingTotal: number;
}

export interface MonthlyIncomePoint {
  month: string; // YYYY-MM
  label: string; // e.g. "Jan"
  total: number;
}

// ---------------------------------------------------------------------------
// User settings (Appearance & preferences) — one row per user, table 0008.
// ---------------------------------------------------------------------------

export type ThemePref = "light" | "dark" | "system";
export type FontSize = "small" | "medium" | "large";
export type Density = "comfortable" | "compact";
export type SidebarDefault = "expanded" | "collapsed";
export type DateFormatPref = "MM/DD/YYYY" | "DD/MM/YYYY" | "YYYY-MM-DD";
export type NumberFormatPref = "1,000.00" | "1.000,00";
export type DashboardWidgetKey =
  | "income"
  | "needs_attention"
  | "recent_payments"
  | "client_breakdown";

export interface UserSettings {
  theme: ThemePref;
  font_size: FontSize;
  density: Density;
  sidebar_default: SidebarDefault;
  date_format: DateFormatPref;
  number_format: NumberFormatPref;
  default_currency: string;
  show_both_currencies: boolean;
  dashboard_widget_order: DashboardWidgetKey[];
}

export const DEFAULT_DASHBOARD_WIDGET_ORDER: DashboardWidgetKey[] = [
  "income",
  "needs_attention",
  "recent_payments",
  "client_breakdown",
];

export const DEFAULT_USER_SETTINGS: UserSettings = {
  theme: "system",
  font_size: "medium",
  density: "comfortable",
  sidebar_default: "expanded",
  date_format: "MM/DD/YYYY",
  number_format: "1,000.00",
  default_currency: "USD",
  show_both_currencies: false,
  dashboard_widget_order: DEFAULT_DASHBOARD_WIDGET_ORDER,
};

/** Reorderable dashboard widgets (key -> display label), in default order. */
export const DASHBOARD_WIDGETS: { key: DashboardWidgetKey; label: string }[] = [
  { key: "income", label: "Income overview" },
  { key: "needs_attention", label: "Needs attention" },
  { key: "recent_payments", label: "Recent payments" },
  { key: "client_breakdown", label: "Client breakdown" },
];

// ---------------------------------------------------------------------------
// Booking / scheduling module (0009)
// ---------------------------------------------------------------------------

export interface AvailableDate {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  created_at: string;
}

export type BookingStatus =
  | "pending"
  | "confirmed"
  | "declined"
  | "cancelled"
  | "completed";

export interface Booking {
  id: string;
  user_id: string;
  client_id: string | null;
  guest_name: string;
  guest_email: string;
  requested_date: string; // YYYY-MM-DD
  requested_start_time: string; // HH:MM:SS
  requested_end_time: string; // HH:MM:SS
  status: BookingStatus;
  notes: string | null;
  created_at: string;
}

/** Day-of-week labels indexed 0 (Sunday) – 6 (Saturday), matching day_of_week. */
export const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;
