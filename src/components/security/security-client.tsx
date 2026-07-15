"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Skeleton } from "@/components/ui/misc";
import { SecurityScore } from "./security-score";
import { TwoFactorCard, type TotpFactor } from "./two-factor-card";
import { ChangePasswordCard } from "./change-password-card";
import { SignOutOthersCard } from "./sign-out-others-card";

export function SecurityClient({
  emailConfirmed,
  passwordCheckedAt,
}: {
  email: string;
  emailConfirmed: boolean;
  passwordCheckedAt: string | null;
}) {
  const [factors, setFactors] = useState<TotpFactor[]>([]);
  const [loaded, setLoaded] = useState(false);

  const loadFactors = useCallback(async () => {
    try {
      const supabase = createClient();
      // Never let a slow/stalled MFA lookup hang the whole page.
      const result = await Promise.race([
        supabase.auth.mfa.listFactors().then((r) => r.data),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 4000)),
      ]);
      setFactors(
        (result?.totp ?? []).map((f) => ({
          id: f.id,
          status: f.status,
          friendly_name: f.friendly_name,
        })),
      );
    } catch {
      setFactors([]);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    loadFactors();
  }, [loadFactors]);

  const mfaEnabled = factors.some((f) => f.status === "verified");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {loaded ? (
        <SecurityScore
          mfaEnabled={mfaEnabled}
          emailConfirmed={emailConfirmed}
          passwordCheckedAt={passwordCheckedAt}
        />
      ) : (
        <Skeleton className="h-44 w-full rounded-xl" />
      )}

      {loaded && <TwoFactorCard factors={factors} onChanged={loadFactors} />}

      <ChangePasswordCard />

      <SignOutOthersCard />
    </div>
  );
}
