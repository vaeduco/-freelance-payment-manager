"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wordmark } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/app/user-menu";
import { NAV } from "@/components/app/nav-items";
import { cn } from "@/lib/utils";

export function Sidebar({
  user,
}: {
  user: { name: string; email: string };
}) {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-border bg-card lg:flex">
      <div className="flex h-16 items-center gap-2 border-b border-border px-5">
        <Link href="/dashboard">
          <Wordmark size={32} />
        </Link>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {NAV.map(({ href, label, Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground",
              )}
            >
              <Icon className="h-[18px] w-[18px]" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-3 border-t border-border p-3">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-medium text-muted-foreground">
            Appearance
          </span>
          <ThemeToggle />
        </div>
        <UserMenu name={user.name} email={user.email} align="up" />
      </div>
    </aside>
  );
}
