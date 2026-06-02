import ClientesClient from "./ClientesClient";

export default async function ClientesPage({ searchParams }) {
  const params = await searchParams;
  const page = params?.page ?? "1";
  const nombre = params?.nombre ?? "";
  const limit = 50;

  let data = { clientes: [], total: 0 };

  try {
    const query = new URLSearchParams({ page, limit, ...(nombre && { nombre }) }).toString();
    const res = await fetch(
      `${process.env.API_URL}/clientes?${query}`,
      { headers: { "X-API-Key": process.env.API_KEY }, cache: "no-store" }
    );
    if (res.ok) data = await res.json();
  } catch {}

  return <ClientesClient data={data} currentPage={parseInt(page)} nombre={nombre} limit={limit} />;
}
