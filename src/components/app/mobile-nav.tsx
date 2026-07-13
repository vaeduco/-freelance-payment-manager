"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wordmark } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/app/user-menu";
import { NAV_FLAT } from "@/components/app/nav-items";
import { cn } from "@/lib/utils";

export function MobileTopBar({
  user,
}: {
  user: { name: string; email: string };
}) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-card/80 px-4 backdrop-blur lg:hidden">
      <Link href="/dashboard">
        <Wordmark size={28} />
      </Link>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <div className="w-44">
          <UserMenu name={user.name} email={user.email} align="down" />
        </div>
      </div>
    </header>
  );
}

export function MobileBottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/90 backdrop-blur lg:hidden">
      <div
        className="no-scrollbar flex overflow-x-auto"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {NAV_FLAT.map(({ href, label, shortLabel, Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex min-w-[4.5rem] flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <Icon className="h-5 w-5" />
              {shortLabel ?? label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
