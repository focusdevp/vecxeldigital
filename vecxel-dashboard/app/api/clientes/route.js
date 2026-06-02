import { NextResponse } from "next/server";

const API_URL = process.env.API_URL || "http://localhost:8000";
const API_KEY = process.env.API_KEY;

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.toString();

  try {
    const res = await fetch(`${API_URL}/clientes?${query}`, {
      headers: { "X-API-Key": API_KEY },
      cache: "no-store",
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ success: false, error: "Error conectando con API" }, { status: 503 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const res = await fetch(`${API_URL}/clientes`, {
      method: "POST",
      headers: { "X-API-Key": API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ success: false, error: "Error conectando con API" }, { status: 503 });
  }
}
