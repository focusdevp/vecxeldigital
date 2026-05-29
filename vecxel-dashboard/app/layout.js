import "./globals.css";
import Link from "next/link";
import { LayoutDashboard, Package, ClipboardList } from "lucide-react";

export const metadata = {
  title: "Vecxel Digital — SAC Connector",
  description: "Panel de sincronización con SAC",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" className="h-full">
      <body className="h-full bg-gray-950 text-gray-100 flex">
        <aside className="w-56 bg-gray-900 border-r border-gray-800 flex flex-col">
          <div className="px-5 py-6 border-b border-gray-800">
            <span className="text-lg font-bold text-white tracking-tight">Vecxel Digital</span>
            <p className="text-xs text-gray-500 mt-0.5">SAC Connector</p>
          </div>
          <nav className="flex-1 px-3 py-4 space-y-1">
            <Link href="/" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors">
              <LayoutDashboard size={16} />
              Dashboard
            </Link>
            <Link href="/inventario" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors">
              <Package size={16} />
              Inventario
            </Link>
            <Link href="/logs" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors">
              <ClipboardList size={16} />
              Logs de Sync
            </Link>
          </nav>
        </aside>
        <main className="flex-1 overflow-auto">{children}</main>
      </body>
    </html>
  );
}
