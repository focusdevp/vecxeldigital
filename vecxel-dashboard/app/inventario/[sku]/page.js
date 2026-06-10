import Link from "next/link";
import { ArrowLeft, DollarSign, Warehouse, Calendar, Tag } from "lucide-react";
import { notFound } from "next/navigation";

export default async function ProductoDetallePage({ params }) {
  const { sku } = await params;

  let producto = null;
  try {
    const res = await fetch(
      `${process.env.CONNECTOR_URL}/sync/inventario/${encodeURIComponent(sku)}`,
      { headers: { "X-API-Key": process.env.CONNECTOR_API_KEY }, cache: "no-store" }
    );
    if (res.status === 404) notFound();
    if (res.ok) {
      const data = await res.json();
      producto = data.producto;
    }
  } catch {
    notFound();
  }

  if (!producto) notFound();

  const formatDate = (iso) =>
    new Date(iso).toLocaleString("es-VE", { dateStyle: "long", timeStyle: "short" });

  // Mapeo de códigos de almacén a nombres
  const almacenNames = {
    "00": "Almacén Principal",
    "30": "Almacén Barquisimeto",
    "40": "Almacén Valencia",
    "60": "Almacén Oriente"
  };

  const getAlmacenName = (codigo) => {
    return almacenNames[codigo] || `Almacén ${codigo}`;
  };

  const totalStock = producto.almacenes?.reduce((acc, a) => acc + a.existencia, 0) ?? 0;

  return (
    <div className="p-8 max-w-3xl">
      <Link href="/inventario"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 mb-6 transition-colors">
        <ArrowLeft size={14} />
        Volver al inventario
      </Link>

      <div className="flex items-start gap-3 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-xl font-bold text-slate-900 font-mono">{producto.sku}</h1>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${
              producto.activo ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
            }`}>
              {producto.activo ? "Activo" : "Inactivo"}
            </span>
          </div>
          <p className="text-slate-600">{producto.descripcion}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Precio Base</p>
            <div className="w-7 h-7 bg-white shadow-sm rounded-md flex items-center justify-center">
              <DollarSign size={13} className="text-emerald-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-emerald-600">${producto.precio_usd?.toFixed(2)}</p>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Unidad</p>
            <div className="w-7 h-7 bg-white shadow-sm rounded-md flex items-center justify-center">
              <Tag size={13} className="text-slate-500" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900">{producto.unidad_medida}</p>
        </div>
        <div className={`border rounded-lg p-5 ${totalStock > 0 ? "bg-blue-50 border-blue-100" : "bg-slate-50 border-slate-200"}`}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Stock Total</p>
            <div className="w-7 h-7 bg-white shadow-sm rounded-md flex items-center justify-center">
              <Warehouse size={13} className={totalStock > 0 ? "text-blue-600" : "text-slate-400"} />
            </div>
          </div>
          <p className={`text-2xl font-bold ${totalStock > 0 ? "text-blue-600" : "text-slate-400"}`}>{totalStock}</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm mb-4">
        <h2 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Warehouse size={14} className="text-slate-400" />
          Stock por almacén
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {producto.almacenes?.map((alm) => (
            <div key={alm.codigo} className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-md px-4 py-3">
              <span className="text-sm text-slate-500">{getAlmacenName(alm.codigo)} <span className="font-mono font-semibold text-slate-900">({alm.codigo})</span></span>
              <span className={`text-lg font-bold ${alm.existencia > 0 ? "text-blue-600" : "text-slate-400"}`}>
                {alm.existencia}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Calendar size={14} className="text-slate-400" />
          Fechas
        </h2>
        <div className="space-y-2.5">
          {[
            ["Última sincronización", producto.ultima_sincronizacion],
            ["Creado en BD", producto.createdAt],
            ["Última actualización", producto.updatedAt],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between text-sm py-1 border-b border-slate-100 last:border-0">
              <span className="text-slate-500">{label}</span>
              <span className="text-slate-700 font-medium">{formatDate(value)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
