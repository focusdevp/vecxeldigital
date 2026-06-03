"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Package, ClipboardList, Users } from "lucide-react";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/inventario", label: "Inventario", icon: Package },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/logs", label: "Logs de Sync", icon: ClipboardList },
];

export default function NavSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-slate-900 flex flex-col shrink-0 h-full">
      <div className="px-5 py-5 border-b border-slate-800">
        <img src="/logovecxel.jpg" alt="Vecxel Logo" className="h-10 w-auto mb-2" />
        <span className="text-base font-semibold text-white tracking-tight">Vecxel Intranet</span>
        <p className="text-xs text-slate-500 mt-0.5 uppercase tracking-wider">SAC Connector</p>
      </div>

      <nav className="flex-1 px-3 py-4">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider px-3 mb-2">Navegación</p>
        <div className="space-y-0.5">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== "/" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  active
                    ? "bg-blue-600 text-white"
                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <Icon size={16} />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="px-5 py-4 border-t border-slate-800">
        <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">v1.0.0</p>
      </div>
    </aside>
  );
}
