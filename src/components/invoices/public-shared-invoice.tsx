"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarClock, Loader2, Lock, ShieldAlert } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InvoiceDocument } from "@/components/invoices/invoice-document";
import type { InvoiceWithClient } from "@/lib/types";

type Phase = "loading" | "password" | "shown" | "error";

const STATUS_MESSAGE: Record<string, string> = {
  not_found: "This link isn't valid.",
  revoked: "This link has been revoked by the sender.",
  expired: "This link has expired.",
  limit: "This link has reached its view limit.",
};

function mapInvoice(raw: Record<string, unknown>) {
  const invoice = {
    id: raw.id,
    service_description: raw.service_description,
    amount: raw.amount,
    status: raw.status,
    issue_date: raw.issue_date,
    due_date: raw.due_date,
    project_type: raw.project_type,
    rate_type: raw.rate_type,
    tracked_hours: raw.tracked_hours,
    hourly_rate: raw.hourly_rate,
    client: raw.client ?? null,
    payment_method: raw.payment_method ?? null,
  } as unknown as InvoiceWithClient;
  return {
    invoice,
    invoiceNumber: `INV-${String((raw.invoice_seq as number) ?? 0).padStart(4, "0")}`,
    businessName: ((raw.business_name as string) ?? "").trim() || "Invoice",
    currency: (raw.currency as string) ?? "USD",
    bookingSlug: ((raw.booking_slug as string) ?? "").trim() || null,
  };
}

export function PublicSharedInvoice({ token }: { token: string }) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [message, setMessage] = useState<string>("");
  const [pwError, setPwError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [doc, setDoc] = useState<ReturnType<typeof mapInvoice> | null>(null);

  const open = useCallback(
    async (pw: string | null) => {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("open_shared_link", {
        p_token: token,
        p_password: pw,
      });
      if (error || !data) {
        setMessage("Something went wrong opening this invoice.");
        setPhase("error");
        return;
      }
      const status = (data as { status: string }).status;
      if (status === "ok") {
        setDoc(mapInvoice((data as { invoice: Record<string, unknown> }).invoice));
        setPhase("shown");
      } else if (status === "bad_password") {
        setPwError("Incorrect password. Please try again.");
        setPhase("password");
      } else {
        setMessage(STATUS_MESSAGE[status] ?? "This link isn't available.");
        setPhase("error");
      }
    },
    [token],
  );

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("peek_shared_link", {
        p_token: token,
      });
      if (error || !data) {
        setMessage("This link isn't available.");
        setPhase("error");
        return;
      }
      const { status, requires_password } = data as {
        status: string;
        requires_password: boolean;
      };
      if (status !== "ok") {
        setMessage(STATUS_MESSAGE[status] ?? "This link isn't available.");
        setPhase("error");
      } else if (requires_password) {
        setPhase("password");
      } else {
        await open(null);
      }
    })();
  }, [token, open]);

  async function submitPassword(e: React.FormEvent) {
    e.preventDefault();
    setPwError(null);
    setSubmitting(true);
    try {
      await open(password);
    } finally {
      setSubmitting(false);
    }
  }

  if (phase === "loading") {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-slate-100 text-slate-500">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-slate-100 p-6">
        <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 text-center">
          <ShieldAlert className="mx-auto mb-3 h-8 w-8 text-slate-400" />
          <p className="font-medium text-slate-900">Invoice unavailable</p>
          <p className="mt-1 text-sm text-slate-500">{message}</p>
        </div>
      </div>
    );
  }

  if (phase === "password") {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-slate-100 p-6">
        <form
          onSubmit={submitPassword}
          className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8"
        >
          <div className="mb-4 flex flex-col items-center gap-2 text-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-50 text-blue-600">
              <Lock className="h-5 w-5" />
            </div>
            <p className="font-medium text-slate-900">Password required</p>
            <p className="text-sm text-slate-500">
              This invoice is protected. Enter the password the sender gave you.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="share-pw" className="text-slate-700">
              Password
            </Label>
            <Input
              id="share-pw"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              required
            />
          </div>
          {pwError && (
            <p className="mt-2 text-sm text-red-600">{pwError}</p>
          )}
          <Button
            type="submit"
            className="mt-4 w-full !bg-blue-600 !text-white hover:!bg-blue-700"
            loading={submitting}
          >
            View invoice
          </Button>
        </form>
      </div>
    );
  }

  // shown
  return (
    <div className="min-h-dvh bg-slate-100 py-8 sm:py-12">
      <div className="mx-auto max-w-3xl px-4">
        <div className="overflow-hidden rounded-xl shadow-sm">
          {doc && (
            <InvoiceDocument
              invoice={doc.invoice}
              invoiceNumber={doc.invoiceNumber}
              businessName={doc.businessName}
              logoUrl={null}
              currency={doc.currency}
            />
          )}
        </div>
        {doc?.bookingSlug && (
          <div className="mt-4 flex justify-center">
            <a
              href={`/book/${doc.bookingSlug}`}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
            >
              <CalendarClock className="h-4 w-4" />
              Book a call with {doc.businessName}
            </a>
          </div>
        )}
        <p className="mt-4 text-center text-xs text-slate-400">
          Powered by FreelanceFlow
        </p>
      </div>
    </div>
  );
}
