import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getInvoice, getInvoicesWithClients } from "@/lib/data/invoices";
import { getProfile } from "@/lib/data/profile";
import { getLogoSignedUrl } from "@/lib/data/storage";
import { deriveInvoiceNumbers } from "@/lib/reports";
import { PrintButton } from "@/components/reports/print-button";
import { InvoiceDocument } from "@/components/invoices/invoice-document";

export const metadata: Metadata = { title: "Invoice" };

export default async function InvoicePrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [invoice, allInvoices, profile] = await Promise.all([
    getInvoice(id), // RLS → null for non-owners
    getInvoicesWithClients(),
    getProfile(),
  ]);
  if (!invoice) notFound();

  const numbers = deriveInvoiceNumbers(allInvoices);
  const logoUrl = await getLogoSignedUrl(profile?.logo_path);
  const businessName =
    profile?.business_name?.trim() ||
    profile?.full_name?.trim() ||
    "Your business";

  return (
    <div className="min-h-dvh bg-slate-100 py-8">
      <div className="mx-auto max-w-3xl px-4">
        <div className="mb-4 flex justify-end print:hidden">
          <PrintButton />
        </div>
        <div className="overflow-hidden rounded-lg shadow-sm print:shadow-none">
          <InvoiceDocument
            invoice={invoice}
            invoiceNumber={numbers[invoice.id] ?? "INV-—"}
            businessName={businessName}
            logoUrl={logoUrl}
            currency={profile?.currency ?? "USD"}
          />
        </div>
      </div>
    </div>
  );
}
