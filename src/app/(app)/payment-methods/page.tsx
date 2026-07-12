import type { Metadata } from "next";
import { PaymentMethodsClient } from "@/components/settings/payment-methods-client";
import { getPaymentMethods } from "@/lib/data/payment-methods";

export const metadata: Metadata = { title: "Payment Methods" };

export default async function PaymentMethodsPage() {
  const methods = await getPaymentMethods();

  return <PaymentMethodsClient methods={methods} />;
}
