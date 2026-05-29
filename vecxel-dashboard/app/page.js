import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
  let stats = { total: 0, ultimaSync: null, ultimoEstado: null };

  try {
    const res = await fetch(
      `${process.env.CONNECTOR_URL}/sync/inventario?limit=1`,
      { headers: { "X-API-Key": process.env.CONNECTOR_API_KEY }, cache: "no-store" }
    );
    if (res.ok) {
      const data = await res.json();
      stats.total = data.total ?? 0;
    }

    const logsRes = await fetch(
      `${process.env.CONNECTOR_URL}/sync/logs?limit=1&entidad=inventario`,
      { headers: { "X-API-Key": process.env.CONNECTOR_API_KEY }, cache: "no-store" }
    );
    if (logsRes.ok) {
      const logsData = await logsRes.json();
      if (logsData.logs?.[0]) {
        stats.ultimaSync = logsData.logs[0].createdAt;
        stats.ultimoEstado = logsData.logs[0].estado;
      }
    }
  } catch {}

  return <DashboardClient stats={stats} />;
}
