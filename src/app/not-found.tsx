import Link from "next/link";
import { Wordmark } from "@/components/brand";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 p-6 text-center">
      <Wordmark />
      <div className="space-y-2">
        <p className="text-5xl font-bold tracking-tight">404</p>
        <p className="text-muted-foreground">
          We couldn&apos;t find the page you were looking for.
        </p>
      </div>
      <Link href="/dashboard">
        <Button>Back to dashboard</Button>
      </Link>
    </div>
  );
}
