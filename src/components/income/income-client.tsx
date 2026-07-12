"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Download,
  Plus,
  Pencil,
  Trash2,
  TrendingUp,
  Wallet,
  Hash,
  CalendarRange,
  CreditCard,
} from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/misc";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { StatCard } from "@/components/stat-card";
import { IncomeBarChart } from "@/components/charts/income-bar-chart";
import { PaymentMethodBreakdown } from "@/components/charts/payment-method-breakdown";
import { PaymentFormModal } from "@/components/payments/payment-form-modal";
import { deletePayment } from "@/lib/actions/payments";
import {
  formatCurrency,
  formatDate,
  lastNMonths,
  monthKey,
  parseDateOnly,
  toCSV,
  downloadFile,
  todayISO,
} from "@/lib/utils";
import type {
  Client,
  Invoice,
  MonthlyIncomePoint,
  Payment,
  PaymentMethod,
  PaymentWithRelations,
} from "@/lib/types";

function sourceLabel(p: PaymentWithRelations): string {
  return (
    p.invoice?.service_description ??
    p.notes ??
    p.project_type ??
    "Payment"
  );
}

export function IncomeClient({
  payments,
  clients,
  invoices,
  currency,
  paymentMethods,
}: {
  payments: PaymentWithRelations[];
  clients: Client[];
  invoices: Invoice[];
  currency: string;
  paymentMethods: PaymentMethod[];
}) {
  const router = useRouter();
  const { toast } = useToast();

  // Filters
  const [month, setMonth] = useState("all");
  const [clientId, setClientId] = useState("all");
  const [projectType, setProjectType] = useState("all");
  const [methodId, setMethodId] = useState("all");

  // Modal / dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Payment | null>(null);
  const [deleting, setDeleting] = useState<PaymentWithRelations | null>(null);

  // Distinct months present, newest first.
  const monthOptions = useMemo(() => {
    const keys = new Set<string>();
    for (const p of payments) keys.add(monthKey(p.payment_date));
    return Array.from(keys)
      .sort((a, b) => b.localeCompare(a))
      .map((key) => ({
        key,
        label: parseDateOnly(`${key}-01`).toLocaleDateString("en-US", {
          month: "short",
          year: "numeric",
        }),
      }));
  }, [payments]);

  // Distinct project types present, alphabetical.
  const projectTypeOptions = useMemo(() => {
    const set = new Set<string>();
    for (const p of payments) {
      if (p.project_type) set.add(p.project_type);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [payments]);

  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      if (month !== "all" && monthKey(p.payment_date) !== month) return false;
      if (clientId !== "all" && p.client_id !== clientId) return false;
      if (projectType !== "all" && p.project_type !== projectType) return false;
      if (methodId !== "all" && p.payment_method_id !== methodId) return false;
      return true;
    });
  }, [payments, month, clientId, projectType, methodId]);

  // Summary figures
  const filteredTotal = useMemo(
    () => filteredPayments.reduce((sum, p) => sum + p.amount, 0),
    [filteredPayments],
  );
  const thisYearTotal = useMemo(() => {
    const year = todayISO().slice(0, 4);
    return payments
      .filter((p) => p.payment_date.slice(0, 4) === year)
      .reduce((sum, p) => sum + p.amount, 0);
  }, [payments]);

  // Chart data: last 12 months of the (filtered) payments.
  const monthlyData: MonthlyIncomePoint[] = useMemo(() => {
    const buckets = lastNMonths(12);
    const totals = new Map<string, number>();
    for (const p of filteredPayments) {
      const key = monthKey(p.payment_date);
      totals.set(key, (totals.get(key) ?? 0) + p.amount);
    }
    return buckets.map((b) => ({
      month: b.key,
      label: b.label,
      total: totals.get(b.key) ?? 0,
    }));
  }, [filteredPayments]);

  // Breakdown of (filtered) income by payment method label.
  const breakdown = useMemo(() => {
    const totals = new Map<string, number>();
    for (const p of filteredPayments) {
      const label = p.payment_method?.name ?? "Unspecified";
      totals.set(label, (totals.get(label) ?? 0) + p.amount);
    }
    return Array.from(totals, ([label, value]) => ({ label, value }));
  }, [filteredPayments]);

  const hasFilters =
    month !== "all" ||
    clientId !== "all" ||
    projectType !== "all" ||
    methodId !== "all";

  function handleExport() {
    const rows = filteredPayments.map((p) => ({
      Date: formatDate(p.payment_date),
      Client: p.client?.name ?? "—",
      Source: sourceLabel(p),
      "Project Type": p.project_type ?? "",
      "Payment Method": p.payment_method?.name ?? "",
      Amount: p.amount,
    }));
    const csv = toCSV(rows, [
      "Date",
      "Client",
      "Source",
      "Project Type",
      "Payment Method",
      "Amount",
    ]);
    downloadFile(csv, `income-${todayISO()}.csv`);
    toast("Income exported", "success");
  }

  async function handleDelete() {
    if (!deleting) return;
    const res = await deletePayment(deleting.id);
    if ("error" in res) {
      toast(res.error, "error");
      return;
    }
    toast("Payment deleted", "success");
    setDeleting(null);
    router.refresh();
  }

  const logButton = (
    <Button onClick={() => setCreateOpen(true)}>
      <Plus className="h-4 w-4" />
      Log Payment
    </Button>
  );

  // Fully empty (no payments at all) — dedicated empty state.
  if (payments.length === 0) {
    return (
      <>
        <PageHeader
          title="Income"
          description="Every payment you've received."
        >
          <Button variant="outline" onClick={handleExport} disabled>
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
          {logButton}
        </PageHeader>

        <EmptyState
          icon={TrendingUp}
          title="No income logged yet"
          description="Log your first payment to see it here."
          action={logButton}
        />

        <PaymentFormModal
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          clients={clients}
          invoices={invoices}
          paymentMethods={paymentMethods}
        />
      </>
    );
  }

  return (
    <>
      <PageHeader title="Income" description="Every payment you've received.">
        <Button variant="outline" onClick={handleExport}>
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
        {logButton}
      </PageHeader>

      {/* Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Total (filtered)"
          value={formatCurrency(filteredTotal, currency)}
          icon={Wallet}
          accent="success"
          hint={hasFilters ? "Matching current filters" : "All income"}
        />
        <StatCard
          label="Payments"
          value={String(filteredPayments.length)}
          icon={Hash}
          hint={
            hasFilters
              ? `of ${payments.length} total`
              : "records logged"
          }
        />
        <StatCard
          label="This year"
          value={formatCurrency(thisYearTotal, currency)}
          icon={CalendarRange}
          accent="primary"
          hint={todayISO().slice(0, 4)}
        />
      </div>

      {/* Filters */}
      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="space-y-1.5 sm:w-48">
          <Label htmlFor="filter-month">Month</Label>
          <Select
            id="filter-month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          >
            <option value="all">All months</option>
            {monthOptions.map((m) => (
              <option key={m.key} value={m.key}>
                {m.label}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-1.5 sm:w-48">
          <Label htmlFor="filter-client">Client</Label>
          <Select
            id="filter-client"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
          >
            <option value="all">All clients</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-1.5 sm:w-48">
          <Label htmlFor="filter-type">Project type</Label>
          <Select
            id="filter-type"
            value={projectType}
            onChange={(e) => setProjectType(e.target.value)}
          >
            <option value="all">All types</option>
            {projectTypeOptions.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-1.5 sm:w-48">
          <Label htmlFor="filter-method">Payment method</Label>
          <Select
            id="filter-method"
            value={methodId}
            onChange={(e) => setMethodId(e.target.value)}
          >
            <option value="all">All methods</option>
            {paymentMethods.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {/* Charts */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Monthly income</CardTitle>
          </CardHeader>
          <CardContent>
            <IncomeBarChart data={monthlyData} currency={currency} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment methods</CardTitle>
            <CardDescription>How your clients pay you</CardDescription>
          </CardHeader>
          <CardContent>
            <PaymentMethodBreakdown data={breakdown} currency={currency} />
          </CardContent>
        </Card>
      </div>

      {/* List */}
      <div className="mt-6">
        {filteredPayments.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card/50 px-6 py-12 text-center text-sm text-muted-foreground">
            No payments match these filters.
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <Card className="hidden overflow-hidden md:block">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      <th className="px-5 py-3 font-medium">Date</th>
                      <th className="px-5 py-3 font-medium">Client</th>
                      <th className="px-5 py-3 font-medium">Source</th>
                      <th className="px-5 py-3 font-medium">Project type</th>
                      <th className="px-5 py-3 font-medium">Method</th>
                      <th className="px-5 py-3 text-right font-medium">
                        Amount
                      </th>
                      <th className="px-5 py-3 text-right font-medium">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPayments.map((p) => (
                      <tr
                        key={p.id}
                        className="border-b border-border last:border-0 transition-colors hover:bg-secondary/50"
                      >
                        <td className="whitespace-nowrap px-5 py-3.5 text-muted-foreground">
                          {formatDate(p.payment_date)}
                        </td>
                        <td className="px-5 py-3.5 font-medium">
                          {p.client?.name ?? "—"}
                        </td>
                        <td className="max-w-xs truncate px-5 py-3.5 text-muted-foreground">
                          {sourceLabel(p)}
                        </td>
                        <td className="px-5 py-3.5">
                          {p.project_type ? (
                            <Badge variant="secondary">{p.project_type}</Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          {p.payment_method ? (
                            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                              <CreditCard className="h-3.5 w-3.5 shrink-0" />
                              {p.payment_method.name}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-5 py-3.5 text-right font-semibold tabular-nums text-success">
                          {formatCurrency(p.amount, currency)}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="Edit payment"
                              onClick={() => setEditing(p)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="Delete payment"
                              onClick={() => setDeleting(p)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Mobile cards */}
            <div className="space-y-3 md:hidden">
              {filteredPayments.map((p) => (
                <Card key={p.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <p className="truncate font-medium">
                        {p.client?.name ?? "—"}
                      </p>
                      <p className="truncate text-sm text-muted-foreground">
                        {sourceLabel(p)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(p.payment_date)}
                      </p>
                      {p.payment_method ? (
                        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <CreditCard className="h-3.5 w-3.5 shrink-0" />
                          {p.payment_method.name}
                        </p>
                      ) : null}
                    </div>
                    <p className="shrink-0 font-semibold tabular-nums text-success">
                      {formatCurrency(p.amount, currency)}
                    </p>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <div>
                      {p.project_type ? (
                        <Badge variant="secondary">{p.project_type}</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          No type
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditing(p)}
                      >
                        <Pencil className="h-4 w-4" />
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label="Delete payment"
                        onClick={() => setDeleting(p)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Create modal */}
      <PaymentFormModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        clients={clients}
        invoices={invoices}
        paymentMethods={paymentMethods}
      />

      {/* Edit modal */}
      <PaymentFormModal
        open={editing !== null}
        onClose={() => setEditing(null)}
        clients={clients}
        invoices={invoices}
        payment={editing}
        paymentMethods={paymentMethods}
      />

      {/* Delete confirmation */}
      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title="Delete payment?"
        description={
          deleting
            ? `This will permanently remove the ${formatCurrency(
                deleting.amount,
                currency,
              )} payment${
                deleting.client?.name ? ` from ${deleting.client.name}` : ""
              }. This cannot be undone.`
            : undefined
        }
        confirmLabel="Delete"
        destructive
      />
    </>
  );
}
