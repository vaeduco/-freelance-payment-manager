import { createClient } from "@/lib/supabase/server";
import type {
  DashboardStats,
  Invoice,
  MonthlyIncomePoint,
  Payment,
} from "@/lib/types";
import { effectiveStatus, lastNMonths, monthKey, todayISO } from "@/lib/utils";

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
