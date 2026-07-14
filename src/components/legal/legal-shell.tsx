import Link from "next/link";
import { Wordmark } from "@/components/brand";

/** Chrome for the static legal pages (standalone, no app sidebar). */
export function LegalShell({
  title,
  effectiveDate,
  children,
}: {
  title: string;
  effectiveDate: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <div className="mb-8 flex items-center justify-between">
          <Link href="/">
            <Wordmark size={28} />
          </Link>
          <Link
            href="/login"
            className="text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            Sign in
          </Link>
        </div>

        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          {title}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Effective {effectiveDate}
        </p>

        <div className="mt-5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
          <strong className="font-semibold">Template notice:</strong> this is a
          generic starting point, not legal advice. Replace the bracketed
          placeholders and have it reviewed by a lawyer before you rely on it.
        </div>

        <div className="mt-8 space-y-8 text-sm leading-relaxed text-muted-foreground">
          {children}
        </div>

        <footer className="mt-12 flex items-center gap-3 border-t border-border pt-6 text-sm text-muted-foreground">
          <Link href="/terms" className="hover:text-foreground">
            Terms
          </Link>
          <span aria-hidden="true">·</span>
          <Link href="/privacy" className="hover:text-foreground">
            Privacy
          </Link>
        </footer>
      </div>
    </div>
  );
}

/** A headed section within a legal page. */
export function LegalSection({
  heading,
  children,
}: {
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold text-foreground">{heading}</h2>
      {children}
    </section>
  );
}
