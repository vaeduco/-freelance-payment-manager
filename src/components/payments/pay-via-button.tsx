import { ExternalLink } from "lucide-react";
import type { InvoiceWithClient } from "@/lib/types";
import { cn, effectiveStatus } from "@/lib/utils";

/**
 * Normalize a stored payment link into a safe href, or null if it isn't a URL.
 * - `http(s)://…`            → used as-is
 * - domain-like (`paypal.me/you`, `wise.com/pay/x`) → prefixed with `https://`
 * - anything carrying another scheme (`javascript:`, `mailto:`, …) → rejected
 * - a bare number/handle (e.g. a GCash number) → not a URL (returns null)
 *
 * The emitted href is therefore always an `http(s)` URL, never a script/data
 * scheme, so it's safe to drop straight into an anchor's href.
 */
export function payLinkHref(link: string | null | undefined): string | null {
  const s = (link ?? "").trim();
  if (!s || /\s/.test(s)) return null;
  // Already an absolute http(s) URL.
  if (/^https?:\/\//i.test(s)) return s;
  // Any other explicit scheme (javascript:, data:, mailto:, tel:, …) is not a
  // pay link we'll linkify — reject it rather than risk an unsafe href.
  if (/^[a-z][a-z0-9+.-]*:/i.test(s)) return null;
  // Domain-like (has a dot, e.g. paypal.me/you) → assume https.
  if (/^[^.\s]+\.[^\s]+$/.test(s)) return `https://${s}`;
  // Bare number / handle — show it, but it isn't clickable.
  return null;
}

/**
 * "Pay via [Method]" for an invoice. When the invoice is awaiting payment
 * (sent / overdue) and its method has a link, renders a clickable brand-blue
 * button (URL) or a chip showing the number (non-URL). Otherwise falls back to
 * the plain muted text, preserving prior behavior for draft/paid or link-less
 * methods.
 */
export function PayViaButton({
  invoice,
  className,
}: {
  invoice: Pick<InvoiceWithClient, "status" | "due_date" | "payment_method">;
  className?: string;
}) {
  const method = invoice.payment_method;
  if (!method) return null;

  const status = effectiveStatus(invoice);
  const payable = status === "sent" || status === "overdue";
  const link = method.payment_link?.trim() || null;

  if (payable && link) {
    const href = payLinkHref(link);
    if (href) {
      return (
        <div className={cn("text-xs", className)}>
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 font-medium text-primary transition-colors hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background"
          >
            <ExternalLink className="h-3 w-3" aria-hidden="true" />
            Pay via {method.name}
          </a>
        </div>
      );
    }
    // Non-URL link (e.g. a GCash number): show it as a copy-friendly chip.
    return (
      <div className={cn("text-xs", className)}>
        <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-1 font-medium text-muted-foreground">
          Pay via {method.name} · {link}
        </span>
      </div>
    );
  }

  return (
    <span className={cn("block text-xs text-muted-foreground/80", className)}>
      Pay via {method.name}
    </span>
  );
}
