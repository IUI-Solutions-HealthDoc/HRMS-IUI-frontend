import { getGhostSessionToken, jsonResponse } from "@/lib/ghost-session";

export async function GET() {
  try {
    const ghostToken = await getGhostSessionToken();
    if (!ghostToken) {
      return jsonResponse({ authenticated: false }, 401);
    }

    return jsonResponse({ authenticated: true });
  } catch (error) {
    console.error("Session check error:", error);
    return jsonResponse({ authenticated: false }, 401);
  }
}
