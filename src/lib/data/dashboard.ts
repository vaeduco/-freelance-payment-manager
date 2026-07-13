import { createClient } from "@/lib/supabase/server";
import type {
  DashboardStats,
  Invoice,
  MonthlyIncomePoint,
  Payment,
} from "@/lib/types";
import {
  daysBetween,
  effectiveStatus,
  lastNMonths,
  monthKey,
  todayISO,
} from "@/lib/utils";
import { NO_CONTACT_DAYS } from "@/lib/constants";
import { getClientsWithStats } from "@/lib/data/clients";
import { getInvoicesWithClients } from "@/lib/data/invoices";

export interface RecentActivityItem {
  id: string;
  kind: "payment" | "invoice";
  title: string;
  subtitle: string;
  amount: number;
  date: string;
  status?: string;
}

export interface DashboardData {
  stats: DashboardStats;
  monthly: MonthlyIncomePoint[];
  activity: RecentActivityItem[];
}

export async function getDashboardData(): Promise<DashboardData> {
  const supabase = await createClient();

  const [{ data: invData }, { data: payData }] = await Promise.all([
    supabase
      .from("invoices")
      .select("*, client:clients(id, name)")
      .order("created_at", { ascending: false }),
    supabase
      .from("payments")
      .select("*, client:clients(id, name), invoice:invoices(id, service_description)")
      .order("payment_date", { ascending: false }),
  ]);

  const invoices = (invData ?? []) as unknown as (Invoice & {
    client: { id: string; name: string } | null;
  })[];
  const payments = (payData ?? []) as unknown as (Payment & {
    client: { id: string; name: string } | null;
    invoice: { id: string; service_description: string } | null;
  })[];

  const now = new Date();
  const thisMonth = monthKey(todayISO());
  const thisYear = String(now.getFullYear());
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthKey = `${lastMonthDate.getFullYear()}-${String(
    lastMonthDate.getMonth() + 1,
  ).padStart(2, "0")}`;

  let incomeThisMonth = 0;
  let incomeThisYear = 0;
  let incomeLastMonth = 0;
  for (const p of payments) {
    const amt = Number(p.amount);
    const mk = monthKey(p.payment_date);
    if (mk === thisMonth) incomeThisMonth += amt;
    if (mk === lastMonthKey) incomeLastMonth += amt;
    if (p.payment_date.slice(0, 4) === thisYear) incomeThisYear += amt;
  }

  let pendingCount = 0;
  let pendingAmount = 0;
  let overdueCount = 0;
  let overdueAmount = 0;
  for (const i of invoices) {
    const status = effectiveStatus(i);
    if (status === "sent") {
      pendingCount++;
      pendingAmount += Number(i.amount);
    } else if (status === "overdue") {
      overdueCount++;
      overdueAmount += Number(i.amount);
    }
  }

  const stats: DashboardStats = {
    incomeThisMonth,
    incomeThisYear,
    incomeLastMonth,
    pendingCount,
    pendingAmount,
    overdueCount,
    overdueAmount,
    outstandingTotal: pendingAmount + overdueAmount,
  };

  // Monthly income buckets for the last 12 months.
  const buckets = lastNMonths(12, now);
  const totals = new Map<string, number>(buckets.map((b) => [b.key, 0]));
  for (const p of payments) {
    const mk = monthKey(p.payment_date);
    if (totals.has(mk)) totals.set(mk, (totals.get(mk) ?? 0) + Number(p.amount));
  }
  const monthly: MonthlyIncomePoint[] = buckets.map((b) => ({
    month: b.key,
    label: b.label,
    total: totals.get(b.key) ?? 0,
  }));

  // Recent activity: latest payments + latest invoices, merged by date.
  const activity: RecentActivityItem[] = [
    ...payments.slice(0, 8).map((p) => ({
      id: `pay-${p.id}`,
      kind: "payment" as const,
      title: p.client?.name ?? "Payment received",
      subtitle:
        p.invoice?.service_description ??
        p.notes ??
        p.project_type ??
        "Payment logged",
      amount: Number(p.amount),
      date: p.payment_date,
    })),
    ...invoices.slice(0, 8).map((i) => ({
      id: `inv-${i.id}`,
      kind: "invoice" as const,
      title: i.client?.name ?? "Invoice",
      subtitle: i.service_description,
      amount: Number(i.amount),
      date: i.created_at.slice(0, 10),
      status: effectiveStatus(i),
    })),
  ]
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
    .slice(0, 8);

  return { stats, monthly, activity };
}

// ---------------------------------------------------------------------------
// "Needs attention" widget — derived entirely from existing client/invoice data
// ---------------------------------------------------------------------------

export interface AttentionOverdueItem {
  invoiceId: string;
  clientId: string | null;
  clientName: string;
  service: string;
  amount: number;
  dueDate: string;
  daysOverdue: number;
}

export interface AttentionStaleItem {
  clientId: string;
  clientName: string;
  company: string | null;
  lastActivity: string;
  daysSince: number;
}

export interface NeedsAttentionData {
  overdue: AttentionOverdueItem[];
  stale: AttentionStaleItem[];
}

export async function getNeedsAttention(): Promise<NeedsAttentionData> {
  const [clients, invoices] = await Promise.all([
    getClientsWithStats(),
    getInvoicesWithClients(),
  ]);

  const archived = new Set(
    clients.filter((c) => c.is_archived).map((c) => c.id),
  );
  const today = todayISO();

  const overdue: AttentionOverdueItem[] = invoices
    .filter((i) => effectiveStatus(i) === "overdue")
    .filter((i) => !(i.client_id && archived.has(i.client_id)))
    .map((i) => ({
      invoiceId: i.id,
      clientId: i.client_id,
      clientName: i.client?.name ?? "No client",
      service: i.service_description,
      amount: Number(i.amount),
      dueDate: i.due_date,
      daysOverdue: daysBetween(i.due_date, today),
    }))
    .sort((a, b) => b.daysOverdue - a.daysOverdue)
    .slice(0, 6);

  const stale: AttentionStaleItem[] = clients
    .filter((c) => !c.is_archived)
    .map((c) => ({
      clientId: c.id,
      clientName: c.name,
      company: c.company,
      lastActivity: c.last_activity,
      daysSince: daysBetween(c.last_activity, today),
    }))
    .filter((c) => c.daysSince >= NO_CONTACT_DAYS)
    .sort((a, b) => b.daysSince - a.daysSince)
    .slice(0, 6);

  return { overdue, stale };
}
