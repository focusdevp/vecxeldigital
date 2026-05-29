import { CheckCircle, AlertTriangle, XCircle, Upload, Download } from "lucide-react";

export default async function LogsPage() {
  let data = { logs: [], total: 0 };

  try {
    const res = await fetch(
      `${process.env.CONNECTOR_URL}/sync/logs?limit=50`,
      { headers: { "X-API-Key": process.env.CONNECTOR_API_KEY }, cache: "no-store" }
    );
    if (res.ok) data = await res.json();
  } catch {}

  const formatDate = (iso) =>
    new Date(iso).toLocaleString("es-VE", { dateStyle: "short", timeStyle: "medium" });

  const estadoBadge = (estado) => {
    if (estado === "exitoso") return "bg-green-900/60 text-green-300";
    if (estado === "parcial") return "bg-yellow-900/60 text-yellow-300";
    return "bg-red-900/60 text-red-300";
  };

  const estadoIcon = (estado) => {
    if (estado === "exitoso") return <CheckCircle size={14} className="text-green-400" />;
    if (estado === "parcial") return <AlertTriangle size={14} className="text-yellow-400" />;
    return <XCircle size={14} className="text-red-400" />;
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-white mb-1">Logs de Sincronización</h1>
      <p className="text-gray-400 text-sm mb-6">{data.total} operaciones registradas</p>

      <div className="rounded-xl border border-gray-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-900 border-b border-gray-800">
              <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">FECHA</th>
              <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">TIPO</th>
              <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">ENTIDAD</th>
              <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">ARCHIVO</th>
              <th className="text-right px-4 py-3 text-xs text-gray-400 font-medium">TOTAL</th>
              <th className="text-right px-4 py-3 text-xs text-gray-400 font-medium">PROCESADOS</th>
              <th className="text-right px-4 py-3 text-xs text-gray-400 font-medium">ERRORES</th>
              <th className="text-center px-4 py-3 text-xs text-gray-400 font-medium">ESTADO</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {data.logs.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-16 text-gray-500">
                  No hay logs registrados aún
                </td>
              </tr>
            ) : (
              data.logs.map((log) => (
                <tr key={log._id} className="hover:bg-gray-900/50 transition-colors">
                  <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                    {formatDate(log.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1.5 text-gray-300">
                      {log.tipo === "upload"
                        ? <Upload size={12} className="text-blue-400" />
                        : <Download size={12} className="text-purple-400" />
                      }
                      {log.tipo}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-300 capitalize">{log.entidad}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs font-mono max-w-xs truncate">
                    {log.archivo ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-300">{log.total_registros}</td>
                  <td className="px-4 py-3 text-right text-green-400 font-medium">{log.registros_procesados}</td>
                  <td className="px-4 py-3 text-right text-red-400 font-medium">{log.registros_error}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${estadoBadge(log.estado)}`}>
                      {estadoIcon(log.estado)}
                      {log.estado}
                    </span>
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
