import "./globals.css";
import NavSidebar from "./NavSidebar";

export const metadata = {
  title: "Vecxel Intranet — SAC Connector",
  description: "Panel de sincronización con SAC",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" className="h-full">
      <body className="h-full bg-slate-50 text-slate-900 flex font-sans">
        <NavSidebar />
        <main className="flex-1 overflow-auto">{children}</main>
      </body>
    </html>
  );
}
