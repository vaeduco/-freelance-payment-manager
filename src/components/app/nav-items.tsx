import {
  LayoutDashboard,
  FileText,
  TrendingUp,
  Users,
  Calculator,
  BarChart3,
  Wallet,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  Icon: LucideIcon;
  /** Shorter label for the cramped mobile bottom nav (falls back to label). */
  shortLabel?: string;
  /** Nested links shown indented under this item in the sidebar. */
  children?: NavItem[];
}

export const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/invoices", label: "Invoices", Icon: FileText },
  { href: "/income", label: "Income", Icon: TrendingUp },
  { href: "/clients", label: "Clients", Icon: Users },
  { href: "/reports", label: "Reports", Icon: BarChart3 },
  {
    href: "/tax",
    label: "Tax",
    Icon: Calculator,
    children: [
      {
        href: "/payment-methods",
        label: "Payment Methods",
        shortLabel: "Methods",
        Icon: Wallet,
      },
      { href: "/settings", label: "Settings", Icon: Settings },
    ],
  },
];

/** Flattened list (parents followed by their children) for the mobile bar. */
export const NAV_FLAT: NavItem[] = NAV.flatMap((item) => [
  item,
  ...(item.children ?? []),
]);
