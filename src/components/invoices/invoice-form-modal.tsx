"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { cn, todayISO } from "@/lib/utils";
import { PROJECT_TYPES } from "@/lib/constants";
import {
  createInvoice,
  updateInvoice,
  type InvoiceInput,
} from "@/lib/actions/invoices";
import type { Client, Invoice, PaymentMethod } from "@/lib/types";

type RateType = "fixed" | "hourly";

function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d + days);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

export function InvoiceFormModal({
  open,
  onClose,
  clients,
  invoice,
  defaultClientId,
  paymentMethods = [],
  projectTypeRates = {},
  paymentTermsDays = 14,
}: {
  open: boolean;
  onClose: () => void;
  clients: Client[];
  invoice?: Invoice | null;
  defaultClientId?: string;
  paymentMethods?: PaymentMethod[];
  /** project_type (lowercased) -> last hourly rate used, for prefill. */
  projectTypeRates?: Record<string, number>;
  /** User's default payment terms in days — sets a new invoice's due date. */
  paymentTermsDays?: number;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const isEdit = !!invoice;

  const today = todayISO();
  const defaultMethodId = paymentMethods.find((m) => m.is_default)?.id ?? "";
  const [clientId, setClientId] = useState(
    invoice?.client_id ?? defaultClientId ?? "",
  );
  const [description, setDescription] = useState(
    invoice?.service_description ?? "",
  );
  const [amount, setAmount] = useState(
    invoice ? String(invoice.amount) : "",
  );
  const [status, setStatus] = useState<"draft" | "sent" | "paid">(
    invoice && invoice.status !== "overdue" ? invoice.status : invoice ? "sent" : "draft",
  );
  const [issueDate, setIssueDate] = useState(invoice?.issue_date ?? today);
  const [dueDate, setDueDate] = useState(
    invoice?.due_date ?? addDays(today, paymentTermsDays),
  );
  const [projectType, setProjectType] = useState(invoice?.project_type ?? "");
  const [paymentMethodId, setPaymentMethodId] = useState(
    invoice ? (invoice.payment_method_id ?? "") : defaultMethodId,
  );
  const [rateType, setRateType] = useState<RateType>(
    invoice?.rate_type ?? "fixed",
  );
  const [trackedHours, setTrackedHours] = useState(
    invoice?.tracked_hours != null ? String(invoice.tracked_hours) : "",
  );
  const [hourlyRate, setHourlyRate] = useState(
    invoice?.hourly_rate != null ? String(invoice.hourly_rate) : "",
  );
  const [loading, setLoading] = useState(false);

  // Re-seed all fields from props each time the modal opens, so editing shows
  // the invoice's real data and the create form always opens clean.
  const [prevOpen, setPrevOpen] = useState(open);
  if (open && !prevOpen) {
    setPrevOpen(true);
    setClientId(invoice?.client_id ?? defaultClientId ?? "");
    setDescription(invoice?.service_description ?? "");
    setAmount(invoice ? String(invoice.amount) : "");
    setStatus(
      invoice && invoice.status !== "overdue"
        ? invoice.status
        : invoice
          ? "sent"
          : "draft",
    );
    setIssueDate(invoice?.issue_date ?? today);
    setDueDate(invoice?.due_date ?? addDays(today, paymentTermsDays));
    setProjectType(invoice?.project_type ?? "");
    setPaymentMethodId(invoice ? (invoice.payment_method_id ?? "") : defaultMethodId);
    setRateType(invoice?.rate_type ?? "fixed");
    setTrackedHours(
      invoice?.tracked_hours != null ? String(invoice.tracked_hours) : "",
    );
    setHourlyRate(
      invoice?.hourly_rate != null ? String(invoice.hourly_rate) : "",
    );
  } else if (!open && prevOpen) {
    setPrevOpen(false);
  }

  const selectedMethod =
    paymentMethods.find((m) => m.id === paymentMethodId) ?? null;

  // Amount is derived for hourly invoices; manual for fixed.
  const hoursNum = parseFloat(trackedHours) || 0;
  const rateNum = parseFloat(hourlyRate) || 0;
  const computedAmount =
    rateType === "hourly"
      ? Math.round(hoursNum * rateNum * 100) / 100
      : parseFloat(amount) || 0;

  function rateForProjectType(pt: string): number | undefined {
    return projectTypeRates[pt.trim().toLowerCase()];
  }

  // Prefill the hourly rate from the last rate used for this project type
  // (only when empty, so we never clobber a rate the user typed).
  function switchToHourly() {
    setRateType("hourly");
    if (!hourlyRate) {
      const r = rateForProjectType(projectType);
      if (r) setHourlyRate(String(r));
    }
  }

  function onProjectTypeChange(value: string) {
    setProjectType(value);
    if (rateType === "hourly" && !hourlyRate) {
      const r = rateForProjectType(value);
      if (r) setHourlyRate(String(r));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim()) return toast("Add a service description", "error");
    if (!dueDate) return toast("Pick a due date", "error");

    let amt: number;
    if (rateType === "hourly") {
      if (trackedHours.trim() === "" || hoursNum < 0)
        return toast("Enter valid tracked hours", "error");
      if (hourlyRate.trim() === "" || rateNum < 0)
        return toast("Enter a valid hourly rate", "error");
      amt = computedAmount;
    } else {
      amt = parseFloat(amount);
      if (isNaN(amt) || amt < 0) return toast("Enter a valid amount", "error");
    }

    const input: InvoiceInput = {
      client_id: clientId || null,
      service_description: description,
      amount: amt,
      status,
      issue_date: issueDate,
      due_date: dueDate,
      project_type: projectType.trim() || null,
      rate_type: rateType,
      tracked_hours: rateType === "hourly" ? hoursNum : null,
      hourly_rate: rateType === "hourly" ? rateNum : null,
      payment_method_id: paymentMethodId || null,
    };

    setLoading(true);
    const res = isEdit
      ? await updateInvoice(invoice!.id, input)
      : await createInvoice(input);
    setLoading(false);

    if ("error" in res) {
      toast(res.error, "error");
      return;
    }
    toast(isEdit ? "Invoice updated" : "Invoice created");
    router.refresh();
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit invoice" : "New invoice"}
      description={
        isEdit
          ? "Update the details of this invoice."
          : "Create an invoice for a client."
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="inv-client">Client</Label>
          <Select
            id="inv-client"
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

        <div className="space-y-1.5">
          <Label htmlFor="inv-desc">Service description</Label>
          <Input
            id="inv-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Website redesign — phase 1"
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label>Billing</Label>
          <div className="grid grid-cols-2 gap-1 rounded-lg border border-border bg-secondary/50 p-1">
            <button
              type="button"
              onClick={() => setRateType("fixed")}
              aria-pressed={rateType === "fixed"}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                rateType === "fixed"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Fixed
            </button>
            <button
              type="button"
              onClick={switchToHourly}
              aria-pressed={rateType === "hourly"}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                rateType === "hourly"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Hourly
            </button>
          </div>
        </div>

        {rateType === "hourly" && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="inv-hours">Tracked hours</Label>
              <Input
                id="inv-hours"
                type="number"
                min="0"
                step="0.25"
                inputMode="decimal"
                value={trackedHours}
                onChange={(e) => setTrackedHours(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inv-rate">Hourly rate</Label>
              <Input
                id="inv-rate"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="inv-amount">Amount</Label>
            <Input
              id="inv-amount"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={rateType === "hourly" ? computedAmount.toFixed(2) : amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              readOnly={rateType === "hourly"}
              disabled={rateType === "hourly"}
              required={rateType === "fixed"}
              className={cn(rateType === "hourly" && "bg-muted text-muted-foreground")}
            />
            {rateType === "hourly" && (
              <p className="text-xs text-muted-foreground">
                Auto-calculated: tracked hours × hourly rate
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="inv-status">Status</Label>
            <Select
              id="inv-status"
              value={status}
              onChange={(e) =>
                setStatus(e.target.value as "draft" | "sent" | "paid")
              }
            >
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="paid">Paid</option>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="inv-issue">Issue date</Label>
            <Input
              id="inv-issue"
              type="date"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="inv-due">Due date</Label>
            <Input
              id="inv-due"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="inv-type">Project type</Label>
          <Input
            id="inv-type"
            list="project-types"
            value={projectType}
            onChange={(e) => onProjectTypeChange(e.target.value)}
            placeholder="e.g. Web Development"
          />
          <datalist id="project-types">
            {PROJECT_TYPES.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="inv-method">Payment method</Label>
          <Select
            id="inv-method"
            value={paymentMethodId}
            onChange={(e) => setPaymentMethodId(e.target.value)}
          >
            <option value="">None</option>
            {paymentMethods.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
                {m.is_default ? " (default)" : ""}
              </option>
            ))}
          </Select>
          {paymentMethods.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Add methods under Payment Methods so clients know how to pay you.
            </p>
          ) : selectedMethod && (selectedMethod.account_name || selectedMethod.details) ? (
            <div className="rounded-lg border border-border bg-secondary/50 px-3 py-2 text-xs">
              {selectedMethod.account_name && (
                <div className="font-medium text-foreground">
                  {selectedMethod.account_name}
                </div>
              )}
              {selectedMethod.details && (
                <div className="break-words text-muted-foreground">
                  {selectedMethod.details}
                </div>
              )}
              <div className="mt-1 text-muted-foreground">
                Shown on the invoice so your client knows how to pay.
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            {isEdit ? "Save changes" : "Create invoice"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
