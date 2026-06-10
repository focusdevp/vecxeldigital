"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, ChevronLeft, ChevronRight, Package, Eye, Filter } from "lucide-react";

export default function InventarioClient({ data, currentPage, sku, almacen: almacenParam, stock_op, stock_value, limit }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState(sku || "");
  const [almacen, setAlmacen] = useState(almacenParam || "");
  const [stockOp, setStockOp] = useState(stock_op || "lt");
  const [stockValue, setStockValue] = useState(stock_value || "");
  const totalPages = Math.ceil(data.total / limit);

  const applySearch = (value) => {
    startTransition(() => {
      const params = new URLSearchParams();
      if (value) params.set("sku", value);
      params.set("page", "1");
      router.push(`/inventario?${params.toString()}`);
    });
  };

  const applyFilters = () => {
    startTransition(() => {
      const params = new URLSearchParams();
      if (almacen) params.set("almacen", almacen);
      if (stockOp) params.set("stock_op", stockOp);
      if (stockValue) params.set("stock_value", stockValue);
      params.set("page", "1");
      router.push(`/inventario?${params.toString()}`);
    });
  };

  const clearFilters = () => {
    setAlmacen("");
    setStockOp("lt");
    setStockValue("");
    startTransition(() => {
      router.push("/inventario?page=1");
    });
  };

  const goToPage = (p) => {
    startTransition(() => {
      const params = new URLSearchParams();
      // Preservar búsqueda por SKU
      if (sku) params.set("sku", sku);
      // Preservar filtros de stock
      if (almacenParam) params.set("almacen", almacenParam);
      if (stock_op) params.set("stock_op", stock_op);
      if (stock_value) params.set("stock_value", stock_value);
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

      {/* Búsqueda por SKU */}
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

      {/* Separador */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 border-t border-slate-200"></div>
        <span className="text-xs text-slate-400 font-medium">O</span>
        <div className="flex-1 border-t border-slate-200"></div>
      </div>

      {/* Filtros por Stock */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter size={14} className="text-slate-500" />
          <h3 className="text-sm font-medium text-slate-700">Filtrar por Stock</h3>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <label className="block text-xs text-slate-600 mb-1.5">Almacén</label>
            <select
              value={almacen}
              onChange={(e) => setAlmacen(e.target.value)}
              className="w-full h-9 bg-white border border-slate-200 rounded-md px-3 text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Todos los almacenes</option>
              <option value="00">Principal (00)</option>
              <option value="30">Barquisimeto (30)</option>
              <option value="40">Valencia (40)</option>
              <option value="60">Oriente (60)</option>
            </select>
          </div>
          <div className="w-32">
            <label className="block text-xs text-slate-600 mb-1.5">Operador</label>
            <select
              value={stockOp}
              onChange={(e) => setStockOp(e.target.value)}
              className="w-full h-9 bg-white border border-slate-200 rounded-md px-3 text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              <option value="lt">Menor que (&lt;)</option>
              <option value="lte">Menor o igual (≤)</option>
              <option value="eq">Igual (=)</option>
              <option value="gte">Mayor o igual (≥)</option>
              <option value="gt">Mayor que (&gt;)</option>
            </select>
          </div>
          <div className="w-32">
            <label className="block text-xs text-slate-600 mb-1.5">Cantidad</label>
            <input
              type="number"
              value={stockValue}
              onChange={(e) => setStockValue(e.target.value)}
              placeholder="0"
              min="0"
              className="w-full h-9 bg-white border border-slate-200 rounded-md px-3 text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-2" style={{marginTop: "20px"}}>
            <button
              onClick={applyFilters}
              disabled={!almacen || !stockValue}
              className="h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Aplicar Filtros
            </button>
            <button
              onClick={clearFilters}
              className="h-9 px-4 border border-slate-200 hover:bg-slate-50 text-slate-600 text-sm font-medium rounded-md transition-colors"
            >
              Limpiar
            </button>
          </div>
        </div>
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
          <div className="flex items-center gap-1">
            {/* Botón anterior */}
            <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage <= 1}
              className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-slate-100 text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              <ChevronLeft size={16} />
            </button>

            {/* Páginas */}
            {(() => {
              const pages = [];
              const delta = 3; // Páginas cercanas a mostrar (±3)
              const left = currentPage - delta;
              const right = currentPage + delta;
              
              for (let i = 1; i <= totalPages; i++) {
                // Siempre mostrar: primera, última, páginas cercanas a la actual
                if (i === 1 || i === totalPages || (i >= left && i <= right)) {
                  // Agregar separador si hay salto
                  if (pages.length > 0) {
                    const lastPage = pages[pages.length - 1];
                    if (lastPage.key && parseInt(lastPage.key) !== i - 1) {
                      pages.push(
                        <span key={`dots-${i}`} className="w-8 h-8 flex items-center justify-center text-slate-400 text-sm">
                          ...
                        </span>
                      );
                    }
                  }
                  
                  // Agregar botón de página
                  pages.push(
                    <button key={i} onClick={() => goToPage(i)}
                      className={`w-8 h-8 flex items-center justify-center rounded-md text-sm transition-colors ${
                        i === currentPage
                          ? "bg-blue-600 text-white font-medium"
                          : "hover:bg-slate-100 text-slate-600"
                      }`}>
                      {i}
                    </button>
                  );
                }
              }

              return pages;
            })()}

            {/* Botón siguiente */}
            <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage >= totalPages}
              className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-slate-100 text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
