import type { NextRequest } from "next/server";

const UPSTREAM_ORIGIN = "https://img.a.transfermarkt.technology";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  if (!path || path.length === 0) {
    return new Response("Not found", { status: 404 });
  }
  if (path.some((seg) => seg.includes("..") || seg.includes("/") || seg.includes("\\"))) {
    return new Response("Bad request", { status: 400 });
  }

  const upstreamUrl = `${UPSTREAM_ORIGIN}/${path.map(encodeURIComponent).join("/")}${request.nextUrl.search}`;

  let upstream: Response;
  try {
    upstream = await fetch(upstreamUrl, {
      headers: { accept: "image/*" },
      next: { revalidate: 86400 },
    });
  } catch {
    return new Response("Upstream error", { status: 502 });
  }

  if (!upstream.ok) {
    return new Response("Upstream error", { status: upstream.status });
  }

  const contentType = upstream.headers.get("content-type") ?? "image/jpeg";
  const body = await upstream.arrayBuffer();

  return new Response(body, {
    headers: {
      "content-type": contentType,
      "cache-control": "public, max-age=86400, s-maxage=2592000, immutable",
    },
  });
}
