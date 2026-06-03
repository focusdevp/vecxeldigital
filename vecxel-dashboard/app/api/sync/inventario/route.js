const CONNECTOR_URL = process.env.CONNECTOR_URL;
const CONNECTOR_API_KEY = process.env.CONNECTOR_API_KEY;
const API_URL = process.env.API_URL;
const API_KEY = process.env.API_KEY;

export async function POST(request) {
  const formData = await request.formData();
  const file = formData.get('file');

  const bodyFormData = new FormData();
  bodyFormData.append('file', file);

  const response = await fetch(`${CONNECTOR_URL}/sync/inventario`, {
    method: 'POST',
    headers: {
      'X-API-Key': CONNECTOR_API_KEY,
    },
    body: bodyFormData,
  });

  const data = await response.json();
  return Response.json(data, { status: response.status });
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.toString();

  const response = await fetch(`${API_URL}/inventario${query ? `?${query}` : ''}`, {
    headers: { 'X-API-Key': API_KEY }
  });

  const data = await response.json();
  return Response.json(data, { status: response.status });
}
