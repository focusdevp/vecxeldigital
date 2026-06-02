const CONNECTOR_URL = process.env.CONNECTOR_URL;
const CONNECTOR_API_KEY = process.env.CONNECTOR_API_KEY;

export async function POST(request) {
  const contentType = request.headers.get('content-type');
  const body = await request.arrayBuffer();

  const response = await fetch(`${CONNECTOR_URL}/sync/clientes`, {
    method: 'POST',
    headers: {
      'X-API-Key': CONNECTOR_API_KEY,
      'Content-Type': contentType,
    },
    body: body,
  });

  const data = await response.json();
  return Response.json(data, { status: response.status });
}
