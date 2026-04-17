import {
  LayoutDashboard,
  Users,
  HeartHandshake,
  Wallet,
  Package,
  Truck,
  Receipt,
  Banknote,
  CircleDollarSign,
  BoxSelect,
  FileText,
  Shield,
  UserCircle,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles?: ("admin" | "manager" | "staff")[];
};

export const nav: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/clients", label: "Clients & Deceased", icon: Users },
  { href: "/services", label: "Services", icon: HeartHandshake },
  { href: "/payments", label: "Payments", icon: Wallet },
  { href: "/inventory", label: "Inventory", icon: Package },
  { href: "/suppliers", label: "Suppliers", icon: Truck },
  { href: "/expenses", label: "Expenses", icon: Receipt },
  { href: "/payroll", label: "Payroll", icon: Banknote, roles: ["admin", "manager"] },
  { href: "/liabilities", label: "Liabilities", icon: CircleDollarSign, roles: ["admin", "manager"] },
  { href: "/packages", label: "Service Packages", icon: BoxSelect },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/admin", label: "Admin Panel", icon: Shield, roles: ["admin"] },
  { href: "/profile", label: "My Profile", icon: UserCircle },
];
