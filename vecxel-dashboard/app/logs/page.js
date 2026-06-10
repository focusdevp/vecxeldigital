"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { CheckCircle, AlertTriangle, XCircle, Upload, Download, ClipboardList } from "lucide-react";

export default function LogsPage() {
  const [data, setData] = useState({ logs: [], total: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await fetch(`/api/sync/logs?limit=50`, { cache: "no-store" });
        if (res.ok) {
          const result = await res.json();
          setData(result);
        }
      } catch {}
      setLoading(false);
    };

    fetchLogs();
  }, []);

  const formatDate = (iso) => {
    if (!iso) return "—";
    const date = new Date(iso);
    // Asegurar que la fecha se interprete correctamente en timezone de Venezuela
    const options = {
      timeZone: "America/Caracas",
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    };
    return date.toLocaleString("es-VE", options);
  };

  const formatDuration = (ms) => {
    if (ms == null) return "—";
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const estadoStyle = {
    exitoso: "bg-emerald-100 text-emerald-700",
    parcial: "bg-amber-100 text-amber-700",
    fallido: "bg-red-100 text-red-700",
  };

  const estadoIcon = {
    exitoso: <CheckCircle size={12} />,
    parcial: <AlertTriangle size={12} />,
    fallido: <XCircle size={12} />,
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-slate-900">Logs de Sincronización</h1>
        <p className="text-sm text-slate-500 mt-0.5">{data.total} operaciones registradas</p>
        <p className="text-xs text-slate-400 mt-1">Fechas mostradas en horario de Caracas (America/Caracas).</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto shadow-sm">
        <table className="w-full text-sm whitespace-nowrap">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Inicio</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Fin</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Duración</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Tipo</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Archivo</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Motivo</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Total</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">OK</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Err</th>
              <th className="text-center px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Estado</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {loading ? (
              <tr>
                <td colSpan={11} className="text-center py-16">
                  <ClipboardList size={28} className="mx-auto mb-2 text-slate-300 animate-pulse" />
                  <p className="text-sm text-slate-400">Cargando logs...</p>
                </td>
              </tr>
            ) : data.logs.length === 0 ? (
              <tr>
                <td colSpan={11} className="text-center py-16">
                  <ClipboardList size={28} className="mx-auto mb-2 text-slate-300" />
                  <p className="text-sm text-slate-400">No hay logs registrados aún</p>
                </td>
              </tr>
            ) : (
              data.logs.map((log) => (
                <tr key={log._id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-2.5 text-slate-500 text-xs">
                    {formatDate(log.inicio_procesamiento || log.createdAt)}
                  </td>
                  <td className="px-4 py-2.5 text-slate-500 text-xs">
                    {formatDate(log.fin_procesamiento)}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <span className={`text-xs font-semibold ${
                      log.duracion_ms != null && log.duracion_ms > 5000
                        ? "text-amber-600"
                        : "text-slate-700"
                    }`}>
                      {formatDuration(log.duracion_ms)}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="inline-flex items-center gap-1.5 text-slate-600 text-xs font-medium">
                      {log.tipo === "upload"
                        ? <Upload size={12} className="text-blue-600" />
                        : <Download size={12} className="text-purple-600" />}
                      {log.tipo}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-slate-500 text-xs font-mono max-w-[200px] truncate">
                    {log.archivo ?? "—"}
                  </td>
                  <td className="px-4 py-2.5 text-slate-500 text-xs max-w-[240px] truncate">
                    {log.fail_reason ?? "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right text-slate-700 text-xs">{log.total_registros}</td>
                  <td className="px-4 py-2.5 text-right text-emerald-600 text-xs font-semibold">{log.registros_procesados}</td>
                  <td className="px-4 py-2.5 text-right text-red-600 text-xs font-semibold">{log.registros_error}</td>
                  <td className="px-4 py-2.5 text-center">
                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${estadoStyle[log.estado] ?? "bg-slate-100 text-slate-600"}`}>
                      {estadoIcon[log.estado]}
                      {log.estado}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {log.archivo_path && (
                      <Link
                        href={`/api/sync/logs/${log._id}/archivo`}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-900 text-xs font-medium rounded-md transition-colors"
                        download
                      >
                        <Download size={11} />
                        TXT
                      </Link>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
