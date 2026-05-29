import InventarioClient from "./InventarioClient";

export default async function InventarioPage({ searchParams }) {
  const params = await searchParams;
  const page = params?.page ?? "1";
  const sku = params?.sku ?? "";
  const limit = 50;

  let data = { productos: [], total: 0 };

  try {
    const query = new URLSearchParams({ page, limit, ...(sku && { sku }) }).toString();
    const res = await fetch(
      `${process.env.CONNECTOR_URL}/sync/inventario?${query}`,
      { headers: { "X-API-Key": process.env.CONNECTOR_API_KEY }, cache: "no-store" }
    );
    if (res.ok) data = await res.json();
  } catch {}

  return <InventarioClient data={data} currentPage={parseInt(page)} sku={sku} limit={limit} />;
}
