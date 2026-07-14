import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Printer } from "lucide-react";
import { getInvoice, getInvoicesWithClients } from "@/lib/data/invoices";
import { getProfile } from "@/lib/data/profile";
import { getLogoSignedUrl } from "@/lib/data/storage";
import { deriveInvoiceNumbers } from "@/lib/reports";
import { InvoiceDocument } from "@/components/invoices/invoice-document";

export const metadata: Metadata = { title: "Invoice" };

export default async function InvoiceDetailPage({
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
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/invoices"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to invoices
        </Link>
        <a
          href={`/invoices/${id}/print`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-border bg-transparent px-3 text-xs font-medium text-foreground transition-colors hover:bg-secondary"
        >
          <Printer className="h-4 w-4" />
          Print / Save as PDF
        </a>
      </div>

      <div className="overflow-hidden rounded-xl border border-border shadow-sm">
        <InvoiceDocument
          invoice={invoice}
          invoiceNumber={numbers[invoice.id] ?? "INV-—"}
          businessName={businessName}
          logoUrl={logoUrl}
          currency={profile?.currency ?? "USD"}
        />
      </div>
    </div>
  );
}
