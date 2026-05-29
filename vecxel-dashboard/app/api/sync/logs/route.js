const CONNECTOR_URL = process.env.CONNECTOR_URL;
const CONNECTOR_API_KEY = process.env.CONNECTOR_API_KEY;

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.toString();

  const response = await fetch(`${CONNECTOR_URL}/sync/logs${query ? `?${query}` : ''}`, {
    headers: { 'X-API-Key': CONNECTOR_API_KEY }
  });

  const data = await response.json();
  return Response.json(data, { status: response.status });
}
