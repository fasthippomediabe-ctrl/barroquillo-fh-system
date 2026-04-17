"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { nav } from "@/lib/nav";
import { logoutAction } from "@/lib/auth-actions";
import { LogOut } from "lucide-react";

export default function Sidebar({
  role,
  displayName,
}: {
  role: string;
  displayName: string;
}) {
  const pathname = usePathname();
  const visible = nav.filter(
    (n) =>
      !n.roles ||
      n.roles.includes(
        role as "admin" | "manager" | "staff" | "hr" | "accounting",
      ),
  );
  return (
    <aside className="sidebar w-64 shrink-0 min-h-screen flex flex-col no-print">
      <div className="px-5 py-6 flex flex-col items-center text-center border-b border-white/10">
        <Image
          src="/logo.png"
          alt="L.E. Barroquillo FH"
          width={88}
          height={88}
          className="rounded-full bg-white p-1 mb-3"
          priority
        />
        <div className="text-white font-bold leading-tight text-sm">
          L.E. BARROQUILLO
        </div>
        <div className="text-[#c8d6f0] text-xs mt-0.5">Funeral Homes</div>
      </div>

      <nav className="flex-1 px-3 py-4 flex flex-col gap-1 overflow-y-auto">
        {visible.map((n) => {
          const Icon = n.icon;
          const active = pathname === n.href || (n.href !== "/" && pathname.startsWith(n.href));
          return (
            <Link
              key={n.href}
              href={n.href}
              className={`sidebar-link ${active ? "active" : ""}`}
            >
              <Icon size={18} />
              <span>{n.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="px-4 py-4 border-t border-white/10 flex items-center justify-between">
        <div className="min-w-0">
          <div className="text-white text-sm font-semibold truncate">{displayName}</div>
          <div className="text-[#c8d6f0] text-xs capitalize">{role}</div>
        </div>
        <form action={logoutAction}>
          <button
            type="submit"
            className="p-2 rounded-md text-[#c8d6f0] hover:text-white hover:bg-white/10"
            title="Log out"
          >
            <LogOut size={18} />
          </button>
        </form>
      </div>
    </aside>
  );
}
