"use client";

import { useState } from "react";
import { ShieldCheck, Smartphone } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";

export interface TotpFactor {
  id: string;
  status: string; // "verified" | "unverified"
  friendly_name?: string | null;
}

export function TwoFactorCard({
  factors,
  onChanged,
}: {
  factors: TotpFactor[];
  onChanged: () => Promise<void> | void;
}) {
  const { toast } = useToast();
  const supabase = createClient();

  const verified = factors.find((f) => f.status === "verified") ?? null;
  const enabled = !!verified;

  const [enrollOpen, setEnrollOpen] = useState(false);
  const [disableOpen, setDisableOpen] = useState(false);
  const [starting, setStarting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");

  async function startEnroll() {
    setStarting(true);
    try {
      // Clean up any stale unverified factors so re-enrolling stays clean.
      for (const f of factors) {
        if (f.status !== "verified") {
          await supabase.auth.mfa.unenroll({ factorId: f.id });
        }
      }
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: `Authenticator ${Date.now()}`,
      });
      if (error) {
        toast(error.message, "error");
        return;
      }
      setFactorId(data.id);
      setQr(data.totp.qr_code);
      setSecret(data.totp.secret);
      setCode("");
      setEnrollOpen(true);
    } finally {
      setStarting(false);
    }
  }

  async function verify() {
    if (!factorId) return;
    if (!/^\d{6}$/.test(code.trim())) {
      toast("Enter the 6-digit code from your app", "error");
      return;
    }
    setVerifying(true);
    try {
      const { data: challenge, error: cErr } =
        await supabase.auth.mfa.challenge({ factorId });
      if (cErr) {
        toast(cErr.message, "error");
        return;
      }
      const { error: vErr } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code: code.trim(),
      });
      if (vErr) {
        toast(vErr.message, "error");
        return;
      }
      toast("Two-factor authentication enabled");
      await closeEnroll(false);
      await onChanged();
    } finally {
      setVerifying(false);
    }
  }

  // Close the enroll modal; if we bailed before verifying, remove the pending factor.
  async function closeEnroll(cleanup: boolean) {
    if (cleanup && factorId) {
      await supabase.auth.mfa.unenroll({ factorId });
    }
    setEnrollOpen(false);
    setFactorId(null);
    setQr(null);
    setSecret(null);
    setCode("");
  }

  async function disable() {
    for (const f of factors) {
      await supabase.auth.mfa.unenroll({ factorId: f.id });
    }
    toast("Two-factor authentication disabled");
    await onChanged();
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>Two-factor authentication</CardTitle>
            <CardDescription>
              Require a one-time code from an authenticator app when signing in.
            </CardDescription>
          </div>
          <Badge variant={enabled ? "success" : "secondary"} className="shrink-0">
            {enabled ? (
              <>
                <ShieldCheck className="h-3 w-3" />
                On
              </>
            ) : (
              "Off"
            )}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {enabled ? (
          <Button variant="outline" onClick={() => setDisableOpen(true)}>
            Disable 2FA
          </Button>
        ) : (
          <Button onClick={startEnroll} loading={starting}>
            {!starting && <Smartphone className="h-4 w-4" />}
            Enable 2FA
          </Button>
        )}
      </CardContent>

      <Modal
        open={enrollOpen}
        onClose={() => closeEnroll(true)}
        title="Set up two-factor authentication"
        description="Scan the QR code with an authenticator app (Google Authenticator, 1Password, Authy…), then enter the 6-digit code."
      >
        <div className="space-y-4">
          {qr && (
            <div className="flex justify-center rounded-lg border border-border bg-white p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qr} alt="2FA QR code" className="h-44 w-44" />
            </div>
          )}
          {secret && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">
                Or enter this key manually:
              </p>
              <code className="block break-all rounded-md bg-secondary px-2 py-1.5 text-xs">
                {secret}
              </code>
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="totp-code">6-digit code</Label>
            <Input
              id="totp-code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="123456"
              inputMode="numeric"
              autoComplete="one-time-code"
            />
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <Button variant="outline" onClick={() => closeEnroll(true)}>
              Cancel
            </Button>
            <Button onClick={verify} loading={verifying}>
              Verify &amp; enable
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={disableOpen}
        onClose={() => setDisableOpen(false)}
        onConfirm={disable}
        destructive
        title="Disable two-factor authentication?"
        description="Your account will no longer require a second factor at sign-in. You can re-enable it any time."
        confirmLabel="Disable 2FA"
      />
    </Card>
  );
}
