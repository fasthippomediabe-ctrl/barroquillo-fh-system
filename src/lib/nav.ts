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
  IdCard,
  Scale,
  BookOpen,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles?: ("admin" | "manager" | "staff" | "hr" | "accounting")[];
};

export const nav: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/clients", label: "Clients & Deceased", icon: Users },
  { href: "/services", label: "Services", icon: HeartHandshake },
  { href: "/payments", label: "Payments", icon: Wallet },
  { href: "/inventory", label: "Inventory", icon: Package },
  { href: "/suppliers", label: "Suppliers", icon: Truck },
  { href: "/expenses", label: "Expenses", icon: Receipt },
  { href: "/employees", label: "Employees", icon: IdCard, roles: ["admin", "manager", "hr"] },
  { href: "/payroll", label: "Payroll", icon: Banknote, roles: ["admin", "manager", "hr"] },
  { href: "/liabilities", label: "Liabilities", icon: CircleDollarSign, roles: ["admin", "manager"] },
  { href: "/packages", label: "Service Packages", icon: BoxSelect },
  { href: "/accounting", label: "Accounting", icon: Scale, roles: ["admin", "accounting"] },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/admin", label: "Admin Panel", icon: Shield, roles: ["admin"] },
  { href: "/profile", label: "My Profile", icon: UserCircle },
  { href: "/guide", label: "How to Use", icon: BookOpen },
];
