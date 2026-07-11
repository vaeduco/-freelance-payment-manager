"use client";

import { useState } from "react";
import { CircleDollarSign, FilePlus, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InvoiceFormModal } from "@/components/invoices/invoice-form-modal";
import { PaymentFormModal } from "@/components/payments/payment-form-modal";
import { ClientFormModal } from "@/components/clients/client-form-modal";
import type { Client, Invoice } from "@/lib/types";

export function QuickActions({
  clients,
  invoices,
}: {
  clients: Client[];
  invoices: Invoice[];
}) {
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [clientOpen, setClientOpen] = useState(false);

  return (
    <>
      <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
        <Button
          variant="primary"
          className="flex-1 sm:flex-none"
          onClick={() => setInvoiceOpen(true)}
        >
          <FilePlus className="h-4 w-4" />
          New Invoice
        </Button>
        <Button
          variant="secondary"
          className="flex-1 sm:flex-none"
          onClick={() => setPaymentOpen(true)}
        >
          <CircleDollarSign className="h-4 w-4" />
          Log Payment
        </Button>
        <Button
          variant="outline"
          className="flex-1 sm:flex-none"
          onClick={() => setClientOpen(true)}
        >
          <UserPlus className="h-4 w-4" />
          Add Client
        </Button>
      </div>

      <InvoiceFormModal
        open={invoiceOpen}
        onClose={() => setInvoiceOpen(false)}
        clients={clients}
      />
      <PaymentFormModal
        open={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        clients={clients}
        invoices={invoices}
      />
      <ClientFormModal
        open={clientOpen}
        onClose={() => setClientOpen(false)}
      />
    </>
  );
}
