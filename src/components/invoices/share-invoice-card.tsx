"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Link2, Share2 } from "lucide-react";
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
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { createShareLink, revokeShareLink } from "@/lib/actions/shares";
import { formatDate } from "@/lib/utils";
import type { SharedLink } from "@/lib/types";

export function ShareInvoiceCard({
  invoiceId,
  link,
}: {
  invoiceId: string;
  link: SharedLink | null;
}) {
  const router = useRouter();
  const { toast } = useToast();

  const active = link && !link.revoked ? link : null;
  const [configuring, setConfiguring] = useState(!active);
  const [password, setPassword] = useState("");
  const [expiry, setExpiry] = useState("");
  const [maxViews, setMaxViews] = useState("");
  const [busy, setBusy] = useState(false);
  const [revokeOpen, setRevokeOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState("");

  useEffect(() => setOrigin(window.location.origin), []);
  const url = active ? `${origin}/s/${active.token}` : "";

  async function create() {
    setBusy(true);
    const res = await createShareLink(invoiceId, {
      password: password.trim() || null,
      // Treat the picked date as end-of-day UTC so the displayed date (sliced
      // from the stored UTC value) always matches what the owner selected.
      expiresAt: expiry ? new Date(`${expiry}T23:59:59Z`).toISOString() : null,
      maxViews: maxViews ? parseInt(maxViews, 10) : null,
    });
    setBusy(false);
    if ("error" in res) return toast(res.error, "error");
    setPassword("");
    setConfiguring(false);
    toast("Share link ready");
    router.refresh();
  }

  async function revoke() {
    const res = await revokeShareLink(invoiceId);
    if ("error" in res) return toast(res.error, "error");
    toast("Share link revoked");
    router.refresh();
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast("Couldn't copy the link", "error");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Share2 className="h-4 w-4" />
          Share this invoice
        </CardTitle>
        <CardDescription>
          Create a secure link your client can open without an account — with an
          optional password, expiry, and view limit.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {active && !configuring && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={url}
                onFocus={(e) => e.currentTarget.select()}
                className="min-w-0 flex-1 text-xs"
                aria-label="Share link"
              />
              <Button variant="outline" size="sm" onClick={copy} className="shrink-0">
                {copied ? (
                  <Check className="h-4 w-4 text-success" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>{active.has_password ? "🔒 Password-protected" : "No password"}</span>
              <span>
                {active.expires_at
                  ? `Expires ${formatDate(active.expires_at.slice(0, 10))}`
                  : "No expiry"}
              </span>
              <span>
                {active.max_views != null
                  ? `${active.view_count} / ${active.max_views} views`
                  : `${active.view_count} view${active.view_count === 1 ? "" : "s"}`}
              </span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setConfiguring(true)}>
                <Link2 className="h-4 w-4" />
                New settings
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => setRevokeOpen(true)}
              >
                Revoke link
              </Button>
            </div>
          </div>
        )}

        {(!active || configuring) && (
          <div className="space-y-3">
            {link?.revoked && (
              <p className="text-xs text-muted-foreground">
                The previous link was revoked. Create a new one below.
              </p>
            )}
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="share-password">Password (optional)</Label>
                <Input
                  id="share-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Leave blank for none"
                  autoComplete="off"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="share-expiry">Expires (optional)</Label>
                <Input
                  id="share-expiry"
                  type="date"
                  value={expiry}
                  onChange={(e) => setExpiry(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="share-views">Max views (optional)</Label>
                <Input
                  id="share-views"
                  type="number"
                  min="1"
                  step="1"
                  inputMode="numeric"
                  value={maxViews}
                  onChange={(e) => setMaxViews(e.target.value)}
                  placeholder="Unlimited"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={create} loading={busy}>
                {!busy && <Link2 className="h-4 w-4" />}
                {active ? "Replace link" : "Create link"}
              </Button>
              {active && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setConfiguring(false)}
                  disabled={busy}
                >
                  Cancel
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>

      <ConfirmDialog
        open={revokeOpen}
        onClose={() => setRevokeOpen(false)}
        onConfirm={revoke}
        destructive
        title="Revoke this share link?"
        description="The link will stop working immediately. Anyone you sent it to will no longer be able to open the invoice."
        confirmLabel="Revoke link"
      />
    </Card>
  );
}
