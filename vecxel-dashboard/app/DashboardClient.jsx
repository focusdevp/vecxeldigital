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
      const res = await fetch("/api/sync/inventario/reset", { method: "DELETE" });
      const data = await res.json();
      setResult({ ...data, success: true, mensaje: data.mensaje });
      window.location.reload();
    } catch {
      setResult({ error: true, mensaje: "Error al limpiar la base de datos." });
    } finally {
      setResetting(false);
      setShowConfirm(false);
    }
  };

  const handleFile = async (file) => {
    if (!file || !file.name.endsWith(".txt")) {
      setResult({ error: true, mensaje: "Solo se aceptan archivos .txt" });
      return;
    }

    setUploading(true);
    setResult(null);

    const formData = new FormData();
    formData.append("archivo", file);

    try {
      const res = await fetch("/api/sync/inventario", { method: "POST", body: formData });
      const data = await res.json();
      setResult(data);
    } catch {
      setResult({ error: true, mensaje: "Error al conectar con el servidor." });
    } finally {
      setUploading(false);
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    handleFile(file);
  };

  const formatDate = (iso) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleString("es-VE", { dateStyle: "medium", timeStyle: "short" });
  };

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Dashboard</h1>
          <p className="text-gray-400 text-sm">Sincronización con SAC — Sistema Administrativo</p>
        </div>
        <button
          onClick={() => setShowConfirm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-red-900/40 hover:bg-red-900/70 border border-red-800 text-red-400 hover:text-red-300 text-sm rounded-lg transition-colors"
        >
          <Trash2 size={14} />
          Borrar todo
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center gap-2 text-gray-400 text-xs mb-2">
            <Package size={14} /> PRODUCTOS EN BD
          </div>
          <p className="text-3xl font-bold text-white">{stats.total.toLocaleString()}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center gap-2 text-gray-400 text-xs mb-2">
            <Clock size={14} /> ÚLTIMA SINCRONIZACIÓN
          </div>
          <p className="text-sm font-medium text-white">{formatDate(stats.ultimaSync)}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center gap-2 text-gray-400 text-xs mb-2">
            <CheckCircle size={14} /> ÚLTIMO ESTADO
          </div>
          <span className={`text-sm font-semibold px-2 py-0.5 rounded-full ${
            stats.ultimoEstado === "exitoso" ? "bg-green-900 text-green-300" :
            stats.ultimoEstado === "parcial" ? "bg-yellow-900 text-yellow-300" :
            stats.ultimoEstado === "fallido" ? "bg-red-900 text-red-300" :
            "bg-gray-800 text-gray-400"
          }`}>
            {stats.ultimoEstado ?? "Sin datos"}
          </span>
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h2 className="text-base font-semibold text-white mb-1">Subir archivo de inventario</h2>
        <p className="text-xs text-gray-400 mb-5">Formato SAC — separado por punto y coma (.txt)</p>

        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => fileRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
            dragging ? "border-blue-500 bg-blue-950/20" : "border-gray-700 hover:border-gray-500"
          }`}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".txt"
            className="hidden"
            onChange={(e) => handleFile(e.target.files[0])}
          />
          <Upload size={32} className="mx-auto mb-3 text-gray-500" />
          {uploading ? (
            <p className="text-sm text-blue-400 font-medium">Procesando archivo...</p>
          ) : (
            <>
              <p className="text-sm text-gray-300 font-medium">Arrastra el archivo aquí</p>
              <p className="text-xs text-gray-500 mt-1">o haz clic para seleccionarlo</p>
            </>
          )}
        </div>

        {result && (
          <div className={`mt-4 rounded-lg p-4 border ${
            result.success ? "bg-green-950/30 border-green-800" : "bg-red-950/30 border-red-800"
          }`}>
            <div className="flex items-center gap-2 mb-2">
              {result.success
                ? <CheckCircle size={16} className="text-green-400" />
                : <AlertCircle size={16} className="text-red-400" />
              }
              <span className={`text-sm font-semibold ${result.success ? "text-green-300" : "text-red-300"}`}>
                {result.success ? "Sincronización exitosa" : "Error"}
              </span>
            </div>
            {result.success ? (
              <div className="grid grid-cols-3 gap-3 mt-3">
                <div className="bg-gray-900 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-400">Total</p>
                  <p className="text-lg font-bold text-white">{result.total_registros}</p>
                </div>
                <div className="bg-gray-900 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-400">Procesados</p>
                  <p className="text-lg font-bold text-green-400">{result.registros_procesados}</p>
                </div>
                <div className="bg-gray-900 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-400">Errores</p>
                  <p className="text-lg font-bold text-red-400">{result.registros_error}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-red-300">{result.error || result.mensaje}</p>
            )}
          </div>
        )}
      </div>

      {showConfirm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-sm w-full mx-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-red-900/50 flex items-center justify-center">
                <Trash2 size={18} className="text-red-400" />
              </div>
              <h3 className="text-base font-semibold text-white">¿Borrar toda la base de datos?</h3>
            </div>
            <p className="text-sm text-gray-400 mb-5">
              Esta acción eliminará los <strong className="text-white">{stats.total.toLocaleString()} productos</strong> y todos los logs. Solo úsalo para pruebas. No se puede deshacer.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleReset}
                disabled={resetting}
                className="flex-1 px-4 py-2 bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white text-sm rounded-lg font-medium transition-colors"
              >
                {resetting ? "Borrando..." : "Sí, borrar todo"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
