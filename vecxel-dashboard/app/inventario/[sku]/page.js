import Link from "next/link";
import { ArrowLeft, Package, DollarSign, Warehouse, Calendar, Tag } from "lucide-react";
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

  const totalStock = producto.almacenes?.reduce((acc, a) => acc + a.existencia, 0) ?? 0;

  return (
    <div className="p-8 max-w-3xl">
      <Link
        href="/inventario"
        className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft size={14} />
        Volver al inventario
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-white font-mono">{producto.sku}</h1>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              producto.activo ? "bg-green-900/60 text-green-300" : "bg-gray-800 text-gray-500"
            }`}>
              {producto.activo ? "Activo" : "Inactivo"}
            </span>
          </div>
          <p className="text-gray-300 text-lg">{producto.descripcion}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center gap-2 text-gray-400 text-xs mb-2">
            <DollarSign size={13} /> PRECIO USD
          </div>
          <p className="text-2xl font-bold text-green-400">${producto.precio_usd?.toFixed(2)}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center gap-2 text-gray-400 text-xs mb-2">
            <Tag size={13} /> UNIDAD DE MEDIDA
          </div>
          <p className="text-2xl font-bold text-white">{producto.unidad_medida}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center gap-2 text-gray-400 text-xs mb-2">
            <Warehouse size={13} /> STOCK TOTAL
          </div>
          <p className={`text-2xl font-bold ${totalStock > 0 ? "text-blue-400" : "text-gray-500"}`}>
            {totalStock}
          </p>
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-4">
        <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <Warehouse size={14} className="text-gray-400" />
          Stock por almacén
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {producto.almacenes?.map((alm) => (
            <div key={alm.codigo} className="flex items-center justify-between bg-gray-800/50 rounded-lg px-4 py-3">
              <span className="text-sm text-gray-400">Almacén <span className="font-mono text-white">{alm.codigo}</span></span>
              <span className={`text-lg font-bold ${alm.existencia > 0 ? "text-blue-400" : "text-gray-600"}`}>
                {alm.existencia}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <Calendar size={14} className="text-gray-400" />
          Fechas
        </h2>
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Última sincronización</span>
            <span className="text-gray-200">{formatDate(producto.ultima_sincronizacion)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Creado en BD</span>
            <span className="text-gray-200">{formatDate(producto.createdAt)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Última actualización</span>
            <span className="text-gray-200">{formatDate(producto.updatedAt)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
