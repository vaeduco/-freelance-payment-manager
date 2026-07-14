"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CreditCard,
  FilePlus,
  FileText,
  Mail,
  Receipt,
  Wallet,
} from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import { InvoiceFormModal } from "@/components/invoices/invoice-form-modal";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/misc";
import { PayViaButton } from "@/components/payments/pay-via-button";
import type {
  Client,
  InvoiceWithClient,
  PaymentMethod,
  PaymentWithRelations,
} from "@/lib/types";
import {
  effectiveStatus,
  formatCurrency,
  formatDate,
  isOutstanding,
} from "@/lib/utils";

export function ClientDetail({
  client,
  invoices,
  payments,
  currency,
  clients,
  paymentMethods,
  projectTypeRates,
}: {
  client: Client;
  invoices: InvoiceWithClient[];
  payments: PaymentWithRelations[];
  currency: string;
  clients: Client[];
  paymentMethods: PaymentMethod[];
  projectTypeRates: Record<string, number>;
}) {
  const [invoiceOpen, setInvoiceOpen] = useState(false);

  const totalPaid = payments.reduce((s, p) => s + Number(p.amount), 0);
  const outstanding = invoices
    .filter((i) => isOutstanding(i))
    .reduce((s, i) => s + Number(i.amount), 0);

  return (
    <div>
      <Link
        href="/clients"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:outline-none"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to clients
      </Link>

      <PageHeader
        title={client.name}
        description={client.company ?? undefined}
      >
        {client.email && (
          <a
            href={`mailto:${client.email}`}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-primary focus-visible:text-primary focus-visible:outline-none"
          >
            <Mail className="h-4 w-4" />
            {client.email}
          </a>
        )}
        <Button onClick={() => setInvoiceOpen(true)}>
          <FilePlus className="h-4 w-4" />
          New invoice
        </Button>
      </PageHeader>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Total paid"
          value={formatCurrency(totalPaid, currency)}
          icon={Wallet}
          accent="success"
        />
        <StatCard
          label="Outstanding"
          value={formatCurrency(outstanding, currency)}
          icon={CreditCard}
          accent={outstanding > 0 ? "destructive" : "primary"}
        />
        <StatCard
          label="Invoices"
          value={String(invoices.length)}
          icon={FileText}
        />
        <StatCard
          label="Payments"
          value={String(payments.length)}
          icon={Receipt}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <InvoicesSection invoices={invoices} currency={currency} />
        <PaymentsSection payments={payments} currency={currency} />
      </div>

      <InvoiceFormModal
        open={invoiceOpen}
        onClose={() => setInvoiceOpen(false)}
        clients={clients}
        defaultClientId={client.id}
        paymentMethods={paymentMethods}
        projectTypeRates={projectTypeRates}
      />
    </div>
  );
}

function InvoicesSection({
  invoices,
  currency,
}: {
  invoices: InvoiceWithClient[];
  currency: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Invoices</CardTitle>
      </CardHeader>
      <CardContent>
        {invoices.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No invoices"
            description="This client has no invoices yet."
          />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs font-medium text-muted-foreground">
                    <th className="pb-2 pr-3 font-medium">Service</th>
                    <th className="pb-2 pr-3 font-medium">Due</th>
                    <th className="pb-2 pr-3 text-right font-medium">Amount</th>
                    <th className="pb-2 text-right font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {invoices.map((inv) => (
                    <tr key={inv.id}>
                      <td className="py-3 pr-3 font-medium text-foreground">
                        {inv.service_description}
                        <PayViaButton invoice={inv} className="mt-0.5" />
                      </td>
                      <td className="py-3 pr-3 text-muted-foreground">
                        {formatDate(inv.due_date)}
                      </td>
                      <td className="py-3 pr-3 text-right font-semibold tabular-nums">
                        {formatCurrency(Number(inv.amount), currency)}
                      </td>
                      <td className="py-3 text-right">
                        <StatusBadge status={effectiveStatus(inv)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile stacked cards */}
            <ul className="space-y-3 sm:hidden">
              {invoices.map((inv) => (
                <li
                  key={inv.id}
                  className="rounded-lg border border-border p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="min-w-0 flex-1 font-medium text-foreground">
                      {inv.service_description}
                    </p>
                    <StatusBadge status={effectiveStatus(inv)} />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      Due {formatDate(inv.due_date)}
                    </span>
                    <span className="font-semibold tabular-nums">
                      {formatCurrency(Number(inv.amount), currency)}
                    </span>
                  </div>
                  <PayViaButton invoice={inv} className="mt-1.5" />
                </li>
              ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function PaymentsSection({
  payments,
  currency,
}: {
  payments: PaymentWithRelations[];
  currency: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment history</CardTitle>
      </CardHeader>
      <CardContent>
        {payments.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No payments"
            description="Payments from this client will appear here."
          />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs font-medium text-muted-foreground">
                    <th className="pb-2 pr-3 font-medium">Date</th>
                    <th className="pb-2 pr-3 font-medium">Source</th>
                    <th className="pb-2 text-right font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {payments.map((p) => (
                    <tr key={p.id}>
                      <td className="py-3 pr-3 text-muted-foreground">
                        {formatDate(p.payment_date)}
                      </td>
                      <td className="py-3 pr-3 font-medium text-foreground">
                        {paymentSource(p)}
                      </td>
                      <td className="py-3 text-right font-semibold tabular-nums text-success">
                        {formatCurrency(Number(p.amount), currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile stacked cards */}
            <ul className="space-y-3 sm:hidden">
              {payments.map((p) => (
                <li
                  key={p.id}
                  className="rounded-lg border border-border p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="min-w-0 flex-1 font-medium text-foreground">
                      {paymentSource(p)}
                    </p>
                    <span className="font-semibold tabular-nums text-success">
                      {formatCurrency(Number(p.amount), currency)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatDate(p.payment_date)}
                  </p>
                </li>
              ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function paymentSource(p: PaymentWithRelations): string {
  return p.invoice?.service_description ?? p.notes ?? "Payment";
}
