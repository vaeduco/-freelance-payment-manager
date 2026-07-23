import {
  LayoutDashboard,
  FileText,
  TrendingUp,
  Users,
  CalendarCheck,
  Calculator,
  BarChart3,
  Wallet,
  Settings,
  User,
  Bell,
  Paintbrush,
  CalendarClock,
  Shield,
  Plug,
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
  /**
   * When true, the sidebar renders this item as a collapsible dropdown: the row
   * is a toggle button (not a link) with a chevron, and its children show/hide.
   * The mobile bar shows just the parent (linking to `href`) — the children
   * aren't flattened into the bottom bar.
   */
  collapsible?: boolean;
}

export const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/invoices", label: "Invoices", Icon: FileText },
  { href: "/income", label: "Income", Icon: TrendingUp },
  { href: "/clients", label: "Clients", Icon: Users },
  { href: "/availability", label: "Availability", Icon: CalendarClock },
  { href: "/bookings", label: "Bookings", Icon: CalendarCheck },
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
    ],
  },
  {
    href: "/settings",
    label: "Settings",
    Icon: Settings,
    collapsible: true,
    children: [
      { href: "/settings/profile", label: "Profile", Icon: User },
      { href: "/settings/notifications", label: "Notifications", Icon: Bell },
      { href: "/settings/appearance", label: "Appearance", Icon: Paintbrush },
      { href: "/settings/security", label: "Security", Icon: Shield },
      { href: "/settings/integrations", label: "Integrations", Icon: Plug },
    ],
  },
];

/**
 * Flattened list for the mobile bottom bar: non-collapsible parents contribute
 * their children (so Payment Methods still appears), while a collapsible
 * dropdown contributes only itself (its sub-links would overflow the bar).
 */
export const NAV_FLAT: NavItem[] = NAV.flatMap((item) =>
  item.collapsible ? [item] : [item, ...(item.children ?? [])],
);
