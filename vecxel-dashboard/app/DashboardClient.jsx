"use client";

import { useState, useRef } from "react";
import { Upload, Package, CheckCircle, AlertCircle, Clock, Trash2 } from "lucide-react";

export default function DashboardClient({ stats }) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [resetting, setResetting] = useState(false);
  const fileRef = useRef(null);

  const handleReset = async () => {
    setResetting(true);
    try {
      // Borrar SAC Connector DB
      const resSAC = await fetch("/api/sync/inventario/reset", { method: "DELETE" });
      const dataSAC = await resSAC.json();
      
      // Borrar Vecxel API DB
      const resVecxel = await fetch("/api/inventario/reset", { method: "DELETE" });
      const dataVecxel = await resVecxel.json();
      
      const totalEliminados = (dataSAC.eliminados || 0) + (dataVecxel.eliminados || 0);
      setResult({ 
        success: true, 
        mensaje: `Bases de datos limpiadas. ${totalEliminados} productos eliminados en total.` 
      });
      
      // Esperar 500ms antes de recargar para que se vea el mensaje
      setTimeout(() => window.location.reload(), 500);
    } catch {
      setResult({ error: true, mensaje: "Error al limpiar las bases de datos." });
      setResetting(false);
      setShowConfirm(false);
    }
  };

  const handleFile = async (file) => {
    if (!file || !file.name.endsWith(".txt")) {
      setResult({ success: false, error: "Solo se aceptan archivos .txt" });
      return;
    }
    setUploading(true);
    setResult(null);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/sync/inventario", { method: "POST", body: formData });
      const data = await res.json();
      setResult(data);
    } catch {
      setResult({ success: false, error: "Error al conectar con el servidor." });
    } finally {
      setUploading(false);
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const formatDate = (iso) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleString("es-VE", { dateStyle: "medium", timeStyle: "short" });
  };

  const estadoBadge = {
    exitoso: "bg-emerald-50 text-emerald-700 border border-emerald-100",
    parcial:  "bg-amber-50 text-amber-700 border border-amber-100",
    fallido:  "bg-red-50 text-red-700 border border-red-100",
  };

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">Sincronización con SAC — Sistema Administrativo</p>
        </div>
        <button
          onClick={() => setShowConfirm(true)}
          className="flex items-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50 border border-slate-200 rounded-md text-sm font-medium transition-colors"
        >
          <Trash2 size={14} />
          Borrar todo
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Productos en BD</p>
            <div className="w-8 h-8 bg-white shadow-sm rounded-md flex items-center justify-center">
              <Package size={16} className="text-blue-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-blue-600">{stats.total.toLocaleString()}</p>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Última Sync</p>
            <div className="w-8 h-8 bg-white shadow-sm rounded-md flex items-center justify-center">
              <Clock size={16} className="text-slate-500" />
            </div>
          </div>
          <p suppressHydrationWarning className="text-sm font-semibold text-slate-700">{formatDate(stats.ultimaSync)}</p>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Último Estado</p>
            <div className="w-8 h-8 bg-white shadow-sm rounded-md flex items-center justify-center">
              <CheckCircle size={16} className="text-slate-500" />
            </div>
          </div>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            estadoBadge[stats.ultimoEstado] ?? "bg-slate-100 text-slate-600"
          }`}>
            {stats.ultimoEstado ?? "Sin datos"}
          </span>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900 mb-0.5">Subir archivo de inventario</h2>
        <p className="text-xs text-slate-500 mb-5">Formato SAC — separado por punto y coma (.txt, máx. 10 MB)</p>

        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => fileRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors ${
            dragging
              ? "border-blue-400 bg-blue-50"
              : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
          }`}
        >
          <input ref={fileRef} type="file" accept=".txt" className="hidden"
            onChange={(e) => handleFile(e.target.files[0])} />
          <Upload size={24} className={`mx-auto mb-3 ${dragging ? "text-blue-500" : "text-slate-400"}`} />
          {uploading ? (
            <p className="text-sm font-medium text-blue-600">Procesando archivo...</p>
          ) : (
            <>
              <p className="text-sm font-medium text-slate-700">Arrastra el archivo aquí</p>
              <p className="text-xs text-slate-400 mt-1">o haz clic para seleccionarlo · solo .txt</p>
            </>
          )}
        </div>

        {result && (
          <div className={`mt-4 rounded-lg p-4 border ${
            result.success
              ? "bg-emerald-50 border-emerald-100"
              : "bg-red-50 border-red-100"
          }`}>
            <div className="flex items-center gap-2 mb-3">
              {result.success
                ? <CheckCircle size={16} className="text-emerald-600" />
                : <AlertCircle size={16} className="text-red-600" />}
              <span className={`text-sm font-semibold ${result.success ? "text-emerald-700" : "text-red-700"}`}>
                {result.success ? "Sincronización exitosa" : "Error en la carga"}
              </span>
            </div>
            {result.success ? (
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white rounded-md p-3 text-center border border-slate-100">
                  <p className="text-xs text-slate-500 uppercase tracking-wider">Total</p>
                  <p className="text-xl font-bold text-slate-900 mt-1">{result.total_registros}</p>
                </div>
                <div className="bg-white rounded-md p-3 text-center border border-slate-100">
                  <p className="text-xs text-slate-500 uppercase tracking-wider">Procesados</p>
                  <p className="text-xl font-bold text-emerald-600 mt-1">{result.registros_procesados}</p>
                </div>
                <div className="bg-white rounded-md p-3 text-center border border-slate-100">
                  <p className="text-xs text-slate-500 uppercase tracking-wider">Errores</p>
                  <p className="text-xl font-bold text-red-600 mt-1">{result.registros_error}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-red-700">{result.error || result.mensaje}</p>
            )}
          </div>
        )}
      </div>

      {showConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50">
          <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-6 max-w-sm w-full mx-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-md bg-red-50 border border-red-100 flex items-center justify-center">
                <Trash2 size={18} className="text-red-600" />
              </div>
              <h3 className="text-base font-semibold text-slate-900">¿Borrar toda la base de datos?</h3>
            </div>
            <p className="text-sm text-slate-500 mb-5">
              Se eliminarán <strong className="text-slate-900">{stats.total.toLocaleString()} productos</strong> y todos los logs. Solo para pruebas. No se puede deshacer.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowConfirm(false)}
                className="flex-1 px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm rounded-md font-medium transition-colors">
                Cancelar
              </button>
              <button onClick={handleReset} disabled={resetting}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm rounded-md font-medium transition-colors">
                {resetting ? "Borrando..." : "Sí, borrar todo"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
