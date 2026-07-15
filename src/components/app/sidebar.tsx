"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { Wordmark } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/app/user-menu";
import { NAV, type NavItem } from "@/components/app/nav-items";
import { cn } from "@/lib/utils";

// Shared row styling. The app's theme tokens render as blue text + light-blue
// background when active and muted-gray with a subtle hover otherwise — the
// look the design calls for, but theme-aware so it also holds up in dark mode.
const rowBase =
  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors";
const activeCls = "bg-primary/10 text-primary";
const inactiveCls =
  "text-muted-foreground hover:bg-secondary hover:text-foreground";

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

/** Collapsible parent: the row toggles its nested sub-links (Settings). */
function CollapsibleNav({ item }: { item: NavItem }) {
  const pathname = usePathname();
  const active = isActive(pathname, item.href);
  const [open, setOpen] = useState(active);

  // Auto-expand whenever the current route falls under this item (on load and
  // on client-side navigation into a sub-route).
  useEffect(() => {
    if (active) setOpen(true);
  }, [active]);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={cn(rowBase, "w-full text-left", active ? activeCls : inactiveCls)}
      >
        <item.Icon className="h-[18px] w-[18px] shrink-0" />
        <span className="flex-1">{item.label}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>

      {/* Smooth expand/collapse via animated grid rows (no magic max-height). */}
      <div
        className={cn(
          "grid transition-all duration-200 ease-in-out",
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="overflow-hidden">
          <div className="ml-4 mt-1 space-y-1 border-l border-border pl-3">
            {(item.children ?? []).map((sub) => {
              const subActive = pathname === sub.href;
              return (
                <Link
                  key={sub.href}
                  href={sub.href}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    subActive ? activeCls : inactiveCls,
                  )}
                >
                  <sub.Icon className="h-4 w-4 shrink-0" />
                  {sub.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Non-collapsible parent (or leaf): a link, with any children always visible. */
function StaticNav({ item }: { item: NavItem }) {
  const pathname = usePathname();
  const active = isActive(pathname, item.href);
  return (
    <div>
      <Link href={item.href} className={cn(rowBase, active ? activeCls : inactiveCls)}>
        <item.Icon className="h-[18px] w-[18px] shrink-0" />
        {item.label}
      </Link>
      {item.children && (
        <div className="mt-1 space-y-1">
          {item.children.map((sub) => {
            const subActive = isActive(pathname, sub.href);
            return (
              <Link
                key={sub.href}
                href={sub.href}
                className={cn(rowBase, subActive ? activeCls : inactiveCls)}
              >
                <sub.Icon className="h-[18px] w-[18px] shrink-0" />
                {sub.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function Sidebar({ user }: { user: { name: string; email: string } }) {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-border bg-card lg:flex">
      <div className="flex h-16 items-center gap-2 border-b border-border px-5">
        <Link href="/dashboard">
          <Wordmark size={32} />
        </Link>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {NAV.map((item) =>
          item.collapsible ? (
            <CollapsibleNav key={item.href} item={item} />
          ) : (
            <StaticNav key={item.href} item={item} />
          ),
        )}
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
