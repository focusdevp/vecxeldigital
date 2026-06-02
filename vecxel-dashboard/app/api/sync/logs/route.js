const API_URL = process.env.API_URL;
const API_KEY = process.env.API_KEY;

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.toString();

  const response = await fetch(`${API_URL}/logs${query ? `?${query}` : ''}`, {
    headers: { 'X-API-Key': API_KEY }
  });

  const data = await response.json();
  return Response.json(data, { status: response.status });
}
