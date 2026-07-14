"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  CreditCard,
  Link2,
  Pencil,
  Plus,
  Star,
  Trash2,
  Wallet,
} from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import {
  createPaymentMethod,
  updatePaymentMethod,
  setDefaultPaymentMethod,
  deletePaymentMethod,
  type PaymentMethodInput,
} from "@/lib/actions/payment-methods";
import { PAYMENT_METHOD_SUGGESTIONS } from "@/lib/constants";
import { payLinkHref } from "@/components/payments/pay-via-button";
import type { PaymentMethod } from "@/lib/types";
import { cn } from "@/lib/utils";

export function PaymentMethodsClient({
  methods,
}: {
  methods: PaymentMethod[];
}) {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PaymentMethod | null>(null);

  function openAdd() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(method: PaymentMethod) {
    setEditing(method);
    setFormOpen(true);
  }

  const hasMethods = methods.length > 0;

  return (
    <div>
      <PageHeader
        title="Payment Methods"
        description="How your clients pay you."
      >
        <Button onClick={openAdd}>
          <Plus className="h-4 w-4" />
          Add method
        </Button>
      </PageHeader>

      {!hasMethods ? (
        <EmptyState
          icon={Wallet}
          title="No payment methods yet"
          description="Add how clients can pay you — it'll appear on your invoices."
          action={
            <Button onClick={openAdd}>
              <Plus className="h-4 w-4" />
              Add method
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {methods.map((method) => (
            <MethodCard
              key={method.id}
              method={method}
              onEdit={() => openEdit(method)}
            />
          ))}
        </div>
      )}

      <PaymentMethodFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        method={editing}
      />
    </div>
  );
}

function MethodCard({
  method,
  onEdit,
}: {
  method: PaymentMethod;
  onEdit: () => void;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [settingDefault, setSettingDefault] = useState(false);

  async function handleSetDefault() {
    setSettingDefault(true);
    const res = await setDefaultPaymentMethod(method.id);
    setSettingDefault(false);
    if ("error" in res) {
      toast(res.error, "error");
      return;
    }
    toast("Default payment method updated");
    router.refresh();
  }

  async function handleDelete() {
    const res = await deletePaymentMethod(method.id);
    if ("error" in res) {
      toast(res.error, "error");
      return;
    }
    toast("Payment method deleted");
    router.refresh();
  }

  return (
    <Card className="flex flex-col p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <CreditCard className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <p className="truncate font-semibold text-foreground">
              {method.name}
            </p>
            {method.is_default && (
              <Badge variant="success" className="shrink-0">
                <Star className="h-3 w-3" />
                Default
              </Badge>
            )}
          </div>
          {method.account_name && (
            <p className="truncate text-sm text-muted-foreground">
              {method.account_name}
            </p>
          )}
          {method.details && (
            <p className="whitespace-pre-wrap break-words text-sm text-muted-foreground">
              {method.details}
            </p>
          )}
          {method.payment_link && <MethodLink link={method.payment_link} />}
        </div>
      </div>

      <div className="mt-5 flex items-center gap-1 border-t border-border pt-4">
        {!method.is_default && (
          <Button
            variant="outline"
            size="sm"
            className="mr-auto"
            onClick={handleSetDefault}
            loading={settingDefault}
          >
            {!settingDefault && <Check className="h-4 w-4" />}
            Set default
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className={cn("h-8 w-8", method.is_default && "ml-auto")}
          onClick={onEdit}
          aria-label={`Edit ${method.name}`}
          title="Edit"
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          onClick={() => setDeleteOpen(true)}
          aria-label={`Delete ${method.name}`}
          title="Delete"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        destructive
        title={`Delete ${method.name}?`}
        description="This removes the payment method. It will be detached from any invoices or payments it's attached to, but those records stay intact."
        confirmLabel="Delete method"
      />
    </Card>
  );
}

/** Renders a method's pay link as a clickable link (URL) or plain text (number). */
function MethodLink({ link }: { link: string }) {
  const href = payLinkHref(link);
  return (
    <p className="flex items-center gap-1.5 text-sm">
      <Link2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="truncate font-medium text-primary hover:underline"
        >
          {link}
        </a>
      ) : (
        <span className="truncate text-muted-foreground">{link}</span>
      )}
    </p>
  );
}

function PaymentMethodFormModal({
  open,
  onClose,
  method,
}: {
  open: boolean;
  onClose: () => void;
  method: PaymentMethod | null;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const isEdit = !!method;
  const suggestionsId = useId();

  const [name, setName] = useState(method?.name ?? "");
  const [accountName, setAccountName] = useState(method?.account_name ?? "");
  const [details, setDetails] = useState(method?.details ?? "");
  const [paymentLink, setPaymentLink] = useState(method?.payment_link ?? "");
  const [isDefault, setIsDefault] = useState(method?.is_default ?? false);
  const [loading, setLoading] = useState(false);

  // Re-seed fields from props each time the modal opens, so editing shows the
  // method's real data and the add form always opens clean.
  const [prevOpen, setPrevOpen] = useState(open);
  if (open && !prevOpen) {
    setPrevOpen(true);
    setName(method?.name ?? "");
    setAccountName(method?.account_name ?? "");
    setDetails(method?.details ?? "");
    setPaymentLink(method?.payment_link ?? "");
    setIsDefault(method?.is_default ?? false);
  } else if (!open && prevOpen) {
    setPrevOpen(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return toast("Enter a method name", "error");

    const input: PaymentMethodInput = {
      name: name.trim(),
      account_name: accountName.trim() || null,
      details: details.trim() || null,
      payment_link: paymentLink.trim() || null,
      is_default: isDefault,
    };

    setLoading(true);
    const res = isEdit
      ? await updatePaymentMethod(method!.id, input)
      : await createPaymentMethod(input);
    setLoading(false);

    if ("error" in res) {
      toast(res.error, "error");
      return;
    }
    toast(isEdit ? "Payment method updated" : "Payment method added");
    router.refresh();
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit payment method" : "Add payment method"}
      description={
        isEdit
          ? "Update how clients pay you."
          : "Add a way clients can pay you."
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="pm-name">Name</Label>
          <Input
            id="pm-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Bank Transfer"
            list={suggestionsId}
            autoComplete="off"
            required
          />
          <datalist id={suggestionsId}>
            {PAYMENT_METHOD_SUGGESTIONS.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="pm-account-name">Account name</Label>
          <Input
            id="pm-account-name"
            value={accountName}
            onChange={(e) => setAccountName(e.target.value)}
            placeholder="Juan Dela Cruz"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="pm-details">Details</Label>
          <Textarea
            id="pm-details"
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="Account number, email, or wallet address"
            rows={2}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="pm-link">
            Payment link{" "}
            <span className="font-normal text-muted-foreground">(optional)</span>
          </Label>
          <Input
            id="pm-link"
            value={paymentLink}
            onChange={(e) => setPaymentLink(e.target.value)}
            placeholder="https://paypal.me/you or 0917 123 4567"
            autoComplete="off"
            inputMode="url"
          />
          <p className="text-xs text-muted-foreground">
            Shown as a “Pay via” button on sent &amp; overdue invoices. Links
            open in a new tab; numbers appear as-is.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsDefault((d) => !d)}
          aria-pressed={isDefault}
          className={cn(
            "flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-left transition-colors",
            isDefault
              ? "border-success/30 bg-success/10"
              : "border-border hover:bg-secondary",
          )}
        >
          <span className="flex items-center gap-2 text-sm font-medium">
            <Star
              className={cn(
                "h-4 w-4",
                isDefault ? "text-success" : "text-muted-foreground",
              )}
            />
            Set as default
          </span>
          <span
            className={cn(
              "relative h-5 w-9 rounded-full transition-colors",
              isDefault ? "bg-success" : "bg-muted",
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform",
                isDefault ? "translate-x-4" : "translate-x-0.5",
              )}
            />
          </span>
        </button>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            {isEdit ? "Save changes" : "Add method"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
