"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { LogoUploader } from "@/components/settings/logo-uploader";
import { updateProfile } from "@/lib/actions/profile";
import { CURRENCIES } from "@/lib/constants";
import type { Profile } from "@/lib/types";

export function SettingsClient({
  profile,
  email,
  logoUrl,
}: {
  profile: Profile | null;
  email: string;
  logoUrl: string | null;
}) {
  const router = useRouter();
  const { toast } = useToast();

  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [businessName, setBusinessName] = useState(
    profile?.business_name ?? "",
  );
  const [currency, setCurrency] = useState(profile?.currency ?? "USD");
  const [taxRate, setTaxRate] = useState(
    profile ? String(profile.tax_rate) : "25",
  );
  const [termsDays, setTermsDays] = useState(
    profile ? String(profile.payment_terms_days) : "14",
  );
  const [loading, setLoading] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const rate = parseFloat(taxRate);
    if (isNaN(rate) || rate < 0 || rate > 100) {
      return toast("Tax rate must be between 0 and 100", "error");
    }
    const days = parseInt(termsDays, 10);
    if (isNaN(days) || days < 0) {
      return toast("Payment terms must be 0 or more days", "error");
    }
    setLoading(true);
    const res = await updateProfile({
      full_name: fullName.trim() || null,
      business_name: businessName.trim() || null,
      currency,
      tax_rate: rate,
      payment_terms_days: days,
    });
    setLoading(false);
    if ("error" in res) return toast(res.error, "error");
    toast("Settings saved");
    router.refresh();
  }

  return (
    <form onSubmit={handleSave} className="max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Your account details.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="set-name">Full name</Label>
            <Input
              id="set-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Alex Rivera"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="set-email">Email</Label>
            <Input id="set-email" value={email} disabled />
            <p className="text-xs text-muted-foreground">
              Your login email can&apos;t be changed here.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Business</CardTitle>
          <CardDescription>
            Your brand and defaults — shown on invoices you send.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="set-business">Business name</Label>
            <Input
              id="set-business"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Your business or studio name"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Logo</Label>
            <LogoUploader initialLogoUrl={logoUrl} />
          </div>
          <div className="space-y-1.5 sm:max-w-xs">
            <Label htmlFor="set-terms">Default payment terms (days)</Label>
            <Input
              id="set-terms"
              type="number"
              min="0"
              step="1"
              inputMode="numeric"
              value={termsDays}
              onChange={(e) => setTermsDays(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              New invoices default their due date this many days out.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Preferences</CardTitle>
          <CardDescription>
            Currency is used across invoices, income, and the dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="set-currency">Currency</Label>
            <Select
              id="set-currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} — {c.label} ({c.symbol})
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="set-tax">Tax rate (%)</Label>
            <Input
              id="set-tax"
              type="number"
              min="0"
              max="100"
              step="0.5"
              inputMode="decimal"
              value={taxRate}
              onChange={(e) => setTaxRate(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Used by the Tax Estimator to calculate set-asides.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" loading={loading}>
          <Save className="h-4 w-4" />
          Save settings
        </Button>
      </div>
    </form>
  );
}
