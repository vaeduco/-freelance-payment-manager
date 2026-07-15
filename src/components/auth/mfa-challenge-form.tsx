"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { signOut } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function MfaChallengeForm() {
  const router = useRouter();
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const supabase = createClient();
        const result = await Promise.race([
          supabase.auth.mfa.listFactors().then((r) => r.data),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 4000)),
        ]);
        const totp =
          result?.totp?.find((f) => f.status === "verified") ??
          result?.totp?.[0];
        if (totp) setFactorId(totp.id);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!/^\d{6}$/.test(code.trim())) {
      setError("Enter the 6-digit code from your authenticator app.");
      return;
    }
    if (!factorId) {
      setError("Couldn't find your authenticator. Try signing out and back in.");
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: ch, error: cErr } = await supabase.auth.mfa.challenge({
        factorId,
      });
      if (cErr) {
        setError(cErr.message);
        return;
      }
      const { error: vErr } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: ch.id,
        code: code.trim(),
      });
      if (vErr) {
        setError(vErr.message);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleSignOut() {
    await signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="mfa-code">Authentication code</Label>
        <Input
          id="mfa-code"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder="123456"
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
        />
      </div>
      {error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}
      <Button
        type="submit"
        size="lg"
        disabled={loading || !ready}
        className="w-full !bg-[#185fa5] !text-white hover:!bg-[#154f88]"
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        Verify
      </Button>
      <button
        type="button"
        onClick={handleSignOut}
        className="w-full text-center text-sm text-muted-foreground hover:text-foreground"
      >
        Sign out instead
      </button>
    </form>
  );
}
