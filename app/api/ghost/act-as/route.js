import { jsonResponse, proxyGhostRequest } from "@/lib/ghost-session";

const PANEL_ROLES = new Set(["admin", "hr", "accounts"]);

// Ghost session -> normal access token for the full Admin / HR / Accounts panel.
export async function POST(request) {
  const { role } = await request.json().catch(() => ({}));
  if (!PANEL_ROLES.has(role)) return jsonResponse({ error: "Unknown panel" }, 400);
  try {
    return await proxyGhostRequest(request, `/ghost/act-as/${role}`, { method: "POST" });
  } catch (error) {
    console.error("Ghost act-as error:", error);
    return jsonResponse({ error: "Could not open panel" }, 502);
  }
}
