export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue";

/** Status actually stored in the DB (overdue is derived at read time). */
export type StoredInvoiceStatus = "draft" | "sent" | "paid" | "overdue";

export interface Profile {
  id: string;
  full_name: string | null;
  tax_rate: number;
  currency: string;
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
  created_at: string;
  updated_at: string;
}

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
  notes: string | null;
  created_at: string;
}

/** Invoice joined with its client (as returned by our queries). */
export interface InvoiceWithClient extends Invoice {
  client: Pick<Client, "id" | "name" | "company"> | null;
}

/** Payment joined with client + invoice context. */
export interface PaymentWithRelations extends Payment {
  client: Pick<Client, "id" | "name"> | null;
  invoice: Pick<Invoice, "id" | "service_description"> | null;
}

/** Client augmented with aggregate payment stats. */
export interface ClientWithStats extends Client {
  total_paid: number;
  invoice_count: number;
  outstanding: number;
  last_payment_date: string | null;
  avg_days_to_pay: number | null;
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
