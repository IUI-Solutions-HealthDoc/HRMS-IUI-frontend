const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

function targetUrl(request, pathParts) {
  const path = (pathParts || []).map(encodeURIComponent).join("/");
  const url = new URL(request.url);
  return `${BACKEND_URL.replace(/\/$/, "")}/${path}${url.search}`;
}

function proxyHeaders(request) {
  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.delete("connection");
  headers.delete("content-length");
  return headers;
}

async function proxy(request, context) {
  const method = request.method.toUpperCase();
  const hasBody = !["GET", "HEAD"].includes(method);
  const params = await context.params;
  const response = await fetch(targetUrl(request, params.path), {
    method,
    headers: proxyHeaders(request),
    body: hasBody ? await request.arrayBuffer() : undefined,
    cache: "no-store",
  });

  const headers = new Headers(response.headers);
  headers.delete("content-encoding");
  headers.delete("content-length");
  headers.delete("transfer-encoding");
  return new Response(await response.arrayBuffer(), {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
