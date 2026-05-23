import { cookies } from "next/headers";

const JSON_HEADERS = { "Content-Type": "application/json" };

export function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: JSON_HEADERS,
  });
}

export function verifyGhostSession(token) {
  try {
    if (!token) return false;
    const payload = JSON.parse(Buffer.from(token, "base64").toString());
    if (payload.exp < Date.now()) return false;
    return payload.role === "ghost";
  } catch {
    return false;
  }
}

export async function getGhostSessionToken() {
  const cookieStore = await cookies();
  const token = cookieStore.get("ghost_session")?.value;
  return verifyGhostSession(token) ? token : null;
}

export async function proxyGhostRequest(request, backendPath, init = {}) {
  const token = await getGhostSessionToken();
  if (!token) return jsonResponse({ error: "Unauthorized" }, 403);

  const backendUrl = new URL(backendPath, process.env.BACKEND_URL || "http://localhost:8000");
  const requestUrl = new URL(request.url);
  requestUrl.searchParams.forEach((value, key) => {
    backendUrl.searchParams.set(key, value);
  });
  backendUrl.searchParams.set("ghost_token", token);

  const response = await fetch(backendUrl, {
    method: init.method || request.method,
    headers: init.headers,
    body: init.body,
    cache: "no-store",
  });

  return new Response(await response.text(), {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("content-type") || "application/json",
    },
  });
}
