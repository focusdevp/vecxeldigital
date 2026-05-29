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
      <h1 className="text-2xl font-bold text-white mb-1">Inventario</h1>
      <p className="text-gray-400 text-sm mb-6">
        {data.total.toLocaleString()} productos cargados desde SAC
      </p>

      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Buscar por SKU o descripción..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applySearch(search)}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
        </div>
        <button
          onClick={() => applySearch(search)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition-colors"
        >
          Buscar
        </button>
        {sku && (
          <button
            onClick={() => { setSearch(""); applySearch(""); }}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg transition-colors"
          >
            Limpiar
          </button>
        )}
      </div>

      <div className={`rounded-xl border border-gray-800 overflow-hidden transition-opacity ${isPending ? "opacity-50" : ""}`}>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-900 border-b border-gray-800">
              <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">SKU</th>
              <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">DESCRIPCIÓN</th>
              <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">UNIDAD</th>
              <th className="text-right px-4 py-3 text-xs text-gray-400 font-medium">PRECIO USD</th>
              <th className="text-center px-4 py-3 text-xs text-gray-400 font-medium">ALM 00</th>
              <th className="text-center px-4 py-3 text-xs text-gray-400 font-medium">ALM 30</th>
              <th className="text-center px-4 py-3 text-xs text-gray-400 font-medium">ALM 40</th>
              <th className="text-center px-4 py-3 text-xs text-gray-400 font-medium">ALM 60</th>
              <th className="text-center px-4 py-3 text-xs text-gray-400 font-medium">ESTADO</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {data.productos.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-16 text-gray-500">
                  <Package size={32} className="mx-auto mb-2 opacity-30" />
                  No se encontraron productos
                </td>
              </tr>
            ) : (
              data.productos.map((p) => {
                const stock = (codigo) => p.almacenes?.find((a) => a.codigo === codigo)?.existencia ?? "—";
                return (
                  <tr key={p._id} className="hover:bg-gray-900/50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-blue-300">{p.sku}</td>
                    <td className="px-4 py-3 text-gray-200 max-w-xs truncate">{p.descripcion}</td>
                    <td className="px-4 py-3 text-gray-400">{p.unidad_medida}</td>
                    <td className="px-4 py-3 text-right font-medium text-green-400">
                      ${p.precio_usd?.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-300">{stock("00")}</td>
                    <td className="px-4 py-3 text-center text-gray-300">{stock("30")}</td>
                    <td className="px-4 py-3 text-center text-gray-300">{stock("40")}</td>
                    <td className="px-4 py-3 text-center text-gray-300">{stock("60")}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        p.activo ? "bg-green-900/60 text-green-300" : "bg-gray-800 text-gray-500"
                      }`}>
                        {p.activo ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/inventario/${encodeURIComponent(p.sku)}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white text-xs rounded-lg transition-colors"
                      >
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
          <p className="text-xs text-gray-500">
            Página {currentPage} de {totalPages} — {data.total.toLocaleString()} productos
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage <= 1}
              className="p-1.5 rounded-lg bg-gray-900 border border-gray-800 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className="p-1.5 rounded-lg bg-gray-900 border border-gray-800 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
