"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { PROJECT_TYPES } from "@/lib/constants";
import { todayISO } from "@/lib/utils";
import {
  createPayment,
  updatePayment,
  type PaymentInput,
} from "@/lib/actions/payments";
import type { Client, Invoice, Payment } from "@/lib/types";

export function PaymentFormModal({
  open,
  onClose,
  clients,
  invoices = [],
  payment,
  defaultClientId,
}: {
  open: boolean;
  onClose: () => void;
  clients: Client[];
  invoices?: Invoice[];
  payment?: Payment | null;
  defaultClientId?: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const isEdit = !!payment;

  const [clientId, setClientId] = useState(
    payment?.client_id ?? defaultClientId ?? "",
  );
  const [invoiceId, setInvoiceId] = useState(payment?.invoice_id ?? "");
  const [amount, setAmount] = useState(payment ? String(payment.amount) : "");
  const [paymentDate, setPaymentDate] = useState(
    payment?.payment_date ?? todayISO(),
  );
  const [projectType, setProjectType] = useState(payment?.project_type ?? "");
  const [notes, setNotes] = useState(payment?.notes ?? "");
  const [loading, setLoading] = useState(false);

  // Re-seed fields from props each time the modal opens, so editing shows the
  // payment's real data and the create form always opens clean.
  const [prevOpen, setPrevOpen] = useState(open);
  if (open && !prevOpen) {
    setPrevOpen(true);
    setClientId(payment?.client_id ?? defaultClientId ?? "");
    setInvoiceId(payment?.invoice_id ?? "");
    setAmount(payment ? String(payment.amount) : "");
    setPaymentDate(payment?.payment_date ?? todayISO());
    setProjectType(payment?.project_type ?? "");
    setNotes(payment?.notes ?? "");
  } else if (!open && prevOpen) {
    setPrevOpen(false);
  }

  // Only offer unpaid invoices for linking (plus the currently linked one).
  const linkableInvoices = invoices.filter(
    (i) => i.status !== "paid" || i.id === payment?.invoice_id,
  );

  function onSelectInvoice(id: string) {
    setInvoiceId(id);
    const inv = invoices.find((i) => i.id === id);
    if (inv) {
      if (!amount) setAmount(String(inv.amount));
      if (!clientId && inv.client_id) setClientId(inv.client_id);
      if (!projectType && inv.project_type) setProjectType(inv.project_type);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) return toast("Enter a valid amount", "error");
    if (!paymentDate) return toast("Pick a payment date", "error");

    const input: PaymentInput = {
      client_id: clientId || null,
      invoice_id: invoiceId || null,
      amount: amt,
      payment_date: paymentDate,
      project_type: projectType.trim() || null,
      notes: notes.trim() || null,
    };

    setLoading(true);
    const res = isEdit
      ? await updatePayment(payment!.id, input)
      : await createPayment(input);
    setLoading(false);

    if ("error" in res) {
      toast(res.error, "error");
      return;
    }
    toast(isEdit ? "Payment updated" : "Payment logged");
    router.refresh();
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit payment" : "Log a payment"}
      description={
        isEdit
          ? "Update this payment record."
          : "Record income you've received."
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="pay-amount">Amount</Label>
            <Input
              id="pay-amount"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pay-date">Date received</Label>
            <Input
              id="pay-date"
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="pay-client">Client</Label>
          <Select
            id="pay-client"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
          >
            <option value="">No client</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.company ? ` — ${c.company}` : ""}
              </option>
            ))}
          </Select>
        </div>

        {linkableInvoices.length > 0 && (
          <div className="space-y-1.5">
            <Label htmlFor="pay-invoice">Apply to invoice (optional)</Label>
            <Select
              id="pay-invoice"
              value={invoiceId}
              onChange={(e) => onSelectInvoice(e.target.value)}
            >
              <option value="">None</option>
              {linkableInvoices.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.service_description} — {i.amount}
                </option>
              ))}
            </Select>
            <p className="text-xs text-muted-foreground">
              Applied to the invoice; it&apos;s marked paid once fully covered.
            </p>
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="pay-type">Project type</Label>
          <Input
            id="pay-type"
            list="project-types-pay"
            value={projectType}
            onChange={(e) => setProjectType(e.target.value)}
            placeholder="e.g. Consulting"
          />
          <datalist id="project-types-pay">
            {PROJECT_TYPES.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="pay-notes">Notes</Label>
          <Textarea
            id="pay-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional note about this payment"
            rows={2}
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            {isEdit ? "Save changes" : "Log payment"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
