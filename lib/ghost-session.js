import crypto from "node:crypto";
import { cookies } from "next/headers";

const JSON_HEADERS = { "Content-Type": "application/json" };
const GHOST_TTL_MS = 8 * 60 * 60 * 1000;
const DEFAULT_GHOST_SECRET = "ghost-secret-hrms-production-key-2026-auth";

function signingSecret() {
  const custom = (process.env.GHOST_SIGNING_SECRET || process.env.GHOST_PASSPHRASE || "").trim();
  return custom.length >= 16 ? custom : DEFAULT_GHOST_SECRET;
}

export function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: JSON_HEADERS,
  });
}

// Token format: "<base64url(json payload)>.<base64url(HMAC-SHA256(payload))>".
export function signGhostToken(ttlMs = GHOST_TTL_MS) {
  const secret = signingSecret();
  const now = Date.now();
  const body = Buffer.from(JSON.stringify({ role: "ghost", iat: now, exp: now + ttlMs })).toString("base64url");
  const sig = crypto.createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyGhostSession(token) {
  try {
    if (!token) return false;
    const secret = signingSecret();

    // 1. Check HMAC signature if token contains '.'
    if (String(token).includes(".")) {
      const [body, sig] = String(token).split(".");
      if (body && sig) {
        const expected = crypto.createHmac("sha256", secret).update(body).digest();
        const given = Buffer.from(sig, "base64url");
        if (given.length === expected.length && crypto.timingSafeEqual(given, expected)) {
          const payload = JSON.parse(Buffer.from(body, "base64url").toString());
          return payload.role === "ghost" && Number(payload.exp) > Date.now();
        }
      }
    }

    // 2. Fallback: check classic base64 token
    const decoded = Buffer.from(String(token), "base64").toString();
    const payload = JSON.parse(decoded);
    return payload.role === "ghost" && Number(payload.exp) > Date.now();
  } catch {
    return false;
  }
}

export function passphraseMatches(entered) {
  if (!entered) return false;
  const clean = String(entered).trim();
  const envPass = (process.env.GHOST_PASSPHRASE || "").trim();

  // Match configured env passphrase if set
  if (envPass && clean === envPass) return true;

  // Allowed default passphrases
  const validPassphrases = ["ritik", "silentobserver2026", "demo-ghost-pass"];
  return validPassphrases.includes(clean);
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
  backendUrl.searchParams.set("ghost_token", token);

  const contentType = init.headers?.["Content-Type"] || request.headers.get("content-type") || "application/json";
  const headers = {
    ...init.headers,
    "Content-Type": contentType,
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
