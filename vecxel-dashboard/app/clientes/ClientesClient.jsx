"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, ChevronLeft, ChevronRight, Users, Plus, X, Loader2, CheckCircle, AlertCircle, Upload, Trash2 } from "lucide-react";

const ESQUEMAS_PAGO = ["CONTADO", "C00", "C15", "C30", "C45", "C60", "C90"];

const campoVacio = {
  rif: "", nombre: "", direccion: "", telefonos: "",
  email: "", codigo_vendedor: "", codigo_zona: "10", esquema_pago: "CONTADO",
};

export default function ClientesClient({ data, currentPage, nombre, limit }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState(nombre);
  const [modalOpen, setModalOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [form, setForm] = useState(campoVacio);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef(null);

  const totalPages = Math.ceil(data.total / limit);

  const applySearch = (value) => {
    startTransition(() => {
      const params = new URLSearchParams();
      if (value) params.set("nombre", value);
      params.set("page", "1");
      router.push(`/clientes?${params.toString()}`);
    });
  };

  const goToPage = (p) => {
    startTransition(() => {
      const params = new URLSearchParams();
      if (nombre) params.set("nombre", nombre);
      params.set("page", String(p));
      router.push(`/clientes?${params.toString()}`);
    });
  };

  const handleFile = async (file) => {
    if (!file || !file.name.endsWith(".txt")) {
      setUploadResult({ success: false, error: "Solo se aceptan archivos .txt" });
      return;
    }
    setUploading(true);
    setUploadResult(null);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/sync/clientes", { method: "POST", body: formData });
      const data = await res.json();
      setUploadResult(data);
      if (data.success) startTransition(() => router.refresh());
    } catch {
      setUploadResult({ success: false, error: "Error al conectar con el servidor." });
    } finally {
      setUploading(false);
    }
  };

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.rif.trim() || !form.nombre.trim()) {
      showToast("error", "RIF y Nombre son obligatorios.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/clientes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = await res.json();
      if (result.success) {
        showToast("success", `Cliente ${result.rif} registrado. Archivo: ${result.archivo_generado ?? "generado"}`);
        setModalOpen(false);
        setForm(campoVacio);
        startTransition(() => router.refresh());
      } else {
        showToast("error", result.detail || result.error || "Error al registrar cliente.");
      }
    } catch {
      showToast("error", "Error de conexión con la API.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = async () => {
    setResetting(true);
    try {
      const resSAC = await fetch("/api/sync/clientes/reset", { method: "DELETE" });
      const resVecxel = await fetch("/api/clientes", { method: "DELETE" });
      if (resSAC.ok && resVecxel.ok) {
        showToast("success", "Todos los clientes han sido eliminados.");
        setResetModalOpen(false);
        startTransition(() => router.refresh());
      } else {
        showToast("error", "Error al eliminar clientes.");
      }
    } catch {
      showToast("error", "Error de conexión con la API.");
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="p-8">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-sm font-medium transition-all ${
          toast.type === "success" ? "bg-emerald-50 border border-emerald-200 text-emerald-800" : "bg-red-50 border border-red-200 text-red-800"
        }`}>
          {toast.type === "success" ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          <span className="max-w-xs">{toast.message}</span>
        </div>
      )}

      {/* Upload widget */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm mb-6">
        <h2 className="text-base font-semibold text-slate-900 mb-0.5">Subir archivo de clientes</h2>
        <p className="text-xs text-slate-500 mb-4">Formato SAC — CLIENTES.txt separado por punto y coma</p>
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }}
          onClick={() => fileRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            dragging ? "border-blue-400 bg-blue-50" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
          }`}
        >
          <input ref={fileRef} type="file" accept=".txt" className="hidden"
            onChange={(e) => handleFile(e.target.files[0])} />
          <Upload size={22} className={`mx-auto mb-2 ${dragging ? "text-blue-500" : "text-slate-400"}`} />
          {uploading ? (
            <p className="text-sm font-medium text-blue-600">Procesando archivo...</p>
          ) : (
            <>
              <p className="text-sm font-medium text-slate-700">Arrastra CLIENTES.txt aquí</p>
              <p className="text-xs text-slate-400 mt-1">o haz clic para seleccionarlo · solo .txt</p>
            </>
          )}
        </div>

        {uploadResult && (
          <div className={`mt-4 rounded-lg p-4 border ${
            uploadResult.success ? "bg-emerald-50 border-emerald-100" : "bg-red-50 border-red-100"
          }`}>
            <div className="flex items-center gap-2 mb-2">
              {uploadResult.success
                ? <CheckCircle size={15} className="text-emerald-600" />
                : <AlertCircle size={15} className="text-red-600" />}
              <span className={`text-sm font-semibold ${uploadResult.success ? "text-emerald-700" : "text-red-700"}`}>
                {uploadResult.success ? "Clientes sincronizados" : "Error en la carga"}
              </span>
            </div>
            {uploadResult.success ? (
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white rounded-md p-3 text-center border border-slate-100">
                  <p className="text-xs text-slate-500 uppercase tracking-wider">Total</p>
                  <p className="text-xl font-bold text-slate-900 mt-1">{uploadResult.total_registros}</p>
                </div>
                <div className="bg-white rounded-md p-3 text-center border border-slate-100">
                  <p className="text-xs text-slate-500 uppercase tracking-wider">Procesados</p>
                  <p className="text-xl font-bold text-emerald-600 mt-1">{uploadResult.registros_procesados}</p>
                </div>
                <div className="bg-white rounded-md p-3 text-center border border-slate-100">
                  <p className="text-xs text-slate-500 uppercase tracking-wider">Errores</p>
                  <p className="text-xl font-bold text-red-600 mt-1">{uploadResult.registros_error}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-red-700">{uploadResult.error || uploadResult.mensaje}</p>
            )}
          </div>
        )}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Clientes</h1>
          <p className="text-sm text-slate-500 mt-0.5">{data.total.toLocaleString()} clientes registrados</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setResetModalOpen(true)}
            className="flex items-center gap-2 h-9 px-4 border border-red-200 hover:bg-red-50 text-red-600 text-sm font-medium rounded-md transition-colors"
          >
            <Trash2 size={15} />
            Eliminar todos
          </button>
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors"
          >
            <Plus size={15} />
            Nuevo cliente
          </button>
        </div>
      </div>

      {/* Búsqueda */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nombre..."
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
        {nombre && (
          <button onClick={() => { setSearch(""); applySearch(""); }}
            className="h-9 px-4 border border-slate-200 hover:bg-slate-50 text-slate-600 text-sm font-medium rounded-md transition-colors">
            Limpiar
          </button>
        )}
      </div>

      {/* Tabla */}
      <div className={`bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm transition-opacity ${isPending ? "opacity-50" : ""}`}>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">RIF</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Nombre / Razón Social</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Teléfonos</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Zona</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Pago</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Origen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {data.clientes.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-16 text-slate-400">
                  <Users size={28} className="mx-auto mb-2 text-slate-300" />
                  <p className="text-sm">No se encontraron clientes</p>
                </td>
              </tr>
            ) : (
              data.clientes.map((c, i) => (
                <tr key={c.rif ?? i} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-2.5 font-mono text-xs text-blue-600 font-medium whitespace-nowrap">{c.rif}</td>
                  <td className="px-4 py-2.5 text-slate-700 max-w-xs truncate">{c.nombre}</td>
                  <td className="px-4 py-2.5 text-slate-500 text-xs">{c.telefonos || "—"}</td>
                  <td className="px-4 py-2.5 text-slate-500 text-xs">{c.codigo_zona || "—"}</td>
                  <td className="px-4 py-2.5">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 uppercase tracking-wide">
                      {c.esquema_pago || "CONTADO"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${
                      c.origen === "vecxel"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-emerald-100 text-emerald-700"
                    }`}>
                      {c.origen === "vecxel" ? "Vecxel" : "SAC"}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-xs text-slate-500">
            Página {currentPage} de {totalPages} — {data.total.toLocaleString()} clientes
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

      {/* Modal nuevo cliente */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-base font-semibold text-slate-900">Nuevo cliente</h2>
              <button onClick={() => { setModalOpen(false); setForm(campoVacio); }}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">RIF / Cédula *</label>
                  <input
                    type="text" required placeholder="J307078618"
                    value={form.rif} onChange={(e) => setForm({ ...form, rif: e.target.value.toUpperCase() })}
                    className="w-full h-9 border border-slate-200 rounded-md px-3 text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Esquema de pago</label>
                  <select value={form.esquema_pago} onChange={(e) => setForm({ ...form, esquema_pago: e.target.value })}
                    className="w-full h-9 border border-slate-200 rounded-md px-3 text-sm text-slate-900 focus:outline-none focus:border-blue-500 bg-white">
                    {ESQUEMAS_PAGO.map(e => <option key={e} value={e}>{e}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Nombre / Razón Social *</label>
                <input
                  type="text" required placeholder="TUBOCENTER, C.A"
                  value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value.toUpperCase() })}
                  className="w-full h-9 border border-slate-200 rounded-md px-3 text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Dirección fiscal</label>
                <textarea
                  rows={2} placeholder="Av. Principal, Edificio..."
                  value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })}
                  className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-900 resize-none focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Teléfonos</label>
                  <input
                    type="text" placeholder="0212-5551234"
                    value={form.telefonos} onChange={(e) => setForm({ ...form, telefonos: e.target.value })}
                    className="w-full h-9 border border-slate-200 rounded-md px-3 text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Email</label>
                  <input
                    type="email" placeholder="contacto@empresa.com"
                    value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full h-9 border border-slate-200 rounded-md px-3 text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Código vendedor</label>
                  <input
                    type="text" placeholder="VEN6"
                    value={form.codigo_vendedor} onChange={(e) => setForm({ ...form, codigo_vendedor: e.target.value.toUpperCase() })}
                    className="w-full h-9 border border-slate-200 rounded-md px-3 text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Código zona</label>
                  <input
                    type="text" placeholder="10"
                    value={form.codigo_zona} onChange={(e) => setForm({ ...form, codigo_zona: e.target.value })}
                    className="w-full h-9 border border-slate-200 rounded-md px-3 text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => { setModalOpen(false); setForm(campoVacio); }}
                  className="h-9 px-4 border border-slate-200 hover:bg-slate-50 text-slate-600 text-sm font-medium rounded-md transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={submitting}
                  className="h-9 px-5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium rounded-md transition-colors flex items-center gap-2">
                  {submitting && <Loader2 size={14} className="animate-spin" />}
                  {submitting ? "Registrando..." : "Registrar cliente"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de confirmación de eliminación */}
      {resetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="px-6 py-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <Trash2 size={20} className="text-red-600" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-slate-900">Eliminar todos los clientes</h2>
                  <p className="text-sm text-slate-500 mt-0.5">Esta acción no se puede deshacer</p>
                </div>
              </div>
              <p className="text-sm text-slate-600 mb-5">
                ¿Estás seguro de que deseas eliminar todos los clientes de SAC Connector y Vecxel API?
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setResetModalOpen(false)}
                  disabled={resetting}
                  className="h-9 px-4 border border-slate-200 hover:bg-slate-50 text-slate-600 text-sm font-medium rounded-md transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleReset}
                  disabled={resetting}
                  className="h-9 px-4 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-sm font-medium rounded-md transition-colors flex items-center gap-2"
                >
                  {resetting && <Loader2 size={14} className="animate-spin" />}
                  {resetting ? "Borrando..." : "Sí, borrar todo"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
