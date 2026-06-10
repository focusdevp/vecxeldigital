"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, ChevronLeft, ChevronRight, Package, Eye } from "lucide-react";

export default function InventarioClient({ data, currentPage, sku, limit }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState(sku);
  const totalPages = Math.ceil(data.total / limit);

  const applySearch = (value) => {
    startTransition(() => {
      const params = new URLSearchParams();
      if (value) params.set("sku", value);
      params.set("page", "1");
      router.push(`/inventario?${params.toString()}`);
    });
  };

  const goToPage = (p) => {
    startTransition(() => {
      const params = new URLSearchParams();
      if (sku) params.set("sku", sku);
      params.set("page", String(p));
      router.push(`/inventario?${params.toString()}`);
    });
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-slate-900">Inventario</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          {data.total.toLocaleString()} productos sincronizados desde SAC
        </p>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por SKU o descripción..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applySearch(search)}
            className="w-full h-9 bg-white border border-slate-200 rounded-md pl-9 pr-4 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <button onClick={() => applySearch(search)}
          className="h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors">
          Buscar
        </button>
        {sku && (
          <button onClick={() => { setSearch(""); applySearch(""); }}
            className="h-9 px-4 border border-slate-200 hover:bg-slate-50 text-slate-600 text-sm font-medium rounded-md transition-colors">
            Limpiar
          </button>
        )}
      </div>

      <div className={`bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm transition-opacity ${isPending ? "opacity-50" : ""}`}>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">SKU</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Descripción</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Unidad</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Precio</th>
              <th className="text-center px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider" title="Almacén Principal">Principal (00)</th>
              <th className="text-center px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider" title="Almacén Barquisimeto">Barquisimeto (30)</th>
              <th className="text-center px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider" title="Almacén Valencia">Valencia (40)</th>
              <th className="text-center px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider" title="Almacén Oriente">Oriente (60)</th>
              <th className="text-center px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Estado</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {data.productos.length === 0 ? (
              <tr>
                <td colSpan={10} className="text-center py-16 text-slate-400">
                  <Package size={28} className="mx-auto mb-2 text-slate-300" />
                  <p className="text-sm">No se encontraron productos</p>
                </td>
              </tr>
            ) : (
              data.productos.map((p) => {
                const stock = (codigo) => p.almacenes?.find((a) => a.codigo === codigo)?.existencia ?? "—";
                return (
                  <tr key={p._id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-2.5 font-mono text-xs text-blue-600 font-medium">{p.sku}</td>
                    <td className="px-4 py-2.5 text-slate-700 max-w-xs truncate">{p.descripcion}</td>
                    <td className="px-4 py-2.5 text-slate-500 text-xs">{p.unidad_medida}</td>
                    <td className="px-4 py-2.5 text-right font-medium text-emerald-600">
                      ${p.precio_usd?.toFixed(2)}
                    </td>
                    <td className="px-4 py-2.5 text-center text-slate-600 text-xs">{stock("00")}</td>
                    <td className="px-4 py-2.5 text-center text-slate-600 text-xs">{stock("30")}</td>
                    <td className="px-4 py-2.5 text-center text-slate-600 text-xs">{stock("40")}</td>
                    <td className="px-4 py-2.5 text-center text-slate-600 text-xs">{stock("60")}</td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${
                        p.activo
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-100 text-slate-500"
                      }`}>
                        {p.activo ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <Link href={`/inventario/${encodeURIComponent(p.sku)}`}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-900 text-xs font-medium rounded-md transition-colors">
                        <Eye size={12} />
                        Ver
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-xs text-slate-500">
            Página {currentPage} de {totalPages} — {data.total.toLocaleString()} productos
          </p>
          <div className="flex items-center gap-2">
            <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage <= 1}
              className="p-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              <ChevronLeft size={14} />
            </button>
            <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage >= totalPages}
              className="p-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
