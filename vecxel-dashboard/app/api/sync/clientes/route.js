const CONNECTOR_URL = process.env.CONNECTOR_URL;
const CONNECTOR_API_KEY = process.env.CONNECTOR_API_KEY;

export async function POST(request) {
  const formData = await request.formData();
  const file = formData.get('file');

  const bodyFormData = new FormData();
  bodyFormData.append('file', file);

  const response = await fetch(`${CONNECTOR_URL}/sync/clientes`, {
    method: 'POST',
    headers: {
      'X-API-Key': CONNECTOR_API_KEY,
    },
    body: bodyFormData,
  });

  const data = await response.json();
  return Response.json(data, { status: response.status });
}

export async function DELETE(request) {
  const response = await fetch(`${CONNECTOR_URL}/sync/clientes/reset`, {
    method: 'DELETE',
    headers: {
      'X-API-Key': CONNECTOR_API_KEY,
    },
  });

  const data = await response.json();
  return Response.json(data, { status: response.status });
}
