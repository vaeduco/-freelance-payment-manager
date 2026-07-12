"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  FilePlus,
  FileText,
  Pencil,
  Search,
  Trash2,
} from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/misc";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { InvoiceFormModal } from "@/components/invoices/invoice-form-modal";
import { deleteInvoice, markInvoicePaid } from "@/lib/actions/invoices";
import { INVOICE_STATUSES, STATUS_META } from "@/lib/constants";
import { cn, effectiveStatus, formatCurrency, formatDate } from "@/lib/utils";
import type {
  Client,
  InvoiceStatus,
  InvoiceWithClient,
  PaymentMethod,
} from "@/lib/types";

type StatusFilter = "all" | InvoiceStatus;

const SUMMARY_ORDER: InvoiceStatus[] = ["draft", "sent", "overdue", "paid"];

export function InvoicesClient({
  invoices,
  clients,
  currency,
  paymentMethods,
}: {
  invoices: InvoiceWithClient[];
  clients: Client[];
  currency: string;
  paymentMethods: PaymentMethod[];
}) {
  const router = useRouter();
  const { toast } = useToast();

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<InvoiceWithClient | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<InvoiceWithClient | null>(
    null,
  );
  const [payingId, setPayingId] = useState<string | null>(null);

  // Bucket totals by effective status for the summary chips.
  const summary = useMemo(() => {
    const acc: Record<InvoiceStatus, { count: number; amount: number }> = {
      draft: { count: 0, amount: 0 },
      sent: { count: 0, amount: 0 },
      paid: { count: 0, amount: 0 },
      overdue: { count: 0, amount: 0 },
    };
    for (const inv of invoices) {
      const s = effectiveStatus(inv);
      acc[s].count += 1;
      acc[s].amount += inv.amount;
    }
    return acc;
  }, [invoices]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return invoices.filter((inv) => {
      if (statusFilter !== "all" && effectiveStatus(inv) !== statusFilter) {
        return false;
      }
      if (!q) return true;
      const haystack = [
        inv.client?.name ?? "",
        inv.client?.company ?? "",
        inv.service_description ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [invoices, query, statusFilter]);

  async function handleMarkPaid(inv: InvoiceWithClient) {
    setPayingId(inv.id);
    const res = await markInvoicePaid(inv.id);
    setPayingId(null);
    if ("error" in res) {
      toast(res.error, "error");
      return;
    }
    toast("Invoice marked paid");
    router.refresh();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const res = await deleteInvoice(deleteTarget.id);
    if ("error" in res) {
      toast(res.error, "error");
      return;
    }
    toast("Invoice deleted");
    router.refresh();
  }

  const hasInvoices = invoices.length > 0;

  return (
    <div>
      <PageHeader title="Invoices" description="Create, track, and get paid.">
        <Button onClick={() => setCreateOpen(true)}>
          <FilePlus className="h-4 w-4" />
          New Invoice
        </Button>
      </PageHeader>

      {hasInvoices && (
        <>
          {/* Summary chips */}
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {SUMMARY_ORDER.map((status) => {
              const meta = STATUS_META[status];
              const data = summary[status];
              const active = statusFilter === status;
              return (
                <button
                  key={status}
                  type="button"
                  onClick={() =>
                    setStatusFilter((prev) =>
                      prev === status ? "all" : status,
                    )
                  }
                  aria-pressed={active}
                  className={cn(
                    "rounded-xl border bg-card p-4 text-left transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                    active
                      ? "border-primary ring-1 ring-primary/40"
                      : "border-border hover:border-primary/40",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={cn("h-2 w-2 rounded-full", meta.dot)}
                      aria-hidden="true"
                    />
                    <span className="text-xs font-medium text-muted-foreground">
                      {meta.label}
                    </span>
                    <span className="ml-auto text-xs font-semibold tabular-nums text-muted-foreground">
                      {data.count}
                    </span>
                  </div>
                  <p className="mt-2 text-lg font-bold tracking-tight tabular-nums">
                    {formatCurrency(data.amount, currency)}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Controls */}
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Label htmlFor="invoice-search" className="sr-only">
                Search invoices
              </Label>
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                id="invoice-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by client or service…"
                className="pl-9"
              />
            </div>
            <div className="sm:w-48">
              <Label htmlFor="invoice-status" className="sr-only">
                Filter by status
              </Label>
              <Select
                id="invoice-status"
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as StatusFilter)
                }
              >
                <option value="all">All statuses</option>
                {INVOICE_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_META[s].label}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </>
      )}

      {/* List */}
      {!hasInvoices ? (
        <EmptyState
          icon={FileText}
          title="No invoices yet"
          description="Create your first invoice to start tracking payments."
          action={
            <Button onClick={() => setCreateOpen(true)}>
              <FilePlus className="h-4 w-4" />
              New Invoice
            </Button>
          }
        />
      ) : filtered.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-card/50 px-6 py-12 text-center text-sm text-muted-foreground">
          No invoices match your filters.
        </p>
      ) : (
        <>
          {/* Desktop table */}
          <Card className="hidden overflow-hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <th className="px-5 py-3 font-medium">Client</th>
                    <th className="px-5 py-3 font-medium">Service</th>
                    <th className="px-5 py-3 text-right font-medium">Amount</th>
                    <th className="px-5 py-3 font-medium">Due date</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 text-right font-medium">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((inv) => {
                    const status = effectiveStatus(inv);
                    const overdue = status === "overdue";
                    return (
                      <tr
                        key={inv.id}
                        className="border-b border-border last:border-0 transition-colors hover:bg-secondary/40"
                      >
                        <td className="px-5 py-3.5 align-middle">
                          <div className="font-medium text-foreground">
                            {inv.client?.name ?? "No client"}
                          </div>
                          {inv.client?.company && (
                            <div className="text-xs text-muted-foreground">
                              {inv.client.company}
                            </div>
                          )}
                        </td>
                        <td className="max-w-xs px-5 py-3.5 align-middle">
                          <span className="line-clamp-1 text-muted-foreground">
                            {inv.service_description}
                          </span>
                          {inv.payment_method && (
                            <span className="mt-0.5 block text-xs text-muted-foreground/80">
                              Pay via {inv.payment_method.name}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-right align-middle font-medium tabular-nums">
                          {formatCurrency(inv.amount, currency)}
                        </td>
                        <td
                          className={cn(
                            "px-5 py-3.5 align-middle tabular-nums",
                            overdue
                              ? "font-medium text-destructive"
                              : "text-muted-foreground",
                          )}
                        >
                          {formatDate(inv.due_date)}
                        </td>
                        <td className="px-5 py-3.5 align-middle">
                          <StatusBadge status={status} />
                        </td>
                        <td className="px-5 py-3.5 align-middle">
                          <div className="flex items-center justify-end gap-1.5">
                            {status !== "paid" && (
                              <Button
                                size="sm"
                                variant="success"
                                loading={payingId === inv.id}
                                onClick={() => handleMarkPaid(inv)}
                              >
                                <Check className="h-3.5 w-3.5" />
                                Mark paid
                              </Button>
                            )}
                            <Button
                              size="icon"
                              variant="ghost"
                              aria-label="Edit invoice"
                              onClick={() => setEditing(inv)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              aria-label="Delete invoice"
                              className="text-muted-foreground hover:text-destructive"
                              onClick={() => setDeleteTarget(inv)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Mobile stacked cards */}
          <div className="space-y-3 md:hidden">
            {filtered.map((inv) => {
              const status = effectiveStatus(inv);
              const overdue = status === "overdue";
              return (
                <Card key={inv.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium text-foreground">
                        {inv.client?.name ?? "No client"}
                      </div>
                      {inv.client?.company && (
                        <div className="text-xs text-muted-foreground">
                          {inv.client.company}
                        </div>
                      )}
                    </div>
                    <StatusBadge status={status} />
                  </div>

                  <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                    {inv.service_description}
                  </p>
                  {inv.payment_method && (
                    <p className="mt-0.5 text-xs text-muted-foreground/80">
                      Pay via {inv.payment_method.name}
                    </p>
                  )}

                  <div className="mt-3 flex items-end justify-between gap-3">
                    <div>
                      <p className="text-lg font-bold tracking-tight tabular-nums">
                        {formatCurrency(inv.amount, currency)}
                      </p>
                      <p
                        className={cn(
                          "text-xs tabular-nums",
                          overdue
                            ? "font-medium text-destructive"
                            : "text-muted-foreground",
                        )}
                      >
                        Due {formatDate(inv.due_date)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-2">
                    {status !== "paid" && (
                      <Button
                        size="sm"
                        variant="success"
                        className="flex-1"
                        loading={payingId === inv.id}
                        onClick={() => handleMarkPaid(inv)}
                      >
                        <Check className="h-3.5 w-3.5" />
                        Mark paid
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className={cn(status === "paid" && "flex-1")}
                      onClick={() => setEditing(inv)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Delete invoice"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => setDeleteTarget(inv)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* Create modal */}
      <InvoiceFormModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        clients={clients}
        paymentMethods={paymentMethods}
      />

      {/* Edit modal */}
      <InvoiceFormModal
        open={editing !== null}
        onClose={() => setEditing(null)}
        clients={clients}
        invoice={editing}
        paymentMethods={paymentMethods}
      />

      {/* Delete confirmation */}
      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete invoice?"
        description={
          deleteTarget
            ? `This permanently removes the invoice for ${
                deleteTarget.client?.name ?? "No client"
              } (${formatCurrency(deleteTarget.amount, currency)}). This cannot be undone.`
            : undefined
        }
        confirmLabel="Delete"
        destructive
      />
    </div>
  );
}
