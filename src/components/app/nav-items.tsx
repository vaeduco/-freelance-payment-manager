import {
  LayoutDashboard,
  FileText,
  TrendingUp,
  Users,
  Calculator,
  BarChart3,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  Icon: LucideIcon;
}

export const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/invoices", label: "Invoices", Icon: FileText },
  { href: "/income", label: "Income", Icon: TrendingUp },
  { href: "/clients", label: "Clients", Icon: Users },
  { href: "/reports", label: "Reports", Icon: BarChart3 },
  { href: "/tax", label: "Tax", Icon: Calculator },
];
