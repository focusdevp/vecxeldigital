const API_URL = process.env.API_URL;
const API_KEY = process.env.API_KEY;

export async function GET(request, { params }) {
  const { sku } = await params;
  const response = await fetch(`${API_URL}/inventario/${encodeURIComponent(sku)}`, {
    headers: { 'X-API-Key': API_KEY }
  });

  const data = await response.json();
  return Response.json(data, { status: response.status });
}
