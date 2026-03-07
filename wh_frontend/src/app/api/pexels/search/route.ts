import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Missing PEXELS_API_KEY" }, { status: 500 });
  }

  const requestUrl = new URL(request.url);
  const query = requestUrl.searchParams.get("q")?.trim();
  const perPage = Number(requestUrl.searchParams.get("per_page") ?? "12");
  const safePerPage = Number.isFinite(perPage) ? Math.min(Math.max(perPage, 1), 30) : 12;

  const endpoint = query && query.length > 0
    ? `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${safePerPage}`
    : `https://api.pexels.com/v1/curated?per_page=${safePerPage}`;

  const response = await fetch(endpoint, {
    headers: {
      Authorization: apiKey
    },
    next: {
      revalidate: 60
    }
  });

  if (!response.ok) {
    return NextResponse.json({ error: "Pexels request failed" }, { status: response.status });
  }

  const data = await response.json();
  return NextResponse.json({ photos: data.photos ?? [] });
}
