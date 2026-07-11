"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { PROJECT_TYPES } from "@/lib/constants";
import { todayISO } from "@/lib/utils";
import {
  createInvoice,
  updateInvoice,
  type InvoiceInput,
} from "@/lib/actions/invoices";
import type { Client, Invoice } from "@/lib/types";

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
}: {
  open: boolean;
  onClose: () => void;
  clients: Client[];
  invoice?: Invoice | null;
  defaultClientId?: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const isEdit = !!invoice;

  const today = todayISO();
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
    invoice?.due_date ?? addDays(today, 14),
  );
  const [projectType, setProjectType] = useState(invoice?.project_type ?? "");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!description.trim()) return toast("Add a service description", "error");
    if (isNaN(amt) || amt < 0) return toast("Enter a valid amount", "error");
    if (!dueDate) return toast("Pick a due date", "error");

    const input: InvoiceInput = {
      client_id: clientId || null,
      service_description: description,
      amount: amt,
      status,
      issue_date: issueDate,
      due_date: dueDate,
      project_type: projectType.trim() || null,
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

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="inv-amount">Amount</Label>
            <Input
              id="inv-amount"
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
            onChange={(e) => setProjectType(e.target.value)}
            placeholder="e.g. Web Development"
          />
          <datalist id="project-types">
            {PROJECT_TYPES.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
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
