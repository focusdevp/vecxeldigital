import InventarioClient from "./InventarioClient";

export default async function InventarioPage({ searchParams }) {
  const params = await searchParams;
  const page = params?.page ?? "1";
  const sku = params?.sku ?? "";
  const almacen = params?.almacen ?? "";
  const stock_op = params?.stock_op ?? "";
  const stock_value = params?.stock_value ?? "";
  const limit = 50;

  let data = { productos: [], total: 0 };

  try {
    const queryParams = { page, limit };
    if (sku) queryParams.sku = sku;
    if (almacen) queryParams.almacen = almacen;
    if (stock_op) queryParams.stock_op = stock_op;
    if (stock_value) queryParams.stock_value = stock_value;
    
    const query = new URLSearchParams(queryParams).toString();
    const res = await fetch(
      `${process.env.CONNECTOR_URL}/api/inventario?${query}`,
      { headers: { "X-API-Key": process.env.CONNECTOR_API_KEY }, cache: "no-store" }
    );
    if (res.ok) data = await res.json();
  } catch {}

  return <InventarioClient data={data} currentPage={parseInt(page)} sku={sku} almacen={almacen} stock_op={stock_op} stock_value={stock_value} limit={limit} />;
}
