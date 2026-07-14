"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";
import { Wordmark } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { LogoUploader } from "@/components/settings/logo-uploader";
import { useToast } from "@/components/ui/toast";
import { completeOnboarding } from "@/lib/actions/profile";
import { CURRENCIES } from "@/lib/constants";

export function OnboardingClient({
  initialBusinessName,
  initialCurrency,
  initialTermsDays,
  logoUrl,
}: {
  initialBusinessName: string;
  initialCurrency: string;
  initialTermsDays: number;
  logoUrl: string | null;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [businessName, setBusinessName] = useState(initialBusinessName);
  const [currency, setCurrency] = useState(initialCurrency);
  const [termsDays, setTermsDays] = useState(String(initialTermsDays));
  const [loading, setLoading] = useState<"finish" | "skip" | null>(null);

  async function finish() {
    const days = parseInt(termsDays, 10);
    setLoading("finish");
    const res = await completeOnboarding({
      business_name: businessName.trim() || null,
      currency,
      payment_terms_days: isNaN(days) ? 14 : Math.max(0, days),
    });
    if ("error" in res) {
      setLoading(null);
      return toast(res.error, "error");
    }
    router.push("/dashboard");
    router.refresh();
  }

  async function skip() {
    setLoading("skip");
    const res = await completeOnboarding({});
    if ("error" in res) {
      setLoading(null);
      return toast(res.error, "error");
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background p-6">
      <div className="w-full max-w-lg space-y-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <Wordmark size={32} />
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight">
              Welcome — let&apos;s set up your business
            </h1>
            <p className="text-sm text-muted-foreground">
              These defaults appear on your invoices. You can change everything
              later in Settings.
            </p>
          </div>
        </div>

        <div className="space-y-5 rounded-xl border border-border bg-card p-6">
          <div className="space-y-1.5">
            <Label htmlFor="ob-business">Business name</Label>
            <Input
              id="ob-business"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Your business or studio name"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Logo (optional)</Label>
            <LogoUploader initialLogoUrl={logoUrl} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="ob-currency">Default currency</Label>
              <Select
                id="ob-currency"
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
              <Label htmlFor="ob-terms">Payment terms (days)</Label>
              <Input
                id="ob-terms"
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
          </div>
        </div>

        <div className="flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            onClick={skip}
            loading={loading === "skip"}
            disabled={loading !== null}
          >
            Skip for now
          </Button>
          <Button
            type="button"
            onClick={finish}
            loading={loading === "finish"}
            disabled={loading !== null}
          >
            {loading !== "finish" && <ArrowRight className="h-4 w-4" />}
            Finish setup
          </Button>
        </div>
      </div>
    </div>
  );
}
