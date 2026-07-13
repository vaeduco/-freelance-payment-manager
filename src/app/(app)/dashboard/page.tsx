import { AlertTriangle, Clock, TrendingUp, Wallet } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/app/page-header";
import { StatCard } from "@/components/stat-card";
import { IncomeBarChart } from "@/components/charts/income-bar-chart";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { NeedsAttention } from "@/components/dashboard/needs-attention";
import { getDashboardData, getNeedsAttention } from "@/lib/data/dashboard";
import { getProfile } from "@/lib/data/profile";
import { getClients } from "@/lib/data/clients";
import { getInvoicesWithClients } from "@/lib/data/invoices";
import { getPaymentMethods } from "@/lib/data/payment-methods";
import { formatCurrency, hourlyRatesByProjectType } from "@/lib/utils";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const [
    { stats, monthly, activity },
    profile,
    clients,
    invoices,
    paymentMethods,
    needsAttention,
  ] = await Promise.all([
    getDashboardData(),
    getProfile(),
    getClients(),
    getInvoicesWithClients(),
    getPaymentMethods(),
    getNeedsAttention(),
  ]);

  const currency = profile?.currency ?? "USD";
  const firstName = (profile?.full_name || "there").split(" ")[0];

  const monthDelta =
    stats.incomeLastMonth > 0
      ? {
          value: Math.round(
            ((stats.incomeThisMonth - stats.incomeLastMonth) /
              stats.incomeLastMonth) *
              100,
          ),
          label: "vs last month",
        }
      : null;

  const twelveMonthTotal = monthly.reduce((sum, m) => sum + m.total, 0);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description={`Welcome back, ${firstName}`}
      >
        <QuickActions
          clients={clients}
          invoices={invoices}
          paymentMethods={paymentMethods}
          projectTypeRates={hourlyRatesByProjectType(invoices)}
        />
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Income this month"
          value={formatCurrency(stats.incomeThisMonth, currency)}
          icon={Wallet}
          accent="primary"
          delta={monthDelta}
          hint={monthDelta ? undefined : "vs last month"}
        />
        <StatCard
          label="Income this year"
          value={formatCurrency(stats.incomeThisYear, currency)}
          icon={TrendingUp}
          accent="success"
        />
        <StatCard
          label="Pending invoices"
          value={String(stats.pendingCount)}
          icon={Clock}
          accent="warning"
          hint={`${formatCurrency(stats.pendingAmount, currency)} outstanding`}
        />
        <StatCard
          label="Overdue"
          value={String(stats.overdueCount)}
          icon={AlertTriangle}
          accent="destructive"
          hint={`${formatCurrency(stats.overdueAmount, currency)} overdue`}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
            <div className="space-y-1.5">
              <CardTitle>Income</CardTitle>
              <CardDescription>Last 12 months</CardDescription>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold tracking-tight tabular-nums">
                {formatCurrency(twelveMonthTotal, currency)}
              </p>
              <p className="text-xs text-muted-foreground">total collected</p>
            </div>
          </CardHeader>
          <CardContent>
            <IncomeBarChart data={monthly} currency={currency} />
          </CardContent>
        </Card>

        <div className="space-y-6 lg:col-span-1">
          <NeedsAttention
            overdue={needsAttention.overdue}
            stale={needsAttention.stale}
            currency={currency}
          />
          <Card>
            <CardHeader>
              <CardTitle>Recent activity</CardTitle>
              <CardDescription>
                Your latest invoices and payments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RecentActivity items={activity} currency={currency} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
