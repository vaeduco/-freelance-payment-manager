"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, KeyRound, Loader2 } from "lucide-react";
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
import { useToast } from "@/components/ui/toast";
import { updatePassword } from "@/lib/actions/auth";
import { markPasswordChecked } from "@/lib/actions/security";
import { checkPasswordPwned } from "@/lib/security/pwned";
import { PasswordStrengthMeter, scorePassword } from "./password-strength-meter";

// number = definitive breach count (0 = clean); "error" = check unavailable;
// null = not yet checked / in progress.
type Breach = number | "error" | null;

export function ChangePasswordCard() {
  const router = useRouter();
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [breach, setBreach] = useState<Breach>(null);
  const [checking, setChecking] = useState(false);
  const seq = useRef(0);

  // Debounced breach check as the user types (only for plausible passwords).
  useEffect(() => {
    setBreach(null);
    if (password.length < 8) {
      setChecking(false);
      return;
    }
    const id = ++seq.current;
    setChecking(true);
    const t = setTimeout(async () => {
      const count = await checkPasswordPwned(password);
      if (id === seq.current) {
        setBreach(count === null ? "error" : count);
        setChecking(false);
      }
    }, 500);
    return () => clearTimeout(t);
  }, [password]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) return toast("Use at least 8 characters", "error");
    if (password !== confirm) return toast("Passwords don't match", "error");
    if (scorePassword(password).score < 2) {
      return toast("Please choose a stronger password", "error");
    }
    if (typeof breach === "number" && breach > 0) {
      return toast("This password appears in known breaches — pick another", "error");
    }

    setLoading(true);
    const res = await updatePassword(password);
    if ("error" in res) {
      setLoading(false);
      return toast(res.error, "error");
    }
    // Only record a *clean* breach check (definitive 0). If the check couldn't
    // run, update the password but don't claim it was breach-verified.
    if (breach === 0) await markPasswordChecked();
    setLoading(false);
    setPassword("");
    setConfirm("");
    setBreach(null);
    toast(
      breach === "error"
        ? "Password updated (breach check was unavailable)"
        : "Password updated",
    );
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Password</CardTitle>
        <CardDescription>
          Choose a strong password. We check it against known breaches without it
          ever leaving your device.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="new-pw">New password</Label>
            <div className="relative">
              <Input
                id="new-pw"
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                autoComplete="new-password"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPw((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground hover:text-foreground"
                aria-label={showPw ? "Hide password" : "Show password"}
              >
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <PasswordStrengthMeter
              password={password}
              breachCount={
                checking || typeof breach !== "number" ? null : breach
              }
            />
            {breach === "error" && !checking && (
              <p className="text-xs text-muted-foreground">
                Couldn&apos;t reach the breach database — you can still update,
                but we couldn&apos;t verify this password.
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm-pw">Confirm new password</Label>
            <Input
              id="confirm-pw"
              type={showPw ? "text" : "password"}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Re-enter your new password"
              autoComplete="new-password"
            />
          </div>
          <Button type="submit" loading={loading} disabled={checking}>
            {!loading && <KeyRound className="h-4 w-4" />}
            Update password
          </Button>
          {checking && (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Checking against known breaches…
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
