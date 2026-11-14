import crypto from "node:crypto";
import { cookies } from "next/headers";

const JSON_HEADERS = { "Content-Type": "application/json" };
const MIN_SECRET_LENGTH = 16; // must match the backend check
const GHOST_TTL_MS = 8 * 60 * 60 * 1000;

function signingSecret() {
  return (process.env.GHOST_SIGNING_SECRET || "").trim();
}

export function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: JSON_HEADERS,
  });
}

// Token format: "<base64url(json payload)>.<base64url(HMAC-SHA256(payload))>".
// The backend verifies the same signature with the shared GHOST_SIGNING_SECRET,
// so a client can no longer mint its own ghost session.
export function signGhostToken(ttlMs = GHOST_TTL_MS) {
  const secret = signingSecret();
  if (secret.length < MIN_SECRET_LENGTH) throw new Error("GHOST_SIGNING_SECRET is missing or shorter than 16 characters");
  const now = Date.now();
  const body = Buffer.from(JSON.stringify({ role: "ghost", iat: now, exp: now + ttlMs })).toString("base64url");
  const sig = crypto.createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyGhostSession(token) {
  try {
    const secret = signingSecret();
    if (!token || secret.length < MIN_SECRET_LENGTH) return false;
    const [body, sig] = String(token).split(".");
    if (!body || !sig) return false;
    const expected = crypto.createHmac("sha256", secret).update(body).digest();
    const given = Buffer.from(sig, "base64url");
    if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return false;
    const payload = JSON.parse(Buffer.from(body, "base64url").toString());
    return payload.role === "ghost" && Number(payload.exp) > Date.now();
  } catch {
    return false;
  }
}

// Why ghost login is unavailable, or null when both env vars are usable.
export function ghostConfigProblem() {
  if (signingSecret().length < MIN_SECRET_LENGTH) return "GHOST_SIGNING_SECRET is not set (16+ characters, same value on Vercel and Railway)";
  if ((process.env.GHOST_PASSPHRASE || "").trim().length < 6) return "GHOST_PASSPHRASE is not set on Vercel (6+ characters)";
  return null;
}

export function passphraseMatches(entered) {
  const expected = (process.env.GHOST_PASSPHRASE || "").trim();
  if (expected.length < 6) return false; // ghost mode stays disabled until a passphrase of 6+ characters is configured
  const a = Buffer.from(String(entered || "").trim());
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
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
    if (key !== "ghost_token") backendUrl.searchParams.set(key, value);
  });

  const contentType = init.headers?.["Content-Type"] || request.headers.get("content-type") || "application/json";
  const headers = {
    ...init.headers,
    "Content-Type": contentType,
    // Header, not query string: query strings end up in proxy and access logs.
    "X-Ghost-Token": token,
  };

  const response = await fetch(backendUrl, {
    method: init.method || request.method,
    headers,
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
