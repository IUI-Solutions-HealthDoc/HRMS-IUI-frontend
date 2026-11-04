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

// NOTE: this route handler shadows the /api/proxy rewrite in next.config.mjs, so every
// API call is a billed Vercel Function invocation. Prefer NEXT_PUBLIC_API_URL (browser
// calls Railway directly). Bodies are streamed rather than buffered to keep the
// function's memory and duration down for uploads/downloads that still pass through.
async function proxy(request, context) {
  const method = request.method.toUpperCase();
  const hasBody = !["GET", "HEAD"].includes(method);
  const params = await context.params;
  const response = await fetch(targetUrl(request, params.path), {
    method,
    headers: proxyHeaders(request),
    body: hasBody ? request.body : undefined,
    duplex: hasBody ? "half" : undefined,
    cache: "no-store",
  });

  const headers = new Headers(response.headers);
  headers.delete("content-encoding");
  headers.delete("content-length");
  headers.delete("transfer-encoding");
  return new Response(response.body, {
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
