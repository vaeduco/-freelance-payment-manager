import type { Metadata } from "next";
import { getProfile } from "@/lib/data/profile";
import { getPaymentsWithRelations } from "@/lib/data/payments";
import { getInvoicesWithClients } from "@/lib/data/invoices";
import { isOutstanding } from "@/lib/utils";
import { TaxClient } from "@/components/tax/tax-client";

export const metadata: Metadata = {
  title: "Tax Estimator",
};

export default async function TaxPage() {
  const [profile, payments, invoices] = await Promise.all([
    getProfile(),
    getPaymentsWithRelations(),
    getInvoicesWithClients(),
  ]);

  const currency = profile?.currency ?? "USD";
  const taxRate = profile?.tax_rate ?? 25;

  const currentYear = new Date().getFullYear();

  const incomeThisYear = payments.reduce((sum, p) => {
    const year = Number(p.payment_date.slice(0, 4));
    return year === currentYear ? sum + p.amount : sum;
  }, 0);

  const incomeAllTime = payments.reduce((sum, p) => sum + p.amount, 0);

  const outstanding = invoices.reduce(
    (sum, inv) => (isOutstanding(inv) ? sum + inv.amount : sum),
    0,
  );

  return (
    <TaxClient
      initialRate={taxRate}
      currency={currency}
      incomeThisYear={incomeThisYear}
      incomeAllTime={incomeAllTime}
      outstanding={outstanding}
      recentPayments={payments.slice(0, 10)}
    />
  );
}
