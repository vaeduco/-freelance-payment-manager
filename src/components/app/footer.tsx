import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-10 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-t border-border pt-6 text-xs text-muted-foreground">
      <Link href="/terms" className="hover:text-foreground">
        Terms
      </Link>
      <span aria-hidden="true">·</span>
      <Link href="/privacy" className="hover:text-foreground">
        Privacy
      </Link>
      <span aria-hidden="true">·</span>
      <span>
        © {new Date().getFullYear()} FreelanceFlow
      </span>
    </footer>
  );
}
