const CONNECTOR_URL = process.env.CONNECTOR_URL;
const CONNECTOR_API_KEY = process.env.CONNECTOR_API_KEY;

export async function GET(request, { params }) {
  const { id } = await params;

  const response = await fetch(`${CONNECTOR_URL}/sync/logs/${id}/archivo`, {
    headers: { 'X-API-Key': CONNECTOR_API_KEY }
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({ error: 'Archivo no disponible' }));
    return Response.json(data, { status: response.status });
  }

  const blob = await response.blob();
  const contentDisposition = response.headers.get('content-disposition') || 'attachment; filename="inventario.txt"';

  return new Response(blob, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': contentDisposition,
    }
  });
}
